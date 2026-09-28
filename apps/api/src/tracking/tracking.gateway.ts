import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  MessageBody,
  ConnectedSocket,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { TrackingService } from './tracking.service';
import { LocationUpdateDto } from './dto/location-update.dto';
import {
  SOCKET_EVENTS,
  LiveLocationUpdate,
  WorkerStatus,
} from '@fieldops/shared';
import { JobEntity } from '../jobs/entities/job.entity';
import { UsersService } from '../users/users.service';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
  workerName?: string;
}

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  namespace: '/',
  transports: ['websocket', 'polling'],
})
export class TrackingGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(TrackingGateway.name);
  private connectedWorkers = new Map<string, string>(); // workerId → socketId

  constructor(
    private readonly trackingService: TrackingService,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('TrackingGateway initialized');
  }

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        this.logger.warn(`Client ${client.id} connected without token`);
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify<{
        sub: string;
        email: string;
        role: string;
      }>(token, {
        secret: this.configService.get<string>('JWT_SECRET', 'fallback_secret'),
      });

      client.userId = payload.sub;
      client.userRole = payload.role;

      const user = await this.usersService.findById(payload.sub);
      if (user) {
        client.workerName = `${user.firstName} ${user.lastName}`;
      }

      // Join appropriate rooms
      if (payload.role === 'admin') {
        await client.join('admin-room');
        this.logger.log(`Admin ${payload.sub} joined admin-room`);
      } else if (payload.role === 'worker') {
        await client.join(`worker-${payload.sub}`);
        this.connectedWorkers.set(payload.sub, client.id);
        this.logger.log(`Worker ${payload.sub} connected`);

        // Update status to available
        await this.usersService.updateStatus(payload.sub, WorkerStatus.AVAILABLE);
      }

      this.logger.log(`Client ${client.id} connected (${payload.role})`);
    } catch (error) {
      this.logger.warn(`Auth failed for client ${client.id}: ${(error as Error).message}`);
      client.disconnect();
    }
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    this.logger.log(`Client ${client.id} disconnected`);
    if (client.userId && client.userRole === 'worker') {
      this.connectedWorkers.delete(client.userId);
      await this.usersService.updateStatus(client.userId, WorkerStatus.OFFLINE);
    }
  }

  @SubscribeMessage(SOCKET_EVENTS.LOCATION_UPDATE)
  async handleLocationUpdate(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: LocationUpdateDto,
  ) {
    if (!client.userId || client.userRole !== 'worker') {
      throw new WsException('Unauthorized: only workers can send location updates');
    }

    try {
      const location = await this.trackingService.recordLocation(
        client.userId,
        data,
      );

      const user = await this.usersService.findById(client.userId);

      const broadcastPayload: LiveLocationUpdate = {
        workerId: client.userId,
        workerName: client.workerName ?? 'Unknown Worker',
        latitude: Number(location.latitude),
        longitude: Number(location.longitude),
        altitude: location.altitude ?? undefined,
        accuracy: location.accuracy ?? undefined,
        speed: location.speed ?? undefined,
        heading: location.heading ?? undefined,
        batteryLevel: location.batteryLevel ?? undefined,
        status: user?.status ?? WorkerStatus.AVAILABLE,
        timestamp: location.timestamp.toISOString(),
      };

      // Broadcast to all admin clients
      this.server.to('admin-room').emit(SOCKET_EVENTS.LOCATION_BROADCAST, broadcastPayload);

      return { success: true, locationId: location.id };
    } catch (error) {
      this.logger.error('Failed to record location', (error as Error).stack);
      throw new WsException('Failed to process location update');
    }
  }

  @SubscribeMessage(SOCKET_EVENTS.JOIN_WORKER_ROOM)
  handleJoinWorkerRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { workerId: string },
  ) {
    if (client.userRole === 'admin') {
      client.join(`worker-${data.workerId}`);
      return { success: true };
    }
    throw new WsException('Unauthorized');
  }

  // Methods called from services to emit events

  emitJobAssigned(workerId: string, job: JobEntity) {
    this.server.to(`worker-${workerId}`).emit(SOCKET_EVENTS.JOB_ASSIGNED, {
      jobId: job.id,
      workerId,
      job,
    });
  }

  emitJobUpdated(job: JobEntity) {
    // Notify admin room
    this.server.to('admin-room').emit(SOCKET_EVENTS.JOB_UPDATED, job);
    // Notify assigned worker if any
    if (job.assignedWorkerId) {
      this.server
        .to(`worker-${job.assignedWorkerId}`)
        .emit(SOCKET_EVENTS.JOB_UPDATED, job);
    }
  }

  notifyWorkerJobAssigned(workerId: string, jobId: string) {
    this.server.to(`worker-${workerId}`).emit(SOCKET_EVENTS.JOB_ASSIGNED, {
      jobId,
      workerId,
    });
  }

  emitGeofenceEvent(
    workerId: string,
    event: {
      geofenceId: string;
      geofenceName: string;
      jobId?: string;
      eventType: string;
      timestamp: string;
    },
  ) {
    const eventName =
      event.eventType === 'check_in'
        ? SOCKET_EVENTS.GEOFENCE_ENTER
        : SOCKET_EVENTS.GEOFENCE_EXIT;

    // Notify admin room
    this.server.to('admin-room').emit(eventName, { workerId, ...event });
    // Notify the worker
    this.server.to(`worker-${workerId}`).emit(eventName, { workerId, ...event });
  }

  getConnectedWorkers(): string[] {
    return Array.from(this.connectedWorkers.keys());
  }

  isWorkerConnected(workerId: string): boolean {
    return this.connectedWorkers.has(workerId);
  }
}

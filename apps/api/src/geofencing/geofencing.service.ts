import {
  Injectable,
  NotFoundException,
  Logger,
  forwardRef,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { GeofenceEntity } from './entities/geofence.entity';
import { CheckInEntity } from './entities/checkin.entity';
import { CreateGeofenceDto } from './dto/create-geofence.dto';
import { GeofenceType, CheckInEventType } from '@fieldops/shared';
import { TrackingGateway } from '../tracking/tracking.gateway';
import { AlertsService } from '../alerts/alerts.service';

// Track which workers are currently inside each geofence
interface WorkerGeofenceState {
  [workerId: string]: Set<string>; // workerId → Set of geofenceIds
}

@Injectable()
export class GeofencingService {
  private readonly logger = new Logger(GeofencingService.name);
  private workerGeofenceState: WorkerGeofenceState = {};

  constructor(
    @InjectRepository(GeofenceEntity)
    private readonly geofenceRepository: Repository<GeofenceEntity>,
    @InjectRepository(CheckInEntity)
    private readonly checkInRepository: Repository<CheckInEntity>,
    @Inject(forwardRef(() => TrackingGateway))
    private readonly trackingGateway: TrackingGateway,
    private readonly alertsService: AlertsService,
  ) {}

  async create(dto: CreateGeofenceDto, createdById: string): Promise<GeofenceEntity> {
    const geofence = this.geofenceRepository.create({
      name: dto.name,
      description: dto.description ?? null,
      type: dto.type,
      centerLatitude: dto.centerLatitude ?? null,
      centerLongitude: dto.centerLongitude ?? null,
      radiusMeters: dto.radiusMeters ?? null,
      polygonCoordinates: dto.polygonCoordinates ?? null,
      geometryWkt: this.buildGeometryWkt(dto),
      jobId: dto.jobId ?? null,
      isActive: true,
      triggerOnEnter: dto.triggerOnEnter ?? true,
      triggerOnExit: dto.triggerOnExit ?? true,
      createdById,
    });

    return this.geofenceRepository.save(geofence);
  }

  async findAll(): Promise<GeofenceEntity[]> {
    return this.geofenceRepository.find({
      where: { isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string): Promise<GeofenceEntity> {
    const geofence = await this.geofenceRepository.findOne({ where: { id } });
    if (!geofence) {
      throw new NotFoundException(`Geofence ${id} not found`);
    }
    return geofence;
  }

  async update(
    id: string,
    dto: Partial<CreateGeofenceDto>,
  ): Promise<GeofenceEntity> {
    const geofence = await this.findById(id);
    Object.assign(geofence, dto);
    geofence.geometryWkt = this.buildGeometryWkt({
      type: geofence.type,
      centerLatitude: geofence.centerLatitude ?? undefined,
      centerLongitude: geofence.centerLongitude ?? undefined,
      radiusMeters: geofence.radiusMeters ?? undefined,
      polygonCoordinates: geofence.polygonCoordinates ?? undefined,
    });
    return this.geofenceRepository.save(geofence);
  }

  async remove(id: string): Promise<void> {
    const geofence = await this.findById(id);
    geofence.isActive = false;
    await this.geofenceRepository.save(geofence);
  }

  async getCheckIns(options?: {
    workerId?: string;
    geofenceId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<CheckInEntity[]> {
    const query = this.checkInRepository
      .createQueryBuilder('ci')
      .leftJoinAndSelect('ci.geofence', 'geofence')
      .orderBy('ci.timestamp', 'DESC');

    if (options?.workerId) {
      query.andWhere('ci.workerId = :workerId', { workerId: options.workerId });
    }
    if (options?.geofenceId) {
      query.andWhere('ci.geofenceId = :geofenceId', {
        geofenceId: options.geofenceId,
      });
    }
    if (options?.startDate) {
      query.andWhere('ci.timestamp >= :startDate', {
        startDate: options.startDate,
      });
    }
    if (options?.endDate) {
      query.andWhere('ci.timestamp <= :endDate', { endDate: options.endDate });
    }

    return query.limit(500).getMany();
  }

  async checkGeofencesForWorker(
    workerId: string,
    latitude: number,
    longitude: number,
  ): Promise<void> {
    const activeGeofences = await this.findAll();

    if (!this.workerGeofenceState[workerId]) {
      this.workerGeofenceState[workerId] = new Set();
    }

    const currentInside = this.workerGeofenceState[workerId];

    for (const geofence of activeGeofences) {
      const isInside = this.isPointInGeofence(latitude, longitude, geofence);
      const wasInside = currentInside.has(geofence.id);

      if (isInside && !wasInside) {
        // Worker entered geofence
        currentInside.add(geofence.id);
        if (geofence.triggerOnEnter) {
          await this.recordCheckInEvent(
            workerId,
            geofence,
            CheckInEventType.CHECK_IN,
            latitude,
            longitude,
          );
        }
      } else if (!isInside && wasInside) {
        // Worker exited geofence
        currentInside.delete(geofence.id);
        if (geofence.triggerOnExit) {
          await this.recordCheckInEvent(
            workerId,
            geofence,
            CheckInEventType.CHECK_OUT,
            latitude,
            longitude,
          );
        }
      }
    }
  }

  private async recordCheckInEvent(
    workerId: string,
    geofence: GeofenceEntity,
    eventType: CheckInEventType,
    latitude: number,
    longitude: number,
  ): Promise<void> {
    const checkIn = this.checkInRepository.create({
      workerId,
      geofenceId: geofence.id,
      jobId: geofence.jobId ?? null,
      eventType,
      latitude,
      longitude,
    });

    await this.checkInRepository.save(checkIn);

    // Emit socket event
    this.trackingGateway.emitGeofenceEvent(workerId, {
      geofenceId: geofence.id,
      geofenceName: geofence.name,
      jobId: geofence.jobId ?? undefined,
      eventType,
      timestamp: new Date().toISOString(),
    });

    // Fire alert rules
    const alertType = eventType === CheckInEventType.CHECK_IN ? 'enter' : 'exit';
    this.alertsService.checkGeofenceEvent(
      alertType, workerId, geofence.id, workerId, geofence.name,
    ).catch(() => {});

    this.logger.log(
      `Worker ${workerId} ${eventType} geofence ${geofence.name}`,
    );
  }

  private isPointInGeofence(
    latitude: number,
    longitude: number,
    geofence: GeofenceEntity,
  ): boolean {
    if (geofence.type === GeofenceType.CIRCLE) {
      if (
        geofence.centerLatitude === null ||
        geofence.centerLongitude === null ||
        geofence.radiusMeters === null
      ) {
        return false;
      }
      const distance = this.haversineDistance(
        latitude,
        longitude,
        Number(geofence.centerLatitude),
        Number(geofence.centerLongitude),
      );
      return distance <= Number(geofence.radiusMeters);
    }

    if (geofence.type === GeofenceType.POLYGON) {
      if (!geofence.polygonCoordinates || geofence.polygonCoordinates.length < 3) {
        return false;
      }
      return this.pointInPolygon(latitude, longitude, geofence.polygonCoordinates);
    }

    return false;
  }

  private pointInPolygon(
    latitude: number,
    longitude: number,
    polygon: Array<{ latitude: number; longitude: number }>,
  ): boolean {
    // Ray casting algorithm
    let inside = false;
    const x = longitude;
    const y = latitude;
    const n = polygon.length;

    for (let i = 0, j = n - 1; i < n; j = i++) {
      const xi = polygon[i].longitude;
      const yi = polygon[i].latitude;
      const xj = polygon[j].longitude;
      const yj = polygon[j].latitude;

      const intersect =
        yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }

    return inside;
  }

  private haversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371000;
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  private buildGeometryWkt(dto: {
    type: GeofenceType;
    centerLatitude?: number;
    centerLongitude?: number;
    radiusMeters?: number;
    polygonCoordinates?: Array<{ latitude: number; longitude: number }>;
  }): string | null {
    if (dto.type === GeofenceType.CIRCLE) {
      if (dto.centerLatitude == null || dto.centerLongitude == null) return null;
      return `POINT(${dto.centerLongitude} ${dto.centerLatitude})`;
    }
    if (dto.type === GeofenceType.POLYGON && dto.polygonCoordinates?.length) {
      const coords = dto.polygonCoordinates
        .map((c) => `${c.longitude} ${c.latitude}`)
        .join(', ');
      const first = dto.polygonCoordinates[0];
      return `POLYGON((${coords}, ${first.longitude} ${first.latitude}))`;
    }
    return null;
  }
}

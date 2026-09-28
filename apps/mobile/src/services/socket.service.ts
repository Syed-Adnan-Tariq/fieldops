import { io, Socket } from 'socket.io-client';
import Constants from 'expo-constants';
import { SOCKET_EVENTS } from '@fieldops/shared';

const WS_URL =
  process.env.EXPO_PUBLIC_WS_URL ||
  (Constants.expoConfig?.extra as { wsUrl?: string })?.wsUrl ||
  'http://localhost:3001';

class SocketService {
  private socket: Socket | null = null;

  connect(token: string): Socket {
    if (this.socket?.connected) {
      return this.socket;
    }

    this.socket = io(WS_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 3000,
      timeout: 15000,
    });

    this.socket.on(SOCKET_EVENTS.CONNECT, () => {
      console.log('[Socket] Connected to server');
    });

    this.socket.on(SOCKET_EVENTS.DISCONNECT, (reason) => {
      console.log('[Socket] Disconnected:', reason);
    });

    this.socket.on(SOCKET_EVENTS.CONNECT_ERROR, (err) => {
      console.warn('[Socket] Connection error:', err.message);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  sendLocationUpdate(data: {
    latitude: number;
    longitude: number;
    altitude?: number;
    accuracy?: number;
    speed?: number;
    heading?: number;
    batteryLevel?: number;
    timestamp: string;
  }) {
    if (this.socket?.connected) {
      this.socket.emit(SOCKET_EVENTS.LOCATION_UPDATE, data);
    }
  }

  onJobAssigned(callback: (data: unknown) => void) {
    this.socket?.on(SOCKET_EVENTS.JOB_ASSIGNED, callback);
    return () => this.socket?.off(SOCKET_EVENTS.JOB_ASSIGNED, callback);
  }

  onJobUpdated(callback: (data: unknown) => void) {
    this.socket?.on(SOCKET_EVENTS.JOB_UPDATED, callback);
    return () => this.socket?.off(SOCKET_EVENTS.JOB_UPDATED, callback);
  }

  onGeofenceEnter(callback: (data: unknown) => void) {
    this.socket?.on(SOCKET_EVENTS.GEOFENCE_ENTER, callback);
    return () => this.socket?.off(SOCKET_EVENTS.GEOFENCE_ENTER, callback);
  }

  onGeofenceExit(callback: (data: unknown) => void) {
    this.socket?.on(SOCKET_EVENTS.GEOFENCE_EXIT, callback);
    return () => this.socket?.off(SOCKET_EVENTS.GEOFENCE_EXIT, callback);
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  getSocket(): Socket | null {
    return this.socket;
  }
}

export const socketService = new SocketService();
export default socketService;

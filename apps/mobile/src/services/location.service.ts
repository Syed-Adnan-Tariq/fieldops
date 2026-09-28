import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as Battery from 'expo-battery';
import { GPS_BACKGROUND_TASK_NAME, GPS_UPDATE_INTERVAL_MS } from '@fieldops/shared';
import socketService from './socket.service';

// --- Background Task Definition ---
// This must be defined at the module top level (not inside a function)
TaskManager.defineTask(
  GPS_BACKGROUND_TASK_NAME,
  async ({ data, error }: TaskManager.TaskManagerTaskBody<{ locations: Location.LocationObject[] }>) => {
    if (error) {
      console.error('[BGLocation] Task error:', error);
      return;
    }

    if (!data?.locations?.length) return;

    const location = data.locations[data.locations.length - 1];
    const { latitude, longitude, altitude, accuracy, speed, heading } = location.coords;

    let batteryLevel: number | undefined;
    try {
      const level = await Battery.getBatteryLevelAsync();
      batteryLevel = Math.round(level * 100);
    } catch {
      // Battery info not available
    }

    const payload = {
      latitude,
      longitude,
      altitude: altitude ?? undefined,
      accuracy: accuracy ?? undefined,
      speed: speed ?? undefined,
      heading: heading ?? undefined,
      batteryLevel,
      timestamp: new Date(location.timestamp).toISOString(),
    };

    // Send via socket (primary method - low latency)
    socketService.sendLocationUpdate(payload);
  },
);

class LocationService {
  private foregroundSubscription: Location.LocationSubscription | null = null;
  private foregroundInterval: ReturnType<typeof setInterval> | null = null;
  private lastLocation: Location.LocationObject | null = null;

  async requestPermissions(): Promise<boolean> {
    const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
    if (fgStatus !== 'granted') {
      console.warn('[Location] Foreground permission denied');
      return false;
    }

    const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
    if (bgStatus !== 'granted') {
      console.warn('[Location] Background permission denied - will use foreground only');
    }

    return true;
  }

  async startBackgroundTracking(): Promise<void> {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) return;

    const isAlreadyRegistered = await TaskManager.isTaskRegisteredAsync(
      GPS_BACKGROUND_TASK_NAME,
    );

    if (!isAlreadyRegistered) {
      await Location.startLocationUpdatesAsync(GPS_BACKGROUND_TASK_NAME, {
        accuracy: Location.Accuracy.High,
        timeInterval: GPS_UPDATE_INTERVAL_MS,
        distanceInterval: 5, // minimum 5 meters moved
        deferredUpdatesInterval: GPS_UPDATE_INTERVAL_MS,
        showsBackgroundLocationIndicator: true,
        foregroundService: {
          notificationTitle: 'FieldOps Tracking',
          notificationBody: 'Your location is being tracked while on duty',
          notificationColor: '#1D4ED8',
        },
        activityType: Location.ActivityType.AutomotiveNavigation,
        pausesUpdatesAutomatically: false,
      });
      console.log('[Location] Background tracking started');
    }
  }

  async stopBackgroundTracking(): Promise<void> {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(GPS_BACKGROUND_TASK_NAME);
    if (isRegistered) {
      await Location.stopLocationUpdatesAsync(GPS_BACKGROUND_TASK_NAME);
      console.log('[Location] Background tracking stopped');
    }
  }

  async startForegroundTracking(): Promise<void> {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) return;

    this.foregroundSubscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: GPS_UPDATE_INTERVAL_MS,
        distanceInterval: 5,
      },
      (location) => {
        this.lastLocation = location;
        this.sendLocationUpdate(location);
      },
    );
    console.log('[Location] Foreground tracking started');
  }

  stopForegroundTracking(): void {
    if (this.foregroundSubscription) {
      this.foregroundSubscription.remove();
      this.foregroundSubscription = null;
    }
    if (this.foregroundInterval) {
      clearInterval(this.foregroundInterval);
      this.foregroundInterval = null;
    }
    console.log('[Location] Foreground tracking stopped');
  }

  private async sendLocationUpdate(location: Location.LocationObject): Promise<void> {
    const { latitude, longitude, altitude, accuracy, speed, heading } =
      location.coords;

    let batteryLevel: number | undefined;
    try {
      const level = await Battery.getBatteryLevelAsync();
      batteryLevel = Math.round(level * 100);
    } catch {
      // Not available
    }

    socketService.sendLocationUpdate({
      latitude,
      longitude,
      altitude: altitude ?? undefined,
      accuracy: accuracy ?? undefined,
      speed: speed ?? undefined,
      heading: heading ?? undefined,
      batteryLevel,
      timestamp: new Date(location.timestamp).toISOString(),
    });
  }

  async getCurrentLocation(): Promise<Location.LocationObject | null> {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      this.lastLocation = location;
      return location;
    } catch (err) {
      console.error('[Location] Failed to get current location:', err);
      return null;
    }
  }

  getLastLocation(): Location.LocationObject | null {
    return this.lastLocation;
  }

  async isBackgroundTrackingActive(): Promise<boolean> {
    return TaskManager.isTaskRegisteredAsync(GPS_BACKGROUND_TASK_NAME);
  }
}

export const locationService = new LocationService();
export default locationService;

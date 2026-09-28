// =============================================================================
// Shared Constants
// =============================================================================

// --- Socket Event Names ---

export const SOCKET_EVENTS = {
  // Client → Server
  LOCATION_UPDATE: 'location:update',
  JOIN_WORKER_ROOM: 'worker:join',
  JOIN_ADMIN_ROOM: 'admin:join',

  // Server → Client
  LOCATION_BROADCAST: 'location:broadcast',
  JOB_ASSIGNED: 'job:assigned',
  JOB_UPDATED: 'job:updated',
  JOB_CANCELLED: 'job:cancelled',
  GEOFENCE_ENTER: 'geofence:enter',
  GEOFENCE_EXIT: 'geofence:exit',
  WORKER_STATUS_CHANGED: 'worker:status_changed',

  // Connection lifecycle
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  ERROR: 'error',
  CONNECT_ERROR: 'connect_error',
} as const;

export type SocketEventName = (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS];

// --- Job Status Transitions ---

export const JOB_STATUS_TRANSITIONS: Record<string, string[]> = {
  pending: ['assigned', 'cancelled'],
  assigned: ['dispatched', 'cancelled'],
  dispatched: ['in_progress', 'cancelled'],
  in_progress: ['on_site', 'completed', 'failed', 'cancelled'],
  on_site: ['in_progress', 'completed', 'failed'],
  completed: [],
  cancelled: [],
  failed: ['pending'],
};

// --- Job Priority Levels ---

export const JOB_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;
export type JobPriority = (typeof JOB_PRIORITIES)[number];

export const JOB_PRIORITY_COLORS: Record<string, string> = {
  low: '#6B7280',
  medium: '#3B82F6',
  high: '#F59E0B',
  urgent: '#EF4444',
};

// --- Worker Status ---

export const WORKER_STATUS_COLORS: Record<string, string> = {
  available: '#10B981',
  busy: '#F59E0B',
  offline: '#6B7280',
  on_break: '#8B5CF6',
};

// --- GPS Tracking ---

export const GPS_UPDATE_INTERVAL_MS = 5000; // 5 seconds
export const GPS_ACCURACY_THRESHOLD_METERS = 50;
export const GPS_BACKGROUND_TASK_NAME = 'FIELDOPS_BACKGROUND_LOCATION';

// --- Geofence ---

export const GEOFENCE_MIN_RADIUS_METERS = 10;
export const GEOFENCE_MAX_RADIUS_METERS = 10000;

// --- Pagination ---

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// --- Auth ---

export const ACCESS_TOKEN_EXPIRES_IN = '15m';
export const REFRESH_TOKEN_EXPIRES_IN = '7d';
export const ACCESS_TOKEN_EXPIRES_SECONDS = 15 * 60; // 900 seconds
export const REFRESH_TOKEN_EXPIRES_SECONDS = 7 * 24 * 60 * 60; // 604800 seconds

// --- BullMQ Queue Names ---

export const QUEUE_NAMES = {
  JOB_DISPATCH: 'job-dispatch',
  NOTIFICATIONS: 'notifications',
  REPORTS: 'reports',
  GEOFENCE_CHECK: 'geofence-check',
} as const;

// --- API Endpoints ---

export const API_ROUTES = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    REFRESH: '/auth/refresh',
    LOGOUT: '/auth/logout',
    ME: '/auth/me',
  },
  USERS: {
    BASE: '/users',
    BY_ID: (id: string) => `/users/${id}`,
    WORKERS: '/users/workers',
  },
  JOBS: {
    BASE: '/jobs',
    BY_ID: (id: string) => `/jobs/${id}`,
    ASSIGN: (id: string) => `/jobs/${id}/assign`,
    DISPATCH: (id: string) => `/jobs/${id}/dispatch`,
    STATUS: (id: string) => `/jobs/${id}/status`,
    NOTES: (id: string) => `/jobs/${id}/notes`,
    ATTACHMENTS: (id: string) => `/jobs/${id}/attachments`,
    SIGNATURE: (id: string) => `/jobs/${id}/signature`,
  },
  TRACKING: {
    LOCATIONS: '/tracking/locations',
    WORKER_HISTORY: (workerId: string) => `/tracking/workers/${workerId}/history`,
    LIVE: '/tracking/live',
  },
  GEOFENCES: {
    BASE: '/geofences',
    BY_ID: (id: string) => `/geofences/${id}`,
    CHECKINS: '/geofences/checkins',
  },
  ROUTES: {
    BASE: '/routes',
    OPTIMIZE: '/routes/optimize',
    BY_ID: (id: string) => `/routes/${id}`,
  },
  REPORTS: {
    MILEAGE: '/reports/mileage',
    JOB_COMPLETION: '/reports/job-completion',
    TIMESHEET: '/reports/timesheet',
    ON_SITE_TIME: '/reports/on-site-time',
  },
  HEALTH: '/health',
} as const;

// --- Map ---

export const MAP_DEFAULT_CENTER: [number, number] = [-87.6298, 41.8781]; // Chicago
export const MAP_DEFAULT_ZOOM = 11;
export const MAP_MAX_ZOOM = 20;
export const MAP_MIN_ZOOM = 3;

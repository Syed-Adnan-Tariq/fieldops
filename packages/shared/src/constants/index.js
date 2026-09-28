"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAP_MIN_ZOOM = exports.MAP_MAX_ZOOM = exports.MAP_DEFAULT_ZOOM = exports.MAP_DEFAULT_CENTER = exports.API_ROUTES = exports.QUEUE_NAMES = exports.REFRESH_TOKEN_EXPIRES_SECONDS = exports.ACCESS_TOKEN_EXPIRES_SECONDS = exports.REFRESH_TOKEN_EXPIRES_IN = exports.ACCESS_TOKEN_EXPIRES_IN = exports.MAX_PAGE_SIZE = exports.DEFAULT_PAGE_SIZE = exports.GEOFENCE_MAX_RADIUS_METERS = exports.GEOFENCE_MIN_RADIUS_METERS = exports.GPS_BACKGROUND_TASK_NAME = exports.GPS_ACCURACY_THRESHOLD_METERS = exports.GPS_UPDATE_INTERVAL_MS = exports.WORKER_STATUS_COLORS = exports.JOB_PRIORITY_COLORS = exports.JOB_PRIORITIES = exports.JOB_STATUS_TRANSITIONS = exports.SOCKET_EVENTS = void 0;
exports.SOCKET_EVENTS = {
    LOCATION_UPDATE: 'location:update',
    JOIN_WORKER_ROOM: 'worker:join',
    JOIN_ADMIN_ROOM: 'admin:join',
    LOCATION_BROADCAST: 'location:broadcast',
    JOB_ASSIGNED: 'job:assigned',
    JOB_UPDATED: 'job:updated',
    JOB_CANCELLED: 'job:cancelled',
    GEOFENCE_ENTER: 'geofence:enter',
    GEOFENCE_EXIT: 'geofence:exit',
    WORKER_STATUS_CHANGED: 'worker:status_changed',
    CONNECT: 'connect',
    DISCONNECT: 'disconnect',
    ERROR: 'error',
    CONNECT_ERROR: 'connect_error',
};
exports.JOB_STATUS_TRANSITIONS = {
    pending: ['assigned', 'cancelled'],
    assigned: ['dispatched', 'cancelled'],
    dispatched: ['in_progress', 'cancelled'],
    in_progress: ['on_site', 'completed', 'failed', 'cancelled'],
    on_site: ['in_progress', 'completed', 'failed'],
    completed: [],
    cancelled: [],
    failed: ['pending'],
};
exports.JOB_PRIORITIES = ['low', 'medium', 'high', 'urgent'];
exports.JOB_PRIORITY_COLORS = {
    low: '#6B7280',
    medium: '#3B82F6',
    high: '#F59E0B',
    urgent: '#EF4444',
};
exports.WORKER_STATUS_COLORS = {
    available: '#10B981',
    busy: '#F59E0B',
    offline: '#6B7280',
    on_break: '#8B5CF6',
};
exports.GPS_UPDATE_INTERVAL_MS = 5000;
exports.GPS_ACCURACY_THRESHOLD_METERS = 50;
exports.GPS_BACKGROUND_TASK_NAME = 'FIELDOPS_BACKGROUND_LOCATION';
exports.GEOFENCE_MIN_RADIUS_METERS = 10;
exports.GEOFENCE_MAX_RADIUS_METERS = 10000;
exports.DEFAULT_PAGE_SIZE = 20;
exports.MAX_PAGE_SIZE = 100;
exports.ACCESS_TOKEN_EXPIRES_IN = '15m';
exports.REFRESH_TOKEN_EXPIRES_IN = '7d';
exports.ACCESS_TOKEN_EXPIRES_SECONDS = 15 * 60;
exports.REFRESH_TOKEN_EXPIRES_SECONDS = 7 * 24 * 60 * 60;
exports.QUEUE_NAMES = {
    JOB_DISPATCH: 'job-dispatch',
    NOTIFICATIONS: 'notifications',
    REPORTS: 'reports',
    GEOFENCE_CHECK: 'geofence-check',
};
exports.API_ROUTES = {
    AUTH: {
        LOGIN: '/auth/login',
        REGISTER: '/auth/register',
        REFRESH: '/auth/refresh',
        LOGOUT: '/auth/logout',
        ME: '/auth/me',
    },
    USERS: {
        BASE: '/users',
        BY_ID: (id) => `/users/${id}`,
        WORKERS: '/users/workers',
    },
    JOBS: {
        BASE: '/jobs',
        BY_ID: (id) => `/jobs/${id}`,
        ASSIGN: (id) => `/jobs/${id}/assign`,
        DISPATCH: (id) => `/jobs/${id}/dispatch`,
        STATUS: (id) => `/jobs/${id}/status`,
        NOTES: (id) => `/jobs/${id}/notes`,
        ATTACHMENTS: (id) => `/jobs/${id}/attachments`,
        SIGNATURE: (id) => `/jobs/${id}/signature`,
    },
    TRACKING: {
        LOCATIONS: '/tracking/locations',
        WORKER_HISTORY: (workerId) => `/tracking/workers/${workerId}/history`,
        LIVE: '/tracking/live',
    },
    GEOFENCES: {
        BASE: '/geofences',
        BY_ID: (id) => `/geofences/${id}`,
        CHECKINS: '/geofences/checkins',
    },
    ROUTES: {
        BASE: '/routes',
        OPTIMIZE: '/routes/optimize',
        BY_ID: (id) => `/routes/${id}`,
    },
    REPORTS: {
        MILEAGE: '/reports/mileage',
        JOB_COMPLETION: '/reports/job-completion',
        TIMESHEET: '/reports/timesheet',
        ON_SITE_TIME: '/reports/on-site-time',
    },
    HEALTH: '/health',
};
exports.MAP_DEFAULT_CENTER = [-87.6298, 41.8781];
exports.MAP_DEFAULT_ZOOM = 11;
exports.MAP_MAX_ZOOM = 20;
exports.MAP_MIN_ZOOM = 3;
//# sourceMappingURL=index.js.map
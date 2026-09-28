export declare const SOCKET_EVENTS: {
    readonly LOCATION_UPDATE: "location:update";
    readonly JOIN_WORKER_ROOM: "worker:join";
    readonly JOIN_ADMIN_ROOM: "admin:join";
    readonly LOCATION_BROADCAST: "location:broadcast";
    readonly JOB_ASSIGNED: "job:assigned";
    readonly JOB_UPDATED: "job:updated";
    readonly JOB_CANCELLED: "job:cancelled";
    readonly GEOFENCE_ENTER: "geofence:enter";
    readonly GEOFENCE_EXIT: "geofence:exit";
    readonly WORKER_STATUS_CHANGED: "worker:status_changed";
    readonly CONNECT: "connect";
    readonly DISCONNECT: "disconnect";
    readonly ERROR: "error";
    readonly CONNECT_ERROR: "connect_error";
};
export type SocketEventName = (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS];
export declare const JOB_STATUS_TRANSITIONS: Record<string, string[]>;
export declare const JOB_PRIORITIES: readonly ["low", "medium", "high", "urgent"];
export type JobPriority = (typeof JOB_PRIORITIES)[number];
export declare const JOB_PRIORITY_COLORS: Record<string, string>;
export declare const WORKER_STATUS_COLORS: Record<string, string>;
export declare const GPS_UPDATE_INTERVAL_MS = 5000;
export declare const GPS_ACCURACY_THRESHOLD_METERS = 50;
export declare const GPS_BACKGROUND_TASK_NAME = "FIELDOPS_BACKGROUND_LOCATION";
export declare const GEOFENCE_MIN_RADIUS_METERS = 10;
export declare const GEOFENCE_MAX_RADIUS_METERS = 10000;
export declare const DEFAULT_PAGE_SIZE = 20;
export declare const MAX_PAGE_SIZE = 100;
export declare const ACCESS_TOKEN_EXPIRES_IN = "15m";
export declare const REFRESH_TOKEN_EXPIRES_IN = "7d";
export declare const ACCESS_TOKEN_EXPIRES_SECONDS: number;
export declare const REFRESH_TOKEN_EXPIRES_SECONDS: number;
export declare const QUEUE_NAMES: {
    readonly JOB_DISPATCH: "job-dispatch";
    readonly NOTIFICATIONS: "notifications";
    readonly REPORTS: "reports";
    readonly GEOFENCE_CHECK: "geofence-check";
};
export declare const API_ROUTES: {
    readonly AUTH: {
        readonly LOGIN: "/auth/login";
        readonly REGISTER: "/auth/register";
        readonly REFRESH: "/auth/refresh";
        readonly LOGOUT: "/auth/logout";
        readonly ME: "/auth/me";
    };
    readonly USERS: {
        readonly BASE: "/users";
        readonly BY_ID: (id: string) => string;
        readonly WORKERS: "/users/workers";
    };
    readonly JOBS: {
        readonly BASE: "/jobs";
        readonly BY_ID: (id: string) => string;
        readonly ASSIGN: (id: string) => string;
        readonly DISPATCH: (id: string) => string;
        readonly STATUS: (id: string) => string;
        readonly NOTES: (id: string) => string;
        readonly ATTACHMENTS: (id: string) => string;
        readonly SIGNATURE: (id: string) => string;
    };
    readonly TRACKING: {
        readonly LOCATIONS: "/tracking/locations";
        readonly WORKER_HISTORY: (workerId: string) => string;
        readonly LIVE: "/tracking/live";
    };
    readonly GEOFENCES: {
        readonly BASE: "/geofences";
        readonly BY_ID: (id: string) => string;
        readonly CHECKINS: "/geofences/checkins";
    };
    readonly ROUTES: {
        readonly BASE: "/routes";
        readonly OPTIMIZE: "/routes/optimize";
        readonly BY_ID: (id: string) => string;
    };
    readonly REPORTS: {
        readonly MILEAGE: "/reports/mileage";
        readonly JOB_COMPLETION: "/reports/job-completion";
        readonly TIMESHEET: "/reports/timesheet";
        readonly ON_SITE_TIME: "/reports/on-site-time";
    };
    readonly HEALTH: "/health";
};
export declare const MAP_DEFAULT_CENTER: [number, number];
export declare const MAP_DEFAULT_ZOOM = 11;
export declare const MAP_MAX_ZOOM = 20;
export declare const MAP_MIN_ZOOM = 3;

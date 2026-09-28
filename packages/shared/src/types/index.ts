// =============================================================================
// Shared TypeScript Types & Interfaces
// =============================================================================

// --- Enums ---

export enum UserRole {
  ADMIN = 'admin',
  WORKER = 'worker',
}

export enum JobStatus {
  PENDING = 'pending',
  ASSIGNED = 'assigned',
  DISPATCHED = 'dispatched',
  IN_PROGRESS = 'in_progress',
  ON_SITE = 'on_site',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  FAILED = 'failed',
}

export enum WorkerStatus {
  AVAILABLE = 'available',
  BUSY = 'busy',
  OFFLINE = 'offline',
  ON_BREAK = 'on_break',
}

export enum GeofenceType {
  CIRCLE = 'circle',
  POLYGON = 'polygon',
}

export enum CheckInEventType {
  CHECK_IN = 'check_in',
  CHECK_OUT = 'check_out',
}

// --- Coordinates ---

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface CoordinatesWithAltitude extends Coordinates {
  altitude?: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
}

// --- User / Worker ---

export interface UserBase {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  phone?: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminUser extends UserBase {
  role: UserRole.ADMIN;
}

export enum TransportMode {
  ON_FOOT = 'on_foot',
  BICYCLE = 'bicycle',
  VEHICLE = 'vehicle',
}

export interface WorkerUser extends UserBase {
  role: UserRole.WORKER;
  status: WorkerStatus;
  transportMode?: TransportMode;
  vehicleId?: string;
  currentLocation?: Coordinates;
  lastSeenAt?: string;
}

export type User = AdminUser | WorkerUser;

// --- Location ---

export interface LocationRecord {
  id: string;
  workerId: string;
  latitude: number;
  longitude: number;
  altitude?: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
  batteryLevel?: number;
  timestamp: string;
}

export interface LiveLocationUpdate {
  workerId: string;
  workerName: string;
  latitude: number;
  longitude: number;
  altitude?: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
  batteryLevel?: number;
  status: WorkerStatus;
  timestamp: string;
}

// --- Job ---

export interface JobAddress {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  latitude?: number;
  longitude?: number;
}

export interface JobNote {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
}

export interface JobAttachment {
  id: string;
  filename: string;
  url: string;
  mimeType: string;
  size: number;
  uploadedBy: string;
  uploadedAt: string;
}

export interface JobSignature {
  id: string;
  signerName: string;
  signatureDataUrl: string;
  capturedAt: string;
  capturedBy: string;
}

export interface Job {
  id: string;
  title: string;
  description?: string;
  status: JobStatus;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedWorkerId?: string;
  assignedWorker?: Pick<WorkerUser, 'id' | 'firstName' | 'lastName' | 'email' | 'phone'>;
  createdById: string;
  address: JobAddress;
  scheduledStartAt?: string;
  scheduledEndAt?: string;
  actualStartAt?: string;
  actualEndAt?: string;
  estimatedDurationMinutes?: number;
  notes: JobNote[];
  attachments: JobAttachment[];
  signature?: JobSignature;
  geofenceId?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

// --- Route ---

export interface RouteStop {
  jobId: string;
  order: number;
  address: JobAddress;
  coordinates: Coordinates;
  estimatedArrivalAt?: string;
  estimatedDurationMinutes?: number;
}

export interface Route {
  id: string;
  workerId: string;
  stops: RouteStop[];
  totalDistanceMeters: number;
  totalDurationSeconds: number;
  optimizedPolyline?: string;
  mapboxRouteId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OptimizeRouteRequest {
  workerId: string;
  jobIds: string[];
  startCoordinates: Coordinates;
  endCoordinates?: Coordinates;
}

export interface OptimizeRouteResponse {
  route: Route;
  orderedStops: RouteStop[];
  totalDistanceMeters: number;
  totalDurationSeconds: number;
  polyline: string;
}

// --- Geofence ---

export interface GeofenceCircle {
  type: GeofenceType.CIRCLE;
  center: Coordinates;
  radiusMeters: number;
}

export interface GeofencePolygon {
  type: GeofenceType.POLYGON;
  coordinates: Coordinates[];
}

export type GeofenceGeometry = GeofenceCircle | GeofencePolygon;

export interface Geofence {
  id: string;
  name: string;
  description?: string;
  geometry: GeofenceGeometry;
  jobId?: string;
  isActive: boolean;
  triggerOnEnter: boolean;
  triggerOnExit: boolean;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

// --- Check-in / Check-out ---

export interface CheckIn {
  id: string;
  workerId: string;
  geofenceId: string;
  geofenceName: string;
  jobId?: string;
  eventType: CheckInEventType;
  location: Coordinates;
  timestamp: string;
}

// --- Reports ---

export interface MileageReport {
  workerId: string;
  workerName: string;
  periodStart: string;
  periodEnd: string;
  totalDistanceMeters: number;
  totalDistanceMiles: number;
  totalDistanceKm: number;
  tripCount: number;
}

export interface JobCompletionReport {
  periodStart: string;
  periodEnd: string;
  totalJobs: number;
  completedJobs: number;
  cancelledJobs: number;
  failedJobs: number;
  completionRate: number;
  averageDurationMinutes: number;
  byWorker: {
    workerId: string;
    workerName: string;
    assigned: number;
    completed: number;
    completionRate: number;
  }[];
}

export interface TimesheetEntry {
  workerId: string;
  workerName: string;
  date: string;
  checkInTime?: string;
  checkOutTime?: string;
  totalOnSiteMinutes: number;
  jobsCompleted: number;
}

export interface TimesheetReport {
  periodStart: string;
  periodEnd: string;
  entries: TimesheetEntry[];
}

export interface OnSiteTimeReport {
  workerId: string;
  workerName: string;
  jobId: string;
  jobTitle: string;
  geofenceId: string;
  geofenceName: string;
  checkInTime: string;
  checkOutTime?: string;
  durationMinutes?: number;
}

// --- API Responses ---

export interface ApiResponse<T> {
  data: T;
  message?: string;
  statusCode: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  search?: string;
}

// --- Auth ---

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  phone?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

// --- Socket Events (payload types) ---

export interface SocketLocationUpdate extends CoordinatesWithAltitude {
  workerId: string;
  batteryLevel?: number;
  timestamp: string;
}

export interface SocketJobAssigned {
  jobId: string;
  workerId: string;
  job: Job;
}

export interface SocketGeofenceEvent {
  workerId: string;
  geofenceId: string;
  geofenceName: string;
  jobId?: string;
  eventType: CheckInEventType;
  timestamp: string;
}

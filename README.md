# FieldOps - Field Operations Management Platform

A production-ready field operations management platform built with NestJS, Next.js 14, React Native/Expo, PostgreSQL + PostGIS, Redis, Socket.io, and BullMQ.

## Architecture

```
fieldops/
├── apps/
│   ├── api/          # NestJS backend API
│   ├── web/          # Next.js 14 admin dashboard
│   └── mobile/       # React Native / Expo worker app
└── packages/
    └── shared/       # Shared TypeScript types & constants
```

## Tech Stack

| Layer | Technology |
|---|---|
| Monorepo | Turborepo |
| Backend | NestJS 10, TypeScript, TypeORM |
| Database | PostgreSQL 15 + PostGIS |
| Cache / Queue | Redis 7, BullMQ |
| Real-time | Socket.io |
| Admin Web | Next.js 14, Tailwind CSS, Mapbox GL JS |
| Mobile | React Native + Expo SDK 50 |
| Auth | JWT (access 15m / refresh 7d) |
| Maps | Mapbox Optimization API |
| Containers | Docker + Docker Compose |

## Prerequisites

- Node.js >= 18
- Docker & Docker Compose
- npm >= 9
- Mapbox account (free tier works)

## Quick Start

### 1. Clone and install dependencies

```bash
git clone <your-repo>
cd fieldops
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and fill in:
- `MAPBOX_ACCESS_TOKEN` and `MAPBOX_SECRET_TOKEN` — get from [mapbox.com](https://www.mapbox.com/)
- `JWT_SECRET` — a random 32+ character string
- `JWT_REFRESH_SECRET` — a different random 32+ character string
- `NEXT_PUBLIC_MAPBOX_TOKEN` — same as `MAPBOX_ACCESS_TOKEN`

### 3. Start infrastructure with Docker Compose

```bash
# Start PostgreSQL + PostGIS and Redis
docker compose up postgres redis -d

# Wait for health checks to pass (usually 10-20 seconds)
docker compose ps
```

### 4. Start development servers

```bash
# Start all apps in development mode
npm run dev

# Or start individually:
cd apps/api && npm run dev       # API on :3001
cd apps/web && npm run dev       # Web on :3000
cd apps/mobile && npm start      # Expo dev server
```

### 5. Access the apps

| App | URL |
|---|---|
| Admin Web | http://localhost:3000 |
| API | http://localhost:3001 |
| Swagger Docs | http://localhost:3001/api/docs |
| Health Check | http://localhost:3001/api/v1/health |

## Production Deployment

### Full Docker Compose deployment

```bash
# Build and start all services
docker compose up --build -d

# View logs
docker compose logs -f api
docker compose logs -f web
```

### Environment variables for production

Update `.env`:
```env
NODE_ENV=production
DB_SSL=true
JWT_SECRET=<secure-random-string-32-chars>
JWT_REFRESH_SECRET=<another-secure-random-string>
CORS_ORIGINS=https://your-admin-domain.com
```

## API Documentation

The full API is documented with Swagger at `/api/docs` when running.

### Key endpoints

```
POST   /api/v1/auth/login           # Login
POST   /api/v1/auth/register        # Register
POST   /api/v1/auth/refresh         # Refresh tokens
GET    /api/v1/auth/me              # Current user

GET    /api/v1/users                # List users (admin)
GET    /api/v1/users/workers        # List workers (admin)

GET    /api/v1/jobs                 # List jobs
POST   /api/v1/jobs                 # Create job (admin)
PATCH  /api/v1/jobs/:id/status      # Update status
POST   /api/v1/jobs/:id/assign      # Assign worker (admin)
POST   /api/v1/jobs/:id/dispatch    # Dispatch to worker (admin)
POST   /api/v1/jobs/:id/signature   # Capture signature (worker)
POST   /api/v1/jobs/:id/notes       # Add note

GET    /api/v1/tracking/live        # Live locations (admin)
GET    /api/v1/tracking/workers/:id/history  # Location history

GET    /api/v1/geofences            # List geofences
POST   /api/v1/geofences            # Create geofence (admin)
GET    /api/v1/geofences/checkins   # Check-in/out events

POST   /api/v1/routes/optimize      # Optimize route (admin)
GET    /api/v1/routes/my-route      # Worker's current route

GET    /api/v1/reports/mileage      # Mileage report
GET    /api/v1/reports/job-completion  # Job stats
GET    /api/v1/reports/timesheet    # Timesheet
GET    /api/v1/reports/on-site-time # On-site duration
```

## WebSocket Events

Connect to the WebSocket server with a JWT token in `auth.token`.

### Worker → Server
| Event | Payload | Description |
|---|---|---|
| `location:update` | `{latitude, longitude, accuracy, speed, heading, batteryLevel, timestamp}` | Send GPS update every 5s |

### Server → Worker
| Event | Payload | Description |
|---|---|---|
| `job:assigned` | `{jobId, workerId, job}` | New job assigned to worker |
| `job:updated` | `Job` | Job status/details updated |
| `geofence:enter` | `{workerId, geofenceId, geofenceName, timestamp}` | Worker entered geofence |
| `geofence:exit` | `{workerId, geofenceId, geofenceName, timestamp}` | Worker exited geofence |

### Server → Admin Room
| Event | Payload | Description |
|---|---|---|
| `location:broadcast` | `LiveLocationUpdate` | Real-time worker position |
| `job:updated` | `Job` | Any job status change |
| `geofence:enter` / `geofence:exit` | geofence event | Worker geofence events |

## Features

### 1. Auth
- JWT login/register with bcrypt password hashing
- Access tokens (15 min) + refresh tokens (7 days)
- Admin and Worker roles with role-based guards

### 2. Real-time GPS Tracking
- Workers send location updates every 5 seconds via Socket.io
- Live map shows all worker positions with real-time updates
- Location history stored in PostgreSQL for reporting

### 3. Job Management
- Full lifecycle: Pending → Assigned → Dispatched → In Progress → On Site → Completed
- BullMQ queue for job dispatch notifications
- Notes, attachments, signature capture
- Assign jobs to workers, dispatch via socket

### 4. Route Optimization
- Integrates with Mapbox Optimization API
- Calculates optimal routes for multiple job stops
- Returns ordered stops with estimated arrival times and encoded polyline

### 5. Geofencing
- Polygon and circle geofences
- Auto check-in / check-out when worker enters / exits zones
- Ray-casting algorithm for polygon containment, Haversine for circles
- Real-time socket events on geofence transitions

### 6. Worker Management
- CRUD workers, view current status and live location
- Status: Available, Busy, Offline, On Break
- Vehicle ID tracking

### 7. Reporting
- Mileage report (per worker, per period)
- Job completion rates and average duration
- Timesheet aggregation from geofence check-ins
- On-site time reports

### 8. Mobile Worker App (Expo)
- Background GPS with `expo-location` task manager
- Persistent socket connection for real-time job updates
- Signature capture with SVG drawing
- Photo capture with camera + library picker
- Offline-resilient with Zustand persist + AsyncStorage

## Database Schema

Key tables (auto-created by TypeORM sync in development):
- `users` — admins + workers
- `jobs` — job records with JSONB notes/attachments/signature
- `locations` — GPS history (indexed on workerId + timestamp)
- `geofences` — polygon/circle zones
- `checkins` — geofence entry/exit events
- `routes` — optimized route records

## Development Notes

- TypeORM `synchronize: true` is enabled in development — do NOT use in production. Run migrations instead.
- The `@fieldops/shared` package is symlinked via npm workspaces — changes are immediately available to all apps.
- Socket.io requires JWT auth on connect — unauthenticated connections are rejected.
- Geofence checks are done in-process (not PostGIS ST_Contains) for simplicity. For high-volume deployments, migrate to PostGIS spatial queries.

## Mobile App Setup

```bash
cd apps/mobile
npm install

# Update API URL in .env or app.json extra config
# For physical device testing, use your machine's LAN IP
# e.g., EXPO_PUBLIC_API_URL=http://192.168.1.100:3001

npx expo start
```

For background location on iOS, you must build a standalone app (not Expo Go):
```bash
npx eas build --platform ios --profile development
```

## License

MIT

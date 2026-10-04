FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package files and workspace files
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY packages/shared/package*.json ./packages/shared/

RUN npm ci

COPY packages/shared ./packages/shared
RUN cd packages/shared && npm run build

COPY apps/api ./apps/api
RUN cd apps/api && npm run build

# Production image
FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache curl

COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY packages/shared/package*.json ./packages/shared/

# Install production dependencies only inside the production stage
RUN npm ci --omit=dev

COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/apps/api/dist ./apps/api/dist

EXPOSE 3001

CMD ["node", "apps/api/dist/src/main"]
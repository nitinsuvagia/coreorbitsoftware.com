# Auth Service Dockerfile
FROM node:20-slim AS base

FROM base AS deps
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app

COPY package*.json ./
COPY packages/database/package*.json ./packages/database/
COPY packages/event-bus/package*.json ./packages/event-bus/
COPY packages/shared-types/package*.json ./packages/shared-types/
COPY packages/shared-utils/package*.json ./packages/shared-utils/
COPY packages/tenant-db-manager/package*.json ./packages/tenant-db-manager/
COPY services/auth-service/package*.json ./services/auth-service/

# Install all workspace dependencies
RUN npm ci

FROM base AS builder
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules

COPY package*.json ./
COPY tsconfig.base.json ./
COPY packages/database ./packages/database
COPY packages/event-bus ./packages/event-bus
COPY packages/shared-types ./packages/shared-types
COPY packages/shared-utils ./packages/shared-utils
COPY packages/tenant-db-manager ./packages/tenant-db-manager
COPY services/auth-service ./services/auth-service

# Build shared packages first
RUN cd packages/shared-types && npm run build
RUN cd packages/shared-utils && npm run build
RUN cd packages/event-bus && npm run build
RUN cd packages/tenant-db-manager && npm run build

# Generate Prisma clients
RUN cd packages/database && \
    npx prisma generate --schema=./prisma/master/schema.prisma && \
    npx prisma generate --schema=./prisma/tenant/schema.prisma

# Build database package AFTER prisma generate
RUN cd packages/database && npm run build

WORKDIR /app/services/auth-service
RUN npm run build

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Install OpenSSL for Prisma
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
RUN groupadd --system --gid 1001 nodejs
RUN useradd --system --uid 1001 appuser

COPY --from=builder /app/services/auth-service/dist ./dist
COPY --from=builder /app/services/auth-service/package*.json ./
COPY --from=builder /app/node_modules ./node_modules

# Copy built internal packages to node_modules to resolve @oms/* imports
COPY --from=builder /app/packages/database/dist ./node_modules/@oms/database/dist
COPY --from=builder /app/packages/database/package.json ./node_modules/@oms/database/
COPY --from=builder /app/packages/shared-types/dist ./node_modules/@oms/shared-types/dist
COPY --from=builder /app/packages/shared-types/package.json ./node_modules/@oms/shared-types/
COPY --from=builder /app/packages/shared-utils/dist ./node_modules/@oms/shared-utils/dist
COPY --from=builder /app/packages/shared-utils/package.json ./node_modules/@oms/shared-utils/
COPY --from=builder /app/packages/event-bus/dist ./node_modules/@oms/event-bus/dist
COPY --from=builder /app/packages/event-bus/package.json ./node_modules/@oms/event-bus/
COPY --from=builder /app/packages/tenant-db-manager/dist ./node_modules/@oms/tenant-db-manager/dist
COPY --from=builder /app/packages/tenant-db-manager/package.json ./node_modules/@oms/tenant-db-manager/

# Copy Prisma generated clients (from workspace root node_modules)
COPY --from=builder /app/node_modules/.prisma/master-client ./node_modules/.prisma/master-client
COPY --from=builder /app/node_modules/.prisma/tenant-client ./node_modules/.prisma/tenant-client

USER appuser

EXPOSE 3001

CMD ["node", "dist/index.js"]

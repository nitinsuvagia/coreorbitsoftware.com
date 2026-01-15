# Billing Service Dockerfile
FROM node:20-alpine AS base

FROM base AS deps
RUN apk add --no-cache libc6-compat ca-certificates
WORKDIR /app

COPY package*.json ./
COPY packages/database/package*.json ./packages/database/
COPY packages/event-bus/package*.json ./packages/event-bus/
COPY packages/shared-types/package*.json ./packages/shared-types/
COPY packages/shared-utils/package*.json ./packages/shared-utils/
COPY packages/tenant-db-manager/package*.json ./packages/tenant-db-manager/
COPY services/billing-service/package*.json ./services/billing-service/

RUN npm ci --workspace=packages/database --workspace=packages/event-bus --workspace=packages/shared-types --workspace=packages/shared-utils --workspace=packages/tenant-db-manager --workspace=services/billing-service

FROM base AS builder
RUN apk add --no-cache ca-certificates
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules

COPY package*.json ./
COPY tsconfig.base.json ./
COPY packages/database ./packages/database
COPY packages/event-bus ./packages/event-bus
COPY packages/shared-types ./packages/shared-types
COPY packages/shared-utils ./packages/shared-utils
COPY packages/tenant-db-manager ./packages/tenant-db-manager
COPY services/billing-service ./services/billing-service

RUN cd packages/shared-types && npm run build
RUN cd packages/shared-utils && npm run build
RUN cd packages/event-bus && npm run build
RUN cd packages/tenant-db-manager && npm run build

RUN cd packages/database && \
    npx prisma generate --schema=./prisma/master/schema.prisma && \
    npx prisma generate --schema=./prisma/tenant/schema.prisma

RUN cd packages/database && npm run build

WORKDIR /app/services/billing-service
RUN npm run build

# Use Debian slim for runner (Prisma compatibility)
FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

# Install openssl for Prisma
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid nodejs appuser

COPY --from=builder /app/services/billing-service/dist ./dist
COPY --from=builder /app/services/billing-service/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
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
COPY --from=builder /app/node_modules/.prisma/master-client ./node_modules/.prisma/master-client
COPY --from=builder /app/node_modules/.prisma/tenant-client ./node_modules/.prisma/tenant-client

USER appuser
EXPOSE 3006
CMD ["node", "dist/index.js"]

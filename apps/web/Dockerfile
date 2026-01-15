# Web App Dockerfile (Next.js)
FROM node:20-alpine AS base

FROM base AS deps
RUN apk add --no-cache gcompat || true
WORKDIR /app

COPY package*.json ./
COPY apps/web/package*.json ./apps/web/

RUN npm ci --workspace=apps/web

FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules

COPY package*.json ./
COPY tsconfig.base.json ./
COPY apps/web ./apps/web

WORKDIR /app/apps/web

ENV NEXT_TELEMETRY_DISABLED=1
# NEXT_PUBLIC_* variables must be set at build time for client-side code
ENV NEXT_PUBLIC_API_URL=http://localhost:4000

RUN npm run build

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/web/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
# In monorepo, standalone outputs to apps/web path
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Server.js is at apps/web/server.js in monorepo standalone output
CMD ["node", "apps/web/server.js"]

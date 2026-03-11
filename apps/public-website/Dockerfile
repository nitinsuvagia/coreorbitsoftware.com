# Public Website Dockerfile (Next.js)
FROM node:20-alpine AS base

FROM base AS deps
RUN apk add --no-cache gcompat || true
WORKDIR /app

COPY package*.json ./
COPY apps/public-website/package*.json ./apps/public-website/

RUN npm ci --workspace=apps/public-website

FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules

COPY package*.json ./
COPY tsconfig.base.json ./
COPY apps/public-website ./apps/public-website

WORKDIR /app/apps/public-website

ENV NEXT_TELEMETRY_DISABLED=1

# NEXT_PUBLIC_* variables must be set at build time for client-side code
ARG NEXT_PUBLIC_API_URL=http://localhost:4000
ARG NEXT_PUBLIC_MAIN_DOMAIN=localhost
ARG NEXT_PUBLIC_PORTAL_URL=http://localhost:3000

ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_MAIN_DOMAIN=${NEXT_PUBLIC_MAIN_DOMAIN}
ENV NEXT_PUBLIC_PORTAL_URL=${NEXT_PUBLIC_PORTAL_URL}

RUN npm run build

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/public-website/public ./apps/public-website/public

# Set the correct permission for prerender cache
RUN mkdir -p apps/public-website/.next
RUN chown nextjs:nodejs apps/public-website/.next

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/apps/public-website/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/public-website/.next/static ./apps/public-website/.next/static

USER nextjs

EXPOSE 3100

ENV PORT=3100
ENV HOSTNAME="0.0.0.0"

CMD ["node", "apps/public-website/server.js"]

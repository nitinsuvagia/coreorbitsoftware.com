# Local Development Setup

Fast development workflow without Docker rebuilds.

## Quick Start

```bash
# Start all services
./dev-services.sh start

# Check status
./dev-services.sh status

# View logs
./dev-services.sh logs

# Restart all services
./dev-services.sh restart

# Stop all services
./dev-services.sh stop
```

## Services Running Locally

| Port | Service | Purpose |
|------|---------|---------|
| 3000 | API Gateway | Main entry point, routes to microservices |
| 3001 | Auth Service | Authentication, platform admin |
| 3002 | Employee Service | Employee management |
| 3003 | Attendance Service | Attendance & leave tracking |
| 3004 | Project Service | Project & time tracking |
| 3005 | Task Service | Task management |
| 3006 | Notification Service | Email, WebSocket, in-app notifications |
| 3007 | Document Service | Document storage & management |
| 3008 | Billing Service | Subscription & usage billing |
| 3009 | Report Service | Analytics & reporting |

## Infrastructure (Docker)

| Port | Service | Command |
|------|---------|---------|
| 5432 | PostgreSQL | `docker compose up -d postgres` |
| 6379 | Redis | `docker compose up -d redis` |

## Development Workflow

### 1. Start Infrastructure
```bash
docker compose up -d postgres redis
```

### 2. Start Services
```bash
./dev-services.sh start
```

### 3. Start Frontend
```bash
cd apps/web
npm run dev
# Runs on http://localhost:3000
```

## Benefits

✅ **Instant Reload** - Changes reflect in seconds with `tsx watch`  
✅ **No Docker Rebuilds** - Save 5-10 minutes per change  
✅ **Real-time Logs** - See all service logs clearly  
✅ **Easy Debugging** - Set breakpoints, inspect variables  
✅ **Faster Iteration** - Fix bugs quickly

## Troubleshooting

### Port Already in Use
```bash
# Kill processes on occupied ports
./dev-services.sh stop

# Or manually
lsof -ti :3000,:3001,:3002,:3003,:3004,:3005,:3006,:3007,:3008,:3009 | xargs kill -9
```

### Service Won't Start
Check logs:
```bash
./dev-services.sh logs
```

### Database Connection Issues
Ensure PostgreSQL is running:
```bash
docker compose up -d postgres
docker compose logs postgres
```

### Clear Everything and Restart
```bash
./dev-services.sh stop
docker compose down
docker compose up -d postgres redis
./dev-services.sh start
```

## Environment Variables

All services read from `.env` in the workspace root.

Key variables:
- `MASTER_DATABASE_URL` - PostgreSQL connection
- `REDIS_URL` - Redis connection
- `JWT_SECRET` - Authentication secret
- Service ports (3000-3014)

## Service-Specific Commands

### Run Single Service
```bash
cd services/api-gateway
npm run dev
```

### Run Specific Services Only
```bash
# Only auth and notification
cd services/auth-service && npm run dev &
cd services/notification-service && npm run dev &
```

## Logs Location

All services: `/tmp/oms-services.log`

```bash
# Follow logs
tail -f /tmp/oms-services.log

# Search logs
grep "ERROR" /tmp/oms-services.log

# Clear logs
> /tmp/oms-services.log
```

## Testing Changes

### Website Field Bug Fix (Example)
1. Services auto-reload when code changes
2. Test the fix immediately at `http://localhost:3000/admin/tenants/[id]/edit`
3. No rebuild needed! ✅

### Email Templates
Templates are hot-reloaded from `services/notification-service/templates/`

### Database Changes
```bash
cd packages/database
npm run db:migrate
```

## Production Deployment

For production, still use Docker:
```bash
docker compose build
docker compose up -d
```

This local setup is **only for development**.

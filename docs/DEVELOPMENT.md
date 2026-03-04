# Development Environment Setup

This project supports **both Docker and Local development** with unified configuration.

## 🎯 Unified Configuration System

The project uses a **three-tier configuration system**:

1. **`.env`** - Shared configuration for both Docker and Local
2. **`.env.docker`** - Docker-specific overrides (service names: `postgres`, `redis`, etc.)
3. **`.env.local`** - Local development overrides (localhost connections)

### Key Differences

| Setting | Docker (`.env.docker`) | Local (`.env.local`) |
|---------|------------------------|----------------------|
| Database | `postgres:5432` | `localhost:5432` |
| Redis | `redis:6379` | `localhost:6379` |
| Auth Service | `http://auth-service:3001` | `http://localhost:3001` |
| Other Services | Docker service names | `localhost` |

## 🚀 Quick Start

### Option 1: Local Development (Fast, Hot Reload)

**Advantages:**
- ⚡ Instant hot reload
- 🐛 Easy debugging
- 🔧 Quick iterations
- 💾 Lower memory usage

**Start:**
```bash
./scripts/dev-local.sh
```

This will:
- Start PostgreSQL & Redis in Docker (infrastructure only)
- Run all microservices locally with `tsx watch`
- Start Next.js in development mode
- Use `.env.local` configuration

### Option 2: Docker Development (Production-like)

**Advantages:**
- 🎯 Production parity
- 🔒 Isolated environments
- 📦 Consistent across team
- ☁️ Includes LocalStack for AWS services

**Start:**
```bash
./scripts/dev-docker.sh
```

**Rebuild and start:**
```bash
./scripts/dev-docker.sh --build
```

This will:
- Build all Docker images
- Start all services in containers
- Use `.env.docker` configuration

### Stop All Services

```bash
./scripts/dev-stop.sh
```

## 📝 Configuration Files

### `.env` (Shared Base Configuration)
```env
NODE_ENV=development
APP_NAME="Office Management System"
JWT_SECRET=your-super-secret-jwt-key
# ... shared config
```

### `.env.local` (Local Development)
```env
# Overrides for local development
MASTER_DATABASE_URL=postgresql://postgres:password@localhost:5432/oms_master
REDIS_URL=redis://localhost:6379
AUTH_SERVICE_URL=http://localhost:3001
# ... localhost URLs
```

### `.env.docker` (Docker Development)
```env
# Overrides for Docker
MASTER_DATABASE_URL=postgresql://postgres:password@postgres:5432/oms_master
REDIS_URL=redis://redis:6379
AUTH_SERVICE_URL=http://auth-service:3001
# ... Docker service names
```

## 🔧 Manual Setup

### Local Development (Manual)

1. **Start infrastructure:**
   ```bash
   docker compose -f docker-compose.yml up -d postgres redis
   ```

2. **Generate Prisma clients:**
   ```bash
   cd packages/database
   npm run db:generate
   cd ../..
   ```

3. **Start services:**
   ```bash
   # Terminal 1 - API Gateway
   cd services/api-gateway && npx tsx watch src/index.ts
   
   # Terminal 2 - Auth Service
   cd services/auth-service && npx tsx watch src/index.ts
   
   # Terminal 3 - Web App
   cd apps/web && npm run dev
   
   # ... repeat for other services
   ```

### Docker Development (Manual)

```bash
# Build
docker compose -f docker-compose.yml build

# Start
docker compose -f docker-compose.yml up -d

# View logs
docker compose -f docker-compose.yml logs -f [service-name]

# Stop
docker compose -f docker-compose.yml down
```

## 🎯 Service Ports (Same in Both Environments!)

| Service | Port | URL |
|---------|------|-----|
| Web App | 3000 | http://localhost:3000 |
| API Gateway | 4000 | http://localhost:4000 |
| Auth Service | 3001 | http://localhost:3001 |
| Employee Service | 3002 | http://localhost:3002 |
| Attendance Service | 3003 | http://localhost:3003 |
| Project Service | 3004 | http://localhost:3004 |
| Task Service | 3005 | http://localhost:3005 |
| Billing Service | 3006 | http://localhost:3006 |
| Document Service | 3007 | http://localhost:3007 |
| Notification Service | 3008 | http://localhost:3008 |
| Report Service | 3009 | http://localhost:3009 |
| **Infrastructure** |  |  |
| PostgreSQL | 5432 | localhost:5432 |
| Redis | 6379 | localhost:6379 |
| LocalStack (Docker only) | 4566 | localhost:4566 |

## 🔄 Switching Between Environments

You can switch seamlessly:

```bash
# Stop current setup
./scripts/dev-stop.sh

# Start local
./scripts/dev-local.sh

# OR start Docker
./scripts/dev-docker.sh
```

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Find and kill process
lsof -ti :3000 | xargs kill -9

# Or stop all services
./scripts/dev-stop.sh
```

### Prisma Client Issues
```bash
cd packages/database
npm run db:generate
```

### Docker Build Fails
```bash
# Clean and rebuild
docker compose -f docker-compose.yml down -v
docker compose -f docker-compose.yml build --no-cache
```

### Database Connection Issues

**Local:**
- Ensure PostgreSQL Docker container is running: `docker ps | grep oms-postgres`
- Check `.env.local` has `localhost` as host

**Docker:**
- Check `.env.docker` has `postgres` as host
- Verify network: `docker network inspect office-management_oms-network`

## �️ Database Migrations

When modifying database schema (adding/removing fields, tables, indexes):

```bash
# 1. Update the schema file(s)
#    packages/database/prisma/master/schema.prisma   (platform tables)
#    packages/database/prisma/tenant/schema.prisma   (tenant tables)

# 2. Create and apply migration
./scripts/db-migrate.sh dev add_new_field_name

# 3. Commit the migration files
git add packages/database/prisma/*/migrations/
git commit -m "Add migration: add_new_field_name"
```

**Key Commands:**
- `./scripts/db-migrate.sh dev [name]` - Create new migration
- `./scripts/db-migrate.sh deploy` - Apply pending migrations (for production)
- `./scripts/db-migrate.sh status` - Check migration status
- `./scripts/db-migrate.sh generate` - Regenerate Prisma client only

📖 See [docs/DATABASE_MIGRATIONS.md](docs/DATABASE_MIGRATIONS.md) for full guide.

## 📚 Best Practices

1. **Daily Development:** Use **local mode** for fast iterations
2. **Testing Changes:** Switch to **Docker mode** before committing
3. **Never commit** `.env.local` or `.env.docker` with secrets
4. **Keep ports consistent** between both environments
5. **Use the helper scripts** for consistency
6. **Always use migrations** for database schema changes (never manual SQL)

## 🎓 Understanding the System

### Why This Approach?

**Before:** Separate configurations led to "works on my machine" issues

**Now:** Same codebase, same ports, same behavior - only connection endpoints differ

### Environment Resolution Order

1. Service reads `.env` (base configuration)
2. If running in Docker: overlays `.env.docker`
3. If running locally: overlays `.env.local`
4. Result: Correct configuration for the environment

### Network Architecture

**Local Development:**
```
Browser → localhost:3000 (Next.js)
       ↓
localhost:4000 (API Gateway) → localhost:3001 (Auth)
                              → localhost:3002 (Employee)
                              → localhost:5432 (Postgres in Docker)
                              → localhost:6379 (Redis in Docker)
```

**Docker Development:**
```
Browser → localhost:3000 (Next.js Container)
       ↓
api-gateway:4000 → auth-service:3001
                 → employee-service:3002
                 → postgres:5432
                 → redis:6379
```

## 🚨 Important Notes

- **Database & Redis** always run in Docker (even for local dev) for consistency
- **Ports are the same** in both environments for easy URL switching
- **Hot reload** works in local mode only
- **LocalStack** (AWS mock) only available in Docker mode
- **Same `.env` variables** work in both environments!

## 📞 Need Help?

- Check service health: `curl http://localhost:4000/health`
- View logs: `docker compose -f docker-compose.yml logs -f [service]`
- List running containers: `docker ps`
- Check ports: `lsof -i :3000,4000,3001`

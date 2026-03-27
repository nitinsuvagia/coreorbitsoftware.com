#!/bin/bash
# ============================================================================
# Deploy Daily Status Feature
# Run this script on your EC2 server after SSH
# ============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_step() {
    echo -e "\n${BLUE}▶ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Configuration
APP_DIR="${APP_DIR:-/opt/office-management}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-}"
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"

cd "$APP_DIR"

echo "=============================================="
echo "  Deploy: Pre-Aggregated Daily Status Table"
echo "=============================================="

print_step "Pulling latest changes..."
git pull origin main
print_success "Code updated"

# Skip npm install on host - Docker build handles dependencies
print_step "Skipping npm install (handled by Docker build)..."
print_success "Dependencies will be installed during Docker build"

print_step "Running migrations on tenant databases..."

# Check if running inside Docker or directly on host
if [ -f /.dockerenv ]; then
    # Inside Docker - use docker network hostname
    DB_HOST="postgres"
else
    # On host - use localhost or configured host
    DB_HOST="$POSTGRES_HOST"
fi

# Get tenant database names from master
if [ -n "$POSTGRES_PASSWORD" ]; then
    export PGPASSWORD="$POSTGRES_PASSWORD"
fi

TENANT_DBS=$(psql -h "$DB_HOST" -U "$POSTGRES_USER" -d oms_master -t -c \
    "SELECT CONCAT('oms_tenant_', slug) FROM tenants WHERE status='ACTIVE';" 2>/dev/null || echo "")

if [ -z "$TENANT_DBS" ]; then
    print_warning "Could not fetch tenant list. Trying via Docker..."
    TENANT_DBS=$(docker compose -f docker-compose.prod.yml exec -T postgres \
        psql -U postgres -d oms_master -t -c \
        "SELECT CONCAT('oms_tenant_', slug) FROM tenants WHERE status='ACTIVE';" 2>/dev/null || echo "")
fi

MIGRATION_SCRIPT="scripts/add-employee-daily-status.sql"

if [ -n "$TENANT_DBS" ]; then
    for db in $TENANT_DBS; do
        db=$(echo "$db" | xargs)  # trim whitespace
        if [ -n "$db" ]; then
            echo "  → Migrating $db"
            if [ -n "$POSTGRES_PASSWORD" ]; then
                psql -h "$DB_HOST" -U "$POSTGRES_USER" -d "$db" -f "$MIGRATION_SCRIPT" 2>/dev/null || \
                docker compose -f docker-compose.prod.yml exec -T postgres \
                    psql -U postgres -d "$db" -f "/app/$MIGRATION_SCRIPT"
            else
                docker compose -f docker-compose.prod.yml exec -T postgres \
                    psql -U postgres -d "$db" -f "/app/$MIGRATION_SCRIPT"
            fi
        fi
    done
    print_success "Database migrations complete"
else
    print_warning "No tenant databases found or could not connect. Run migration manually:"
    echo "  psql -d oms_tenant_yourslug -f $MIGRATION_SCRIPT"
fi

print_step "Rebuilding attendance-service..."
docker compose -f docker-compose.prod.yml build attendance-service --no-cache
print_success "Image built"

print_step "Restarting attendance-service..."
docker compose -f docker-compose.prod.yml up -d attendance-service
print_success "Service restarted"

print_step "Waiting for service to be healthy..."
sleep 10

# Check health
HEALTH=$(docker compose -f docker-compose.prod.yml exec -T attendance-service \
    wget -q -O- http://localhost:3003/health 2>/dev/null || echo '{"status":"unknown"}')
echo "  Health check: $HEALTH"

print_step "Checking cron job initialization..."
docker logs oms-attendance-service 2>&1 | grep -i "cron" | tail -3 || echo "  Check full logs for cron status"

echo ""
echo "=============================================="
print_success "Deployment complete!"
echo "=============================================="
echo ""
echo "Next steps:"
echo "  1. Backfill historical data (run once):"
echo "     POST /api/v1/attendance/admin/backfill"
echo "     Body: {\"from\": \"2024-01-01\", \"to\": \"$(date -d yesterday +%Y-%m-%d)\"}"
echo ""
echo "  2. Or run backfill via script:"
echo "     docker compose -f docker-compose.prod.yml exec attendance-service \\"
echo "       npx tsx scripts/backfill-daily-status.ts --from 2024-01-01"
echo ""
echo "  3. Verify logs:"
echo "     docker logs -f oms-attendance-service --tail=100"
echo ""

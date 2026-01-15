#!/bin/bash

# ============================================
# Office Management - Database Migration Script
# ============================================
# This script handles database migrations for both master and tenant databases
# 
# Usage:
#   ./scripts/db-migrate.sh dev         # Create new migration (development)
#   ./scripts/db-migrate.sh deploy      # Apply pending migrations (production/deploy)
#   ./scripts/db-migrate.sh status      # Check migration status
#   ./scripts/db-migrate.sh reset       # Reset database (DANGER: deletes all data)
#   ./scripts/db-migrate.sh generate    # Regenerate Prisma client only
# ============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
DATABASE_PACKAGE="$ROOT_DIR/packages/database"

# Load environment
if [ -f "$ROOT_DIR/.env.local" ]; then
    export $(cat "$ROOT_DIR/.env.local" | grep -v '^#' | xargs)
    echo -e "${BLUE}📋 Loaded .env.local${NC}"
elif [ -f "$ROOT_DIR/.env" ]; then
    export $(cat "$ROOT_DIR/.env" | grep -v '^#' | xargs)
    echo -e "${BLUE}📋 Loaded .env${NC}"
fi

# Set database URLs if not already set
export MASTER_DATABASE_URL="${MASTER_DATABASE_URL:-postgresql://postgres:password@localhost:5432/oms_master}"
export TENANT_DATABASE_URL="${TENANT_DATABASE_URL:-postgresql://postgres:password@localhost:5432/oms_tenant_template}"

print_usage() {
    echo -e "${BLUE}Database Migration Tool${NC}"
    echo ""
    echo "Usage: $0 <command> [options]"
    echo ""
    echo "Commands:"
    echo "  dev [name]     Create a new migration for development"
    echo "                 Example: $0 dev add_user_fields"
    echo ""
    echo "  deploy         Apply all pending migrations to the database"
    echo "                 Safe for production - only applies migrations, never creates new ones"
    echo ""
    echo "  status         Show current migration status"
    echo ""
    echo "  reset          Reset the database (WARNING: Deletes all data!)"
    echo ""
    echo "  generate       Regenerate Prisma client without touching the database"
    echo ""
    echo "  push           Sync schema to database without migrations (dev only)"
    echo ""
    echo "Options:"
    echo "  --master       Target master database only"
    echo "  --tenant       Target tenant database only"
    echo "  --help         Show this help message"
}

run_prisma_command() {
    local schema=$1
    local command=$2
    shift 2
    
    cd "$DATABASE_PACKAGE"
    npx prisma $command --schema="$schema" "$@"
}

migrate_dev() {
    local name=${1:-"update"}
    
    echo -e "${GREEN}🔄 Creating new migration: $name${NC}"
    echo ""
    
    echo -e "${YELLOW}📦 Master Database Migration${NC}"
    run_prisma_command "prisma/master/schema.prisma" "migrate dev" --name "$name"
    
    echo ""
    echo -e "${YELLOW}📦 Tenant Template Database Migration${NC}"
    run_prisma_command "prisma/tenant/schema.prisma" "migrate dev" --name "$name"
    
    echo ""
    echo -e "${GREEN}✅ Migration created and applied successfully!${NC}"
    echo ""
    echo -e "${BLUE}📝 Next steps:${NC}"
    echo "   1. Review the generated migration SQL files in prisma/*/migrations/"
    echo "   2. Commit the migration files to version control"
    echo "   3. For production, run: $0 deploy"
}

migrate_deploy() {
    echo -e "${GREEN}🚀 Deploying pending migrations${NC}"
    echo ""
    
    echo -e "${YELLOW}📦 Master Database${NC}"
    run_prisma_command "prisma/master/schema.prisma" "migrate deploy"
    
    echo ""
    echo -e "${YELLOW}📦 Tenant Template Database${NC}"
    run_prisma_command "prisma/tenant/schema.prisma" "migrate deploy"
    
    echo ""
    echo -e "${GREEN}✅ All migrations applied successfully!${NC}"
}

migrate_status() {
    echo -e "${BLUE}📊 Migration Status${NC}"
    echo ""
    
    echo -e "${YELLOW}📦 Master Database${NC}"
    run_prisma_command "prisma/master/schema.prisma" "migrate status" || true
    
    echo ""
    echo -e "${YELLOW}📦 Tenant Template Database${NC}"
    run_prisma_command "prisma/tenant/schema.prisma" "migrate status" || true
}

migrate_reset() {
    echo -e "${RED}⚠️  WARNING: This will delete ALL data in the database!${NC}"
    echo ""
    read -p "Are you sure you want to reset the database? (type 'yes' to confirm): " confirm
    
    if [ "$confirm" != "yes" ]; then
        echo "Aborted."
        exit 0
    fi
    
    echo ""
    echo -e "${YELLOW}📦 Resetting Master Database${NC}"
    run_prisma_command "prisma/master/schema.prisma" "migrate reset" --force
    
    echo ""
    echo -e "${YELLOW}📦 Resetting Tenant Template Database${NC}"
    run_prisma_command "prisma/tenant/schema.prisma" "migrate reset" --force
    
    echo ""
    echo -e "${GREEN}✅ Database reset complete!${NC}"
}

generate_client() {
    echo -e "${GREEN}🔧 Regenerating Prisma Client${NC}"
    echo ""
    
    run_prisma_command "prisma/master/schema.prisma" "generate"
    run_prisma_command "prisma/tenant/schema.prisma" "generate"
    
    echo ""
    echo -e "${GREEN}✅ Prisma client regenerated!${NC}"
}

db_push() {
    echo -e "${YELLOW}⚡ Syncing schema to database (without migrations)${NC}"
    echo -e "${RED}⚠️  Warning: This should only be used in development!${NC}"
    echo ""
    
    echo -e "${YELLOW}📦 Master Database${NC}"
    run_prisma_command "prisma/master/schema.prisma" "db push"
    
    echo ""
    echo -e "${YELLOW}📦 Tenant Template Database${NC}"
    run_prisma_command "prisma/tenant/schema.prisma" "db push"
    
    echo ""
    echo -e "${GREEN}✅ Schema synced!${NC}"
}

# Parse command
COMMAND=${1:-"help"}
shift || true

case $COMMAND in
    dev)
        migrate_dev "$@"
        ;;
    deploy)
        migrate_deploy
        ;;
    status)
        migrate_status
        ;;
    reset)
        migrate_reset
        ;;
    generate)
        generate_client
        ;;
    push)
        db_push
        ;;
    help|--help|-h)
        print_usage
        ;;
    *)
        echo -e "${RED}Unknown command: $COMMAND${NC}"
        echo ""
        print_usage
        exit 1
        ;;
esac

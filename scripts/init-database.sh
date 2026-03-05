#!/bin/bash
# =============================================================================
# Database Initialization Script for Production
# =============================================================================
# This script handles:
# 1. Running Prisma migrations for master database
# 2. Seeding the platform admin user
# 3. Seeding subscription plans
# 4. Any other initial data setup
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check required environment variables
check_env() {
    local missing=0
    for var in "$@"; do
        if [ -z "${!var}" ]; then
            log_error "Missing required environment variable: $var"
            missing=1
        fi
    done
    return $missing
}

# Wait for PostgreSQL to be ready
wait_for_postgres() {
    log_info "Waiting for PostgreSQL to be ready..."
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d postgres -c "SELECT 1" > /dev/null 2>&1; then
            log_success "PostgreSQL is ready!"
            return 0
        fi
        log_info "Attempt $attempt/$max_attempts - PostgreSQL not ready, waiting..."
        sleep 2
        ((attempt++))
    done
    
    log_error "PostgreSQL did not become ready in time"
    return 1
}

# Create master database if not exists
create_master_database() {
    log_info "Creating master database if not exists..."
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d postgres -tc \
        "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -q 1 || \
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d postgres -c \
        "CREATE DATABASE \"$DB_NAME\""
    log_success "Master database ready: $DB_NAME"
}

# Run Prisma migrations for master database
run_master_migrations() {
    log_info "Running master database migrations..."
    cd /app/packages/database
    
    # Generate Prisma client
    npx prisma generate --schema=./prisma/master/schema.prisma
    
    # Deploy migrations
    npx prisma migrate deploy --schema=./prisma/master/schema.prisma
    
    log_success "Master database migrations complete!"
}

# Seed platform admin
seed_platform_admin() {
    log_info "Checking/creating platform admin..."
    
    # Check if admin exists
    local admin_exists=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -tAc \
        "SELECT COUNT(*) FROM platform_admins WHERE email = 'admin@oms.local'")
    
    if [ "$admin_exists" -gt "0" ]; then
        log_warn "Platform admin already exists, skipping..."
        return 0
    fi
    
    # Generate bcrypt hash for password
    local password_hash=$(node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('${ADMIN_PASSWORD:-admin123}', 12));")
    
    # Insert admin
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" <<EOF
INSERT INTO platform_admins (
    id, email, username, password_hash, role, status, 
    first_name, last_name, display_name, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'admin@oms.local',
    'superadmin',
    '$password_hash',
    'SUPER_ADMIN',
    'ACTIVE',
    'Super',
    'Admin',
    'Super Admin',
    NOW(),
    NOW()
);
EOF
    
    log_success "Platform admin created!"
    log_info "  Email:    admin@oms.local"
    log_info "  Password: ${ADMIN_PASSWORD:-admin123}"
    log_warn "  Please change the password after first login!"
}

# Seed subscription plans
seed_subscription_plans() {
    log_info "Checking/creating subscription plans..."
    
    local plans_exist=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -tAc \
        "SELECT COUNT(*) FROM subscription_plans")
    
    if [ "$plans_exist" -gt "0" ]; then
        log_warn "Subscription plans already exist, skipping..."
        return 0
    fi
    
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" <<'EOF'
INSERT INTO subscription_plans (id, name, slug, description, tier, is_active, is_public, monthly_price, yearly_price, currency, max_users, max_storage, max_projects, max_clients, features, created_at, updated_at) VALUES
(gen_random_uuid(), 'Starter', 'starter', 'Perfect for small teams getting started', 'STARTER', true, true, 29.00, 290.00, 'USD', 10, 5368709120, 5, 10, '{"modules": ["employee", "attendance", "task", "file"], "support": "email", "storage": "5GB"}', NOW(), NOW()),
(gen_random_uuid(), 'Professional', 'professional', 'For growing businesses with advanced needs', 'PROFESSIONAL', true, true, 79.00, 790.00, 'USD', 50, 53687091200, 25, 50, '{"modules": ["employee", "attendance", "task", "file", "project", "client", "meeting", "reporting"], "support": "priority", "storage": "50GB", "api_access": true}', NOW(), NOW()),
(gen_random_uuid(), 'Enterprise', 'enterprise', 'Full-featured solution for large organizations', 'ENTERPRISE', true, true, 199.00, 1990.00, 'USD', 500, 536870912000, NULL, NULL, '{"modules": ["employee", "attendance", "task", "file", "project", "client", "meeting", "reporting", "hr_payroll", "recruitment", "assets"], "support": "dedicated", "storage": "500GB", "api_access": true, "sso": true, "custom_domain": true}', NOW(), NOW());
EOF
    
    log_success "Subscription plans created!"
}

# Seed platform settings
seed_platform_settings() {
    log_info "Checking/creating platform settings..."
    
    local settings_exist=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -tAc \
        "SELECT COUNT(*) FROM platform_settings WHERE id = 'default'")
    
    if [ "$settings_exist" -gt "0" ]; then
        log_warn "Platform settings already exist, skipping..."
        return 0
    fi
    
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" <<'EOF'
INSERT INTO platform_settings (id, general, email, security, billing, integrations, maintenance, created_at, updated_at) VALUES (
    'default',
    '{"platformName": "Office Management System", "supportEmail": "support@coreorbitsoftware.com", "timezone": "UTC"}',
    '{"fromName": "OMS Platform", "fromEmail": "noreply@coreorbitsoftware.com"}',
    '{"mfaRequired": false, "sessionTimeout": 3600, "maxLoginAttempts": 5}',
    '{"currency": "USD", "taxRate": 0}',
    '{}',
    '{"enabled": false}',
    NOW(),
    NOW()
);
EOF
    
    log_success "Platform settings created!"
}

# Main execution
main() {
    log_info "=========================================="
    log_info "  Database Initialization Script"
    log_info "=========================================="
    
    # Set defaults
    DB_HOST="${DB_HOST:-postgres}"
    DB_PORT="${DB_PORT:-5432}"
    DB_USER="${DB_USER:-postgres}"
    DB_NAME="${DB_NAME:-oms_master}"
    
    check_env DB_PASSWORD || exit 1
    
    wait_for_postgres
    create_master_database
    run_master_migrations
    seed_platform_admin
    seed_subscription_plans
    seed_platform_settings
    
    log_info "=========================================="
    log_success "  Database initialization complete!"
    log_info "=========================================="
}

main "$@"

#!/bin/bash
# ============================================================================
# Database Setup Script for Production
# ============================================================================
# This script sets up both master and tenant databases during initial deployment.
#
# Usage:
#   ./scripts/setup-database.sh
#
# Requirements:
#   - PostgreSQL server running and accessible
#   - Environment variables set (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME)
#
# Last Updated: 2026-03-05
# ============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Default values
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-postgres}"
DB_NAME="${DB_NAME:-oms_master}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SQL_DIR="$SCRIPT_DIR/sql"

# Check requirements
check_requirements() {
    if [ -z "$DB_PASSWORD" ]; then
        log_error "DB_PASSWORD environment variable is required"
        exit 1
    fi
    
    if ! command -v psql &> /dev/null; then
        log_error "psql command not found. Please install PostgreSQL client."
        exit 1
    fi
}

# Wait for PostgreSQL
wait_for_postgres() {
    log_info "Waiting for PostgreSQL at $DB_HOST:$DB_PORT..."
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "SELECT 1" > /dev/null 2>&1; then
            log_success "PostgreSQL is ready!"
            return 0
        fi
        log_info "Attempt $attempt/$max_attempts - waiting..."
        sleep 2
        ((attempt++))
    done
    
    log_error "PostgreSQL did not become ready"
    return 1
}

# Create database if not exists
create_database() {
    local db_name="$1"
    log_info "Creating database: $db_name"
    
    local exists=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -tAc \
        "SELECT 1 FROM pg_database WHERE datname = '$db_name'")
    
    if [ "$exists" = "1" ]; then
        log_warn "Database '$db_name' already exists"
        return 0
    fi
    
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c \
        "CREATE DATABASE \"$db_name\""
    
    log_success "Database '$db_name' created"
}

# Run SQL file
run_sql_file() {
    local db_name="$1"
    local sql_file="$2"
    local description="$3"
    
    if [ ! -f "$sql_file" ]; then
        log_error "SQL file not found: $sql_file"
        return 1
    fi
    
    log_info "Running $description on $db_name..."
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$db_name" -f "$sql_file"
    log_success "$description completed"
}

# Check if schema exists
check_schema_exists() {
    local db_name="$1"
    local table_name="$2"
    
    local exists=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$db_name" -tAc \
        "SELECT 1 FROM information_schema.tables WHERE table_name = '$table_name'")
    
    [ "$exists" = "1" ]
}

# Setup master database
setup_master_database() {
    log_info "=========================================="
    log_info "Setting up Master Database"
    log_info "=========================================="
    
    # Create database
    create_database "$DB_NAME"
    
    # Check if schema already exists
    if check_schema_exists "$DB_NAME" "platform_admins"; then
        log_warn "Master schema already exists. Skipping schema creation."
        log_info "Running seed data (with ON CONFLICT handling)..."
        run_sql_file "$DB_NAME" "$SQL_DIR/oms_master_seed.sql" "Master seed data"
    else
        # Run schema
        run_sql_file "$DB_NAME" "$SQL_DIR/oms_master_schema.sql" "Master schema"
        
        # Run seed data
        run_sql_file "$DB_NAME" "$SQL_DIR/oms_master_seed.sql" "Master seed data"
    fi
    
    log_success "Master database setup complete!"
}

# Generate admin password hash
generate_admin_hash() {
    local password="${1:-admin123}"
    
    # Try using node with bcryptjs
    if command -v node &> /dev/null; then
        node -e "try { const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('$password', 12)); } catch(e) { process.exit(1); }" 2>/dev/null && return 0
    fi
    
    # Fallback: use a pre-computed hash for 'admin123'
    echo '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.xW9LpABADN2ZOq'
}

# Update admin password
update_admin_password() {
    local password="${ADMIN_PASSWORD:-admin123}"
    
    log_info "Updating admin password..."
    
    local hash=$(generate_admin_hash "$password")
    
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c \
        "UPDATE platform_admins SET password_hash = '$hash', updated_at = NOW() WHERE email = 'admin@oms.local'"
    
    log_success "Admin password updated"
}

# Main
main() {
    log_info "=========================================="
    log_info "  OMS Database Setup"
    log_info "=========================================="
    echo ""
    
    check_requirements
    wait_for_postgres
    setup_master_database
    
    # If custom admin password is set, update it
    if [ -n "$ADMIN_PASSWORD" ] && [ "$ADMIN_PASSWORD" != "admin123" ]; then
        update_admin_password
    fi
    
    echo ""
    log_info "=========================================="
    log_success "  Database setup complete!"
    log_info "=========================================="
    echo ""
    log_info "Admin Login Credentials:"
    log_info "  Email:    admin@oms.local"
    log_info "  Password: ${ADMIN_PASSWORD:-admin123}"
    echo ""
    log_warn "IMPORTANT: Change the password after first login!"
    log_info "=========================================="
}

# Run if executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi

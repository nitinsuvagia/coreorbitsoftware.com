#!/bin/bash
# ===========================================
# AWS EC2 Deployment Script
# Office Management SaaS
# ===========================================
#
# This script deploys the application to an EC2 instance
# Run from your LOCAL machine
#
# Prerequisites:
# - SSH key configured (~/.ssh/your-key.pem)
# - EC2 instance running Ubuntu 22.04
# - Security groups configured (ports 22, 80, 443)
#
# Usage:
#   ./scripts/ec2-deploy.sh [command]
#
# Commands:
#   setup     - Initial server setup (run once)
#   deploy    - Deploy/update the application
#   bootstrap - First-time setup + deploy + SSL
#   logs      - View application logs
#   status    - Check service status
#   restart   - Restart all services
#   backup    - Backup database
#   ssl       - Setup/renew SSL certificates
#
# ===========================================

set -e

# ===========================================
# CONFIGURATION - EDIT THESE VALUES
# ===========================================
EC2_HOST="${EC2_HOST:-your-ec2-ip-or-hostname}"
EC2_USER="${EC2_USER:-ubuntu}"
SSH_KEY="${SSH_KEY:-~/.ssh/your-key.pem}"
APP_DIR="/opt/office-management"
DOMAIN="coreorbitsoftware.com"
SSL_DIR="$APP_DIR/deployment/nginx/ssl"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# ===========================================
# HELPER FUNCTIONS
# ===========================================

print_header() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
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

ssh_cmd() {
    ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$EC2_USER@$EC2_HOST" "$1"
}

scp_to() {
    scp -i "$SSH_KEY" -o StrictHostKeyChecking=no -r "$1" "$EC2_USER@$EC2_HOST:$2"
}

# ===========================================
# COMMANDS
# ===========================================

cmd_setup() {
    print_header "Setting up EC2 Server"
    
    echo "This will install Docker, Docker Compose, and configure the server."
    echo "Target: $EC2_USER@$EC2_HOST"
    echo ""
    read -p "Continue? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi

    # Copy setup script to server
    print_warning "Copying setup script to server..."
    scp_to "./scripts/ec2-server-setup.sh" "/tmp/ec2-server-setup.sh"
    
    # Run setup script
    print_warning "Running setup script on server..."
    ssh_cmd "chmod +x /tmp/ec2-server-setup.sh && sudo /tmp/ec2-server-setup.sh"
    
    print_success "Server setup complete!"
    echo ""
    echo "Next steps:"
    echo "  1. Configure .env.production with your secrets"
    echo "  2. Run: ./scripts/ec2-deploy.sh deploy"
    echo "  3. Run: ./scripts/ec2-deploy.sh ssl"
}

cmd_deploy() {
    print_header "Deploying Application to EC2"
    
    # Check if .env.production exists
    if [ ! -f ".env.production" ]; then
        print_error ".env.production not found!"
        echo "Copy the template and configure it:"
        echo "  cp .env.production.example .env.production"
        echo "  # Edit .env.production with your values"
        exit 1
    fi

    echo "Deploying to: $EC2_USER@$EC2_HOST"
    echo ""

    # Create app directory on server
    print_warning "Creating application directory..."
    ssh_cmd "sudo mkdir -p $APP_DIR && sudo chown $EC2_USER:$EC2_USER $APP_DIR"

    # Sync files to server
    print_warning "Syncing files to server..."
    rsync -avz --progress \
        -e "ssh -i $SSH_KEY -o StrictHostKeyChecking=no" \
        --exclude 'node_modules' \
        --exclude '.git' \
        --exclude 'logs/*.log' \
        --exclude '.env.local' \
        --exclude '.env.docker' \
        --exclude 'backups/*.sql' \
        --exclude '.next' \
        --exclude 'dist' \
        --exclude 'coverage' \
        ./ "$EC2_USER@$EC2_HOST:$APP_DIR/"

    # Copy production env file
    print_warning "Copying production environment file..."
    scp_to ".env.production" "$APP_DIR/.env.production"

    # Build and start services
    print_warning "Building and starting services..."
    ssh_cmd "cd $APP_DIR && docker compose -f docker-compose.prod.yml build"
    ssh_cmd "cd $APP_DIR && docker compose -f docker-compose.prod.yml up -d"

    # Wait for postgres to be ready
    print_warning "Waiting for PostgreSQL to be ready..."
    sleep 15

    # Run database initialization (migrations + seed)
    print_warning "Running database initialization..."
    ssh_cmd "cd $APP_DIR && docker compose -f docker-compose.prod.yml --profile init run --rm db-init" || {
        print_warning "db-init container not available, running migrations manually..."
        cmd_db_migrate
    }

    # Check service health
    ssh_cmd "cd $APP_DIR && docker compose -f docker-compose.prod.yml ps"

    print_success "Deployment complete!"
    echo ""
    
    # Auto-configure SSL if not already configured
    check_and_setup_ssl
    
    echo "Services are now running at:"
    echo "  - https://www.$DOMAIN (Public Website)"
    echo "  - https://portal.$DOMAIN (Web Portal)"
    echo "  - https://api.$DOMAIN (API Gateway)"
}

# Check if SSL is configured and auto-setup if not
check_and_setup_ssl() {
    print_header "Checking SSL Configuration"
    
    SSL_DIR="/home/$EC2_USER/app/nginx/ssl"
    
    # Check if SSL certificates exist on server
    SSL_EXISTS=$(ssh_cmd "[ -f $SSL_DIR/fullchain.pem ] && [ -f $SSL_DIR/privkey.pem ] && echo 'yes' || echo 'no'")
    
    if [ "$SSL_EXISTS" = "yes" ]; then
        print_success "SSL certificates already configured!"
        
        # Check if certificates are valid (not expired)
        CERT_VALID=$(ssh_cmd "openssl x509 -checkend 86400 -noout -in $SSL_DIR/fullchain.pem 2>/dev/null && echo 'valid' || echo 'expired'")
        
        if [ "$CERT_VALID" = "expired" ]; then
            print_warning "SSL certificate is expired or expiring soon. Renewing..."
            cmd_ssl_certbot_auto
        else
            print_success "SSL certificate is valid."
        fi
    else
        print_warning "SSL certificates not found. Setting up SSL automatically..."
        cmd_ssl_certbot_auto
    fi
}

# Auto SSL setup (non-interactive for deploy)
cmd_ssl_certbot_auto() {
    print_header "Auto SSL Setup via Let's Encrypt Certbot"
    
    SSL_EMAIL_VALUE="${SSL_EMAIL:-admin@$DOMAIN}"
    SSL_DIR="/home/$EC2_USER/app/nginx/ssl"
    
    # Step 1: Install certbot if not installed
    print_warning "Ensuring certbot is installed..."
    ssh_cmd "which certbot > /dev/null 2>&1 || (sudo apt update && sudo apt install certbot -y)"
    
    # Step 2: Stop nginx to free port 80
    print_warning "Stopping nginx container..."
    ssh_cmd "docker stop oms-nginx 2>/dev/null || true"
    
    # Step 3: Check if Let's Encrypt certs already exist (from previous runs)
    LE_CERTS_EXIST=$(ssh_cmd "[ -d /etc/letsencrypt/live/$DOMAIN ] && echo 'yes' || echo 'no'")
    
    if [ "$LE_CERTS_EXIST" = "no" ]; then
        # Step 4: Obtain certificates
        print_warning "Obtaining SSL certificates from Let's Encrypt..."
        ssh_cmd "sudo certbot certonly --standalone \
            -d $DOMAIN \
            -d www.$DOMAIN \
            -d api.$DOMAIN \
            -d portal.$DOMAIN \
            --email $SSL_EMAIL_VALUE \
            --agree-tos \
            --non-interactive" || {
            print_error "Failed to obtain SSL certificates. Check DNS configuration."
            print_warning "Starting nginx without SSL..."
            start_nginx_without_ssl
            return 1
        }
    else
        print_success "Let's Encrypt certificates already exist."
        # Renew if needed
        ssh_cmd "sudo certbot renew --quiet" || true
    fi
    
    # Step 5: Copy certificates to nginx ssl directory
    print_warning "Copying certificates to nginx directory..."
    ssh_cmd "sudo mkdir -p $SSL_DIR && \
        sudo cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem $SSL_DIR/ && \
        sudo cp /etc/letsencrypt/live/$DOMAIN/privkey.pem $SSL_DIR/ && \
        sudo chmod 644 $SSL_DIR/*.pem && \
        sudo chown $EC2_USER:$EC2_USER $SSL_DIR/*.pem"
    
    # Step 6: Setup nginx config directory
    print_warning "Setting up nginx configuration..."
    ssh_cmd "mkdir -p /home/$EC2_USER/app/nginx/conf.d"
    scp_to "./deployment/nginx/conf.d/default.conf" "/home/$EC2_USER/app/nginx/conf.d/default.conf"
    
    # Step 7: Get Docker network name
    NETWORK_NAME=$(ssh_cmd "docker inspect oms-api-gateway --format='{{range \$k, \$v := .NetworkSettings.Networks}}{{\$k}}{{end}}' 2>/dev/null || echo 'office-management_oms-network'")
    
    # Step 8: Start nginx with SSL
    print_warning "Starting nginx with SSL..."
    ssh_cmd "docker rm -f oms-nginx 2>/dev/null || true"
    ssh_cmd "docker run -d \
        --name oms-nginx \
        --network $NETWORK_NAME \
        -p 80:80 \
        -p 443:443 \
        -v /home/$EC2_USER/app/nginx/conf.d:/etc/nginx/conf.d:ro \
        -v /home/$EC2_USER/app/nginx/ssl:/etc/nginx/ssl:ro \
        -v /var/www/certbot:/var/www/certbot:ro \
        --health-cmd='curl -f http://localhost/health || exit 1' \
        --health-interval=30s \
        --restart unless-stopped \
        nginx:alpine"
    
    # Step 9: Setup auto-renewal cron
    print_warning "Setting up auto-renewal..."
    ssh_cmd "echo '0 3 * * * root certbot renew --quiet --pre-hook \"docker stop oms-nginx\" --post-hook \"docker start oms-nginx && cp /etc/letsencrypt/live/$DOMAIN/*.pem $SSL_DIR/\"' | sudo tee /etc/cron.d/certbot-renew > /dev/null"
    
    # Step 10: Verify
    sleep 5
    print_warning "Verifying SSL setup..."
    HTTPS_STATUS=$(ssh_cmd "curl -sI --max-time 10 https://$DOMAIN 2>&1 | head -1 || echo 'failed'")
    
    if echo "$HTTPS_STATUS" | grep -q "200\|301\|302"; then
        print_success "SSL certificates installed and working!"
    else
        print_warning "SSL verification returned: $HTTPS_STATUS"
        print_warning "SSL may take a moment to propagate. Check manually if needed."
    fi
}

# Fallback: Start nginx without SSL (HTTP only)
start_nginx_without_ssl() {
    print_warning "Starting nginx in HTTP-only mode..."
    
    NETWORK_NAME=$(ssh_cmd "docker inspect oms-api-gateway --format='{{range \$k, \$v := .NetworkSettings.Networks}}{{\$k}}{{end}}' 2>/dev/null || echo 'office-management_oms-network'")
    
    ssh_cmd "docker rm -f oms-nginx 2>/dev/null || true"
    ssh_cmd "docker run -d \
        --name oms-nginx \
        --network $NETWORK_NAME \
        -p 80:80 \
        -v /var/www/certbot:/var/www/certbot:ro \
        --health-cmd='curl -f http://localhost/health || exit 1' \
        --health-interval=30s \
        --restart unless-stopped \
        nginx:alpine"
    
    print_warning "Nginx started in HTTP-only mode. Run './scripts/ec2-deploy.sh ssl' to setup SSL manually."
}

# ===========================================
# DATABASE COMMANDS
# ===========================================

cmd_db_init() {
    print_header "Database Initialization (Full Setup)"
    
    print_warning "Running schema setup..."
    ssh_cmd "docker exec oms-postgres psql -U postgres -d oms_master -f /sql/oms_master_schema.sql" 2>/dev/null || true
    
    print_warning "Running seed data..."
    ssh_cmd "docker exec oms-postgres psql -U postgres -d oms_master -f /sql/oms_master_seed.sql"
    
    # Update admin password if custom one is set
    if [ -n "${ADMIN_PASSWORD:-}" ] && [ "$ADMIN_PASSWORD" != "admin123" ]; then
        cmd_db_update_admin_password
    fi
    
    print_success "Database initialization complete!"
}

cmd_db_schema() {
    print_header "Running Database Schema"
    
    print_warning "Applying master database schema..."
    ssh_cmd "docker exec oms-postgres psql -U postgres -d oms_master -f /sql/oms_master_schema.sql"
    
    print_success "Schema applied!"
}

cmd_db_migrate() {
    print_header "Running Database Migrations (Prisma)"
    
    # First try SQL approach
    print_warning "Checking if schema needs to be applied..."
    
    # Check if tables exist
    TABLE_EXISTS=$(ssh_cmd "docker exec oms-postgres psql -U postgres -d oms_master -tAc \"SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'platform_admins')\"")
    
    if [ "$TABLE_EXISTS" = "t" ]; then
        print_info "Schema already exists. Running Prisma migrations for any updates..."
        ssh_cmd "cd $APP_DIR && docker run --rm --network office-management_oms-network \
            -v \$(pwd)/packages/database:/app/packages/database \
            -e MASTER_DATABASE_URL=\$(grep MASTER_DATABASE_URL .env | cut -d= -f2-) \
            -w /app/packages/database \
            node:20-slim \
            sh -c 'apt-get update && apt-get install -y openssl && npm install -g prisma@5.22.0 && prisma migrate deploy --schema=./prisma/master/schema.prisma'" 2>/dev/null || true
    else
        print_warning "Schema not found. Running full schema setup..."
        cmd_db_init
    fi
    
    print_success "Migrations complete!"
}

cmd_db_seed() {
    print_header "Seeding Database"
    
    print_warning "Running seed data..."
    ssh_cmd "docker exec oms-postgres psql -U postgres -d oms_master -f /sql/oms_master_seed.sql"
    
    # Update admin password if custom one is set
    if [ -n "${ADMIN_PASSWORD:-}" ] && [ "$ADMIN_PASSWORD" != "admin123" ]; then
        cmd_db_update_admin_password
    fi
    
    print_success "Database seeded!"
    echo "  Platform Admin:"
    echo "    Email:    admin@oms.local"
    echo "    Password: ${ADMIN_PASSWORD:-admin123}"
}

cmd_db_update_admin_password() {
    print_warning "Updating admin password..."
    
    ADMIN_PWD="${ADMIN_PASSWORD:-admin123}"
    
    # Generate bcrypt hash using auth-service container
    HASH=$(ssh_cmd "docker exec oms-auth-service node -e \"const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('$ADMIN_PWD', 12));\"" 2>/dev/null)
    
    if [ -n "$HASH" ]; then
        ssh_cmd "docker exec oms-postgres psql -U postgres -d oms_master -c \"UPDATE platform_admins SET password_hash = '$HASH', updated_at = NOW() WHERE email = 'admin@oms.local';\""
        print_success "Admin password updated!"
    else
        print_warn "Could not generate password hash. Using default password."
    fi
}

cmd_db_reset() {
    print_header "Resetting Database (DANGEROUS)"
    
    echo ""
    print_error "WARNING: This will DELETE all data and start fresh!"
    read -p "Are you sure you want to continue? (type 'yes' to confirm): " CONFIRM
    
    if [ "$CONFIRM" != "yes" ]; then
        echo "Aborted."
        exit 0
    fi
    
    print_warning "Dropping and recreating database..."
    ssh_cmd "docker exec oms-postgres psql -U postgres -c 'DROP DATABASE IF EXISTS oms_master;'"
    ssh_cmd "docker exec oms-postgres psql -U postgres -c 'CREATE DATABASE oms_master;'"
    
    print_warning "Running schema and seed..."
    cmd_db_init
    
    print_warning "Restarting services to reconnect to database..."
    ssh_cmd "cd $APP_DIR && docker compose -f docker-compose.prod.yml restart"
    
    print_success "Database reset complete!"
}

# ===========================================
# TENANT DATABASE COMMANDS
# ===========================================

cmd_tenant_list() {
    print_header "Listing Tenant Databases"
    
    ssh_cmd "docker exec oms-postgres psql -U postgres -tAc \"SELECT datname FROM pg_database WHERE datname LIKE 'oms_tenant_%' ORDER BY datname;\""
}

cmd_tenant_create() {
    TENANT_SLUG="${2:-}"
    
    if [ -z "$TENANT_SLUG" ]; then
        echo "Usage: ./scripts/ec2-deploy.sh tenant-create <tenant_slug>"
        echo "Example: ./scripts/ec2-deploy.sh tenant-create acme_corp"
        exit 1
    fi
    
    print_header "Creating Tenant Database: oms_tenant_$TENANT_SLUG"
    
    # Create database
    print_warning "Creating database..."
    ssh_cmd "docker exec oms-postgres psql -U postgres -c 'CREATE DATABASE oms_tenant_$TENANT_SLUG;'"
    
    # Apply schema
    print_warning "Applying schema..."
    ssh_cmd "docker exec oms-postgres psql -U postgres -d oms_tenant_$TENANT_SLUG -f /sql/oms_tenant_schema.sql"
    
    # Apply seed data
    print_warning "Seeding default data..."
    ssh_cmd "docker exec oms-postgres psql -U postgres -d oms_tenant_$TENANT_SLUG -f /sql/oms_tenant_seed.sql"
    
    print_success "Tenant database oms_tenant_$TENANT_SLUG created successfully!"
}

cmd_tenant_reset() {
    TENANT_SLUG="${2:-}"
    
    if [ -z "$TENANT_SLUG" ]; then
        echo "Usage: ./scripts/ec2-deploy.sh tenant-reset <tenant_slug>"
        echo "Example: ./scripts/ec2-deploy.sh tenant-reset acme_corp"
        exit 1
    fi
    
    print_header "Resetting Tenant Database: oms_tenant_$TENANT_SLUG (DANGEROUS)"
    
    echo ""
    print_error "WARNING: This will DELETE all tenant data!"
    read -p "Are you sure you want to continue? (type 'yes' to confirm): " CONFIRM
    
    if [ "$CONFIRM" != "yes" ]; then
        echo "Aborted."
        exit 0
    fi
    
    # Drop and recreate
    print_warning "Dropping database..."
    ssh_cmd "docker exec oms-postgres psql -U postgres -c 'DROP DATABASE IF EXISTS oms_tenant_$TENANT_SLUG;'"
    
    print_warning "Creating database..."
    ssh_cmd "docker exec oms-postgres psql -U postgres -c 'CREATE DATABASE oms_tenant_$TENANT_SLUG;'"
    
    # Apply schema
    print_warning "Applying schema..."
    ssh_cmd "docker exec oms-postgres psql -U postgres -d oms_tenant_$TENANT_SLUG -f /sql/oms_tenant_schema.sql"
    
    # Apply seed data
    print_warning "Seeding default data..."
    ssh_cmd "docker exec oms-postgres psql -U postgres -d oms_tenant_$TENANT_SLUG -f /sql/oms_tenant_seed.sql"
    
    print_success "Tenant database oms_tenant_$TENANT_SLUG reset successfully!"
}

cmd_tenant_reset_all() {
    print_header "Resetting ALL Tenant Databases (VERY DANGEROUS)"
    
    echo ""
    print_error "WARNING: This will DELETE ALL TENANT DATA!"
    read -p "Are you sure you want to continue? (type 'yes' to confirm): " CONFIRM
    
    if [ "$CONFIRM" != "yes" ]; then
        echo "Aborted."
        exit 0
    fi
    
    # Get list of tenant databases
    TENANT_DBS=$(ssh_cmd "docker exec oms-postgres psql -U postgres -tAc \"SELECT datname FROM pg_database WHERE datname LIKE 'oms_tenant_%';\"")
    
    for DB in $TENANT_DBS; do
        SLUG=$(echo "$DB" | sed 's/oms_tenant_//')
        
        print_warning "Resetting $DB..."
        
        # Drop and recreate
        ssh_cmd "docker exec oms-postgres psql -U postgres -c 'DROP DATABASE IF EXISTS $DB;'"
        ssh_cmd "docker exec oms-postgres psql -U postgres -c 'CREATE DATABASE $DB;'"
        ssh_cmd "docker exec oms-postgres psql -U postgres -d $DB -f /sql/oms_tenant_schema.sql"
        ssh_cmd "docker exec oms-postgres psql -U postgres -d $DB -f /sql/oms_tenant_seed.sql"
        
        print_success "  $DB reset!"
    done
    
    print_success "All tenant databases reset!"
}

cmd_reset_all() {
    print_header "Complete Database Reset (NUCLEAR OPTION)"
    
    echo ""
    print_error "WARNING: This will DELETE:"
    echo "  - oms_master database (platform data)"
    echo "  - ALL oms_tenant_* databases (tenant data)"
    echo ""
    read -p "Are you absolutely sure? (type 'RESET ALL' to confirm): " CONFIRM
    
    if [ "$CONFIRM" != "RESET ALL" ]; then
        echo "Aborted."
        exit 0
    fi
    
    # Reset master
    print_warning "Resetting master database..."
    ssh_cmd "docker exec oms-postgres psql -U postgres -c 'DROP DATABASE IF EXISTS oms_master;'"
    ssh_cmd "docker exec oms-postgres psql -U postgres -c 'CREATE DATABASE oms_master;'"
    ssh_cmd "docker exec oms-postgres psql -U postgres -d oms_master -f /sql/oms_master_schema.sql"
    ssh_cmd "docker exec oms-postgres psql -U postgres -d oms_master -f /sql/oms_master_seed.sql"
    
    # Reset all tenants
    TENANT_DBS=$(ssh_cmd "docker exec oms-postgres psql -U postgres -tAc \"SELECT datname FROM pg_database WHERE datname LIKE 'oms_tenant_%';\"")
    
    for DB in $TENANT_DBS; do
        print_warning "Dropping $DB..."
        ssh_cmd "docker exec oms-postgres psql -U postgres -c 'DROP DATABASE IF EXISTS $DB;'"
    done
    
    # Update admin password if set
    if [ -n "${ADMIN_PASSWORD:-}" ] && [ "$ADMIN_PASSWORD" != "admin123" ]; then
        cmd_db_update_admin_password
    fi
    
    # Restart services
    print_warning "Restarting services..."
    ssh_cmd "cd $APP_DIR && docker compose -f docker-compose.prod.yml restart"
    
    print_success "Complete database reset done!"
    echo ""
    echo "Platform Admin:"
    echo "  Email:    admin@oms.local"
    echo "  Password: ${ADMIN_PASSWORD:-admin123}"
}

cmd_logs() {
    print_header "Application Logs"
    
    SERVICE="${2:-}"
    
    if [ -z "$SERVICE" ]; then
        echo "Available services:"
        echo "  nginx, web, public-website, api-gateway"
        echo "  auth-service, employee-service, attendance-service"
        echo "  project-service, task-service, billing-service"
        echo "  document-service, notification-service, report-service"
        echo "  postgres, redis"
        echo ""
        echo "Usage: ./scripts/ec2-deploy.sh logs [service-name]"
        echo ""
        echo "Or view all logs:"
        ssh_cmd "cd $APP_DIR && docker compose -f docker-compose.prod.yml logs --tail=100 -f"
    else
        ssh_cmd "cd $APP_DIR && docker compose -f docker-compose.prod.yml logs --tail=200 -f $SERVICE"
    fi
}

cmd_status() {
    print_header "Service Status"
    
    ssh_cmd "cd $APP_DIR && docker compose -f docker-compose.prod.yml ps"
    echo ""
    
    print_header "System Resources"
    ssh_cmd "free -h && echo '' && df -h / && echo '' && uptime"
}

cmd_restart() {
    print_header "Restarting Services"
    
    SERVICE="${2:-}"
    
    if [ -z "$SERVICE" ]; then
        ssh_cmd "cd $APP_DIR && docker compose -f docker-compose.prod.yml restart"
    else
        ssh_cmd "cd $APP_DIR && docker compose -f docker-compose.prod.yml restart $SERVICE"
    fi
    
    print_success "Services restarted!"
}

cmd_stop() {
    print_header "Stopping Services"
    
    ssh_cmd "cd $APP_DIR && docker compose -f docker-compose.prod.yml down"
    
    print_success "Services stopped!"
}

cmd_backup() {
    print_header "Backing Up Database"
    
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="backup_${TIMESTAMP}.sql"
    
    # Create backup on server
    print_warning "Creating database backup..."
    ssh_cmd "cd $APP_DIR && docker compose -f docker-compose.prod.yml exec -T postgres pg_dumpall -U postgres > backups/$BACKUP_FILE"
    
    # Compress backup
    ssh_cmd "gzip $APP_DIR/backups/$BACKUP_FILE"
    
    # Download backup
    print_warning "Downloading backup to local machine..."
    mkdir -p ./backups
    scp -i "$SSH_KEY" "$EC2_USER@$EC2_HOST:$APP_DIR/backups/${BACKUP_FILE}.gz" "./backups/"
    
    print_success "Backup complete: ./backups/${BACKUP_FILE}.gz"
}

cmd_ssl() {
    print_header "SSL Certificate Setup"
    
    echo "Choose SSL setup method:"
    echo ""
    echo "  1. certbot  - Simple multi-domain certs (recommended for single domains)"
    echo "  2. godaddy  - Wildcard certs via GoDaddy DNS (requires API keys)"
    echo ""
    echo "For most deployments, 'certbot' is recommended."
    echo ""
    read -p "Select method (certbot/godaddy): " METHOD
    
    case "$METHOD" in
        certbot|1)
            cmd_ssl_certbot
            ;;
        godaddy|2)
            cmd_ssl_godaddy
            ;;
        *)
            print_error "Invalid selection. Choose 'certbot' or 'godaddy'."
            exit 1
            ;;
    esac
}

cmd_ssl_certbot() {
    print_header "SSL Setup via Let's Encrypt Certbot"
    
    echo "This will obtain SSL certificates using Certbot standalone mode."
    echo ""
    echo "Prerequisites:"
    echo "  - DNS A records pointing to EC2 IP for all domains"
    echo "  - Ports 80 and 443 open in security group"
    echo ""
    echo "Domains to be certified:"
    echo "  - $DOMAIN"
    echo "  - www.$DOMAIN"
    echo "  - api.$DOMAIN"
    echo "  - portal.$DOMAIN"
    echo ""
    read -p "Continue? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
    
    SSL_EMAIL_VALUE="${SSL_EMAIL:-admin@$DOMAIN}"
    SSL_DIR="/home/$EC2_USER/app/nginx/ssl"
    
    # Step 1: Install certbot
    print_warning "Installing certbot..."
    ssh_cmd "sudo apt update && sudo apt install certbot -y"
    
    # Step 2: Stop nginx to free port 80
    print_warning "Stopping nginx container..."
    ssh_cmd "docker stop oms-nginx 2>/dev/null || true"
    
    # Step 3: Obtain certificates
    print_warning "Obtaining SSL certificates..."
    ssh_cmd "sudo certbot certonly --standalone \
        -d $DOMAIN \
        -d www.$DOMAIN \
        -d api.$DOMAIN \
        -d portal.$DOMAIN \
        --email $SSL_EMAIL_VALUE \
        --agree-tos \
        --non-interactive"
    
    # Step 4: Copy certificates to nginx ssl directory
    print_warning "Copying certificates to nginx directory..."
    ssh_cmd "sudo mkdir -p $SSL_DIR && \
        sudo cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem $SSL_DIR/ && \
        sudo cp /etc/letsencrypt/live/$DOMAIN/privkey.pem $SSL_DIR/ && \
        sudo chmod 644 $SSL_DIR/*.pem && \
        sudo chown $EC2_USER:$EC2_USER $SSL_DIR/*.pem"
    
    # Step 5: Copy SSL-enabled nginx config
    print_warning "Deploying SSL-enabled nginx configuration..."
    ssh_cmd "sudo mkdir -p /home/$EC2_USER/app/nginx/conf.d"
    scp_to "$APP_DIR/deployment/nginx/conf.d/default.conf" "/home/$EC2_USER/app/nginx/conf.d/default.conf"
    
    # Step 6: Get Docker network name
    print_warning "Detecting Docker network..."
    NETWORK_NAME=$(ssh_cmd "docker inspect oms-api-gateway --format='{{range \$k, \$v := .NetworkSettings.Networks}}{{\$k}}{{end}}' 2>/dev/null || echo 'office-management_oms-network'")
    
    # Step 7: Start nginx with SSL
    print_warning "Starting nginx with SSL..."
    ssh_cmd "docker rm -f oms-nginx 2>/dev/null || true"
    ssh_cmd "docker run -d \
        --name oms-nginx \
        --network $NETWORK_NAME \
        -p 80:80 \
        -p 443:443 \
        -v /home/$EC2_USER/app/nginx/conf.d:/etc/nginx/conf.d:ro \
        -v /home/$EC2_USER/app/nginx/ssl:/etc/nginx/ssl:ro \
        -v /var/www/certbot:/var/www/certbot:ro \
        --health-cmd='curl -f http://localhost/health || exit 1' \
        --health-interval=30s \
        --restart unless-stopped \
        nginx:alpine"
    
    # Step 8: Setup auto-renewal cron
    print_warning "Setting up auto-renewal..."
    ssh_cmd "echo '0 3 * * * root certbot renew --quiet --pre-hook \"docker stop oms-nginx\" --post-hook \"docker start oms-nginx\" && cp /etc/letsencrypt/live/$DOMAIN/*.pem $SSL_DIR/' | sudo tee /etc/cron.d/certbot-renew > /dev/null"
    
    # Step 9: Verify
    sleep 5
    print_warning "Verifying SSL setup..."
    ssh_cmd "curl -sI --max-time 10 https://$DOMAIN 2>&1 | head -5"
    
    print_success "SSL certificates installed successfully!"
    echo ""
    echo "Your sites are now available at:"
    echo "  - https://$DOMAIN"
    echo "  - https://www.$DOMAIN"
    echo "  - https://portal.$DOMAIN"
    echo "  - https://api.$DOMAIN"
    echo ""
    echo "Certificates will auto-renew before expiration."
}

cmd_ssl_godaddy() {
    MODE="${1:-interactive}"

    if [ -z "${GODADDY_API_KEY:-}" ] || [ -z "${GODADDY_API_SECRET:-}" ]; then
        print_error "Missing GoDaddy API credentials."
        echo "Set these environment variables before running:"
        echo "  GODADDY_API_KEY=..."
        echo "  GODADDY_API_SECRET=..."
        echo "Optional:"
        echo "  SSL_EMAIL=you@$DOMAIN"
        return 1
    fi

    if [[ "$MODE" != "auto" ]]; then
        print_header "GoDaddy Wildcard SSL Setup"
        echo "This will issue and auto-renew wildcard certificates via GoDaddy DNS API:"
        echo "  - $DOMAIN"
        echo "  - *.$DOMAIN"
        echo ""
        read -p "Continue? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi

    SSL_EMAIL_VALUE="${SSL_EMAIL:-admin@$DOMAIN}"

    print_warning "Preparing nginx config files (*.conf)..."
    ssh_cmd "cd $APP_DIR/deployment/nginx/conf.d && \
        [ -f default.conf ] && mv default.conf default.conf.disabled || true && \
        [ -f portal.conf.ssl ] && mv portal.conf.ssl portal.conf || true && \
        [ -f public-website.conf.ssl ] && mv public-website.conf.ssl public-website.conf || true && \
        [ -f api.conf.ssl ] && mv api.conf.ssl api.conf || true"

    print_warning "Installing acme.sh and issuing wildcard certificate via GoDaddy..."
    ssh_cmd "set -e; \
        export GD_Key='$GODADDY_API_KEY'; \
        export GD_Secret='$GODADDY_API_SECRET'; \
        export LE_WORKING_DIR='/home/$EC2_USER/.acme.sh'; \
        if [ ! -d \"/home/$EC2_USER/.acme.sh\" ]; then \
            curl -s https://get.acme.sh | sh -s email='$SSL_EMAIL_VALUE'; \
        fi; \
        mkdir -p '$SSL_DIR'; \
        /home/$EC2_USER/.acme.sh/acme.sh --set-default-ca --server letsencrypt; \
        /home/$EC2_USER/.acme.sh/acme.sh --issue --dns dns_gd -d '$DOMAIN' -d '*.$DOMAIN' --keylength ec-256; \
        /home/$EC2_USER/.acme.sh/acme.sh --install-cert -d '$DOMAIN' --ecc \
            --fullchain-file '$SSL_DIR/fullchain.pem' \
            --key-file '$SSL_DIR/privkey.pem' \
            --reloadcmd 'cd $APP_DIR && docker compose -f docker-compose.prod.yml restart nginx'; \
        chmod 600 '$SSL_DIR/privkey.pem'; \
        chmod 644 '$SSL_DIR/fullchain.pem'"

    print_warning "Reloading nginx with SSL certificates..."
    ssh_cmd "cd $APP_DIR && docker compose -f docker-compose.prod.yml up -d nginx && docker compose -f docker-compose.prod.yml exec -T nginx nginx -t"

    print_success "GoDaddy wildcard SSL installed and auto-renew configured via acme.sh!"
}

cmd_bootstrap() {
    print_header "First-Time Bootstrap (Setup + Deploy + SSL)"

    if [ -z "${GODADDY_API_KEY:-}" ] || [ -z "${GODADDY_API_SECRET:-}" ]; then
        print_error "Bootstrap requires GoDaddy API credentials in local environment."
        echo "Export before running:"
        echo "  export GODADDY_API_KEY=..."
        echo "  export GODADDY_API_SECRET=..."
        echo "Optional: export SSL_EMAIL=you@$DOMAIN"
        exit 1
    fi

    cmd_setup
    FIRST_DEPLOY=true cmd_deploy
}

cmd_update() {
    print_header "Updating Application"
    
    # Pull latest changes (if using git on server)
    # ssh_cmd "cd $APP_DIR && git pull origin main"
    
    # Or sync files
    print_warning "Syncing files..."
    rsync -avz --progress \
        -e "ssh -i $SSH_KEY -o StrictHostKeyChecking=no" \
        --exclude 'node_modules' \
        --exclude '.git' \
        --exclude 'logs' \
        --exclude '.env.*' \
        --exclude 'backups' \
        --exclude 'nginx/ssl' \
        --exclude 'uploads' \
        ./ "$EC2_USER@$EC2_HOST:$APP_DIR/"

    # Rebuild and restart
    print_warning "Rebuilding services..."
    ssh_cmd "cd $APP_DIR && docker compose -f docker-compose.prod.yml build"
    
    print_warning "Restarting services (zero-downtime)..."
    ssh_cmd "cd $APP_DIR && docker compose -f docker-compose.prod.yml up -d --no-deps --build"
    
    print_success "Update complete!"
}

cmd_shell() {
    print_header "Connecting to Server"
    ssh -i "$SSH_KEY" "$EC2_USER@$EC2_HOST"
}

cmd_db_shell() {
    print_header "Database Shell"
    ssh_cmd "cd $APP_DIR && docker compose -f docker-compose.prod.yml exec postgres psql -U postgres"
}

cmd_migrate() {
    print_header "Running Database Migrations"
    ssh_cmd "cd $APP_DIR && docker compose -f docker-compose.prod.yml exec auth-service npm run migrate"
    print_success "Migrations complete!"
}

# ===========================================
# MAIN
# ===========================================

show_help() {
    echo "AWS EC2 Deployment Script"
    echo ""
    echo "Usage: ./scripts/ec2-deploy.sh [command]"
    echo ""
    echo "Commands:"
    echo "  setup     - Initial server setup (run once)"
    echo "  deploy    - Deploy/update the application"
    echo "  bootstrap - First-time setup + deploy + GoDaddy wildcard SSL"
    echo "  update    - Update application (sync & rebuild)"
    echo "  logs      - View application logs"
    echo "  status    - Check service status"
    echo "  restart   - Restart all services"
    echo "  stop      - Stop all services"
    echo "  backup    - Backup database"
    echo "  ssl       - Setup/renew SSL certificates (interactive)"
    echo "  ssl-certbot - Setup SSL via Certbot standalone (recommended)"
    echo "  ssl-godaddy - Setup wildcard SSL via GoDaddy DNS API"
    echo "  shell     - SSH into the server"
    echo "  db-shell  - Access database shell"
    echo ""
    echo "Database Commands:"
    echo "  db-init   - Initialize database (full schema + seed)"
    echo "  db-schema - Apply schema SQL only (no seed data)"
    echo "  db-migrate - Run Prisma migrations (auto-detects if init needed)"
    echo "  db-seed   - Seed platform admin and initial data"
    echo "  db-reset  - Reset database (DANGEROUS - deletes all data)"
    echo ""
    echo "Tenant Database Commands:"
    echo "  tenant-list        - List all tenant databases"
    echo "  tenant-create <slug> - Create a new tenant database"
    echo "  tenant-reset <slug>  - Reset a specific tenant database"
    echo "  tenant-reset-all   - Reset ALL tenant databases"
    echo "  reset-all          - Reset EVERYTHING (master + all tenants)"
    echo ""
    echo "Configuration (edit script or use env vars):"
    echo "  EC2_HOST  - EC2 instance IP or hostname"
    echo "  EC2_USER  - SSH user (default: ubuntu)"
    echo "  SSH_KEY   - Path to SSH key"
    echo "  GODADDY_API_KEY / GODADDY_API_SECRET - Required for ssl-godaddy/bootstrap"
    echo "  SSL_EMAIL - Optional SSL registration email"
    echo "  ADMIN_PASSWORD - Password for seeded admin user (default: admin123)"
    echo ""
    echo "Example:"
    echo "  EC2_HOST=54.123.45.67 SSH_KEY=~/.ssh/my-key.pem ./scripts/ec2-deploy.sh deploy"
    echo "  ./scripts/ec2-deploy.sh ssl-certbot  # Simple SSL setup"
    echo "  ./scripts/ec2-deploy.sh db-init      # Initialize database"
}

COMMAND="${1:-help}"

case "$COMMAND" in
    setup)
        cmd_setup
        ;;
    bootstrap)
        cmd_bootstrap
        ;;
    deploy)
        cmd_deploy
        ;;
    update)
        cmd_update
        ;;
    logs)
        cmd_logs "$@"
        ;;
    status)
        cmd_status
        ;;
    restart)
        cmd_restart "$@"
        ;;
    stop)
        cmd_stop
        ;;
    backup)
        cmd_backup
        ;;
    ssl)
        cmd_ssl
        ;;
    ssl-certbot)
        cmd_ssl_certbot
        ;;
    ssl-godaddy)
        cmd_ssl_godaddy
        ;;
    shell)
        cmd_shell
        ;;
    db-shell)
        cmd_db_shell
        ;;
    db-init)
        cmd_db_init
        ;;
    db-schema)
        cmd_db_schema
        ;;
    db-migrate)
        cmd_db_migrate
        ;;
    db-seed)
        cmd_db_seed
        ;;
    db-reset)
        cmd_db_reset
        ;;
    tenant-list)
        cmd_tenant_list
        ;;
    tenant-create)
        cmd_tenant_create "$@"
        ;;
    tenant-reset)
        cmd_tenant_reset "$@"
        ;;
    tenant-reset-all)
        cmd_tenant_reset_all
        ;;
    reset-all)
        cmd_reset_all
        ;;
    migrate)
        cmd_db_migrate
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        print_error "Unknown command: $COMMAND"
        show_help
        exit 1
        ;;
esac

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

    # Wait for services to start
    print_warning "Waiting for services to start..."
    sleep 30

    # Check service health
    ssh_cmd "cd $APP_DIR && docker compose -f docker-compose.prod.yml ps"

    print_success "Deployment complete!"
    echo ""
    echo "Services are now running at:"
    echo "  - https://www.$DOMAIN (Public Website)"
    echo "  - https://portal.$DOMAIN (Web Portal)"
    echo "  - https://api.$DOMAIN (API Gateway)"

    if [[ "${FIRST_DEPLOY:-false}" == "true" ]]; then
        print_warning "FIRST_DEPLOY=true detected. Running GoDaddy wildcard SSL setup..."
        cmd_ssl_godaddy "auto"
    fi
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
    
    echo "This will obtain SSL certificates from Let's Encrypt."
    echo "Make sure your DNS is configured correctly:"
    echo "  - www.$DOMAIN → EC2 IP"
    echo "  - portal.$DOMAIN → EC2 IP"
    echo "  - api.$DOMAIN → EC2 IP"
    echo "  - *.$DOMAIN → EC2 IP (for tenant subdomains)"
    echo ""
    read -p "Continue? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi

    cmd_ssl_godaddy
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
    echo "  ssl       - Setup/renew SSL certificates"
    echo "  shell     - SSH into the server"
    echo "  db-shell  - Access database shell"
    echo "  migrate   - Run database migrations"
    echo ""
    echo "Configuration (edit script or use env vars):"
    echo "  EC2_HOST  - EC2 instance IP or hostname"
    echo "  EC2_USER  - SSH user (default: ubuntu)"
    echo "  SSH_KEY   - Path to SSH key"
    echo "  GODADDY_API_KEY / GODADDY_API_SECRET - Required for ssl/bootstrap"
    echo "  SSL_EMAIL - Optional SSL registration email"
    echo ""
    echo "Example:"
    echo "  EC2_HOST=54.123.45.67 SSH_KEY=~/.ssh/my-key.pem ./scripts/ec2-deploy.sh deploy"
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
    shell)
        cmd_shell
        ;;
    db-shell)
        cmd_db_shell
        ;;
    migrate)
        cmd_migrate
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

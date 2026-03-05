#!/bin/bash
# ===========================================
# EC2 Server Setup Script
# Office Management SaaS
# ===========================================
#
# This script runs ON the EC2 server to install
# Docker, Docker Compose, and configure the system.
#
# Run as: sudo ./ec2-server-setup.sh
#
# ===========================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "Please run as root: sudo ./ec2-server-setup.sh"
    exit 1
fi

print_header "EC2 Server Setup for Office Management"

# ===========================================
# System Updates
# ===========================================
print_header "Updating System Packages"

apt-get update
apt-get upgrade -y
print_success "System updated"

# ===========================================
# Install Essential Packages
# ===========================================
print_header "Installing Essential Packages"

apt-get install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    htop \
    vim \
    git \
    unzip \
    fail2ban \
    ufw \
    jq

print_success "Essential packages installed"

# ===========================================
# Install Docker
# ===========================================
print_header "Installing Docker"

# Remove old versions
apt-get remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true

# Add Docker's official GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Set up stable repository
echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu \
    $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Add ubuntu user to docker group
usermod -aG docker ubuntu

# Start and enable Docker
systemctl start docker
systemctl enable docker

print_success "Docker installed and configured"

# Verify installation
docker --version
docker compose version

# ===========================================
# Configure Firewall
# ===========================================
print_header "Configuring Firewall"

# Reset UFW
ufw --force reset

# Default policies
ufw default deny incoming
ufw default allow outgoing

# Allow SSH
ufw allow 22/tcp

# Allow HTTP and HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Enable firewall
ufw --force enable

print_success "Firewall configured"
ufw status

# ===========================================
# Configure Fail2Ban
# ===========================================
print_header "Configuring Fail2Ban"

cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 86400
EOF

systemctl restart fail2ban
systemctl enable fail2ban

print_success "Fail2Ban configured"

# ===========================================
# System Optimization
# ===========================================
print_header "Optimizing System"

# Increase file limits
cat >> /etc/security/limits.conf << 'EOF'
* soft nofile 65535
* hard nofile 65535
root soft nofile 65535
root hard nofile 65535
EOF

# Optimize TCP settings
cat >> /etc/sysctl.conf << 'EOF'
# TCP optimization
net.core.somaxconn = 65535
net.core.netdev_max_backlog = 65535
net.ipv4.tcp_max_syn_backlog = 65535
net.ipv4.ip_local_port_range = 1024 65535
net.ipv4.tcp_tw_reuse = 1
net.ipv4.tcp_fin_timeout = 15
net.ipv4.tcp_keepalive_time = 300
net.ipv4.tcp_keepalive_probes = 5
net.ipv4.tcp_keepalive_intvl = 15

# Memory optimization
vm.swappiness = 10
vm.dirty_ratio = 60
vm.dirty_background_ratio = 2
EOF

sysctl -p

print_success "System optimized"

# ===========================================
# Create Application Directory
# ===========================================
print_header "Creating Application Directories"

mkdir -p /opt/office-management
mkdir -p /opt/office-management/backups
mkdir -p /opt/office-management/nginx/ssl
mkdir -p /opt/office-management/nginx/logs
mkdir -p /opt/office-management/uploads

chown -R ubuntu:ubuntu /opt/office-management

print_success "Application directories created"

# ===========================================
# Setup Log Rotation
# ===========================================
print_header "Configuring Log Rotation"

cat > /etc/logrotate.d/office-management << 'EOF'
/opt/office-management/nginx/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 ubuntu ubuntu
    sharedscripts
    postrotate
        docker compose -f /opt/office-management/docker-compose.prod.yml exec -T nginx nginx -s reload 2>/dev/null || true
    endscript
}

/opt/office-management/logs/*.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    notifempty
    create 0640 ubuntu ubuntu
}
EOF

print_success "Log rotation configured"

# ===========================================
# Setup Automatic Updates
# ===========================================
print_header "Configuring Automatic Security Updates"

apt-get install -y unattended-upgrades
cat > /etc/apt/apt.conf.d/20auto-upgrades << 'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::AutocleanInterval "7";
EOF

print_success "Automatic updates configured"

# ===========================================
# Setup Swap (if not present)
# ===========================================
print_header "Configuring Swap Space"

if [ ! -f /swapfile ]; then
    # Create 2GB swap file
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    print_success "2GB swap file created"
else
    print_warning "Swap file already exists"
fi

free -h

# ===========================================
# Docker Cleanup Cron Job
# ===========================================
print_header "Setting up Docker Cleanup"

cat > /etc/cron.d/docker-cleanup << 'EOF'
# Clean up unused Docker resources weekly
0 3 * * 0 root docker system prune -af --volumes 2>&1 | logger -t docker-cleanup
EOF

print_success "Docker cleanup cron job configured"

# ===========================================
# Database Backup Cron Job
# ===========================================
print_header "Setting up Database Backup"

cat > /etc/cron.d/db-backup << 'EOF'
# Daily database backup at 2 AM
0 2 * * * ubuntu cd /opt/office-management && docker compose -f docker-compose.prod.yml exec -T postgres pg_dumpall -U postgres | gzip > backups/backup_$(date +\%Y\%m\%d).sql.gz 2>&1 | logger -t db-backup
# Keep only last 7 days of backups
0 3 * * * ubuntu find /opt/office-management/backups -name "backup_*.sql.gz" -mtime +7 -delete 2>&1 | logger -t db-backup-cleanup
EOF

print_success "Database backup cron job configured"

# ===========================================
# Summary
# ===========================================
print_header "Setup Complete!"

echo ""
echo "Server setup is complete. Summary:"
echo ""
echo -e "${GREEN}✓${NC} Docker and Docker Compose installed"
echo -e "${GREEN}✓${NC} Firewall configured (ports 22, 80, 443)"
echo -e "${GREEN}✓${NC} Fail2Ban configured for SSH protection"
echo -e "${GREEN}✓${NC} System optimized for production"
echo -e "${GREEN}✓${NC} Log rotation configured"
echo -e "${GREEN}✓${NC} Automatic security updates enabled"
echo -e "${GREEN}✓${NC} Database backup cron job configured"
echo ""
echo "Next steps:"
echo "  1. Copy your application files to /opt/office-management"
echo "  2. Configure .env.production with your secrets"
echo "  3. From local machine run bootstrap (recommended):"
echo "     GODADDY_API_KEY=... GODADDY_API_SECRET=... ./scripts/ec2-deploy.sh bootstrap"
echo "  4. Or deploy manually: cd /opt/office-management && docker compose -f docker-compose.prod.yml up -d"
echo ""
echo -e "${YELLOW}Important:${NC} Reboot the server to apply all changes"
echo "  sudo reboot"
echo ""

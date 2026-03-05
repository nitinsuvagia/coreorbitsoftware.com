# AWS EC2 Deployment Guide

## Office Management SaaS - Production Deployment

This guide covers deploying the Office Management System to AWS EC2 using Docker.

---

## 📋 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [AWS Setup](#aws-setup)
4. [EC2 Instance Configuration](#ec2-instance-configuration)
5. [DNS Configuration](#dns-configuration)
6. [Deployment Steps](#deployment-steps)
7. [SSL Certificate Setup](#ssl-certificate-setup)
8. [Post-Deployment](#post-deployment)
9. [Maintenance & Operations](#maintenance--operations)
10. [Troubleshooting](#troubleshooting)

---

## 🏗 Architecture Overview

```
                                    ┌─────────────────────────────────────────┐
                                    │            AWS EC2 Instance             │
                                    │          (t3.large or larger)           │
                                    │                                         │
    Internet                        │  ┌──────────────────────────────────┐   │
        │                           │  │            Nginx                 │   │
        │     ┌──────────────┐      │  │     (Reverse Proxy + SSL)        │   │
        └────►│   Route 53   │──────┼─►│                                  │   │
              │    (DNS)     │      │  │  Port 80 → HTTPS Redirect        │   │
              └──────────────┘      │  │  Port 443 → Internal Services    │   │
                                    │  └──────────────┬───────────────────┘   │
                                    │                 │                       │
                                    │    ┌────────────┼────────────┐          │
                                    │    │            │            │          │
                                    │    ▼            ▼            ▼          │
                                    │ ┌──────┐   ┌──────────┐  ┌────────┐    │
                                    │ │Public│   │  Portal  │  │  API   │    │
                                    │ │Website│  │  (Next)  │  │Gateway │    │
                                    │ │:3100 │   │  :3000   │  │ :4000  │    │
                                    │ └──────┘   └──────────┘  └───┬────┘    │
                                    │                              │          │
                                    │         ┌────────────────────┼───────┐  │
                                    │         │    Microservices   │       │  │
                                    │         │                    ▼       │  │
                                    │         │  ┌─────┐ ┌─────┐ ┌─────┐  │  │
                                    │         │  │Auth │ │Emp  │ │Task │  │  │
                                    │         │  │3001 │ │3002 │ │3005 │  │  │
                                    │         │  └──┬──┘ └──┬──┘ └──┬──┘  │  │
                                    │         │     │       │       │      │  │
                                    │         └─────┼───────┼───────┼──────┘  │
                                    │               │       │       │          │
                                    │         ┌─────┴───────┴───────┴─────┐   │
                                    │         │                           │   │
                                    │         │  ┌─────────┐  ┌───────┐  │   │
                                    │         │  │PostgreSQL│  │ Redis │  │   │
                                    │         │  │  :5432  │  │ :6379 │  │   │
                                    │         │  └─────────┘  └───────┘  │   │
                                    │         │      Data Layer          │   │
                                    │         └───────────────────────────┘   │
                                    └─────────────────────────────────────────┘
```

### Domain Structure

| Domain | Service | Description |
|--------|---------|-------------|
| `www.coreorbitsoftware.com` | Public Website | Marketing site, careers |
| `portal.coreorbitsoftware.com` | Web Portal | Main application |
| `api.coreorbitsoftware.com` | API Gateway | REST API endpoints |
| `*.coreorbitsoftware.com` | Tenant Subdomains | Multi-tenant access |

---

## ✅ Prerequisites

### Local Machine
- [ ] AWS CLI installed and configured
- [ ] SSH key pair (`.pem` file)
- [ ] Git installed
- [ ] rsync installed

### AWS Account
- [ ] IAM user with EC2, Route53, S3, SES permissions
- [ ] VPC configured (or use default)
- [ ] Key pair created in target region

---

## 🔧 AWS Setup

### Step 1: Create EC2 Instance

1. **Go to AWS Console → EC2 → Launch Instance**

2. **Choose AMI:**
   - Ubuntu Server 22.04 LTS (HVM), SSD Volume Type
   - 64-bit (x86)

3. **Choose Instance Type:**
   | Environment | Recommended | vCPUs | Memory |
   |-------------|-------------|-------|--------|
   | Minimum | t3.medium | 2 | 4 GB |
   | Production | t3.large | 2 | 8 GB |
   | High Traffic | t3.xlarge | 4 | 16 GB |

4. **Configure Instance:**
   - Network: Default VPC or your VPC
   - Subnet: Public subnet
   - Auto-assign Public IP: Enable
   - IAM role: (Optional) Create role for S3/SES access

5. **Add Storage:**
   - Root: 50 GB gp3 (minimum)
   - Recommended: 100 GB gp3 for production

6. **Configure Security Group:**
   
   Create a new security group with these rules:
   
   | Type | Protocol | Port | Source | Description |
   |------|----------|------|--------|-------------|
   | SSH | TCP | 22 | Your IP | SSH access |
   | HTTP | TCP | 80 | 0.0.0.0/0 | Web traffic |
   | HTTPS | TCP | 443 | 0.0.0.0/0 | Secure web traffic |

7. **Launch and download key pair**

### Step 2: Allocate Elastic IP (Recommended)

1. Go to **EC2 → Elastic IPs → Allocate**
2. Select and **Associate** with your instance
3. Note the Elastic IP address

---

## 🌐 DNS Configuration

### Route 53 Setup

1. **Go to Route 53 → Hosted Zones**

2. **Create or select hosted zone** for `coreorbitsoftware.com`

3. **Create A Records:**

   | Name | Type | Value |
   |------|------|-------|
   | `coreorbitsoftware.com` | A | `<EC2-IP>` |
   | `www.coreorbitsoftware.com` | A | `<EC2-IP>` |
   | `portal.coreorbitsoftware.com` | A | `<EC2-IP>` |
   | `api.coreorbitsoftware.com` | A | `<EC2-IP>` |
   | `*.coreorbitsoftware.com` | A | `<EC2-IP>` |

4. **Update Domain Registrar** (if not using Route 53):
   - Point nameservers to Route 53 NS records

### Verify DNS

```bash
# Check DNS propagation
dig www.coreorbitsoftware.com +short
dig portal.coreorbitsoftware.com +short
dig api.coreorbitsoftware.com +short
```

---

## 🚀 Deployment Steps

### Step 1: Configure Local Environment

```bash
# Clone repository (if not already)
cd /path/to/office-management

# Copy and configure production environment
cp .env.production.example .env.production

# Edit with your production values
nano .env.production
```

**Important settings to configure in `.env.production`:**

```bash
# Database - Generate strong passwords!
DB_PASSWORD=<generate-strong-password>

# Redis
REDIS_PASSWORD=<generate-strong-password>

# JWT Secrets - Generate with: openssl rand -base64 48
JWT_SECRET=<generate-64-char-secret>
JWT_REFRESH_SECRET=<generate-another-64-char-secret>

# Encryption Key - Generate with: openssl rand -hex 16
ENCRYPTION_KEY=<generate-32-char-key>

# AWS Credentials
AWS_ACCESS_KEY_ID=<your-access-key>
AWS_SECRET_ACCESS_KEY=<your-secret-key>

# Email (SMTP)
SMTP_HOST=<your-smtp-host>
SMTP_USER=<your-smtp-user>
SMTP_PASSWORD=<your-smtp-password>
```

### Step 2: Configure Deployment Script

```bash
# Edit the deployment script
nano scripts/ec2-deploy.sh

# Update these variables:
EC2_HOST="your-ec2-elastic-ip"
EC2_USER="ubuntu"
SSH_KEY="~/.ssh/your-key.pem"
```

Or use environment variables:

```bash
export EC2_HOST="54.123.45.67"
export EC2_USER="ubuntu"
export SSH_KEY="~/.ssh/my-ec2-key.pem"
```

### Step 3: Make Scripts Executable

```bash
chmod +x scripts/ec2-deploy.sh
chmod +x scripts/ec2-server-setup.sh
```

### Step 4: Setup Server

```bash
# Run initial server setup (only once)
./scripts/ec2-deploy.sh setup
```

This will:
- Install Docker and Docker Compose
- Configure firewall (UFW)
- Setup Fail2Ban for SSH protection
- Optimize system settings
- Create application directories
- Configure log rotation
- Setup backup cron jobs

### Step 5 (Recommended): First-Time Bootstrap (Setup + Deploy + SSL)

If you use GoDaddy DNS, run this single command from your local machine:

```bash
export GODADDY_API_KEY="your-godaddy-api-key"
export GODADDY_API_SECRET="your-godaddy-api-secret"
export SSL_EMAIL="admin@coreorbitsoftware.com"   # optional

./scripts/ec2-deploy.sh bootstrap
```

This will:
- Setup the EC2 server
- Deploy the application
- Issue wildcard SSL for `coreorbitsoftware.com` and `*.coreorbitsoftware.com`
- Configure automatic renewal and nginx reload

### Step 6: Deploy Application (Recommended)

```bash
# Deploy the application
./scripts/ec2-deploy.sh deploy
```

This will:
- Sync files to server
- Copy production environment
- Build Docker images
- Start all services
- **Automatically setup SSL** if not already configured
- Configure auto-renewal for certificates

> **Note:** SSL is automatically configured during deployment. The script detects if certificates are missing or expired and sets them up using Let's Encrypt Certbot. No manual SSL setup needed!

### Manual SSL Setup (Only if automatic setup fails)

If DNS is not yet propagated or automatic SSL fails:

```bash
# Manual SSL setup
./scripts/ec2-deploy.sh ssl-certbot
```

---

## 🔐 SSL Certificate Setup

> **Note:** SSL is now **automatically configured** during `./scripts/ec2-deploy.sh deploy`. 
> The sections below are for manual setup or troubleshooting only.

### Option A: Certbot Standalone (Recommended for Quick Setup)

This is the simplest method using Let's Encrypt with Certbot standalone mode.

**Prerequisites:**
- DNS A records pointing to your EC2 IP for all domains
- Ports 80 and 443 open in AWS Security Group

**Automated Setup:**
```bash
./scripts/ec2-deploy.sh ssl-certbot
```

**Manual Setup (if needed):**

```bash
# 1. SSH into the server
./scripts/ec2-deploy.sh shell

# 2. Install certbot
sudo apt update && sudo apt install certbot -y

# 3. Stop nginx to free port 80
docker stop oms-nginx

# 4. Obtain certificates for all domains
sudo certbot certonly --standalone \
  -d coreorbitsoftware.com \
  -d www.coreorbitsoftware.com \
  -d api.coreorbitsoftware.com \
  -d portal.coreorbitsoftware.com \
  --email admin@coreorbitsoftware.com \
  --agree-tos \
  --non-interactive

# 5. Copy certificates to nginx directory
sudo mkdir -p /home/ubuntu/app/nginx/ssl
sudo cp /etc/letsencrypt/live/coreorbitsoftware.com/fullchain.pem /home/ubuntu/app/nginx/ssl/
sudo cp /etc/letsencrypt/live/coreorbitsoftware.com/privkey.pem /home/ubuntu/app/nginx/ssl/
sudo chmod 644 /home/ubuntu/app/nginx/ssl/*.pem

# 6. Copy SSL-enabled nginx config (from local machine)
# The default.conf in deployment/nginx/conf.d/ already has SSL configured

# 7. Find the Docker network name
docker inspect oms-api-gateway --format='{{range $k, $v := .NetworkSettings.Networks}}{{$k}}{{end}}'
# Usually: office-management_oms-network

# 8. Start nginx with SSL volumes mounted
docker rm -f oms-nginx
docker run -d \
  --name oms-nginx \
  --network office-management_oms-network \
  -p 80:80 \
  -p 443:443 \
  -v /home/ubuntu/app/nginx/conf.d:/etc/nginx/conf.d:ro \
  -v /home/ubuntu/app/nginx/ssl:/etc/nginx/ssl:ro \
  -v /var/www/certbot:/var/www/certbot:ro \
  --health-cmd="curl -f http://localhost/health || exit 1" \
  --health-interval=30s \
  --restart unless-stopped \
  nginx:alpine

# 9. Verify SSL is working
curl -sI https://coreorbitsoftware.com | head -5
```

**Auto-Renewal Setup:**
```bash
# Add cron job for auto-renewal
echo '0 3 * * * root certbot renew --quiet --pre-hook "docker stop oms-nginx" --post-hook "docker start oms-nginx" && cp /etc/letsencrypt/live/coreorbitsoftware.com/*.pem /home/ubuntu/app/nginx/ssl/' | sudo tee /etc/cron.d/certbot-renew
```

### Option B: GoDaddy API + Wildcard

Use this method if you need wildcard certificates for tenant subdomains (`*.coreorbitsoftware.com`).

```bash
export GODADDY_API_KEY="your-godaddy-api-key"
export GODADDY_API_SECRET="your-godaddy-api-secret"
./scripts/ec2-deploy.sh ssl-godaddy
```

The script uses `acme.sh` + GoDaddy DNS API to issue:
- `coreorbitsoftware.com`
- `*.coreorbitsoftware.com`

Certificates are installed to:
- `/opt/office-management/deployment/nginx/ssl/fullchain.pem`
- `/opt/office-management/deployment/nginx/ssl/privkey.pem`

### SSL Certificate Locations

| File | Location |
|------|----------|
| Certificate | `/home/ubuntu/app/nginx/ssl/fullchain.pem` |
| Private Key | `/home/ubuntu/app/nginx/ssl/privkey.pem` |
| Let's Encrypt originals | `/etc/letsencrypt/live/coreorbitsoftware.com/` |

### Verify SSL

```bash
# Check certificate details
echo | openssl s_client -connect coreorbitsoftware.com:443 -servername coreorbitsoftware.com 2>/dev/null | openssl x509 -noout -dates -subject -issuer

# Test HTTPS endpoints
curl -sI https://coreorbitsoftware.com | head -5
curl -sI https://api.coreorbitsoftware.com | head -5
curl -sI https://portal.coreorbitsoftware.com | head -5
```

---

## ✅ Post-Deployment

### Verify Deployment

```bash
# Check service status
./scripts/ec2-deploy.sh status

# View logs
./scripts/ec2-deploy.sh logs

# Test endpoints
curl -I https://www.coreorbitsoftware.com
curl -I https://portal.coreorbitsoftware.com
curl -I https://api.coreorbitsoftware.com/health
```

### Run Database Migrations

```bash
./scripts/ec2-deploy.sh migrate
```

### Create Admin User

```bash
./scripts/ec2-deploy.sh shell

# On server
cd /opt/office-management
docker compose -f docker-compose.prod.yml exec auth-service npm run seed:admin
```

---

## 🔧 Maintenance & Operations

### Common Commands

```bash
# View all logs
./scripts/ec2-deploy.sh logs

# View specific service logs
./scripts/ec2-deploy.sh logs api-gateway
./scripts/ec2-deploy.sh logs web
./scripts/ec2-deploy.sh logs auth-service

# Check status
./scripts/ec2-deploy.sh status

# Restart all services
./scripts/ec2-deploy.sh restart

# Restart specific service
./scripts/ec2-deploy.sh restart web

# Stop all services
./scripts/ec2-deploy.sh stop

# Access server shell
./scripts/ec2-deploy.sh shell

# Access database shell
./scripts/ec2-deploy.sh db-shell

# Backup database
./scripts/ec2-deploy.sh backup

# Update application
./scripts/ec2-deploy.sh update
```

### Updating the Application

```bash
# Make code changes locally, then:
./scripts/ec2-deploy.sh update
```

### Database Backup

Automatic daily backups are configured. Manual backup:

```bash
./scripts/ec2-deploy.sh backup
# Downloads to ./backups/backup_YYYYMMDD_HHMMSS.sql.gz
```

### Restore Database

```bash
# SSH into server
./scripts/ec2-deploy.sh shell

# Restore from backup
cd /opt/office-management
gunzip -c backups/backup_20260304.sql.gz | docker compose -f docker-compose.prod.yml exec -T postgres psql -U postgres
```

### Scaling

For horizontal scaling, consider:

1. **RDS for Database**: Move PostgreSQL to AWS RDS
2. **ElastiCache for Redis**: Move Redis to ElastiCache
3. **Load Balancer**: Add ALB in front of multiple EC2 instances
4. **ECS/EKS**: Migrate to container orchestration

---

## 🔍 Troubleshooting

### Service Won't Start

```bash
# Check logs
./scripts/ec2-deploy.sh logs <service-name>

# Check Docker status
./scripts/ec2-deploy.sh shell
docker ps -a
docker compose -f docker-compose.prod.yml logs --tail=100
```

### Database Connection Issues

```bash
# Check postgres is running
docker compose -f docker-compose.prod.yml ps postgres

# Check postgres logs
docker compose -f docker-compose.prod.yml logs postgres

# Test connection
docker compose -f docker-compose.prod.yml exec postgres psql -U postgres -c '\l'
```

### SSL Certificate Issues

```bash
# Check certificate expiry
./scripts/ec2-deploy.sh shell

# acme.sh certificates
~/.acme.sh/acme.sh --list

# Manual renewal
~/.acme.sh/acme.sh --renew -d coreorbitsoftware.com

# Copy renewed certificates
~/.acme.sh/acme.sh --install-cert -d coreorbitsoftware.com \
   --fullchain-file /opt/office-management/deployment/nginx/ssl/fullchain.pem \
   --key-file /opt/office-management/deployment/nginx/ssl/privkey.pem
docker compose -f docker-compose.prod.yml restart nginx
```

### Memory Issues

```bash
# Check memory usage
./scripts/ec2-deploy.sh shell
free -h
docker stats --no-stream

# Clean up Docker
docker system prune -af
```

### Disk Space Issues

```bash
# Check disk usage
df -h

# Clean old backups
find /opt/office-management/backups -name "*.sql.gz" -mtime +7 -delete

# Clean Docker
docker system prune -af --volumes
```

---

## 📊 Monitoring (Optional)

### AWS CloudWatch

1. Install CloudWatch agent on EC2
2. Configure metrics for CPU, Memory, Disk
3. Set up alarms for thresholds

### Application Monitoring

Add to `.env.production`:

```bash
# Sentry for error tracking
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx

# Datadog (optional)
DD_API_KEY=your-datadog-api-key
```

---

## 💰 Cost Estimation

| Resource | Type | Monthly Cost (USD) |
|----------|------|-------------------|
| EC2 | t3.large | ~$60-70 |
| Elastic IP | 1 | ~$3.65 |
| EBS Storage | 100GB gp3 | ~$10 |
| Data Transfer | 100GB | ~$9 |
| Route 53 | Hosted Zone | ~$0.50 |
| **Total** | | **~$85-95/month** |

For production with RDS and ElastiCache:
- Add ~$50-100 for RDS (db.t3.micro/small)
- Add ~$15-30 for ElastiCache (cache.t3.micro)

---

## 🔒 Security Checklist

- [ ] Strong passwords for all services
- [ ] SSH key-based authentication only
- [ ] Security groups properly configured
- [ ] SSL/TLS certificates installed
- [ ] Regular security updates enabled
- [ ] Fail2Ban configured
- [ ] Database not exposed to internet
- [ ] Redis password protected
- [ ] Environment variables secured
- [ ] Regular backups configured

---

## 📞 Support

For issues:
1. Check logs: `./scripts/ec2-deploy.sh logs`
2. Check status: `./scripts/ec2-deploy.sh status`
3. Review this documentation
4. Contact support team

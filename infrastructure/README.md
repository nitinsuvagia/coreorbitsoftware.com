# AWS ECS EC2 Deployment Guide
# Office Management SaaS

This guide covers deploying the Office Management SaaS application to AWS using ECS with EC2 instances.

## Architecture Overview

```
                                    ┌─────────────────────────────────────────┐
                                    │              Route 53                    │
                                    │         (DNS Management)                 │
                                    └─────────────┬───────────────────────────┘
                                                  │
                                    ┌─────────────▼───────────────────────────┐
                                    │    Application Load Balancer (ALB)       │
                                    │         (HTTPS Termination)              │
                                    └─────────────┬───────────────────────────┘
                                                  │
                    ┌─────────────────────────────┼─────────────────────────────┐
                    │                             │                             │
          ┌─────────▼─────────┐         ┌─────────▼─────────┐                   │
          │   /api/* routes   │         │  Web App (Next.js) │                   │
          │    API Gateway    │         │   *.domain.com     │                   │
          └─────────┬─────────┘         └───────────────────┘                   │
                    │                                                            │
    ┌───────────────┼───────────────────────────────────────┐                   │
    │               │            ECS Cluster                │                   │
    │   ┌───────────┴───────────┐                           │                   │
    │   │                       │                           │                   │
    │   ▼                       ▼                           │                   │
    │ ┌────────────┐  ┌────────────┐  ┌────────────┐       │                   │
    │ │Auth Service│  │Employee Svc│  │Project Svc │  ...  │                   │
    │ └─────┬──────┘  └─────┬──────┘  └─────┬──────┘       │                   │
    │       │               │               │               │                   │
    │       └───────────────┴───────────────┘               │                   │
    │                       │                               │                   │
    │         ┌─────────────┴─────────────┐                 │                   │
    │         │    Service Discovery      │                 │                   │
    │         │   (Cloud Map / DNS)       │                 │                   │
    │         └───────────────────────────┘                 │                   │
    └───────────────────────────────────────────────────────┘                   │
                    │                                                            │
    ┌───────────────┼───────────────────────────────────────┐                   │
    │               │            Private Subnets            │                   │
    │   ┌───────────▼───────────┐   ┌───────────────────┐   │                   │
    │   │    RDS PostgreSQL     │   │  ElastiCache      │   │                   │
    │   │    (Multi-AZ)         │   │  Redis Cluster    │   │                   │
    │   └───────────────────────┘   └───────────────────┘   │                   │
    └───────────────────────────────────────────────────────┘                   │
```

## Prerequisites

1. **AWS CLI** - Configured with appropriate credentials
2. **Terraform** - Version 1.0+
3. **Docker** - For building container images
4. **jq** - For JSON processing in scripts

### Install Prerequisites (macOS)

```bash
# Install Homebrew if not already installed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install required tools
brew install awscli terraform docker jq

# Configure AWS CLI
aws configure
```

## Quick Start

### 1. Initial Setup

```bash
# Make scripts executable
chmod +x scripts/aws-*.sh

# Run the setup script (creates infrastructure + deploys)
./scripts/aws-setup.sh
```

### 2. Manual Deployment Steps

If you prefer step-by-step deployment:

```bash
# 1. Initialize Terraform
cd infrastructure/terraform
terraform init

# 2. Create terraform.tfvars (copy and edit example)
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your values

# 3. Plan and apply
terraform plan
terraform apply

# 4. Build and push Docker images
cd ../..
./scripts/aws-build-push.sh

# 5. Deploy to ECS
./scripts/aws-deploy.sh

# 6. Run database migrations
./scripts/aws-migrate.sh
```

## Configuration

### Environment Variables

Set these before running scripts:

```bash
export PROJECT_NAME=office-mgmt
export AWS_REGION=us-east-1
export TAG=latest
```

### Terraform Variables

Key variables in `terraform.tfvars`:

| Variable | Description | Default |
|----------|-------------|---------|
| `aws_region` | AWS region | `us-east-1` |
| `environment` | Environment name | `production` |
| `project_name` | Project prefix | `office-mgmt` |
| `domain_name` | Your domain | `officemanagement.com` |
| `ecs_instance_type` | EC2 instance type | `t3.large` |
| `ecs_min_instances` | Min EC2 instances | `2` |
| `ecs_max_instances` | Max EC2 instances | `6` |
| `db_instance_class` | RDS instance class | `db.t3.medium` |
| `redis_node_type` | Redis node type | `cache.t3.medium` |

### Sensitive Variables

These should be provided via environment variables or secrets management:

```bash
export TF_VAR_db_password="your-secure-password"
export TF_VAR_jwt_secret="your-jwt-secret"
```

## Scripts Reference

| Script | Description |
|--------|-------------|
| `aws-setup.sh` | Complete initial setup |
| `aws-status.sh` | Check deployment status |
| `aws-build-push.sh [service]` | Build and push Docker images |
| `aws-deploy.sh [service]` | Deploy services to ECS |
| `aws-migrate.sh` | Run database migrations |
| `aws-logs.sh <service> [lines]` | View service logs |
| `aws-exec.sh <service>` | Shell into running container |
| `aws-scale.sh <service> <count>` | Scale a service |

### Examples

```bash
# Build and push only api-gateway
./scripts/aws-build-push.sh api-gateway

# Deploy only web-app
./scripts/aws-deploy.sh web-app

# View last 200 lines of auth-service logs
./scripts/aws-logs.sh auth-service 200

# Follow logs in real-time
./scripts/aws-logs.sh api-gateway 100 -f

# Shell into api-gateway container
./scripts/aws-exec.sh api-gateway

# Scale api-gateway to 4 tasks
./scripts/aws-scale.sh api-gateway 4

# Scale all services to 2 tasks
./scripts/aws-scale.sh all 2
```

## DNS Configuration

After deployment, update your domain's DNS:

1. Get the ALB DNS name:
   ```bash
   cd infrastructure/terraform
   terraform output alb_dns_name
   ```

2. Create DNS records:
   - **A Record** (or ALIAS): `yourdomain.com` → ALB DNS
   - **CNAME** (or ALIAS): `*.yourdomain.com` → ALB DNS

### Using Route 53

Uncomment the Route 53 section in `alb.tf` and provide your hosted zone.

## SSL/TLS Certificates

### Option 1: Auto-create with ACM (Recommended)

The infrastructure automatically creates an ACM certificate. Validate it via DNS:

1. Go to AWS Certificate Manager
2. Find the pending certificate
3. Create the CNAME records shown

### Option 2: Existing Certificate

Set `acm_certificate_arn` in your `terraform.tfvars`:

```hcl
acm_certificate_arn = "arn:aws:acm:us-east-1:123456789:certificate/abc123..."
```

## Monitoring

### CloudWatch Logs

All services log to CloudWatch at `/ecs/office-mgmt`

### CloudWatch Alarms

Pre-configured alarms for:
- ECS CPU/Memory utilization
- RDS connections and storage
- Redis memory usage
- ALB target health

### SNS Notifications

Subscribe to the alerts topic for notifications:

```bash
aws sns subscribe \
    --topic-arn arn:aws:sns:us-east-1:ACCOUNT:office-mgmt-alerts \
    --protocol email \
    --notification-endpoint your-email@example.com
```

## Scaling

### Manual Scaling

```bash
# Scale individual service
./scripts/aws-scale.sh api-gateway 4

# Scale all services
./scripts/aws-scale.sh all 3
```

### Auto Scaling

The ECS cluster uses capacity providers for automatic EC2 scaling:
- Target: 80% cluster utilization
- Min instances: 2
- Max instances: 6

Service-level auto scaling can be added via `aws_appautoscaling_target` and `aws_appautoscaling_policy`.

## CI/CD Pipeline

GitHub Actions workflows are provided:

- **`.github/workflows/deploy.yml`** - Builds and deploys on push to main/staging
- **`.github/workflows/infrastructure.yml`** - Manages Terraform infrastructure

### Required GitHub Secrets

```
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
AWS_ACCOUNT_ID
DB_PASSWORD
JWT_SECRET
SLACK_WEBHOOK_URL (optional)
```

## Troubleshooting

### Service Not Starting

1. Check logs:
   ```bash
   ./scripts/aws-logs.sh <service-name>
   ```

2. Check task status:
   ```bash
   aws ecs describe-tasks --cluster office-mgmt-cluster --tasks <task-arn>
   ```

### Database Connection Issues

1. Verify security groups allow traffic
2. Check secrets are properly set
3. Verify RDS is in "available" state

### Container Health Check Failing

1. Ensure `/health` endpoint returns 200
2. Check container is listening on correct port
3. Review container logs

### ECS Exec Not Working

1. Ensure SSM agent is running on EC2 instances
2. Check task role has SSM permissions
3. Verify `enable_execute_command = true` in service

## Cost Estimation

| Resource | Configuration | Est. Monthly Cost |
|----------|--------------|-------------------|
| EC2 (ECS) | 2x t3.large | ~$120 |
| RDS | db.t3.medium Multi-AZ | ~$100 |
| ElastiCache | 2x cache.t3.medium | ~$50 |
| ALB | 1 ALB | ~$20 |
| NAT Gateway | 3 NAT Gateways | ~$100 |
| Data Transfer | ~50GB | ~$5 |
| **Total** | | **~$395/month** |

### Cost Optimization Tips

1. Use Reserved Instances for EC2/RDS (up to 40% savings)
2. Reduce NAT Gateways to 1 for dev/staging
3. Use smaller instance types for non-production
4. Enable RDS storage autoscaling instead of over-provisioning

## Cleanup

To destroy all resources:

```bash
cd infrastructure/terraform
terraform destroy
```

⚠️ **Warning**: This will delete all data including databases!

## Support

For issues or questions:
1. Check CloudWatch logs
2. Review AWS ECS console
3. Check GitHub Actions workflow logs

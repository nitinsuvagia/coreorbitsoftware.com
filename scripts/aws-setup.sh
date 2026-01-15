#!/bin/bash
# AWS ECS EC2 Deployment Setup Script
# Office Management SaaS

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="${PROJECT_NAME:-office-mgmt}"
AWS_REGION="${AWS_REGION:-us-east-1}"
TERRAFORM_DIR="infrastructure/terraform"

# Functions
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

check_command() {
    if ! command -v $1 &> /dev/null; then
        print_error "$1 is not installed. Please install it first."
        exit 1
    fi
    print_success "$1 is installed"
}

# ============================================
# Check Prerequisites
# ============================================
print_header "Checking Prerequisites"

check_command "aws"
check_command "terraform"
check_command "docker"
check_command "jq"

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    print_error "AWS credentials not configured. Run 'aws configure' first."
    exit 1
fi
print_success "AWS credentials configured"

AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query 'Account' --output text)
print_success "AWS Account ID: $AWS_ACCOUNT_ID"

# ============================================
# Create terraform.tfvars
# ============================================
print_header "Creating Terraform Configuration"

if [ ! -f "$TERRAFORM_DIR/terraform.tfvars" ]; then
    print_warning "terraform.tfvars not found. Creating from example..."
    
    # Generate random passwords if not provided
    DB_PASSWORD="${DB_PASSWORD:-$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 24)}"
    JWT_SECRET="${JWT_SECRET:-$(openssl rand -base64 48 | tr -dc 'a-zA-Z0-9' | head -c 48)}"
    
    cat > "$TERRAFORM_DIR/terraform.tfvars" << EOF
aws_region  = "$AWS_REGION"
environment = "production"
project_name = "$PROJECT_NAME"

# VPC Configuration
vpc_cidr = "10.0.0.0/16"
availability_zones = ["${AWS_REGION}a", "${AWS_REGION}b", "${AWS_REGION}c"]
public_subnet_cidrs = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
private_subnet_cidrs = ["10.0.10.0/24", "10.0.20.0/24", "10.0.30.0/24"]

# ECS EC2 Configuration
ecs_instance_type = "t3.large"
ecs_min_instances = 2
ecs_max_instances = 6
ecs_desired_instances = 2

# Database Configuration
db_instance_class = "db.t3.medium"
db_allocated_storage = 100
db_max_allocated_storage = 500
db_name = "office_management"
db_username = "admin"
db_password = "$DB_PASSWORD"
db_multi_az = true

# Redis Configuration
redis_node_type = "cache.t3.medium"
redis_num_cache_nodes = 2

# Application Configuration
domain_name = "officemanagement.com"
jwt_secret = "$JWT_SECRET"
jwt_expires_in = "24h"

# Service Task Counts
api_gateway_desired_count = 2
auth_service_desired_count = 2
employee_service_desired_count = 2
attendance_service_desired_count = 2
project_service_desired_count = 2
task_service_desired_count = 2
notification_service_desired_count = 1
document_service_desired_count = 2
billing_service_desired_count = 1
report_service_desired_count = 1
web_app_desired_count = 2

# Logging
log_retention_days = 30

# SSL/TLS
acm_certificate_arn = ""
EOF
    
    print_success "terraform.tfvars created"
    print_warning "Please review and update domain_name in $TERRAFORM_DIR/terraform.tfvars"
    echo ""
    echo "Generated credentials (save these securely):"
    echo "  DB_PASSWORD: $DB_PASSWORD"
    echo "  JWT_SECRET: $JWT_SECRET"
    echo ""
else
    print_success "terraform.tfvars already exists"
fi

# ============================================
# Initialize Terraform
# ============================================
print_header "Initializing Terraform"

cd "$TERRAFORM_DIR"
terraform init
print_success "Terraform initialized"

# ============================================
# Validate Terraform Configuration
# ============================================
print_header "Validating Terraform Configuration"

terraform validate
print_success "Terraform configuration is valid"

# ============================================
# Show Terraform Plan
# ============================================
print_header "Terraform Plan"

terraform plan -out=tfplan

echo ""
print_warning "Review the plan above carefully before proceeding."
echo ""

read -p "Do you want to apply this plan? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
    print_warning "Deployment cancelled."
    exit 0
fi

# ============================================
# Apply Terraform
# ============================================
print_header "Applying Terraform Configuration"

terraform apply tfplan
print_success "Infrastructure deployed successfully"

# Get outputs
ALB_DNS=$(terraform output -raw alb_dns_name 2>/dev/null || echo "N/A")
RDS_ENDPOINT=$(terraform output -raw rds_endpoint 2>/dev/null || echo "N/A")
REDIS_ENDPOINT=$(terraform output -raw redis_endpoint 2>/dev/null || echo "N/A")
ECS_CLUSTER=$(terraform output -raw ecs_cluster_name 2>/dev/null || echo "N/A")

cd - > /dev/null

# ============================================
# Build and Push Docker Images
# ============================================
print_header "Building and Pushing Docker Images"

ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

# Login to ECR
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REGISTRY
print_success "Logged in to ECR"

# Build and push each service
SERVICES=(
    "api-gateway:services/api-gateway"
    "auth-service:services/auth-service"
    "employee-service:services/employee-service"
    "attendance-service:services/attendance-service"
    "project-service:services/project-service"
    "task-service:services/task-service"
    "notification-service:services/notification-service"
    "document-service:services/document-service"
    "billing-service:services/billing-service"
    "report-service:services/report-service"
    "web-app:apps/web"
)

for SERVICE in "${SERVICES[@]}"; do
    SERVICE_NAME="${SERVICE%%:*}"
    SERVICE_PATH="${SERVICE##*:}"
    
    echo ""
    echo "Building $SERVICE_NAME..."
    
    docker build -t "$ECR_REGISTRY/$PROJECT_NAME/$SERVICE_NAME:latest" -f "$SERVICE_PATH/Dockerfile" .
    docker push "$ECR_REGISTRY/$PROJECT_NAME/$SERVICE_NAME:latest"
    
    print_success "$SERVICE_NAME built and pushed"
done

# ============================================
# Force New Deployment
# ============================================
print_header "Triggering ECS Deployments"

ECS_SERVICES=(
    "api-gateway"
    "auth-service"
    "employee-service"
    "attendance-service"
    "project-service"
    "task-service"
    "notification-service"
    "document-service"
    "billing-service"
    "report-service"
    "web-app"
)

for SERVICE in "${ECS_SERVICES[@]}"; do
    echo "Updating $SERVICE..."
    aws ecs update-service \
        --cluster "$PROJECT_NAME-cluster" \
        --service "$SERVICE" \
        --force-new-deployment \
        --region $AWS_REGION > /dev/null
    print_success "$SERVICE deployment triggered"
done

# ============================================
# Summary
# ============================================
print_header "Deployment Complete!"

echo "Infrastructure Details:"
echo "----------------------"
echo "  ECS Cluster:    $ECS_CLUSTER"
echo "  ALB DNS:        $ALB_DNS"
echo "  RDS Endpoint:   $RDS_ENDPOINT"
echo "  Redis Endpoint: $REDIS_ENDPOINT"
echo ""
echo "Next Steps:"
echo "-----------"
echo "1. Update your domain's DNS to point to the ALB:"
echo "   $ALB_DNS"
echo ""
echo "2. Wait for SSL certificate validation (if using ACM)"
echo ""
echo "3. Run database migrations:"
echo "   ./scripts/aws-migrate.sh"
echo ""
echo "4. Monitor deployment status:"
echo "   ./scripts/aws-status.sh"
echo ""
print_success "Setup complete!"

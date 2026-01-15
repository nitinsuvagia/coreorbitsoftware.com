#!/bin/bash
# AWS ECS Database Migration Script
# Office Management SaaS

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
PROJECT_NAME="${PROJECT_NAME:-office-mgmt}"
AWS_REGION="${AWS_REGION:-us-east-1}"
ECS_CLUSTER="${PROJECT_NAME}-cluster"

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

# ============================================
# Run Migrations
# ============================================
print_header "Running Database Migrations"

# Find a running task from auth-service
echo "Finding a running auth-service task..."

TASK_ARN=$(aws ecs list-tasks \
    --cluster $ECS_CLUSTER \
    --service-name auth-service \
    --desired-status RUNNING \
    --region $AWS_REGION \
    --query 'taskArns[0]' \
    --output text)

if [ "$TASK_ARN" == "None" ] || [ -z "$TASK_ARN" ]; then
    print_error "No running auth-service tasks found. Make sure the service is running."
    exit 1
fi

print_success "Found task: $TASK_ARN"

# Run migrations using ECS Exec
echo ""
echo "Running Prisma migrations..."
echo ""

aws ecs execute-command \
    --cluster $ECS_CLUSTER \
    --task $TASK_ARN \
    --container auth-service \
    --interactive \
    --command "npx prisma migrate deploy" \
    --region $AWS_REGION

print_success "Migrations completed"

# ============================================
# Seed Database (Optional)
# ============================================
read -p "Do you want to seed the database? (yes/no): " SEED_CONFIRM

if [ "$SEED_CONFIRM" == "yes" ]; then
    print_header "Seeding Database"
    
    aws ecs execute-command \
        --cluster $ECS_CLUSTER \
        --task $TASK_ARN \
        --container auth-service \
        --interactive \
        --command "npx prisma db seed" \
        --region $AWS_REGION
    
    print_success "Database seeded"
fi

echo ""
print_success "Migration complete!"

#!/bin/bash
# AWS ECS Service Deployment Script
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
TAG="${TAG:-latest}"

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

# Get AWS Account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query 'Account' --output text)
ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

# Services
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

# Parse arguments
DEPLOY_SERVICE="${1:-all}"
WAIT_FOR_STABLE="${2:-true}"

print_header "Deploying to ECS"

echo "Configuration:"
echo "  Cluster: $ECS_CLUSTER"
echo "  Region: $AWS_REGION"
echo "  Tag: $TAG"
echo "  Service: $DEPLOY_SERVICE"
echo ""

deploy_service() {
    local SERVICE=$1
    local IMAGE="$ECR_REGISTRY/$PROJECT_NAME/$SERVICE:$TAG"
    
    echo "Deploying $SERVICE..."
    
    # Get current task definition
    TASK_DEF=$(aws ecs describe-services \
        --cluster $ECS_CLUSTER \
        --services $SERVICE \
        --region $AWS_REGION \
        --query 'services[0].taskDefinition' \
        --output text)
    
    if [ "$TASK_DEF" == "None" ]; then
        print_error "Service $SERVICE not found"
        return 1
    fi
    
    # Get task definition details
    aws ecs describe-task-definition \
        --task-definition $TASK_DEF \
        --region $AWS_REGION \
        --query 'taskDefinition' > /tmp/task-def.json
    
    # Update image in task definition
    jq --arg IMAGE "$IMAGE" \
        '.containerDefinitions[0].image = $IMAGE | 
         del(.taskDefinitionArn, .revision, .status, .requiresAttributes, .compatibilities, .registeredAt, .registeredBy)' \
        /tmp/task-def.json > /tmp/new-task-def.json
    
    # Register new task definition
    NEW_TASK_DEF=$(aws ecs register-task-definition \
        --cli-input-json file:///tmp/new-task-def.json \
        --region $AWS_REGION \
        --query 'taskDefinition.taskDefinitionArn' \
        --output text)
    
    # Update service
    aws ecs update-service \
        --cluster $ECS_CLUSTER \
        --service $SERVICE \
        --task-definition $NEW_TASK_DEF \
        --force-new-deployment \
        --region $AWS_REGION > /dev/null
    
    print_success "$SERVICE deployment initiated"
}

# Deploy services
for SERVICE in "${ECS_SERVICES[@]}"; do
    if [ "$DEPLOY_SERVICE" == "all" ] || [ "$DEPLOY_SERVICE" == "$SERVICE" ]; then
        deploy_service $SERVICE
    fi
done

# Wait for services to stabilize
if [ "$WAIT_FOR_STABLE" == "true" ]; then
    print_header "Waiting for Services to Stabilize"
    
    for SERVICE in "${ECS_SERVICES[@]}"; do
        if [ "$DEPLOY_SERVICE" == "all" ] || [ "$DEPLOY_SERVICE" == "$SERVICE" ]; then
            echo "Waiting for $SERVICE..."
            aws ecs wait services-stable \
                --cluster $ECS_CLUSTER \
                --services $SERVICE \
                --region $AWS_REGION
            print_success "$SERVICE is stable"
        fi
    done
fi

print_header "Deployment Complete"

# Show status
./scripts/aws-status.sh 2>/dev/null || true

print_success "All services deployed successfully!"

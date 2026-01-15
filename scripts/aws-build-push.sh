#!/bin/bash
# AWS ECS Build and Push Script
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

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Get AWS Account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query 'Account' --output text)
ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

# Services to build
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

# Parse arguments
BUILD_SERVICE="${1:-all}"

print_header "Building Docker Images"

echo "Configuration:"
echo "  Project: $PROJECT_NAME"
echo "  Region: $AWS_REGION"
echo "  Registry: $ECR_REGISTRY"
echo "  Tag: $TAG"
echo "  Service: $BUILD_SERVICE"
echo ""

# Login to ECR
echo "Logging in to ECR..."
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REGISTRY
print_success "Logged in to ECR"

# Build and push
for SERVICE in "${SERVICES[@]}"; do
    SERVICE_NAME="${SERVICE%%:*}"
    SERVICE_PATH="${SERVICE##*:}"
    
    # Skip if specific service requested and this isn't it
    if [ "$BUILD_SERVICE" != "all" ] && [ "$BUILD_SERVICE" != "$SERVICE_NAME" ]; then
        continue
    fi
    
    echo ""
    echo -e "${YELLOW}Building $SERVICE_NAME...${NC}"
    
    # Build
    docker build \
        -t "$ECR_REGISTRY/$PROJECT_NAME/$SERVICE_NAME:$TAG" \
        -t "$ECR_REGISTRY/$PROJECT_NAME/$SERVICE_NAME:$(git rev-parse --short HEAD 2>/dev/null || echo 'latest')" \
        -f "$SERVICE_PATH/Dockerfile" \
        --build-arg NODE_ENV=production \
        .
    
    # Push
    echo "Pushing $SERVICE_NAME..."
    docker push "$ECR_REGISTRY/$PROJECT_NAME/$SERVICE_NAME:$TAG"
    docker push "$ECR_REGISTRY/$PROJECT_NAME/$SERVICE_NAME:$(git rev-parse --short HEAD 2>/dev/null || echo 'latest')"
    
    print_success "$SERVICE_NAME built and pushed"
done

print_header "Build Complete"

echo "Images pushed to ECR:"
for SERVICE in "${SERVICES[@]}"; do
    SERVICE_NAME="${SERVICE%%:*}"
    if [ "$BUILD_SERVICE" == "all" ] || [ "$BUILD_SERVICE" == "$SERVICE_NAME" ]; then
        echo "  $ECR_REGISTRY/$PROJECT_NAME/$SERVICE_NAME:$TAG"
    fi
done
echo ""
print_success "All images built and pushed!"

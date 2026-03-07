#!/bin/bash

# ============================================
# Office Management - Build Docker Images
# ============================================

set -e

echo "🔨 Building Docker Images for Office Management"
echo "================================================"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Use Minikube's Docker daemon
echo -e "${YELLOW}🐳 Using Minikube's Docker daemon...${NC}"
eval $(minikube docker-env)

# Image prefix
PREFIX="office-management"
TAG="${1:-latest}"

echo ""
echo -e "${YELLOW}📦 Building images with tag: ${TAG}${NC}"
echo ""

# Build services
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
    "ai-service:services/ai-service"
    "web:apps/web"
    "public-website:apps/public-website"
)

# Production URLs for frontend builds
NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-https://api.coreorbitsoftware.com}"
NEXT_PUBLIC_APP_URL="${NEXT_PUBLIC_APP_URL:-https://portal.coreorbitsoftware.com}"
NEXT_PUBLIC_MAIN_DOMAIN="${NEXT_PUBLIC_MAIN_DOMAIN:-coreorbitsoftware.com}"
NEXT_PUBLIC_PORTAL_URL="${NEXT_PUBLIC_PORTAL_URL:-https://portal.${NEXT_PUBLIC_MAIN_DOMAIN}}"

for service in "${SERVICES[@]}"; do
    IFS=':' read -r name path <<< "$service"
    echo -e "${YELLOW}🔨 Building ${name}...${NC}"
    
    # Add build args for frontend apps
    BUILD_ARGS=""
    if [[ "$name" == "web" ]]; then
        BUILD_ARGS="--build-arg NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL} --build-arg NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL} --build-arg NEXT_PUBLIC_MAIN_DOMAIN=${NEXT_PUBLIC_MAIN_DOMAIN}"
    elif [[ "$name" == "public-website" ]]; then
        BUILD_ARGS="--build-arg NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL} --build-arg NEXT_PUBLIC_MAIN_DOMAIN=${NEXT_PUBLIC_MAIN_DOMAIN} --build-arg NEXT_PUBLIC_PORTAL_URL=${NEXT_PUBLIC_PORTAL_URL}"
    fi
    
    docker build \
        -t ${PREFIX}/${name}:${TAG} \
        -f ${path}/Dockerfile \
        ${BUILD_ARGS} \
        .
    
    echo -e "${GREEN}✓ ${name} built${NC}"
    echo ""
done

echo -e "${GREEN}✅ All images built successfully!${NC}"
echo ""
echo "Built images:"
docker images | grep ${PREFIX}

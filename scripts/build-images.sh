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
    "web:apps/web"
)

for service in "${SERVICES[@]}"; do
    IFS=':' read -r name path <<< "$service"
    echo -e "${YELLOW}🔨 Building ${name}...${NC}"
    
    docker build \
        -t ${PREFIX}/${name}:${TAG} \
        -f ${path}/Dockerfile \
        .
    
    echo -e "${GREEN}✓ ${name} built${NC}"
    echo ""
done

echo -e "${GREEN}✅ All images built successfully!${NC}"
echo ""
echo "Built images:"
docker images | grep ${PREFIX}

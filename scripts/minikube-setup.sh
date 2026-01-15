#!/bin/bash

# ============================================
# Office Management - Minikube Setup Script
# ============================================

set -e

echo "🚀 Office Management - Minikube Setup"
echo "======================================"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Minikube is installed
if ! command -v minikube &> /dev/null; then
    echo -e "${RED}❌ Minikube is not installed. Please install it first.${NC}"
    echo "   brew install minikube"
    exit 1
fi

# Check if kubectl is installed
if ! command -v kubectl &> /dev/null; then
    echo -e "${RED}❌ kubectl is not installed. Please install it first.${NC}"
    echo "   brew install kubectl"
    exit 1
fi

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo -e "${RED}❌ Docker is not running. Please start Docker first.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Prerequisites check passed${NC}"

# Start Minikube with sufficient resources
echo ""
echo -e "${YELLOW}📦 Starting Minikube...${NC}"
minikube start \
    --driver=docker \
    --cpus=4 \
    --memory=8192 \
    --disk-size=30g \
    --kubernetes-version=v1.28.0

echo -e "${GREEN}✓ Minikube started${NC}"

# Enable required addons
echo ""
echo -e "${YELLOW}🔧 Enabling Minikube addons...${NC}"
minikube addons enable ingress
minikube addons enable ingress-dns
minikube addons enable metrics-server
minikube addons enable storage-provisioner

echo -e "${GREEN}✓ Addons enabled${NC}"

# Set Docker to use Minikube's Docker daemon
echo ""
echo -e "${YELLOW}🐳 Configuring Docker to use Minikube...${NC}"
eval $(minikube docker-env)

echo -e "${GREEN}✓ Docker configured${NC}"

# Get Minikube IP
MINIKUBE_IP=$(minikube ip)
echo ""
echo -e "${GREEN}📍 Minikube IP: ${MINIKUBE_IP}${NC}"

# Add hosts entry (requires sudo)
echo ""
echo -e "${YELLOW}📝 Adding hosts entries...${NC}"
echo "   You may need to enter your password"

# Check if entries already exist
if ! grep -q "office.local" /etc/hosts; then
    echo "$MINIKUBE_IP office.local" | sudo tee -a /etc/hosts
    echo "$MINIKUBE_IP techcorp.office.local" | sudo tee -a /etc/hosts
    echo "$MINIKUBE_IP demo.office.local" | sudo tee -a /etc/hosts
    echo -e "${GREEN}✓ Hosts entries added${NC}"
else
    echo -e "${YELLOW}⚠ Hosts entries already exist${NC}"
fi

echo ""
echo -e "${GREEN}✅ Minikube setup complete!${NC}"
echo ""
echo "Next steps:"
echo "  1. Build Docker images: ./scripts/build-images.sh"
echo "  2. Deploy to Minikube: ./scripts/deploy.sh"
echo ""
echo "Useful commands:"
echo "  minikube dashboard    - Open Kubernetes dashboard"
echo "  minikube tunnel       - Create tunnel for LoadBalancer services"
echo "  kubectl get pods -n office-management - Check pod status"

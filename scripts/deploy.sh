#!/bin/bash

# ============================================
# Office Management - Deploy to Minikube
# ============================================

set -e

echo "🚀 Deploying Office Management to Minikube"
echo "==========================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check if Minikube is running
if ! minikube status | grep -q "Running"; then
    echo -e "${RED}❌ Minikube is not running. Please start it first.${NC}"
    echo "   Run: ./scripts/minikube-setup.sh"
    exit 1
fi

# Use Minikube's Docker daemon
eval $(minikube docker-env)

echo ""
echo -e "${YELLOW}📦 Step 1: Creating namespace and base configs...${NC}"
kubectl apply -f k8s/base/namespace.yaml
kubectl apply -f k8s/base/configmap.yaml
kubectl apply -f k8s/base/secrets.yaml
echo -e "${GREEN}✓ Base configs applied${NC}"

echo ""
echo -e "${YELLOW}📦 Step 2: Deploying databases...${NC}"
kubectl apply -f k8s/database/postgres.yaml
kubectl apply -f k8s/database/redis.yaml
echo -e "${GREEN}✓ Databases deployed${NC}"

# Wait for databases to be ready
echo ""
echo -e "${YELLOW}⏳ Waiting for databases to be ready...${NC}"
kubectl wait --for=condition=ready pod -l app=postgres -n office-management --timeout=120s
kubectl wait --for=condition=ready pod -l app=redis -n office-management --timeout=120s
echo -e "${GREEN}✓ Databases are ready${NC}"

echo ""
echo -e "${YELLOW}📦 Step 3: Deploying backend services...${NC}"
kubectl apply -f k8s/services/api-gateway.yaml
kubectl apply -f k8s/services/auth-service.yaml
kubectl apply -f k8s/services/employee-service.yaml
kubectl apply -f k8s/services/attendance-service.yaml
kubectl apply -f k8s/services/project-service.yaml
kubectl apply -f k8s/services/task-service.yaml
kubectl apply -f k8s/services/notification-service.yaml
kubectl apply -f k8s/services/document-service.yaml
kubectl apply -f k8s/services/billing-service.yaml
kubectl apply -f k8s/services/report-service.yaml
echo -e "${GREEN}✓ Backend services deployed${NC}"

echo ""
echo -e "${YELLOW}📦 Step 4: Deploying frontend...${NC}"
kubectl apply -f k8s/services/web.yaml
echo -e "${GREEN}✓ Frontend deployed${NC}"

echo ""
echo -e "${YELLOW}📦 Step 5: Configuring ingress...${NC}"
kubectl apply -f k8s/ingress/ingress.yaml
echo -e "${GREEN}✓ Ingress configured${NC}"

# Wait for all pods to be ready
echo ""
echo -e "${YELLOW}⏳ Waiting for all services to be ready (this may take a few minutes)...${NC}"
kubectl wait --for=condition=ready pod --all -n office-management --timeout=300s || true

echo ""
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""

# Get Minikube IP
MINIKUBE_IP=$(minikube ip)

echo -e "${BLUE}📊 Deployment Status:${NC}"
echo ""
kubectl get pods -n office-management
echo ""

echo -e "${BLUE}🌐 Access URLs:${NC}"
echo ""
echo "  Web App:     http://office.local (via ingress)"
echo "               http://${MINIKUBE_IP}:30080 (NodePort)"
echo ""
echo "  API Gateway: http://office.local/api (via ingress)"
echo "               http://${MINIKUBE_IP}:30000 (NodePort)"
echo ""
echo "  Dashboard:   minikube dashboard"
echo ""
echo -e "${YELLOW}💡 Tips:${NC}"
echo "  - Run 'minikube tunnel' in a separate terminal for LoadBalancer support"
echo "  - Check logs: kubectl logs -f <pod-name> -n office-management"
echo "  - Check all pods: kubectl get pods -n office-management -w"

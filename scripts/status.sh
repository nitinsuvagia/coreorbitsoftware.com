#!/bin/bash

# ============================================
# Office Management - Quick Status Check
# ============================================

echo "📊 Office Management - Status"
echo "=============================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check Minikube status
echo -e "${YELLOW}Minikube Status:${NC}"
minikube status
echo ""

# Check namespace
if kubectl get namespace office-management &> /dev/null; then
    echo -e "${GREEN}✓ Namespace 'office-management' exists${NC}"
else
    echo -e "${RED}✗ Namespace 'office-management' does not exist${NC}"
    exit 0
fi
echo ""

# Get pods
echo -e "${YELLOW}Pods:${NC}"
kubectl get pods -n office-management -o wide
echo ""

# Get services
echo -e "${YELLOW}Services:${NC}"
kubectl get svc -n office-management
echo ""

# Get ingress
echo -e "${YELLOW}Ingress:${NC}"
kubectl get ingress -n office-management
echo ""

# Get PVCs
echo -e "${YELLOW}Persistent Volume Claims:${NC}"
kubectl get pvc -n office-management
echo ""

# Resource usage
echo -e "${YELLOW}Resource Usage:${NC}"
kubectl top pods -n office-management 2>/dev/null || echo "Metrics not available (run: minikube addons enable metrics-server)"
echo ""

# Access URLs
MINIKUBE_IP=$(minikube ip)
echo -e "${YELLOW}Access URLs:${NC}"
echo "  Web (NodePort): http://${MINIKUBE_IP}:30080"
echo "  API (NodePort): http://${MINIKUBE_IP}:30000"
echo "  Web (Ingress):  http://office.local"

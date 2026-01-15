#!/bin/bash

# ============================================
# Office Management - Teardown / Cleanup
# ============================================

set -e

echo "🧹 Cleaning up Office Management from Minikube"
echo "==============================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

read -p "Are you sure you want to delete all resources? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 0
fi

echo ""
echo -e "${YELLOW}🗑️ Deleting namespace and all resources...${NC}"
kubectl delete namespace office-management --ignore-not-found=true

echo ""
echo -e "${GREEN}✅ Cleanup complete!${NC}"
echo ""
echo "The following were deleted:"
echo "  - All deployments"
echo "  - All services"
echo "  - All configmaps and secrets"
echo "  - All PVCs (persistent data)"
echo ""
echo -e "${YELLOW}💡 To completely reset, you can also run:${NC}"
echo "   minikube delete"
echo "   minikube start"

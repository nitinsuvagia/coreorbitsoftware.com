#!/bin/bash

# ============================================
# Office Management - Database Migration
# ============================================

set -e

echo "🗄️ Running Database Migrations"
echo "==============================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Get the postgres pod name
POSTGRES_POD=$(kubectl get pod -n office-management -l app=postgres -o jsonpath="{.items[0].metadata.name}")

if [ -z "$POSTGRES_POD" ]; then
    echo "❌ PostgreSQL pod not found. Make sure the database is deployed."
    exit 1
fi

echo -e "${YELLOW}📦 PostgreSQL pod: ${POSTGRES_POD}${NC}"

# Wait for postgres to be ready
echo -e "${YELLOW}⏳ Waiting for PostgreSQL to be ready...${NC}"
kubectl wait --for=condition=ready pod/$POSTGRES_POD -n office-management --timeout=60s

# Create a job to run migrations
cat <<EOF | kubectl apply -f -
apiVersion: batch/v1
kind: Job
metadata:
  name: db-migration-$(date +%s)
  namespace: office-management
spec:
  ttlSecondsAfterFinished: 300
  template:
    spec:
      containers:
      - name: migration
        image: office-management/api-gateway:latest
        imagePullPolicy: IfNotPresent
        command: ["npx", "prisma", "migrate", "deploy"]
        envFrom:
        - secretRef:
            name: app-secrets
      restartPolicy: Never
  backoffLimit: 3
EOF

echo ""
echo -e "${GREEN}✅ Migration job created. Check status with:${NC}"
echo "   kubectl get jobs -n office-management"
echo "   kubectl logs job/db-migration-* -n office-management"

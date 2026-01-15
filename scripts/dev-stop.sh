#!/bin/bash

# ===========================================
# STOP ALL SERVICES (LOCAL & DOCKER)
# ===========================================

set -e

echo "🛑 Stopping all services..."
echo ""

# Stop local Node.js processes
echo "Stopping local services..."
pkill -f "tsx watch" 2>/dev/null || true
pkill -f "next dev" 2>/dev/null || true
pkill -f "turbo run dev" 2>/dev/null || true

# Stop Docker services (keep postgres and redis for local dev)
echo "Stopping Docker services..."
docker compose -f docker-compose.yml stop api-gateway auth-service employee-service \
  attendance-service project-service task-service billing-service \
  document-service notification-service report-service web 2>/dev/null || true

echo ""
echo "✅ All services stopped!"
echo ""
echo "Note: PostgreSQL and Redis containers are still running for local development."
echo "To stop them: docker compose -f docker-compose.yml down"
echo ""

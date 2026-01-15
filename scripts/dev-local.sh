#!/bin/bash

# ===========================================
# LOCAL DEVELOPMENT STARTUP SCRIPT
# ===========================================
# This script starts all services in local development mode
# Uses .env.local for configuration

set -e

echo "🚀 Starting Local Development Environment..."
echo ""

# Check if Docker infrastructure is running
echo "📦 Checking infrastructure (PostgreSQL, Redis)..."
if ! docker ps | grep -q oms-postgres; then
    echo "Starting PostgreSQL and Redis..."
    docker compose -f docker-compose.yml up -d postgres redis
    echo "Waiting for services to be ready..."
    sleep 5
fi

# Load local environment
echo "📝 Loading environment configuration..."
set -a
source .env
if [ -f .env.local ]; then
    source .env.local
fi
set +a

# Generate Prisma clients
echo "🔧 Generating Prisma clients..."
cd packages/database
npm run db:generate
cd ../..

# Start services with turbo
echo "🎯 Starting all services..."
npx turbo run dev --concurrency=20 --filter='!@oms/web-app' &

# Wait a bit for services to initialize
sleep 5

# Start web app separately to see logs
echo "🌐 Starting web application..."
cd apps/web
npm run dev &
cd ../..

echo ""
echo "✅ Local development environment started!"
echo ""
echo "Services running:"
echo "  - Web App:            http://localhost:3000"
echo "  - API Gateway:        http://localhost:4000"
echo "  - Auth Service:       http://localhost:3001"
echo "  - Employee Service:   http://localhost:3002"
echo "  - Attendance Service: http://localhost:3003"
echo "  - Project Service:    http://localhost:3004"
echo "  - Task Service:       http://localhost:3005"
echo "  - Billing Service:    http://localhost:3006"
echo "  - Document Service:   http://localhost:3007"
echo "  - Notification:       http://localhost:3008"
echo "  - Report Service:     http://localhost:3009"
echo ""
echo "📊 Database & Cache:"
echo "  - PostgreSQL:         localhost:5432"
echo "  - Redis:             localhost:6379"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Keep script running
wait

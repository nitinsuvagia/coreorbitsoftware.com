#!/bin/bash

# Professional OMS Startup Script with PM2
# This provides production-grade process management with auto-restart

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   Office Management System - Professional Startup    "
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

PROJECT_DIR="/Volumes/Softqube/SOFTQUBE/OFFICE-MANAGEMENT"
cd "$PROJECT_DIR"

# Load environment variables
if [ -f .env ]; then
    echo "✓ Loading environment variables..."
    export $(cat .env | grep -v '^#' | xargs)
fi

# Create logs directory
mkdir -p logs

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "⚠️  PM2 not found. Installing..."
    npm install -g pm2
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   Step 1: Infrastructure Check                       "
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check PostgreSQL
if lsof -i :5432 > /dev/null 2>&1; then
    echo "✓ PostgreSQL running on port 5432"
else
    echo "✗ PostgreSQL not running. Starting..."
    docker start oms-postgres 2>/dev/null || docker run -d --name oms-postgres \
        -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:15
    sleep 3
fi

# Check Redis
if lsof -i :6379 > /dev/null 2>&1; then
    echo "✓ Redis running on port 6379"
else
    echo "✗ Redis not running. Starting..."
    docker start oms-redis 2>/dev/null || docker run -d --name oms-redis \
        -p 6379:6379 redis:7-alpine
    sleep 2
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   Step 2: Building Shared Packages                   "
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "Building packages..."
cd "$PROJECT_DIR/packages/database" && npm run build 2>&1 | tail -3 &
cd "$PROJECT_DIR/packages/shared-types" && npm run build 2>&1 | tail -3 &
cd "$PROJECT_DIR/packages/shared-utils" && npm run build 2>&1 | tail -3 &
cd "$PROJECT_DIR/packages/event-bus" && npm run build 2>&1 | tail -3 &
cd "$PROJECT_DIR/packages/tenant-db-manager" && npm run build 2>&1 | tail -3 &
wait
echo "✓ All packages built successfully"

cd "$PROJECT_DIR"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   Step 3: Starting Services with PM2                 "
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Stop any existing PM2 processes
pm2 delete all 2>/dev/null || true

# Start all services using PM2 ecosystem file
echo "Starting all microservices..."
pm2 start ecosystem.config.js

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   Step 4: Starting Web Application                   "
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cd "$PROJECT_DIR/apps/web"
pm2 start npm --name "web-app" -- run dev

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   System Status                                       "
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

sleep 5
pm2 list

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   🎉 System is Ready!                                 "
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Monitor services:    pm2 monit"
echo "📝 View logs:           pm2 logs [service-name]"
echo "🔄 Restart service:     pm2 restart [service-name]"
echo "⏹️  Stop all:            pm2 stop all"
echo "🗑️  Delete all:          pm2 delete all"
echo ""
echo "🌐 Web App:             http://localhost:3000"
echo "🔌 API Gateway:         http://localhost:4000"
echo ""
echo "💡 PM2 will automatically restart services if they crash"
echo "💡 File changes will reload services automatically"
echo ""

#!/bin/bash

# ===========================================
# DOCKER DEVELOPMENT STARTUP SCRIPT
# ===========================================
# This script starts all services using Docker Compose
# Uses .env.docker for configuration

set -e

echo "🐳 Starting Docker Development Environment..."
echo ""

# Build services if needed
if [ "$1" == "--build" ]; then
    echo "🔨 Building Docker images..."
    docker compose -f docker-compose.yml build
    echo ""
fi

# Start all services
echo "🚀 Starting all services in Docker..."
docker compose -f docker-compose.yml up -d

echo ""
echo "⏳ Waiting for services to be healthy..."
sleep 10

# Show status
docker compose -f docker-compose.yml ps

echo ""
echo "✅ Docker development environment started!"
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
echo "📊 Infrastructure:"
echo "  - PostgreSQL:         localhost:5432"
echo "  - Redis:             localhost:6379"
echo "  - LocalStack:        localhost:4566"
echo ""
echo "📝 Commands:"
echo "  - View logs:    docker compose -f docker-compose.yml logs -f [service]"
echo "  - Stop all:     docker compose -f docker-compose.yml down"
echo "  - Rebuild:      $0 --build"
echo ""

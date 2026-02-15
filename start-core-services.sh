#!/bin/bash

# Proper service startup script with environment loading
set -e

ROOT_DIR="/Volumes/Softqube/SOFTQUBE/OFFICE-MANAGEMENT"
LOG_DIR="$ROOT_DIR/logs"

# Load environment variables
if [ -f "$ROOT_DIR/.env" ]; then
  export $(cat "$ROOT_DIR/.env" | grep -v '^#' | xargs)
fi

if [ -f "$ROOT_DIR/.env.local" ]; then
  export $(cat "$ROOT_DIR/.env.local" | grep -v '^#' | xargs)
fi

# Create logs directory
mkdir -p "$LOG_DIR"

echo "🚀 Starting services with environment:"
echo "   MASTER_DATABASE_URL: ${MASTER_DATABASE_URL:0:30}..."
echo "   REDIS_URL: $REDIS_URL"
echo ""

# Start Auth Service
echo "Starting Auth Service..."
cd "$ROOT_DIR/services/auth-service"
npx tsx watch src/index.ts > "$LOG_DIR/auth-service.log" 2>&1 &
AUTH_PID=$!
echo "   Auth Service started (PID: $AUTH_PID)"

sleep 3

# Start Employee Service
echo "Starting Employee Service..."
cd "$ROOT_DIR/services/employee-service"
npx tsx watch src/index.ts > "$LOG_DIR/employee-service.log" 2>&1 &
EMPLOYEE_PID=$!
echo "   Employee Service started (PID: $EMPLOYEE_PID)"

sleep 3

# Start API Gateway  
echo "Starting API Gateway..."
cd "$ROOT_DIR/services/api-gateway"
npx tsx watch src/index.ts > "$LOG_DIR/api-gateway.log" 2>&1 &
GATEWAY_PID=$!
echo "   API Gateway started (PID: $GATEWAY_PID)"

sleep 3

# Start Web App
echo "Starting Web App..."
cd "$ROOT_DIR/apps/web"
npx next dev -p 3000 > "$LOG_DIR/web-app.log" 2>&1 &
WEB_PID=$!
echo "   Web App started (PID: $WEB_PID)"

sleep 5

echo ""
echo "✅ Services started!"
echo ""
echo "📋 Check logs:"
echo "   tail -f $LOG_DIR/auth-service.log"
echo "   tail -f $LOG_DIR/employee-service.log"
echo "   tail -f $LOG_DIR/api-gateway.log"
echo "   tail -f $LOG_DIR/web-app.log"
echo ""
echo "🔍 Test login:"
echo "   Open: http://localhost:3000/login"
echo "   Email: admin@oms.local"
echo "   Pass: admin123"
echo ""
echo "🔗 Service Ports:"
echo "   Auth: 3001 | Employee: 3002 | Gateway: 4000 | Web: 3000"

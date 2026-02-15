#!/bin/bash

echo "═══════════════════════════════════════════════════════"
echo "   🎯 LOCAL SERVICE STATUS REPORT"
echo "═══════════════════════════════════════════════════════"
echo ""

# Check processes
echo "📊 RUNNING PROCESSES:"
echo "   Next.js processes: $(ps aux | grep 'next dev' | grep -v grep | wc -l | tr -d ' ')"
echo "   tsx watch processes: $(ps aux | grep 'tsx watch' | grep -v grep | wc -l | tr -d ' ')"
echo ""

# Check ports
echo "🔌 PORT STATUS:"
PORTS=(3000 3001 3002 3003 3004 3005 3006 3007 3008 3009 4000 5432 6379)
PORT_NAMES=(
  "Web App"
  "Auth Service" 
  "Employee Service"
  "Attendance Service"
  "Project Service"
  "Task Service"
  "Billing Service"
  "Document Service"
  "Notification Service"
  "Report Service"
  "API Gateway"
  "PostgreSQL"
  "Redis"
)

for i in "${!PORTS[@]}"; do
  PORT="${PORTS[$i]}"
  NAME="${PORT_NAMES[$i]}"
  if lsof -i :$PORT 2>/dev/null | grep -q LISTEN; then
    echo "   ✅ $NAME (port $PORT) - LISTENING"
  else
    echo "   ❌ $NAME (port $PORT) - NOT RUNNING"
  fi
done

echo ""
echo "📋 SERVICE LOGS (Last 3 lines):"
echo ""
echo "🌐 API Gateway (/tmp/api-gateway.log):"
tail -3 /tmp/api-gateway.log 2>/dev/null || echo "   No log file"
echo ""
echo "🔐 Auth Service (/tmp/auth-service.log):"
tail -3 /tmp/auth-service.log 2>/dev/null || echo "   No log file"
echo ""
echo "📱 Web App (/tmp/web-app.log):"
tail -3 /tmp/web-app.log 2>/dev/null || echo "   No log file"
echo ""
echo "═══════════════════════════════════════════════════════"

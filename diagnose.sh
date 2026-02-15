#!/bin/bash

echo "🔍 DIAGNOSTIC CHECK - Run this FIRST when things don't work"
echo "═══════════════════════════════════════════════════════════"
echo ""

# 1. Environment Variables
echo "1️⃣  ENVIRONMENT VARIABLES:"
if [ -z "$MASTER_DATABASE_URL" ]; then
  echo "   ❌ MASTER_DATABASE_URL not set"
else
  echo "   ✅ MASTER_DATABASE_URL: ${MASTER_DATABASE_URL:0:40}..."
fi

if [ -z "$REDIS_URL" ]; then
  echo "   ❌ REDIS_URL not set"
else
  echo "   ✅ REDIS_URL: $REDIS_URL"
fi
echo ""

# 2. Database Connection
echo "2️⃣  DATABASE CONNECTION:"
if psql "$MASTER_DATABASE_URL" -c "SELECT 1" >/dev/null 2>&1; then
  echo "   ✅ PostgreSQL connection working"
else
  echo "   ❌ Cannot connect to PostgreSQL"
fi
echo ""

# 3. Redis Connection
echo "3️⃣  REDIS CONNECTION:"
if redis-cli -u "$REDIS_URL" ping >/dev/null 2>&1; then
  echo "   ✅ Redis connection working"
else
  echo "   ❌ Cannot connect to Redis"
fi
echo ""

# 4. Service Processes
echo "4️⃣  RUNNING PROCESSES:"
AUTH_PID=$(lsof -ti :3001 2>/dev/null)
GATEWAY_PID=$(lsof -ti :4000 2>/dev/null)
WEB_PID=$(lsof -ti :3000 2>/dev/null)

[ -n "$AUTH_PID" ] && echo "   ✅ Auth Service (PID: $AUTH_PID)" || echo "   ❌ Auth Service not running"
[ -n "$GATEWAY_PID" ] && echo "   ✅ API Gateway (PID: $GATEWAY_PID)" || echo "   ❌ API Gateway not running"
[ -n "$WEB_PID" ] && echo "   ✅ Web App (PID: $WEB_PID)" || echo "   ❌ Web App not running"
echo ""

# 5. Service Health (if running)
echo "5️⃣  SERVICE HEALTH CHECKS:"
if [ -n "$AUTH_PID" ]; then
  AUTH_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health --max-time 2)
  if [ "$AUTH_HEALTH" = "200" ]; then
    echo "   ✅ Auth Service responding (200)"
  else
    echo "   ❌ Auth Service NOT responding (code: $AUTH_HEALTH)"
    echo "      Check logs: tail -20 /Volumes/Softqube/SOFTQUBE/OFFICE-MANAGEMENT/logs/auth-service.log"
  fi
fi

if [ -n "$GATEWAY_PID" ]; then
  GW_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/health --max-time 2)
  if [ "$GW_HEALTH" = "200" ]; then
    echo "   ✅ API Gateway responding (200)"
  else
    echo "   ❌ API Gateway NOT responding (code: $GW_HEALTH)"
    echo "      Check logs: tail -20 /Volumes/Softqube/SOFTQUBE/OFFICE-MANAGEMENT/logs/api-gateway.log"
  fi
fi
echo ""

echo "═══════════════════════════════════════════════════════════"
echo "💡 If any checks fail, fix them BEFORE troubleshooting code"
echo "═══════════════════════════════════════════════════════════"

#!/bin/bash

echo "═══════════════════════════════════════════════════════════════"
echo "   🔍 COMPREHENSIVE SYSTEM TEST"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Test 1: Service Status
echo "📊 SERVICE STATUS:"
lsof -i :3000 >/dev/null 2>&1 && echo "   ✅ Web App (3000)" || echo "   ❌ Web App (3000)"
lsof -i :4000 >/dev/null 2>&1 && echo "   ✅ API Gateway (4000)" || echo "   ❌ API Gateway (4000)"
lsof -i :3001 >/dev/null 2>&1 && echo "   ✅ Auth Service (3001)" || echo "   ❌ Auth Service (3001)"
lsof -i :5432 >/dev/null 2>&1 && echo "   ✅ PostgreSQL (5432)" || echo "   ❌ PostgreSQL (5432)"
lsof -i :6379 >/dev/null 2>&1 && echo "   ✅ Redis (6379)" || echo "   ❌ Redis (6379)"
echo ""

# Test 2: API Gateway Health
echo "🏥 API GATEWAY HEALTH:"
HEALTH_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/health --max-time 2)
if [ "$HEALTH_CODE" = "200" ]; then
  echo "   ✅ Health endpoint responding (200)"
else
  echo "   ❌ Health endpoint failed ($HEALTH_CODE)"
fi
echo ""

# Test 3: Login Test
echo "🔐 LOGIN TEST:"
LOGIN_RESPONSE=$(curl -X POST http://localhost:4000/api/v1/auth/platform/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@oms.local","password":"admin123"}' \
  -s -w "\nHTTP_CODE:%{http_code}")

HTTP_CODE=$(echo "$LOGIN_RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
HAS_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -q "accessToken" && echo "yes" || echo "no")

if [ "$HTTP_CODE" = "200" ] && [ "$HAS_TOKEN" = "yes" ]; then
  echo "   ✅ Platform Admin login successful"
  echo "   ✅ JWT tokens received"
else
  echo "   ❌ Login failed (HTTP $HTTP_CODE)"
fi
echo ""

# Test 4: Web App
echo "🌐 WEB APP:"
WEB_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/login --max-time 2)
if [ "$WEB_CODE" = "200" ]; then
  echo "   ✅ Login page loading (200)"
else
  echo "   ❌ Login page failed ($WEB_CODE)"
fi
echo ""

echo "═══════════════════════════════════════════════════════════════"
echo "   📝 TEST CREDENTIALS"
echo "═══════════════════════════════════════════════════════════════"
echo "   Email:    admin@oms.local"
echo "   Password: admin123"
echo ""
echo "   🌐 Login URL: http://localhost:3000/login"
echo "═══════════════════════════════════════════════════════════════"

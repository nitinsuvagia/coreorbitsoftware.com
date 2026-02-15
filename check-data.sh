#!/bin/bash

echo "═══════════════════════════════════════════════════════"
echo "   📊 DATA CHECK REPORT"
echo "═══════════════════════════════════════════════════════"
echo ""

# Database check
echo "1️⃣  DATABASE DATA:"
cd /Volumes/Softqube/SOFTQUBE/OFFICE-MANAGEMENT
source .env 2>/dev/null

echo "   Master Database:"
psql "$MASTER_DATABASE_URL" -t -c "SELECT '   - Tenants: ' || COUNT(*) FROM tenants;" 2>/dev/null || echo "   ❌ Can't connect"
psql "$MASTER_DATABASE_URL" -t -c "SELECT '   - Plans: ' || COUNT(*) FROM subscription_plans;" 2>/dev/null
psql "$MASTER_DATABASE_URL" -t -c "SELECT '   - Admins: ' || COUNT(*) FROM platform_admins;" 2>/dev/null

echo ""
echo "   Tenant Database (softqube):"
psql "postgresql://postgres:password@localhost:5432/oms_tenant_softqube" -t -c "SELECT '   - Employees: ' || COUNT(*) FROM employees;" 2>/dev/null || echo "   ❌ Can't connect"
psql "postgresql://postgres:password@localhost:5432/oms_tenant_softqube" -t -c "SELECT '   - Jobs: ' || COUNT(*) FROM job_descriptions;" 2>/dev/null
psql "postgresql://postgres:password@localhost:5432/oms_tenant_softqube" -t -c "SELECT '   - Departments: ' || COUNT(*) FROM departments;" 2>/dev/null

echo ""
echo "2️⃣  SERVICE STATUS:"
lsof -ti :3001 >/dev/null 2>&1 && echo "   ✅ Auth Service (3001)" || echo "   ❌ Auth Service (3001)"
lsof -ti :3002 >/dev/null 2>&1 && echo "   ✅ Employee Service (3002)" || echo "   ❌ Employee Service (3002)"
lsof -ti :4000 >/dev/null 2>&1 && echo "   ✅ API Gateway (4000)" || echo "   ❌ API Gateway (4000)"
lsof -ti :3000 >/dev/null 2>&1 && echo "   ✅ Web App (3000)" || echo "   ✅ Web App (3000)"

echo ""
echo "3️⃣  API TESTS:"

# Login to get token
echo "   Testing login..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:4000/api/v1/auth/platform/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@oms.local","password":"admin123"}' \
  --max-time 3 2>&1)

if echo "$LOGIN_RESPONSE" | grep -q "accessToken"; then
  echo "   ✅ Login successful"
  TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
  
  # Test tenants endpoint
  echo "   Testing tenants API..."
  TENANTS=$(curl -s -H "Authorization: Bearer $TOKEN" \
    http://localhost:4000/api/v1/platform/tenants \
    --max-time 3 2>&1)
  
  if echo "$TENANTS" | grep -q "softqube"; then
    echo "   ✅ Tenants API working"
  else
    echo "   ❌ Tenants API failed"
  fi
else
  echo "   ❌ Login failed"
fi

echo ""
echo "═══════════════════════════════════════════════════════"
echo "💡 If data exists but not showing in UI:"
echo "   1. Login as tenant user (not platform admin)"
echo "   2. Check browser console for errors"
echo "   3. Verify frontend API calls"
echo "═══════════════════════════════════════════════════════"

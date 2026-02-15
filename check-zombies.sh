#!/bin/bash

echo "═══════════════════════════════════════════════════════"
echo "   🧟 ZOMBIE PROCESS REPORT"
echo "═══════════════════════════════════════════════════════"
echo ""

# Count active processes
TSX_COUNT=$(ps aux | grep 'tsx watch' | grep -v grep | wc -l | tr -d ' ')
NEXT_COUNT=$(ps aux | grep 'next dev' | grep -v grep | wc -l | tr -d ' ')
NODE_COUNT=$(ps aux | grep node | grep -v grep | wc -l | tr -d ' ')
ZOMBIE_COUNT=$(ps aux | awk '$8 ~ /Z/' | wc -l | tr -d ' ')

echo "📊 ACTIVE PROCESSES:"
echo "   tsx watch: $TSX_COUNT"
echo "   next dev: $NEXT_COUNT"
echo "   Total Node: $NODE_COUNT"
echo ""

echo "🧟 ZOMBIE PROCESSES (defunct):"
echo "   Count: $ZOMBIE_COUNT"

if [ "$ZOMBIE_COUNT" -gt 0 ]; then
  echo ""
  echo "   Details:"
  ps aux | awk '$8 ~ /Z/ { print "   PID " $2 " - defunct" }'
fi
echo ""

echo "✅ REQUIRED SERVICES:"
lsof -ti :3001 >/dev/null 2>&1 && echo "   ✅ Auth Service (3001)" || echo "   ❌ Auth Service (3001)"
lsof -ti :4000 >/dev/null 2>&1 && echo "   ✅ API Gateway (4000)" || echo "   ❌ API Gateway (4000)"
lsof -ti :3000 >/dev/null 2>&1 && echo "   ✅ Web App (3000)" || echo "   ❌ Web App (3000)"
echo ""

# Summary
if [ "$ZOMBIE_COUNT" -gt 0 ]; then
  echo "⚠️  WARNING: $ZOMBIE_COUNT zombie processes detected"
  echo "   Run: ps aux | awk '\$8 ~ /Z/' to see details"
else
  echo "✅ No zombie processes found"
fi

echo ""
echo "💡 Comparison with previous issues:"
echo "   Before fix: 68 zombie tsx watch processes"
echo "   Now: $TSX_COUNT tsx watch + $ZOMBIE_COUNT defunct zombies"
echo ""
echo "═══════════════════════════════════════════════════════"

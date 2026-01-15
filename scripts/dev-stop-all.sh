#!/bin/bash

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}Stopping all OMS services...${NC}"

# Kill all services by port
PORTS="3000 3001 3002 3003 3004 3005 3006 3007 3008 3009 4000"

for port in $PORTS; do
    pid=$(lsof -ti :$port 2>/dev/null)
    if [ -n "$pid" ]; then
        echo -e "Stopping process on port $port (PID: $pid)"
        kill -9 $pid 2>/dev/null
    fi
done

# Also kill any tsx watch or next dev processes
pkill -f "tsx watch" 2>/dev/null
pkill -f "next dev" 2>/dev/null
pkill -f "turbo run dev" 2>/dev/null

sleep 2

echo -e "${GREEN}✓ All services stopped${NC}"

# Verify
echo ""
echo -e "${YELLOW}Verifying...${NC}"
for port in $PORTS; do
    if lsof -i :$port 2>/dev/null | grep -q LISTEN; then
        echo -e "${RED}✗ Port $port still in use${NC}"
    else
        echo -e "${GREEN}✓ Port $port free${NC}"
    fi
done

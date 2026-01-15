#!/bin/bash

# Quick Dev Start - Starts services in separate terminal tabs/windows
# Use this for more reliable startup

PROJECT_DIR="/Volumes/Softqube/SOFTQUBE/OFFICE-MANAGEMENT"
LOG_DIR="$PROJECT_DIR/logs"

mkdir -p "$LOG_DIR"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=====================================${NC}"
echo -e "${BLUE}   OMS Quick Dev Start${NC}"
echo -e "${BLUE}=====================================${NC}"

# Check Docker
echo -e "${YELLOW}Checking Docker services...${NC}"
docker start oms-postgres oms-redis 2>/dev/null
sleep 2

# Function to start service
start_service() {
    local name=$1
    local dir=$2
    local port=$3
    
    echo -e "${YELLOW}Starting $name on port $port...${NC}"
    cd "$PROJECT_DIR/$dir"
    nohup npm run dev > "$LOG_DIR/$name.log" 2>&1 &
    echo $! > "$LOG_DIR/$name.pid"
}

# Stop existing processes
echo -e "${YELLOW}Stopping existing services...${NC}"
pkill -f "tsx watch" 2>/dev/null
pkill -f "next dev" 2>/dev/null
sleep 2

# Start API Gateway first (most important)
start_service "api-gateway" "services/api-gateway" 4000
sleep 3

# Start Auth Service (needed for login)
start_service "auth-service" "services/auth-service" 3001
sleep 2

# Start other services
start_service "employee-service" "services/employee-service" 3002
start_service "attendance-service" "services/attendance-service" 3003
start_service "project-service" "services/project-service" 3004
start_service "task-service" "services/task-service" 3005
start_service "billing-service" "services/billing-service" 3006
start_service "document-service" "services/document-service" 3007
start_service "notification-service" "services/notification-service" 3008
start_service "report-service" "services/report-service" 3009
sleep 3

# Start Web App last
start_service "web" "apps/web" 3000

echo ""
echo -e "${YELLOW}Waiting for services to start...${NC}"
sleep 10

# Check status
echo ""
echo -e "${BLUE}Service Status:${NC}"
for port in 4000 3001 3002 3003 3004 3005 3006 3007 3008 3009 3000; do
    if lsof -i :$port 2>/dev/null | grep -q LISTEN; then
        echo -e "${GREEN}✓ Port $port running${NC}"
    else
        echo -e "${YELLOW}○ Port $port starting...${NC}"
    fi
done

echo ""
echo -e "${GREEN}Logs: tail -f $LOG_DIR/*.log${NC}"
echo -e "${BLUE}Web: http://localhost:3000${NC}"
echo -e "${BLUE}API: http://localhost:4000${NC}"

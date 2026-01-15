#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PROJECT_DIR="/Volumes/Softqube/SOFTQUBE/OFFICE-MANAGEMENT"
LOG_DIR="$PROJECT_DIR/logs"

# Create logs directory
mkdir -p "$LOG_DIR"

echo -e "${BLUE}=====================================${NC}"
echo -e "${BLUE}   OMS Development Services Startup${NC}"
echo -e "${BLUE}=====================================${NC}"
echo ""

# Function to check if a port is in use
check_port() {
    lsof -i :$1 2>/dev/null | grep -q LISTEN
}

# Function to wait for a port to be available
wait_for_port() {
    local port=$1
    local name=$2
    local max_wait=60
    local waited=0
    
    while ! check_port $port; do
        sleep 1
        waited=$((waited + 1))
        if [ $waited -ge $max_wait ]; then
            echo -e "${RED}✗ $name failed to start on port $port (timeout)${NC}"
            return 1
        fi
    done
    echo -e "${GREEN}✓ $name running on port $port${NC}"
    return 0
}

# Function to kill process on port
kill_port() {
    local port=$1
    local pid=$(lsof -ti :$port 2>/dev/null)
    if [ -n "$pid" ]; then
        kill -9 $pid 2>/dev/null
        sleep 1
    fi
}

# Step 1: Check Docker services
echo -e "${YELLOW}Step 1: Checking Docker services...${NC}"
if ! docker ps | grep -q oms-postgres; then
    echo -e "${YELLOW}Starting PostgreSQL...${NC}"
    docker start oms-postgres 2>/dev/null || docker run -d --name oms-postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:15
fi
if ! docker ps | grep -q oms-redis; then
    echo -e "${YELLOW}Starting Redis...${NC}"
    docker start oms-redis 2>/dev/null || docker run -d --name oms-redis -p 6379:6379 redis:7-alpine
fi
sleep 2

if check_port 5432; then
    echo -e "${GREEN}✓ PostgreSQL running on port 5432${NC}"
else
    echo -e "${RED}✗ PostgreSQL not running${NC}"
    exit 1
fi

if check_port 6379; then
    echo -e "${GREEN}✓ Redis running on port 6379${NC}"
else
    echo -e "${RED}✗ Redis not running${NC}"
    exit 1
fi

echo ""

# Step 2: Build shared packages first (if needed)
echo -e "${YELLOW}Step 2: Building shared packages...${NC}"
cd "$PROJECT_DIR"

# Check if node_modules exist
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    npm install
fi

# Build database package
echo -e "${BLUE}Building @oms/database...${NC}"
cd "$PROJECT_DIR/packages/database"
npm run build 2>/dev/null &
DB_BUILD_PID=$!

# Build shared packages in parallel
echo -e "${BLUE}Building shared packages...${NC}"
cd "$PROJECT_DIR/packages/shared-types" && npm run build 2>/dev/null &
cd "$PROJECT_DIR/packages/shared-utils" && npm run build 2>/dev/null &
cd "$PROJECT_DIR/packages/event-bus" && npm run build 2>/dev/null &
cd "$PROJECT_DIR/packages/tenant-db-manager" && npm run build 2>/dev/null &

# Wait for builds
wait
echo -e "${GREEN}✓ Shared packages built${NC}"
echo ""

# Step 3: Start services one by one
echo -e "${YELLOW}Step 3: Starting services...${NC}"
cd "$PROJECT_DIR"

# Service configuration: name, directory, port
declare -a SERVICES=(
    "API Gateway|services/api-gateway|4000"
    "Auth Service|services/auth-service|3001"
    "Employee Service|services/employee-service|3002"
    "Attendance Service|services/attendance-service|3003"
    "Project Service|services/project-service|3004"
    "Task Service|services/task-service|3005"
    "Billing Service|services/billing-service|3006"
    "Document Service|services/document-service|3007"
    "Notification Service|services/notification-service|3008"
    "Report Service|services/report-service|3009"
    "Web App|apps/web|3000"
)

# Kill existing processes on service ports
echo -e "${YELLOW}Cleaning up existing processes...${NC}"
for service in "${SERVICES[@]}"; do
    IFS='|' read -r name dir port <<< "$service"
    kill_port $port
done
echo -e "${GREEN}✓ Cleaned up${NC}"
echo ""

# Start each service
for service in "${SERVICES[@]}"; do
    IFS='|' read -r name dir port <<< "$service"
    
    echo -e "${BLUE}Starting $name...${NC}"
    cd "$PROJECT_DIR/$dir"
    
    # Start in background, redirect output to log file
    npm run dev > "$LOG_DIR/${dir//\//-}.log" 2>&1 &
    
    # Wait for port (with shorter timeout for faster services)
    if [[ "$name" == "Web App" ]]; then
        # Next.js takes longer
        sleep 5
        wait_for_port $port "$name" || true
    else
        sleep 2
        wait_for_port $port "$name" || true
    fi
done

echo ""
echo -e "${BLUE}=====================================${NC}"
echo -e "${BLUE}   Service Status Summary${NC}"
echo -e "${BLUE}=====================================${NC}"

# Final status check
declare -A PORT_NAMES=(
    [3000]="Web App"
    [3001]="Auth Service"
    [3002]="Employee Service"
    [3003]="Attendance Service"
    [3004]="Project Service"
    [3005]="Task Service"
    [3006]="Billing Service"
    [3007]="Document Service"
    [3008]="Notification Service"
    [3009]="Report Service"
    [4000]="API Gateway"
    [5432]="PostgreSQL"
    [6379]="Redis"
)

for port in 5432 6379 4000 3001 3002 3003 3004 3005 3006 3007 3008 3009 3000; do
    if check_port $port; then
        echo -e "${GREEN}✓ ${PORT_NAMES[$port]} (port $port)${NC}"
    else
        echo -e "${RED}✗ ${PORT_NAMES[$port]} (port $port)${NC}"
    fi
done

echo ""
echo -e "${GREEN}Logs are available in: $LOG_DIR${NC}"
echo -e "${YELLOW}To view logs: tail -f $LOG_DIR/<service>.log${NC}"
echo ""
echo -e "${BLUE}Platform Admin: http://localhost:3000${NC}"
echo -e "${BLUE}API Gateway: http://localhost:4000${NC}"

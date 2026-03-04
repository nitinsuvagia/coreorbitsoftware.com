#!/bin/bash

# Load environment variables
set -a
source .env
set +a

echo "Starting ALL services..."

# Create logs directory if it doesn't exist
mkdir -p logs

# Array of all services with their ports
declare -A services=(
    ["auth-service"]="3001"
    ["employee-service"]="3002"
    ["attendance-service"]="3003"
    ["project-service"]="3004"
    ["task-service"]="3005"
    ["document-service"]="3006"
    ["notification-service"]="3007"
    ["billing-service"]="3008"
    ["report-service"]="3009"
    ["api-gateway"]="4000"
)

# Start each service
for service in "${!services[@]}"; do
    port=${services[$service]}
    echo "Starting $service on port $port..."
    cd "/Volumes/Softqube/SOFTQUBE/OFFICE-MANAGEMENT/services/$service"
    nohup npm run dev > "/Volumes/Softqube/SOFTQUBE/OFFICE-MANAGEMENT/logs/${service}.log" 2>&1 &
    echo "  ✓ $service started (PID: $!)"
    sleep 2
done

echo ""
echo "All services started!"
echo ""
echo "Service Status:"
echo "==============="
for service in "${!services[@]}"; do
    port=${services[$service]}
    if lsof -i :$port > /dev/null 2>&1; then
        echo "  ✓ $service (port $port) - RUNNING"
    else
        echo "  ✗ $service (port $port) - FAILED"
    fi
done

echo ""
echo "Web app can be started separately with:"
echo "  cd apps/web && npx next dev -p 3000"

#!/bin/bash
# AWS ECS Scale Services Script
# Office Management SaaS

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
PROJECT_NAME="${PROJECT_NAME:-office-mgmt}"
AWS_REGION="${AWS_REGION:-us-east-1}"
ECS_CLUSTER="${PROJECT_NAME}-cluster"

print_usage() {
    echo "Usage: $0 <service> <desired-count>"
    echo ""
    echo "Services:"
    echo "  api-gateway, auth-service, employee-service, attendance-service,"
    echo "  project-service, task-service, notification-service, document-service,"
    echo "  billing-service, report-service, web-app"
    echo ""
    echo "Example:"
    echo "  $0 api-gateway 3"
    echo "  $0 all 2"
    exit 1
}

# Parse arguments
SERVICE="${1}"
DESIRED_COUNT="${2}"

if [ -z "$SERVICE" ] || [ -z "$DESIRED_COUNT" ]; then
    print_usage
fi

# Validate count
if ! [[ "$DESIRED_COUNT" =~ ^[0-9]+$ ]]; then
    echo -e "${RED}Error: Desired count must be a number${NC}"
    exit 1
fi

# Services
ECS_SERVICES=(
    "api-gateway"
    "auth-service"
    "employee-service"
    "attendance-service"
    "project-service"
    "task-service"
    "notification-service"
    "document-service"
    "billing-service"
    "report-service"
    "web-app"
)

scale_service() {
    local SVC=$1
    local COUNT=$2
    
    echo "Scaling $SVC to $COUNT tasks..."
    
    aws ecs update-service \
        --cluster $ECS_CLUSTER \
        --service $SVC \
        --desired-count $COUNT \
        --region $AWS_REGION > /dev/null
    
    echo -e "${GREEN}✓ $SVC scaled to $COUNT${NC}"
}

echo -e "${BLUE}Scaling ECS Services${NC}"
echo ""

if [ "$SERVICE" == "all" ]; then
    for SVC in "${ECS_SERVICES[@]}"; do
        scale_service $SVC $DESIRED_COUNT
    done
else
    # Validate service name
    VALID=false
    for SVC in "${ECS_SERVICES[@]}"; do
        if [ "$SVC" == "$SERVICE" ]; then
            VALID=true
            break
        fi
    done
    
    if [ "$VALID" == "false" ]; then
        echo -e "${RED}Error: Invalid service name '$SERVICE'${NC}"
        print_usage
    fi
    
    scale_service $SERVICE $DESIRED_COUNT
fi

echo ""
echo -e "${GREEN}Scaling complete!${NC}"

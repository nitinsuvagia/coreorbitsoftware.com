#!/bin/bash
# AWS ECS Shell Access Script
# Office Management SaaS - Connect to running container

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

# Parse arguments
SERVICE="${1:-api-gateway}"
COMMAND="${2:-/bin/sh}"

echo -e "${BLUE}Connecting to $SERVICE...${NC}"
echo ""

# Find a running task
TASK_ARN=$(aws ecs list-tasks \
    --cluster $ECS_CLUSTER \
    --service-name $SERVICE \
    --desired-status RUNNING \
    --region $AWS_REGION \
    --query 'taskArns[0]' \
    --output text)

if [ "$TASK_ARN" == "None" ] || [ -z "$TASK_ARN" ]; then
    echo -e "${RED}No running tasks found for $SERVICE${NC}"
    exit 1
fi

echo -e "${GREEN}Found task: $TASK_ARN${NC}"
echo "Connecting..."
echo ""

# Connect using ECS Exec
aws ecs execute-command \
    --cluster $ECS_CLUSTER \
    --task $TASK_ARN \
    --container $SERVICE \
    --interactive \
    --command "$COMMAND" \
    --region $AWS_REGION

#!/bin/bash
# AWS ECS Logs Viewer Script
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
LOG_GROUP="/ecs/${PROJECT_NAME}"

# Parse arguments
SERVICE="${1:-api-gateway}"
LINES="${2:-100}"
FOLLOW="${3:-false}"

echo -e "${BLUE}Fetching logs for $SERVICE...${NC}"
echo ""

if [ "$FOLLOW" == "true" ] || [ "$FOLLOW" == "-f" ]; then
    # Stream logs
    aws logs tail "$LOG_GROUP" \
        --log-stream-name-prefix "$SERVICE" \
        --region $AWS_REGION \
        --follow \
        --format short
else
    # Get recent logs
    aws logs tail "$LOG_GROUP" \
        --log-stream-name-prefix "$SERVICE" \
        --region $AWS_REGION \
        --since "${SINCE:-1h}" \
        --format short | tail -n $LINES
fi

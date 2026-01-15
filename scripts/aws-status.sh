#!/bin/bash
# AWS ECS Deployment Status Script
# Office Management SaaS

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
PROJECT_NAME="${PROJECT_NAME:-office-mgmt}"
AWS_REGION="${AWS_REGION:-us-east-1}"
ECS_CLUSTER="${PROJECT_NAME}-cluster"

print_header() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
}

print_status() {
    if [ "$2" == "ACTIVE" ] || [ "$2" == "RUNNING" ] || [ "$2" == "available" ]; then
        echo -e "  $1: ${GREEN}$2${NC}"
    elif [ "$2" == "PENDING" ] || [ "$2" == "PROVISIONING" ] || [ "$2" == "DRAINING" ]; then
        echo -e "  $1: ${YELLOW}$2${NC}"
    else
        echo -e "  $1: ${RED}$2${NC}"
    fi
}

# ============================================
# ECS Cluster Status
# ============================================
print_header "ECS Cluster Status"

CLUSTER_STATUS=$(aws ecs describe-clusters \
    --clusters $ECS_CLUSTER \
    --region $AWS_REGION \
    --query 'clusters[0].status' \
    --output text 2>/dev/null || echo "NOT_FOUND")

print_status "Cluster" "$CLUSTER_STATUS"

if [ "$CLUSTER_STATUS" != "NOT_FOUND" ]; then
    # Get cluster metrics
    REGISTERED_INSTANCES=$(aws ecs describe-clusters \
        --clusters $ECS_CLUSTER \
        --region $AWS_REGION \
        --query 'clusters[0].registeredContainerInstancesCount' \
        --output text)
    
    RUNNING_TASKS=$(aws ecs describe-clusters \
        --clusters $ECS_CLUSTER \
        --region $AWS_REGION \
        --query 'clusters[0].runningTasksCount' \
        --output text)
    
    PENDING_TASKS=$(aws ecs describe-clusters \
        --clusters $ECS_CLUSTER \
        --region $AWS_REGION \
        --query 'clusters[0].pendingTasksCount' \
        --output text)
    
    echo -e "  EC2 Instances: ${CYAN}$REGISTERED_INSTANCES${NC}"
    echo -e "  Running Tasks: ${GREEN}$RUNNING_TASKS${NC}"
    echo -e "  Pending Tasks: ${YELLOW}$PENDING_TASKS${NC}"
fi

# ============================================
# ECS Services Status
# ============================================
print_header "ECS Services Status"

SERVICES=(
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

printf "%-25s %-12s %-10s %-10s %s\n" "SERVICE" "STATUS" "DESIRED" "RUNNING" "HEALTH"
printf "%-25s %-12s %-10s %-10s %s\n" "-------" "------" "-------" "-------" "------"

for SERVICE in "${SERVICES[@]}"; do
    SERVICE_INFO=$(aws ecs describe-services \
        --cluster $ECS_CLUSTER \
        --services $SERVICE \
        --region $AWS_REGION \
        --query 'services[0]' \
        --output json 2>/dev/null || echo '{}')
    
    if [ "$SERVICE_INFO" != "{}" ] && [ "$SERVICE_INFO" != "null" ]; then
        STATUS=$(echo $SERVICE_INFO | jq -r '.status // "N/A"')
        DESIRED=$(echo $SERVICE_INFO | jq -r '.desiredCount // 0')
        RUNNING=$(echo $SERVICE_INFO | jq -r '.runningCount // 0')
        
        if [ "$RUNNING" -eq "$DESIRED" ] && [ "$DESIRED" -gt 0 ]; then
            HEALTH="${GREEN}HEALTHY${NC}"
        elif [ "$RUNNING" -gt 0 ]; then
            HEALTH="${YELLOW}PARTIAL${NC}"
        else
            HEALTH="${RED}UNHEALTHY${NC}"
        fi
        
        printf "%-25s %-12s %-10s %-10s %b\n" "$SERVICE" "$STATUS" "$DESIRED" "$RUNNING" "$HEALTH"
    else
        printf "%-25s %-12s %-10s %-10s %b\n" "$SERVICE" "NOT_FOUND" "-" "-" "${RED}N/A${NC}"
    fi
done

# ============================================
# EC2 Instances Status
# ============================================
print_header "EC2 Container Instances"

INSTANCES=$(aws ecs list-container-instances \
    --cluster $ECS_CLUSTER \
    --region $AWS_REGION \
    --query 'containerInstanceArns' \
    --output json 2>/dev/null || echo '[]')

if [ "$INSTANCES" != "[]" ]; then
    aws ecs describe-container-instances \
        --cluster $ECS_CLUSTER \
        --container-instances $(echo $INSTANCES | jq -r '.[]') \
        --region $AWS_REGION \
        --query 'containerInstances[*].{ID:ec2InstanceId,Status:status,CPU:remainingResources[?name==`CPU`].integerValue|[0],Memory:remainingResources[?name==`MEMORY`].integerValue|[0],Tasks:runningTasksCount}' \
        --output table
else
    echo "  No container instances registered"
fi

# ============================================
# RDS Status
# ============================================
print_header "RDS Database Status"

RDS_STATUS=$(aws rds describe-db-instances \
    --db-instance-identifier "${PROJECT_NAME}-postgres" \
    --region $AWS_REGION \
    --query 'DBInstances[0].DBInstanceStatus' \
    --output text 2>/dev/null || echo "NOT_FOUND")

print_status "RDS Instance" "$RDS_STATUS"

if [ "$RDS_STATUS" != "NOT_FOUND" ]; then
    RDS_INFO=$(aws rds describe-db-instances \
        --db-instance-identifier "${PROJECT_NAME}-postgres" \
        --region $AWS_REGION \
        --query 'DBInstances[0]' \
        --output json)
    
    echo -e "  Endpoint: ${CYAN}$(echo $RDS_INFO | jq -r '.Endpoint.Address'):$(echo $RDS_INFO | jq -r '.Endpoint.Port')${NC}"
    echo -e "  Instance: ${CYAN}$(echo $RDS_INFO | jq -r '.DBInstanceClass')${NC}"
    echo -e "  Multi-AZ: $(echo $RDS_INFO | jq -r '.MultiAZ')"
    echo -e "  Storage:  $(echo $RDS_INFO | jq -r '.AllocatedStorage') GB"
fi

# ============================================
# ElastiCache Status
# ============================================
print_header "ElastiCache Redis Status"

REDIS_STATUS=$(aws elasticache describe-replication-groups \
    --replication-group-id "${PROJECT_NAME}-redis" \
    --region $AWS_REGION \
    --query 'ReplicationGroups[0].Status' \
    --output text 2>/dev/null || echo "NOT_FOUND")

print_status "Redis Cluster" "$REDIS_STATUS"

if [ "$REDIS_STATUS" != "NOT_FOUND" ]; then
    REDIS_INFO=$(aws elasticache describe-replication-groups \
        --replication-group-id "${PROJECT_NAME}-redis" \
        --region $AWS_REGION \
        --query 'ReplicationGroups[0]' \
        --output json)
    
    echo -e "  Endpoint: ${CYAN}$(echo $REDIS_INFO | jq -r '.NodeGroups[0].PrimaryEndpoint.Address'):$(echo $REDIS_INFO | jq -r '.NodeGroups[0].PrimaryEndpoint.Port')${NC}"
    echo -e "  Node Type: $(echo $REDIS_INFO | jq -r '.CacheNodeType')"
fi

# ============================================
# ALB Status
# ============================================
print_header "Application Load Balancer Status"

ALB_ARN=$(aws elbv2 describe-load-balancers \
    --names "${PROJECT_NAME}-alb" \
    --region $AWS_REGION \
    --query 'LoadBalancers[0].LoadBalancerArn' \
    --output text 2>/dev/null || echo "NOT_FOUND")

if [ "$ALB_ARN" != "NOT_FOUND" ]; then
    ALB_INFO=$(aws elbv2 describe-load-balancers \
        --load-balancer-arns $ALB_ARN \
        --region $AWS_REGION \
        --query 'LoadBalancers[0]' \
        --output json)
    
    ALB_STATE=$(echo $ALB_INFO | jq -r '.State.Code')
    print_status "ALB Status" "$ALB_STATE"
    echo -e "  DNS Name: ${CYAN}$(echo $ALB_INFO | jq -r '.DNSName')${NC}"
    
    # Target group health
    echo ""
    echo "  Target Group Health:"
    
    TARGET_GROUPS=$(aws elbv2 describe-target-groups \
        --load-balancer-arn $ALB_ARN \
        --region $AWS_REGION \
        --query 'TargetGroups[*].TargetGroupArn' \
        --output json)
    
    for TG_ARN in $(echo $TARGET_GROUPS | jq -r '.[]'); do
        TG_NAME=$(aws elbv2 describe-target-groups \
            --target-group-arns $TG_ARN \
            --region $AWS_REGION \
            --query 'TargetGroups[0].TargetGroupName' \
            --output text)
        
        HEALTHY=$(aws elbv2 describe-target-health \
            --target-group-arn $TG_ARN \
            --region $AWS_REGION \
            --query 'TargetHealthDescriptions[?TargetHealth.State==`healthy`] | length(@)' \
            --output text)
        
        TOTAL=$(aws elbv2 describe-target-health \
            --target-group-arn $TG_ARN \
            --region $AWS_REGION \
            --query 'TargetHealthDescriptions | length(@)' \
            --output text)
        
        if [ "$HEALTHY" -eq "$TOTAL" ] && [ "$TOTAL" -gt 0 ]; then
            echo -e "    $TG_NAME: ${GREEN}$HEALTHY/$TOTAL healthy${NC}"
        elif [ "$HEALTHY" -gt 0 ]; then
            echo -e "    $TG_NAME: ${YELLOW}$HEALTHY/$TOTAL healthy${NC}"
        else
            echo -e "    $TG_NAME: ${RED}$HEALTHY/$TOTAL healthy${NC}"
        fi
    done
else
    echo "  ALB not found"
fi

# ============================================
# Recent Deployments
# ============================================
print_header "Recent Deployment Events (Last 5)"

for SERVICE in "api-gateway" "web-app"; do
    echo -e "${CYAN}$SERVICE:${NC}"
    aws ecs describe-services \
        --cluster $ECS_CLUSTER \
        --services $SERVICE \
        --region $AWS_REGION \
        --query 'services[0].events[:5].[createdAt,message]' \
        --output table 2>/dev/null || echo "  No events found"
    echo ""
done

# ============================================
# Summary
# ============================================
print_header "Quick Links"

echo "AWS Console Links:"
echo "  ECS Cluster:   https://${AWS_REGION}.console.aws.amazon.com/ecs/home?region=${AWS_REGION}#/clusters/${ECS_CLUSTER}"
echo "  CloudWatch:    https://${AWS_REGION}.console.aws.amazon.com/cloudwatch/home?region=${AWS_REGION}#logsV2:log-groups/log-group/\$252Fecs\$252F${PROJECT_NAME}"
echo "  RDS:           https://${AWS_REGION}.console.aws.amazon.com/rds/home?region=${AWS_REGION}#database:id=${PROJECT_NAME}-postgres"
echo ""

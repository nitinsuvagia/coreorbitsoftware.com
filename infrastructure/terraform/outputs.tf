# Terraform Outputs for Office Management SaaS
# Important resource information

# ============================================
# VPC Outputs
# ============================================

output "vpc_id" {
  description = "ID of the VPC"
  value       = aws_vpc.main.id
}

output "public_subnet_ids" {
  description = "IDs of the public subnets"
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "IDs of the private subnets"
  value       = aws_subnet.private[*].id
}

# ============================================
# ECR Outputs
# ============================================

output "ecr_repository_urls" {
  description = "URLs of the ECR repositories"
  value = {
    api_gateway          = aws_ecr_repository.api_gateway.repository_url
    auth_service         = aws_ecr_repository.auth_service.repository_url
    employee_service     = aws_ecr_repository.employee_service.repository_url
    attendance_service   = aws_ecr_repository.attendance_service.repository_url
    project_service      = aws_ecr_repository.project_service.repository_url
    task_service         = aws_ecr_repository.task_service.repository_url
    notification_service = aws_ecr_repository.notification_service.repository_url
    document_service     = aws_ecr_repository.document_service.repository_url
    billing_service      = aws_ecr_repository.billing_service.repository_url
    report_service       = aws_ecr_repository.report_service.repository_url
    web_app              = aws_ecr_repository.web_app.repository_url
  }
}

# ============================================
# ECS Outputs
# ============================================

output "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  value       = aws_ecs_cluster.main.name
}

output "ecs_cluster_arn" {
  description = "ARN of the ECS cluster"
  value       = aws_ecs_cluster.main.arn
}

# ============================================
# Load Balancer Outputs
# ============================================

output "alb_dns_name" {
  description = "DNS name of the Application Load Balancer"
  value       = aws_lb.main.dns_name
}

output "alb_zone_id" {
  description = "Zone ID of the Application Load Balancer"
  value       = aws_lb.main.zone_id
}

output "alb_arn" {
  description = "ARN of the Application Load Balancer"
  value       = aws_lb.main.arn
}

# ============================================
# Database Outputs
# ============================================

output "rds_endpoint" {
  description = "Endpoint of the RDS instance"
  value       = aws_db_instance.main.endpoint
}

output "rds_address" {
  description = "Address of the RDS instance"
  value       = aws_db_instance.main.address
}

output "db_credentials_secret_arn" {
  description = "ARN of the database credentials secret"
  value       = aws_secretsmanager_secret.db_credentials.arn
}

# ============================================
# Redis Outputs
# ============================================

output "redis_endpoint" {
  description = "Primary endpoint of Redis"
  value       = aws_elasticache_replication_group.main.primary_endpoint_address
}

output "redis_reader_endpoint" {
  description = "Reader endpoint of Redis"
  value       = aws_elasticache_replication_group.main.reader_endpoint_address
}

# ============================================
# S3 Outputs
# ============================================

output "documents_bucket_name" {
  description = "Name of the documents S3 bucket"
  value       = aws_s3_bucket.documents.bucket
}

output "documents_bucket_arn" {
  description = "ARN of the documents S3 bucket"
  value       = aws_s3_bucket.documents.arn
}

output "logs_bucket_name" {
  description = "Name of the logs S3 bucket"
  value       = aws_s3_bucket.logs.bucket
}

# ============================================
# Service Discovery Outputs
# ============================================

output "service_discovery_namespace" {
  description = "Service discovery namespace"
  value       = aws_service_discovery_private_dns_namespace.main.name
}

# ============================================
# CloudWatch Outputs
# ============================================

output "log_group_name" {
  description = "Name of the CloudWatch log group"
  value       = aws_cloudwatch_log_group.ecs.name
}

# ============================================
# SNS Outputs
# ============================================

output "alerts_topic_arn" {
  description = "ARN of the alerts SNS topic"
  value       = aws_sns_topic.alerts.arn
}

# ============================================
# ACM Certificate
# ============================================

output "acm_certificate_arn" {
  description = "ARN of the ACM certificate"
  value       = var.acm_certificate_arn != "" ? var.acm_certificate_arn : (length(aws_acm_certificate.main) > 0 ? aws_acm_certificate.main[0].arn : null)
}

# ============================================
# Connection Strings (for local use)
# ============================================

output "database_connection_info" {
  description = "Database connection information"
  value = {
    host     = aws_db_instance.main.address
    port     = 5432
    database = var.db_name
    username = var.db_username
    # Password is in Secrets Manager
    secret_arn = aws_secretsmanager_secret.db_credentials.arn
  }
  sensitive = true
}

# ============================================
# URLs
# ============================================

output "application_url" {
  description = "Application URL (update DNS to point to ALB)"
  value       = "https://${var.domain_name}"
}

output "api_url" {
  description = "API URL"
  value       = "https://${var.domain_name}/api"
}

output "alb_url" {
  description = "ALB URL (before DNS setup)"
  value       = "https://${aws_lb.main.dns_name}"
}

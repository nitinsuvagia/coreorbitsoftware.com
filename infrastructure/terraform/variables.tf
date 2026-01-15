# Terraform Variables for Office Management SaaS
# ECS EC2 Deployment Configuration

# ============================================
# General Configuration
# ============================================

variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name (dev, staging, production)"
  type        = string
  default     = "production"
}

variable "project_name" {
  description = "Project name prefix for resources"
  type        = string
  default     = "office-mgmt"
}

# ============================================
# VPC Configuration
# ============================================

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "List of availability zones"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for private subnets"
  type        = list(string)
  default     = ["10.0.10.0/24", "10.0.20.0/24", "10.0.30.0/24"]
}

# ============================================
# EC2 / ECS Configuration
# ============================================

variable "ecs_instance_type" {
  description = "EC2 instance type for ECS cluster"
  type        = string
  default     = "t3.large"
}

variable "ecs_min_instances" {
  description = "Minimum number of EC2 instances in ECS cluster"
  type        = number
  default     = 2
}

variable "ecs_max_instances" {
  description = "Maximum number of EC2 instances in ECS cluster"
  type        = number
  default     = 6
}

variable "ecs_desired_instances" {
  description = "Desired number of EC2 instances in ECS cluster"
  type        = number
  default     = 2
}

# ============================================
# Database Configuration
# ============================================

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.medium"
}

variable "db_allocated_storage" {
  description = "Allocated storage for RDS in GB"
  type        = number
  default     = 100
}

variable "db_max_allocated_storage" {
  description = "Maximum allocated storage for RDS autoscaling in GB"
  type        = number
  default     = 500
}

variable "db_name" {
  description = "Default database name"
  type        = string
  default     = "office_management"
}

variable "db_username" {
  description = "Database master username"
  type        = string
  default     = "admin"
  sensitive   = true
}

variable "db_password" {
  description = "Database master password"
  type        = string
  sensitive   = true
}

variable "db_multi_az" {
  description = "Enable Multi-AZ deployment for RDS"
  type        = bool
  default     = true
}

# ============================================
# Redis Configuration
# ============================================

variable "redis_node_type" {
  description = "ElastiCache Redis node type"
  type        = string
  default     = "cache.t3.medium"
}

variable "redis_num_cache_nodes" {
  description = "Number of Redis cache nodes"
  type        = number
  default     = 2
}

# ============================================
# Application Configuration
# ============================================

variable "domain_name" {
  description = "Main domain name for the application"
  type        = string
  default     = "officemanagement.com"
}

variable "jwt_secret" {
  description = "JWT secret for authentication"
  type        = string
  sensitive   = true
}

variable "jwt_expires_in" {
  description = "JWT token expiration"
  type        = string
  default     = "24h"
}

# ============================================
# Service Task Counts
# ============================================

variable "api_gateway_desired_count" {
  description = "Desired number of API Gateway tasks"
  type        = number
  default     = 2
}

variable "auth_service_desired_count" {
  description = "Desired number of Auth Service tasks"
  type        = number
  default     = 2
}

variable "employee_service_desired_count" {
  description = "Desired number of Employee Service tasks"
  type        = number
  default     = 2
}

variable "attendance_service_desired_count" {
  description = "Desired number of Attendance Service tasks"
  type        = number
  default     = 2
}

variable "project_service_desired_count" {
  description = "Desired number of Project Service tasks"
  type        = number
  default     = 2
}

variable "task_service_desired_count" {
  description = "Desired number of Task Service tasks"
  type        = number
  default     = 2
}

variable "notification_service_desired_count" {
  description = "Desired number of Notification Service tasks"
  type        = number
  default     = 1
}

variable "document_service_desired_count" {
  description = "Desired number of Document Service tasks"
  type        = number
  default     = 2
}

variable "billing_service_desired_count" {
  description = "Desired number of Billing Service tasks"
  type        = number
  default     = 1
}

variable "report_service_desired_count" {
  description = "Desired number of Report Service tasks"
  type        = number
  default     = 1
}

variable "web_app_desired_count" {
  description = "Desired number of Web App tasks"
  type        = number
  default     = 2
}

# ============================================
# Logging Configuration
# ============================================

variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 30
}

# ============================================
# SSL/TLS Configuration
# ============================================

variable "acm_certificate_arn" {
  description = "ARN of ACM certificate for HTTPS (optional, will create if not provided)"
  type        = string
  default     = ""
}

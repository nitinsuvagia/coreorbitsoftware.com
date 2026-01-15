# ECS Task Definitions for Office Management SaaS
# All microservices task definitions

locals {
  ecr_base_url = "${data.aws_caller_identity.current.account_id}.dkr.ecr.${var.aws_region}.amazonaws.com"
  
  common_environment = [
    {
      name  = "NODE_ENV"
      value = var.environment
    },
    {
      name  = "AWS_REGION"
      value = var.aws_region
    },
    {
      name  = "REDIS_HOST"
      value = aws_elasticache_replication_group.main.primary_endpoint_address
    },
    {
      name  = "REDIS_PORT"
      value = "6379"
    },
    {
      name  = "S3_BUCKET"
      value = aws_s3_bucket.documents.bucket
    }
  ]
  
  common_secrets = [
    {
      name      = "DATABASE_URL"
      valueFrom = "${aws_secretsmanager_secret.db_credentials.arn}:connectionString::"
    },
    {
      name      = "JWT_SECRET"
      valueFrom = "${aws_secretsmanager_secret.jwt_secret.arn}:secret::"
    }
  ]
}

# ============================================
# API Gateway Task Definition
# ============================================

resource "aws_ecs_task_definition" "api_gateway" {
  family                   = "${var.project_name}-api-gateway"
  network_mode             = "bridge"
  requires_compatibilities = ["EC2"]
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn
  cpu                      = 512
  memory                   = 1024

  container_definitions = jsonencode([
    {
      name      = "api-gateway"
      image     = "${local.ecr_base_url}/${var.project_name}/api-gateway:latest"
      essential = true
      cpu       = 512
      memory    = 1024

      portMappings = [
        {
          containerPort = 3000
          hostPort      = 0
          protocol      = "tcp"
        }
      ]

      environment = concat(local.common_environment, [
        { name = "PORT", value = "3000" },
        { name = "AUTH_SERVICE_URL", value = "http://auth-service.${var.project_name}.local:3001" },
        { name = "EMPLOYEE_SERVICE_URL", value = "http://employee-service.${var.project_name}.local:3002" },
        { name = "ATTENDANCE_SERVICE_URL", value = "http://attendance-service.${var.project_name}.local:3003" },
        { name = "PROJECT_SERVICE_URL", value = "http://project-service.${var.project_name}.local:3004" },
        { name = "TASK_SERVICE_URL", value = "http://task-service.${var.project_name}.local:3005" },
        { name = "NOTIFICATION_SERVICE_URL", value = "http://notification-service.${var.project_name}.local:3006" },
        { name = "DOCUMENT_SERVICE_URL", value = "http://document-service.${var.project_name}.local:3007" },
        { name = "BILLING_SERVICE_URL", value = "http://billing-service.${var.project_name}.local:3008" },
        { name = "REPORT_SERVICE_URL", value = "http://report-service.${var.project_name}.local:3009" }
      ])

      secrets = local.common_secrets

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.ecs.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "api-gateway"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "wget -q --spider http://localhost:3000/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
    }
  ])

  tags = {
    Name    = "${var.project_name}-api-gateway"
    Service = "api-gateway"
  }
}

# ============================================
# Auth Service Task Definition
# ============================================

resource "aws_ecs_task_definition" "auth_service" {
  family                   = "${var.project_name}-auth-service"
  network_mode             = "bridge"
  requires_compatibilities = ["EC2"]
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn
  cpu                      = 512
  memory                   = 1024

  container_definitions = jsonencode([
    {
      name      = "auth-service"
      image     = "${local.ecr_base_url}/${var.project_name}/auth-service:latest"
      essential = true
      cpu       = 512
      memory    = 1024

      portMappings = [
        {
          containerPort = 3001
          hostPort      = 0
          protocol      = "tcp"
        }
      ]

      environment = concat(local.common_environment, [
        { name = "PORT", value = "3001" },
        { name = "JWT_EXPIRES_IN", value = var.jwt_expires_in }
      ])

      secrets = local.common_secrets

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.ecs.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "auth-service"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "wget -q --spider http://localhost:3001/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
    }
  ])

  tags = {
    Name    = "${var.project_name}-auth-service"
    Service = "auth-service"
  }
}

# ============================================
# Employee Service Task Definition
# ============================================

resource "aws_ecs_task_definition" "employee_service" {
  family                   = "${var.project_name}-employee-service"
  network_mode             = "bridge"
  requires_compatibilities = ["EC2"]
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn
  cpu                      = 512
  memory                   = 1024

  container_definitions = jsonencode([
    {
      name      = "employee-service"
      image     = "${local.ecr_base_url}/${var.project_name}/employee-service:latest"
      essential = true
      cpu       = 512
      memory    = 1024

      portMappings = [
        {
          containerPort = 3002
          hostPort      = 0
          protocol      = "tcp"
        }
      ]

      environment = concat(local.common_environment, [
        { name = "PORT", value = "3002" }
      ])

      secrets = local.common_secrets

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.ecs.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "employee-service"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "wget -q --spider http://localhost:3002/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
    }
  ])

  tags = {
    Name    = "${var.project_name}-employee-service"
    Service = "employee-service"
  }
}

# ============================================
# Attendance Service Task Definition
# ============================================

resource "aws_ecs_task_definition" "attendance_service" {
  family                   = "${var.project_name}-attendance-service"
  network_mode             = "bridge"
  requires_compatibilities = ["EC2"]
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn
  cpu                      = 512
  memory                   = 1024

  container_definitions = jsonencode([
    {
      name      = "attendance-service"
      image     = "${local.ecr_base_url}/${var.project_name}/attendance-service:latest"
      essential = true
      cpu       = 512
      memory    = 1024

      portMappings = [
        {
          containerPort = 3003
          hostPort      = 0
          protocol      = "tcp"
        }
      ]

      environment = concat(local.common_environment, [
        { name = "PORT", value = "3003" }
      ])

      secrets = local.common_secrets

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.ecs.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "attendance-service"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "wget -q --spider http://localhost:3003/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
    }
  ])

  tags = {
    Name    = "${var.project_name}-attendance-service"
    Service = "attendance-service"
  }
}

# ============================================
# Project Service Task Definition
# ============================================

resource "aws_ecs_task_definition" "project_service" {
  family                   = "${var.project_name}-project-service"
  network_mode             = "bridge"
  requires_compatibilities = ["EC2"]
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn
  cpu                      = 512
  memory                   = 1024

  container_definitions = jsonencode([
    {
      name      = "project-service"
      image     = "${local.ecr_base_url}/${var.project_name}/project-service:latest"
      essential = true
      cpu       = 512
      memory    = 1024

      portMappings = [
        {
          containerPort = 3004
          hostPort      = 0
          protocol      = "tcp"
        }
      ]

      environment = concat(local.common_environment, [
        { name = "PORT", value = "3004" }
      ])

      secrets = local.common_secrets

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.ecs.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "project-service"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "wget -q --spider http://localhost:3004/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
    }
  ])

  tags = {
    Name    = "${var.project_name}-project-service"
    Service = "project-service"
  }
}

# ============================================
# Task Service Task Definition
# ============================================

resource "aws_ecs_task_definition" "task_service" {
  family                   = "${var.project_name}-task-service"
  network_mode             = "bridge"
  requires_compatibilities = ["EC2"]
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn
  cpu                      = 512
  memory                   = 1024

  container_definitions = jsonencode([
    {
      name      = "task-service"
      image     = "${local.ecr_base_url}/${var.project_name}/task-service:latest"
      essential = true
      cpu       = 512
      memory    = 1024

      portMappings = [
        {
          containerPort = 3005
          hostPort      = 0
          protocol      = "tcp"
        }
      ]

      environment = concat(local.common_environment, [
        { name = "PORT", value = "3005" }
      ])

      secrets = local.common_secrets

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.ecs.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "task-service"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "wget -q --spider http://localhost:3005/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
    }
  ])

  tags = {
    Name    = "${var.project_name}-task-service"
    Service = "task-service"
  }
}

# ============================================
# Notification Service Task Definition
# ============================================

resource "aws_ecs_task_definition" "notification_service" {
  family                   = "${var.project_name}-notification-service"
  network_mode             = "bridge"
  requires_compatibilities = ["EC2"]
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn
  cpu                      = 256
  memory                   = 512

  container_definitions = jsonencode([
    {
      name      = "notification-service"
      image     = "${local.ecr_base_url}/${var.project_name}/notification-service:latest"
      essential = true
      cpu       = 256
      memory    = 512

      portMappings = [
        {
          containerPort = 3006
          hostPort      = 0
          protocol      = "tcp"
        }
      ]

      environment = concat(local.common_environment, [
        { name = "PORT", value = "3006" },
        { name = "SES_REGION", value = var.aws_region }
      ])

      secrets = local.common_secrets

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.ecs.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "notification-service"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "wget -q --spider http://localhost:3006/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
    }
  ])

  tags = {
    Name    = "${var.project_name}-notification-service"
    Service = "notification-service"
  }
}

# ============================================
# Document Service Task Definition
# ============================================

resource "aws_ecs_task_definition" "document_service" {
  family                   = "${var.project_name}-document-service"
  network_mode             = "bridge"
  requires_compatibilities = ["EC2"]
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn
  cpu                      = 512
  memory                   = 1024

  container_definitions = jsonencode([
    {
      name      = "document-service"
      image     = "${local.ecr_base_url}/${var.project_name}/document-service:latest"
      essential = true
      cpu       = 512
      memory    = 1024

      portMappings = [
        {
          containerPort = 3007
          hostPort      = 0
          protocol      = "tcp"
        }
      ]

      environment = concat(local.common_environment, [
        { name = "PORT", value = "3007" },
        { name = "S3_BUCKET", value = aws_s3_bucket.documents.bucket }
      ])

      secrets = local.common_secrets

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.ecs.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "document-service"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "wget -q --spider http://localhost:3007/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
    }
  ])

  tags = {
    Name    = "${var.project_name}-document-service"
    Service = "document-service"
  }
}

# ============================================
# Billing Service Task Definition
# ============================================

resource "aws_ecs_task_definition" "billing_service" {
  family                   = "${var.project_name}-billing-service"
  network_mode             = "bridge"
  requires_compatibilities = ["EC2"]
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn
  cpu                      = 256
  memory                   = 512

  container_definitions = jsonencode([
    {
      name      = "billing-service"
      image     = "${local.ecr_base_url}/${var.project_name}/billing-service:latest"
      essential = true
      cpu       = 256
      memory    = 512

      portMappings = [
        {
          containerPort = 3008
          hostPort      = 0
          protocol      = "tcp"
        }
      ]

      environment = concat(local.common_environment, [
        { name = "PORT", value = "3008" }
      ])

      secrets = local.common_secrets

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.ecs.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "billing-service"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "wget -q --spider http://localhost:3008/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
    }
  ])

  tags = {
    Name    = "${var.project_name}-billing-service"
    Service = "billing-service"
  }
}

# ============================================
# Report Service Task Definition
# ============================================

resource "aws_ecs_task_definition" "report_service" {
  family                   = "${var.project_name}-report-service"
  network_mode             = "bridge"
  requires_compatibilities = ["EC2"]
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn
  cpu                      = 512
  memory                   = 1024

  container_definitions = jsonencode([
    {
      name      = "report-service"
      image     = "${local.ecr_base_url}/${var.project_name}/report-service:latest"
      essential = true
      cpu       = 512
      memory    = 1024

      portMappings = [
        {
          containerPort = 3009
          hostPort      = 0
          protocol      = "tcp"
        }
      ]

      environment = concat(local.common_environment, [
        { name = "PORT", value = "3009" }
      ])

      secrets = local.common_secrets

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.ecs.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "report-service"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "wget -q --spider http://localhost:3009/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
    }
  ])

  tags = {
    Name    = "${var.project_name}-report-service"
    Service = "report-service"
  }
}

# ============================================
# Web App Task Definition
# ============================================

resource "aws_ecs_task_definition" "web_app" {
  family                   = "${var.project_name}-web-app"
  network_mode             = "bridge"
  requires_compatibilities = ["EC2"]
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn
  cpu                      = 512
  memory                   = 1024

  container_definitions = jsonencode([
    {
      name      = "web-app"
      image     = "${local.ecr_base_url}/${var.project_name}/web-app:latest"
      essential = true
      cpu       = 512
      memory    = 1024

      portMappings = [
        {
          containerPort = 4000
          hostPort      = 0
          protocol      = "tcp"
        }
      ]

      environment = [
        { name = "NODE_ENV", value = var.environment },
        { name = "PORT", value = "4000" },
        { name = "NEXT_PUBLIC_API_URL", value = "https://${var.domain_name}/api" },
        { name = "NEXT_PUBLIC_DOMAIN", value = var.domain_name }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.ecs.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "web-app"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "wget -q --spider http://localhost:4000/api/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
    }
  ])

  tags = {
    Name    = "${var.project_name}-web-app"
    Service = "web-app"
  }
}

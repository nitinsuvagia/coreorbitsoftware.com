# ECR Repositories for Office Management SaaS
# Container registries for all microservices

# ============================================
# ECR Repositories
# ============================================

resource "aws_ecr_repository" "api_gateway" {
  name                 = "${var.project_name}/api-gateway"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "AES256"
  }

  tags = {
    Name    = "${var.project_name}-api-gateway"
    Service = "api-gateway"
  }
}

resource "aws_ecr_repository" "auth_service" {
  name                 = "${var.project_name}/auth-service"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "AES256"
  }

  tags = {
    Name    = "${var.project_name}-auth-service"
    Service = "auth-service"
  }
}

resource "aws_ecr_repository" "employee_service" {
  name                 = "${var.project_name}/employee-service"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "AES256"
  }

  tags = {
    Name    = "${var.project_name}-employee-service"
    Service = "employee-service"
  }
}

resource "aws_ecr_repository" "attendance_service" {
  name                 = "${var.project_name}/attendance-service"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "AES256"
  }

  tags = {
    Name    = "${var.project_name}-attendance-service"
    Service = "attendance-service"
  }
}

resource "aws_ecr_repository" "project_service" {
  name                 = "${var.project_name}/project-service"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "AES256"
  }

  tags = {
    Name    = "${var.project_name}-project-service"
    Service = "project-service"
  }
}

resource "aws_ecr_repository" "task_service" {
  name                 = "${var.project_name}/task-service"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "AES256"
  }

  tags = {
    Name    = "${var.project_name}-task-service"
    Service = "task-service"
  }
}

resource "aws_ecr_repository" "notification_service" {
  name                 = "${var.project_name}/notification-service"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "AES256"
  }

  tags = {
    Name    = "${var.project_name}-notification-service"
    Service = "notification-service"
  }
}

resource "aws_ecr_repository" "document_service" {
  name                 = "${var.project_name}/document-service"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "AES256"
  }

  tags = {
    Name    = "${var.project_name}-document-service"
    Service = "document-service"
  }
}

resource "aws_ecr_repository" "billing_service" {
  name                 = "${var.project_name}/billing-service"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "AES256"
  }

  tags = {
    Name    = "${var.project_name}-billing-service"
    Service = "billing-service"
  }
}

resource "aws_ecr_repository" "report_service" {
  name                 = "${var.project_name}/report-service"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "AES256"
  }

  tags = {
    Name    = "${var.project_name}-report-service"
    Service = "report-service"
  }
}

resource "aws_ecr_repository" "web_app" {
  name                 = "${var.project_name}/web-app"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "AES256"
  }

  tags = {
    Name    = "${var.project_name}-web-app"
    Service = "web-app"
  }
}

# ============================================
# ECR Lifecycle Policies
# ============================================

resource "aws_ecr_lifecycle_policy" "cleanup" {
  for_each = {
    api-gateway          = aws_ecr_repository.api_gateway.name
    auth-service         = aws_ecr_repository.auth_service.name
    employee-service     = aws_ecr_repository.employee_service.name
    attendance-service   = aws_ecr_repository.attendance_service.name
    project-service      = aws_ecr_repository.project_service.name
    task-service         = aws_ecr_repository.task_service.name
    notification-service = aws_ecr_repository.notification_service.name
    document-service     = aws_ecr_repository.document_service.name
    billing-service      = aws_ecr_repository.billing_service.name
    report-service       = aws_ecr_repository.report_service.name
    web-app              = aws_ecr_repository.web_app.name
  }

  repository = each.value

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 10 production images"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["prod-", "v"]
          countType     = "imageCountMoreThan"
          countNumber   = 10
        }
        action = {
          type = "expire"
        }
      },
      {
        rulePriority = 2
        description  = "Keep last 5 staging images"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["staging-", "stg-"]
          countType     = "imageCountMoreThan"
          countNumber   = 5
        }
        action = {
          type = "expire"
        }
      },
      {
        rulePriority = 3
        description  = "Delete untagged images older than 7 days"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 7
        }
        action = {
          type = "expire"
        }
      },
      {
        rulePriority = 4
        description  = "Keep only last 20 images overall"
        selection = {
          tagStatus   = "any"
          countType   = "imageCountMoreThan"
          countNumber = 20
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}

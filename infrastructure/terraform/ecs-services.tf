# ECS Services for Office Management SaaS
# All microservices with service discovery

# ============================================
# Service Discovery Services
# ============================================

resource "aws_service_discovery_service" "api_gateway" {
  name = "api-gateway"

  dns_config {
    namespace_id   = aws_service_discovery_private_dns_namespace.main.id
    routing_policy = "MULTIVALUE"
    
    dns_records {
      ttl  = 10
      type = "A"
    }
  }

  health_check_custom_config {
    failure_threshold = 1
  }
}

resource "aws_service_discovery_service" "auth_service" {
  name = "auth-service"

  dns_config {
    namespace_id   = aws_service_discovery_private_dns_namespace.main.id
    routing_policy = "MULTIVALUE"
    
    dns_records {
      ttl  = 10
      type = "A"
    }
  }

  health_check_custom_config {
    failure_threshold = 1
  }
}

resource "aws_service_discovery_service" "employee_service" {
  name = "employee-service"

  dns_config {
    namespace_id   = aws_service_discovery_private_dns_namespace.main.id
    routing_policy = "MULTIVALUE"
    
    dns_records {
      ttl  = 10
      type = "A"
    }
  }

  health_check_custom_config {
    failure_threshold = 1
  }
}

resource "aws_service_discovery_service" "attendance_service" {
  name = "attendance-service"

  dns_config {
    namespace_id   = aws_service_discovery_private_dns_namespace.main.id
    routing_policy = "MULTIVALUE"
    
    dns_records {
      ttl  = 10
      type = "A"
    }
  }

  health_check_custom_config {
    failure_threshold = 1
  }
}

resource "aws_service_discovery_service" "project_service" {
  name = "project-service"

  dns_config {
    namespace_id   = aws_service_discovery_private_dns_namespace.main.id
    routing_policy = "MULTIVALUE"
    
    dns_records {
      ttl  = 10
      type = "A"
    }
  }

  health_check_custom_config {
    failure_threshold = 1
  }
}

resource "aws_service_discovery_service" "task_service" {
  name = "task-service"

  dns_config {
    namespace_id   = aws_service_discovery_private_dns_namespace.main.id
    routing_policy = "MULTIVALUE"
    
    dns_records {
      ttl  = 10
      type = "A"
    }
  }

  health_check_custom_config {
    failure_threshold = 1
  }
}

resource "aws_service_discovery_service" "notification_service" {
  name = "notification-service"

  dns_config {
    namespace_id   = aws_service_discovery_private_dns_namespace.main.id
    routing_policy = "MULTIVALUE"
    
    dns_records {
      ttl  = 10
      type = "A"
    }
  }

  health_check_custom_config {
    failure_threshold = 1
  }
}

resource "aws_service_discovery_service" "document_service" {
  name = "document-service"

  dns_config {
    namespace_id   = aws_service_discovery_private_dns_namespace.main.id
    routing_policy = "MULTIVALUE"
    
    dns_records {
      ttl  = 10
      type = "A"
    }
  }

  health_check_custom_config {
    failure_threshold = 1
  }
}

resource "aws_service_discovery_service" "billing_service" {
  name = "billing-service"

  dns_config {
    namespace_id   = aws_service_discovery_private_dns_namespace.main.id
    routing_policy = "MULTIVALUE"
    
    dns_records {
      ttl  = 10
      type = "A"
    }
  }

  health_check_custom_config {
    failure_threshold = 1
  }
}

resource "aws_service_discovery_service" "report_service" {
  name = "report-service"

  dns_config {
    namespace_id   = aws_service_discovery_private_dns_namespace.main.id
    routing_policy = "MULTIVALUE"
    
    dns_records {
      ttl  = 10
      type = "A"
    }
  }

  health_check_custom_config {
    failure_threshold = 1
  }
}

# ============================================
# ECS Services
# ============================================

resource "aws_ecs_service" "api_gateway" {
  name            = "api-gateway"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.api_gateway.arn
  desired_count   = var.api_gateway_desired_count

  capacity_provider_strategy {
    capacity_provider = aws_ecs_capacity_provider.main.name
    weight            = 100
    base              = 1
  }

  ordered_placement_strategy {
    type  = "spread"
    field = "instanceId"
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.api_gateway.arn
    container_name   = "api-gateway"
    container_port   = 3000
  }

  service_registries {
    registry_arn   = aws_service_discovery_service.api_gateway.arn
    container_port = 3000
    container_name = "api-gateway"
  }

  deployment_configuration {
    maximum_percent         = 200
    minimum_healthy_percent = 100
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  enable_execute_command = true

  lifecycle {
    ignore_changes = [desired_count, task_definition]
  }

  depends_on = [aws_lb_listener.https]

  tags = {
    Name    = "${var.project_name}-api-gateway"
    Service = "api-gateway"
  }
}

resource "aws_ecs_service" "auth_service" {
  name            = "auth-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.auth_service.arn
  desired_count   = var.auth_service_desired_count

  capacity_provider_strategy {
    capacity_provider = aws_ecs_capacity_provider.main.name
    weight            = 100
  }

  ordered_placement_strategy {
    type  = "spread"
    field = "instanceId"
  }

  service_registries {
    registry_arn   = aws_service_discovery_service.auth_service.arn
    container_port = 3001
    container_name = "auth-service"
  }

  deployment_configuration {
    maximum_percent         = 200
    minimum_healthy_percent = 100
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  enable_execute_command = true

  lifecycle {
    ignore_changes = [desired_count, task_definition]
  }

  tags = {
    Name    = "${var.project_name}-auth-service"
    Service = "auth-service"
  }
}

resource "aws_ecs_service" "employee_service" {
  name            = "employee-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.employee_service.arn
  desired_count   = var.employee_service_desired_count

  capacity_provider_strategy {
    capacity_provider = aws_ecs_capacity_provider.main.name
    weight            = 100
  }

  ordered_placement_strategy {
    type  = "spread"
    field = "instanceId"
  }

  service_registries {
    registry_arn   = aws_service_discovery_service.employee_service.arn
    container_port = 3002
    container_name = "employee-service"
  }

  deployment_configuration {
    maximum_percent         = 200
    minimum_healthy_percent = 100
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  enable_execute_command = true

  lifecycle {
    ignore_changes = [desired_count, task_definition]
  }

  tags = {
    Name    = "${var.project_name}-employee-service"
    Service = "employee-service"
  }
}

resource "aws_ecs_service" "attendance_service" {
  name            = "attendance-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.attendance_service.arn
  desired_count   = var.attendance_service_desired_count

  capacity_provider_strategy {
    capacity_provider = aws_ecs_capacity_provider.main.name
    weight            = 100
  }

  ordered_placement_strategy {
    type  = "spread"
    field = "instanceId"
  }

  service_registries {
    registry_arn   = aws_service_discovery_service.attendance_service.arn
    container_port = 3003
    container_name = "attendance-service"
  }

  deployment_configuration {
    maximum_percent         = 200
    minimum_healthy_percent = 100
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  enable_execute_command = true

  lifecycle {
    ignore_changes = [desired_count, task_definition]
  }

  tags = {
    Name    = "${var.project_name}-attendance-service"
    Service = "attendance-service"
  }
}

resource "aws_ecs_service" "project_service" {
  name            = "project-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.project_service.arn
  desired_count   = var.project_service_desired_count

  capacity_provider_strategy {
    capacity_provider = aws_ecs_capacity_provider.main.name
    weight            = 100
  }

  ordered_placement_strategy {
    type  = "spread"
    field = "instanceId"
  }

  service_registries {
    registry_arn   = aws_service_discovery_service.project_service.arn
    container_port = 3004
    container_name = "project-service"
  }

  deployment_configuration {
    maximum_percent         = 200
    minimum_healthy_percent = 100
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  enable_execute_command = true

  lifecycle {
    ignore_changes = [desired_count, task_definition]
  }

  tags = {
    Name    = "${var.project_name}-project-service"
    Service = "project-service"
  }
}

resource "aws_ecs_service" "task_service" {
  name            = "task-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.task_service.arn
  desired_count   = var.task_service_desired_count

  capacity_provider_strategy {
    capacity_provider = aws_ecs_capacity_provider.main.name
    weight            = 100
  }

  ordered_placement_strategy {
    type  = "spread"
    field = "instanceId"
  }

  service_registries {
    registry_arn   = aws_service_discovery_service.task_service.arn
    container_port = 3005
    container_name = "task-service"
  }

  deployment_configuration {
    maximum_percent         = 200
    minimum_healthy_percent = 100
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  enable_execute_command = true

  lifecycle {
    ignore_changes = [desired_count, task_definition]
  }

  tags = {
    Name    = "${var.project_name}-task-service"
    Service = "task-service"
  }
}

resource "aws_ecs_service" "notification_service" {
  name            = "notification-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.notification_service.arn
  desired_count   = var.notification_service_desired_count

  capacity_provider_strategy {
    capacity_provider = aws_ecs_capacity_provider.main.name
    weight            = 100
  }

  ordered_placement_strategy {
    type  = "spread"
    field = "instanceId"
  }

  service_registries {
    registry_arn   = aws_service_discovery_service.notification_service.arn
    container_port = 3006
    container_name = "notification-service"
  }

  deployment_configuration {
    maximum_percent         = 200
    minimum_healthy_percent = 100
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  enable_execute_command = true

  lifecycle {
    ignore_changes = [desired_count, task_definition]
  }

  tags = {
    Name    = "${var.project_name}-notification-service"
    Service = "notification-service"
  }
}

resource "aws_ecs_service" "document_service" {
  name            = "document-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.document_service.arn
  desired_count   = var.document_service_desired_count

  capacity_provider_strategy {
    capacity_provider = aws_ecs_capacity_provider.main.name
    weight            = 100
  }

  ordered_placement_strategy {
    type  = "spread"
    field = "instanceId"
  }

  service_registries {
    registry_arn   = aws_service_discovery_service.document_service.arn
    container_port = 3007
    container_name = "document-service"
  }

  deployment_configuration {
    maximum_percent         = 200
    minimum_healthy_percent = 100
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  enable_execute_command = true

  lifecycle {
    ignore_changes = [desired_count, task_definition]
  }

  tags = {
    Name    = "${var.project_name}-document-service"
    Service = "document-service"
  }
}

resource "aws_ecs_service" "billing_service" {
  name            = "billing-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.billing_service.arn
  desired_count   = var.billing_service_desired_count

  capacity_provider_strategy {
    capacity_provider = aws_ecs_capacity_provider.main.name
    weight            = 100
  }

  ordered_placement_strategy {
    type  = "spread"
    field = "instanceId"
  }

  service_registries {
    registry_arn   = aws_service_discovery_service.billing_service.arn
    container_port = 3008
    container_name = "billing-service"
  }

  deployment_configuration {
    maximum_percent         = 200
    minimum_healthy_percent = 100
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  enable_execute_command = true

  lifecycle {
    ignore_changes = [desired_count, task_definition]
  }

  tags = {
    Name    = "${var.project_name}-billing-service"
    Service = "billing-service"
  }
}

resource "aws_ecs_service" "report_service" {
  name            = "report-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.report_service.arn
  desired_count   = var.report_service_desired_count

  capacity_provider_strategy {
    capacity_provider = aws_ecs_capacity_provider.main.name
    weight            = 100
  }

  ordered_placement_strategy {
    type  = "spread"
    field = "instanceId"
  }

  service_registries {
    registry_arn   = aws_service_discovery_service.report_service.arn
    container_port = 3009
    container_name = "report-service"
  }

  deployment_configuration {
    maximum_percent         = 200
    minimum_healthy_percent = 100
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  enable_execute_command = true

  lifecycle {
    ignore_changes = [desired_count, task_definition]
  }

  tags = {
    Name    = "${var.project_name}-report-service"
    Service = "report-service"
  }
}

resource "aws_ecs_service" "web_app" {
  name            = "web-app"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.web_app.arn
  desired_count   = var.web_app_desired_count

  capacity_provider_strategy {
    capacity_provider = aws_ecs_capacity_provider.main.name
    weight            = 100
    base              = 1
  }

  ordered_placement_strategy {
    type  = "spread"
    field = "instanceId"
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.web_app.arn
    container_name   = "web-app"
    container_port   = 4000
  }

  deployment_configuration {
    maximum_percent         = 200
    minimum_healthy_percent = 100
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  enable_execute_command = true

  lifecycle {
    ignore_changes = [desired_count, task_definition]
  }

  depends_on = [aws_lb_listener.https]

  tags = {
    Name    = "${var.project_name}-web-app"
    Service = "web-app"
  }
}

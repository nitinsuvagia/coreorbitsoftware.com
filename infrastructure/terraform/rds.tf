# RDS PostgreSQL Configuration for Office Management SaaS
# Multi-AZ deployment with automated backups

# ============================================
# RDS Subnet Group
# ============================================

resource "aws_db_subnet_group" "main" {
  name        = "${var.project_name}-db-subnet-group"
  description = "Database subnet group for ${var.project_name}"
  subnet_ids  = aws_subnet.private[*].id

  tags = {
    Name = "${var.project_name}-db-subnet-group"
  }
}

# ============================================
# RDS Parameter Group
# ============================================

resource "aws_db_parameter_group" "main" {
  name   = "${var.project_name}-pg-params"
  family = "postgres15"

  parameter {
    name  = "log_connections"
    value = "1"
  }

  parameter {
    name  = "log_disconnections"
    value = "1"
  }

  parameter {
    name  = "log_duration"
    value = "1"
  }

  parameter {
    name  = "log_min_duration_statement"
    value = "1000" # Log queries taking more than 1 second
  }

  parameter {
    name  = "shared_preload_libraries"
    value = "pg_stat_statements"
  }

  parameter {
    name         = "max_connections"
    value        = "500"
    apply_method = "pending-reboot"
  }

  tags = {
    Name = "${var.project_name}-pg-params"
  }
}

# ============================================
# Secrets Manager for DB Credentials
# ============================================

resource "random_password" "db_password" {
  count   = var.db_password == "" ? 1 : 0
  length  = 32
  special = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

resource "aws_secretsmanager_secret" "db_credentials" {
  name                    = "${var.project_name}/db-credentials"
  description             = "Database credentials for ${var.project_name}"
  recovery_window_in_days = 7

  tags = {
    Name = "${var.project_name}-db-credentials"
  }
}

resource "aws_secretsmanager_secret_version" "db_credentials" {
  secret_id = aws_secretsmanager_secret.db_credentials.id
  secret_string = jsonencode({
    username = var.db_username
    password = var.db_password != "" ? var.db_password : random_password.db_password[0].result
    host     = aws_db_instance.main.address
    port     = 5432
    database = var.db_name
  })
}

# ============================================
# RDS PostgreSQL Instance
# ============================================

resource "aws_db_instance" "main" {
  identifier = "${var.project_name}-postgres"

  # Engine configuration
  engine               = "postgres"
  engine_version       = "15.4"
  instance_class       = var.db_instance_class
  allocated_storage    = var.db_allocated_storage
  max_allocated_storage = var.db_max_allocated_storage
  storage_type         = "gp3"
  storage_encrypted    = true

  # Database configuration
  db_name  = var.db_name
  username = var.db_username
  password = var.db_password != "" ? var.db_password : random_password.db_password[0].result
  port     = 5432

  # Network configuration
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false
  multi_az               = var.db_multi_az

  # Parameter group
  parameter_group_name = aws_db_parameter_group.main.name

  # Backup configuration
  backup_retention_period = 7
  backup_window           = "03:00-04:00"
  maintenance_window      = "Mon:04:00-Mon:05:00"
  copy_tags_to_snapshot   = true
  skip_final_snapshot     = false
  final_snapshot_identifier = "${var.project_name}-postgres-final-snapshot"

  # Performance Insights
  performance_insights_enabled          = true
  performance_insights_retention_period = 7

  # Monitoring
  monitoring_interval = 60
  monitoring_role_arn = aws_iam_role.rds_monitoring.arn

  # Deletion protection
  deletion_protection = var.environment == "production" ? true : false

  # Auto minor version upgrade
  auto_minor_version_upgrade = true

  tags = {
    Name = "${var.project_name}-postgres"
  }

  lifecycle {
    prevent_destroy = false
  }
}

# ============================================
# RDS Read Replica (Optional for production)
# ============================================

# resource "aws_db_instance" "read_replica" {
#   count = var.environment == "production" ? 1 : 0
#
#   identifier          = "${var.project_name}-postgres-replica"
#   replicate_source_db = aws_db_instance.main.identifier
#   instance_class      = var.db_instance_class
#   
#   vpc_security_group_ids = [aws_security_group.rds.id]
#   publicly_accessible    = false
#   
#   storage_encrypted = true
#   
#   performance_insights_enabled          = true
#   performance_insights_retention_period = 7
#   
#   monitoring_interval = 60
#   monitoring_role_arn = aws_iam_role.rds_monitoring.arn
#   
#   auto_minor_version_upgrade = true
#   
#   tags = {
#     Name = "${var.project_name}-postgres-replica"
#   }
# }

# ============================================
# RDS Monitoring Role
# ============================================

resource "aws_iam_role" "rds_monitoring" {
  name = "${var.project_name}-rds-monitoring-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "monitoring.rds.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name = "${var.project_name}-rds-monitoring-role"
  }
}

resource "aws_iam_role_policy_attachment" "rds_monitoring" {
  role       = aws_iam_role.rds_monitoring.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}

# ============================================
# JWT Secret in Secrets Manager
# ============================================

resource "random_password" "jwt_secret" {
  count   = var.jwt_secret == "" ? 1 : 0
  length  = 64
  special = false
}

resource "aws_secretsmanager_secret" "jwt_secret" {
  name                    = "${var.project_name}/jwt-secret"
  description             = "JWT secret for ${var.project_name}"
  recovery_window_in_days = 7

  tags = {
    Name = "${var.project_name}-jwt-secret"
  }
}

resource "aws_secretsmanager_secret_version" "jwt_secret" {
  secret_id = aws_secretsmanager_secret.jwt_secret.id
  secret_string = jsonencode({
    secret     = var.jwt_secret != "" ? var.jwt_secret : random_password.jwt_secret[0].result
    expires_in = var.jwt_expires_in
  })
}

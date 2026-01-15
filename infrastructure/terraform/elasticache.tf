# ElastiCache Redis Configuration for Office Management SaaS
# Cluster mode with automatic failover

# ============================================
# ElastiCache Subnet Group
# ============================================

resource "aws_elasticache_subnet_group" "main" {
  name        = "${var.project_name}-redis-subnet-group"
  description = "Redis subnet group for ${var.project_name}"
  subnet_ids  = aws_subnet.private[*].id

  tags = {
    Name = "${var.project_name}-redis-subnet-group"
  }
}

# ============================================
# ElastiCache Parameter Group
# ============================================

resource "aws_elasticache_parameter_group" "main" {
  name   = "${var.project_name}-redis-params"
  family = "redis7"

  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"
  }

  parameter {
    name  = "notify-keyspace-events"
    value = "Ex"
  }

  tags = {
    Name = "${var.project_name}-redis-params"
  }
}

# ============================================
# ElastiCache Redis Replication Group
# ============================================

resource "aws_elasticache_replication_group" "main" {
  replication_group_id       = "${var.project_name}-redis"
  description                = "Redis cluster for ${var.project_name}"
  
  # Node configuration
  node_type                  = var.redis_node_type
  num_cache_clusters         = var.redis_num_cache_nodes
  
  # Engine configuration
  engine                     = "redis"
  engine_version             = "7.0"
  port                       = 6379
  parameter_group_name       = aws_elasticache_parameter_group.main.name
  
  # Network configuration
  subnet_group_name          = aws_elasticache_subnet_group.main.name
  security_group_ids         = [aws_security_group.redis.id]
  
  # High availability
  automatic_failover_enabled = var.redis_num_cache_nodes > 1 ? true : false
  multi_az_enabled           = var.redis_num_cache_nodes > 1 ? true : false
  
  # Encryption
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  
  # Maintenance
  maintenance_window         = "sun:05:00-sun:06:00"
  snapshot_window            = "04:00-05:00"
  snapshot_retention_limit   = 7
  
  # Notifications
  notification_topic_arn     = aws_sns_topic.alerts.arn
  
  # Auto minor version upgrade
  auto_minor_version_upgrade = true
  
  # Apply changes immediately (set to false in production)
  apply_immediately          = var.environment != "production"

  tags = {
    Name = "${var.project_name}-redis"
  }

  lifecycle {
    ignore_changes = [num_cache_clusters]
  }
}

# ============================================
# SNS Topic for Alerts
# ============================================

resource "aws_sns_topic" "alerts" {
  name = "${var.project_name}-alerts"

  tags = {
    Name = "${var.project_name}-alerts"
  }
}

# ============================================
# CloudWatch Alarms for Redis
# ============================================

resource "aws_cloudwatch_metric_alarm" "redis_cpu" {
  alarm_name          = "${var.project_name}-redis-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ElastiCache"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "Redis CPU utilization is too high"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]

  dimensions = {
    CacheClusterId = aws_elasticache_replication_group.main.id
  }

  tags = {
    Name = "${var.project_name}-redis-cpu-alarm"
  }
}

resource "aws_cloudwatch_metric_alarm" "redis_memory" {
  alarm_name          = "${var.project_name}-redis-memory-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "DatabaseMemoryUsagePercentage"
  namespace           = "AWS/ElastiCache"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "Redis memory usage is too high"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]

  dimensions = {
    CacheClusterId = aws_elasticache_replication_group.main.id
  }

  tags = {
    Name = "${var.project_name}-redis-memory-alarm"
  }
}

# Application Load Balancer Configuration
# Multi-tenant routing with subdomain support

# ============================================
# Application Load Balancer
# ============================================

resource "aws_lb" "main" {
  name               = "${var.project_name}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id

  enable_deletion_protection = var.environment == "production" ? true : false
  enable_http2               = true

  access_logs {
    bucket  = aws_s3_bucket.logs.bucket
    prefix  = "alb"
    enabled = true
  }

  tags = {
    Name = "${var.project_name}-alb"
  }
}

# ============================================
# ALB Target Groups
# ============================================

resource "aws_lb_target_group" "api_gateway" {
  name                 = "${var.project_name}-api-gateway"
  port                 = 3000
  protocol             = "HTTP"
  vpc_id               = aws_vpc.main.id
  target_type          = "instance"
  deregistration_delay = 30

  health_check {
    enabled             = true
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    path                = "/health"
    matcher             = "200"
  }

  stickiness {
    type            = "lb_cookie"
    cookie_duration = 86400
    enabled         = true
  }

  tags = {
    Name    = "${var.project_name}-api-gateway-tg"
    Service = "api-gateway"
  }
}

resource "aws_lb_target_group" "web_app" {
  name                 = "${var.project_name}-web-app"
  port                 = 4000
  protocol             = "HTTP"
  vpc_id               = aws_vpc.main.id
  target_type          = "instance"
  deregistration_delay = 30

  health_check {
    enabled             = true
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    path                = "/api/health"
    matcher             = "200"
  }

  stickiness {
    type            = "lb_cookie"
    cookie_duration = 86400
    enabled         = true
  }

  tags = {
    Name    = "${var.project_name}-web-app-tg"
    Service = "web-app"
  }
}

# ============================================
# ACM Certificate (for HTTPS)
# ============================================

resource "aws_acm_certificate" "main" {
  count = var.acm_certificate_arn == "" ? 1 : 0

  domain_name               = var.domain_name
  subject_alternative_names = ["*.${var.domain_name}"]
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name = "${var.project_name}-certificate"
  }
}

# ============================================
# ALB Listeners
# ============================================

# HTTP Listener - Redirect to HTTPS
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "redirect"
    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

# HTTPS Listener
resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = var.acm_certificate_arn != "" ? var.acm_certificate_arn : aws_acm_certificate.main[0].arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.web_app.arn
  }
}

# ============================================
# ALB Listener Rules
# ============================================

# API Gateway - Route /api/* to API Gateway
resource "aws_lb_listener_rule" "api_gateway" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 100

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api_gateway.arn
  }

  condition {
    path_pattern {
      values = ["/api/*"]
    }
  }
}

# Admin Portal - Route admin.domain.com to web app
resource "aws_lb_listener_rule" "admin_portal" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 50

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.web_app.arn
  }

  condition {
    host_header {
      values = ["admin.${var.domain_name}"]
    }
  }
}

# Tenant Subdomains - Route *.domain.com to web app
resource "aws_lb_listener_rule" "tenant_subdomains" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 200

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.web_app.arn
  }

  condition {
    host_header {
      values = ["*.${var.domain_name}"]
    }
  }
}

# Main domain - Route to web app (platform admin)
resource "aws_lb_listener_rule" "main_domain" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 300

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.web_app.arn
  }

  condition {
    host_header {
      values = [var.domain_name, "www.${var.domain_name}"]
    }
  }
}

# ============================================
# Route 53 Records (if using Route 53)
# ============================================

# Uncomment if you have a Route 53 hosted zone
# data "aws_route53_zone" "main" {
#   name         = var.domain_name
#   private_zone = false
# }
# 
# resource "aws_route53_record" "main" {
#   zone_id = data.aws_route53_zone.main.zone_id
#   name    = var.domain_name
#   type    = "A"
# 
#   alias {
#     name                   = aws_lb.main.dns_name
#     zone_id                = aws_lb.main.zone_id
#     evaluate_target_health = true
#   }
# }
# 
# resource "aws_route53_record" "wildcard" {
#   zone_id = data.aws_route53_zone.main.zone_id
#   name    = "*.${var.domain_name}"
#   type    = "A"
# 
#   alias {
#     name                   = aws_lb.main.dns_name
#     zone_id                = aws_lb.main.zone_id
#     evaluate_target_health = true
#   }
# }
# 
# resource "aws_route53_record" "cert_validation" {
#   for_each = var.acm_certificate_arn == "" ? {
#     for dvo in aws_acm_certificate.main[0].domain_validation_options : dvo.domain_name => {
#       name   = dvo.resource_record_name
#       record = dvo.resource_record_value
#       type   = dvo.resource_record_type
#     }
#   } : {}
# 
#   allow_overwrite = true
#   name            = each.value.name
#   records         = [each.value.record]
#   ttl             = 60
#   type            = each.value.type
#   zone_id         = data.aws_route53_zone.main.zone_id
# }
# 
# resource "aws_acm_certificate_validation" "main" {
#   count = var.acm_certificate_arn == "" ? 1 : 0
# 
#   certificate_arn         = aws_acm_certificate.main[0].arn
#   validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
# }

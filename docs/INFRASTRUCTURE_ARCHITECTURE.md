# Infrastructure Architecture Document

## Office Management SaaS Platform

**Version:** 2.0  
**Last Updated:** March 4, 2026  
**Document Owner:** CoreOrbit Software

---

## Table of Contents

1. [Overview](#1-overview)
2. [Infrastructure Topology](#2-infrastructure-topology)
3. [AWS Infrastructure](#3-aws-infrastructure)
4. [Network Architecture](#4-network-architecture)
5. [Compute Resources](#5-compute-resources)
6. [Storage Architecture](#6-storage-architecture)
7. [Database Infrastructure](#7-database-infrastructure)
8. [Caching Layer](#8-caching-layer)
9. [Load Balancing & CDN](#9-load-balancing--cdn)
10. [Security Infrastructure](#10-security-infrastructure)
11. [Monitoring Infrastructure](#11-monitoring-infrastructure)
12. [CI/CD Pipeline](#12-cicd-pipeline)
13. [Cost Estimation](#13-cost-estimation)
14. [Capacity Planning](#14-capacity-planning)

---

## 1. Overview

This document outlines the infrastructure architecture for the Office Management SaaS platform deployed on AWS EC2 with Docker containerization.

### 1.1 Infrastructure Goals

| Goal | Description |
|------|-------------|
| **High Availability** | 99.9% uptime SLA target |
| **Scalability** | Handle 10x traffic spikes |
| **Security** | Defense in depth, encryption everywhere |
| **Cost Efficiency** | Optimize resource utilization |
| **Maintainability** | Infrastructure as Code |

### 1.2 Environment Summary

| Environment | Purpose | URL Pattern |
|-------------|---------|-------------|
| **Production** | Live customer traffic | *.coreorbitsoftware.com |
| **Staging** | Pre-production testing | *.staging.coreorbitsoftware.com |
| **Development** | Development testing | localhost / *.dev.coreorbitsoftware.com |

---

## 2. Infrastructure Topology

### 2.1 Production Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    INTERNET                                                  │
└─────────────────────────────────────────┬───────────────────────────────────────────────────┘
                                          │
                            ┌─────────────▼─────────────┐
                            │     CLOUDFLARE (CDN)       │
                            │  • SSL/TLS Termination     │
                            │  • DDoS Protection         │
                            │  • WAF Rules               │
                            │  • Edge Caching            │
                            └─────────────┬─────────────┘
                                          │
                            ┌─────────────▼─────────────┐
                            │     ROUTE 53 (DNS)         │
                            │  • Health-based routing    │
                            │  • Geolocation routing     │
                            │  • Failover support        │
                            └─────────────┬─────────────┘
                                          │
┌─────────────────────────────────────────┼───────────────────────────────────────────────────┐
│                              AWS REGION (us-east-1)                                          │
│                                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────────────────────┐  │
│  │                                    VPC (10.0.0.0/16)                                   │  │
│  │                                                                                       │  │
│  │   ┌─────────────────────────────────────────────────────────────────────────────┐    │  │
│  │   │                           PUBLIC SUBNET (10.0.1.0/24)                        │    │  │
│  │   │                                                                             │    │  │
│  │   │   ┌─────────────────────────────────────────────────────────────────────┐  │    │  │
│  │   │   │                    APPLICATION LOAD BALANCER                         │  │    │  │
│  │   │   │              (Distributes traffic to EC2 instances)                  │  │    │  │
│  │   │   └─────────────────────────────────┬───────────────────────────────────┘  │    │  │
│  │   │                                     │                                      │    │  │
│  │   │   ┌──────────────────┐    ┌────────┴────────┐    ┌──────────────────┐    │    │  │
│  │   │   │  NAT Gateway     │    │  Bastion Host   │    │   NAT Gateway    │    │    │  │
│  │   │   │  (AZ-a)          │    │  (SSH Access)   │    │   (AZ-b)         │    │    │  │
│  │   │   └────────┬─────────┘    └─────────────────┘    └────────┬─────────┘    │    │  │
│  │   │            │                                              │              │    │  │
│  │   └────────────┼──────────────────────────────────────────────┼──────────────┘    │  │
│  │                │                                              │                    │  │
│  │   ┌────────────┼──────────────────────────────────────────────┼──────────────┐    │  │
│  │   │            │        PRIVATE SUBNET (10.0.10.0/24)         │              │    │  │
│  │   │            │                                              │              │    │  │
│  │   │   ┌────────▼────────────────────────────────────┬────────▼────────┐     │    │  │
│  │   │   │                                              │                 │     │    │  │
│  │   │   │   ┌─────────────────────────────────────────────────────┐     │     │    │  │
│  │   │   │   │              EC2 INSTANCE (t3.large)                │     │     │    │  │
│  │   │   │   │                                                     │     │     │    │  │
│  │   │   │   │   ┌────────────────────────────────────────────┐   │     │     │    │  │
│  │   │   │   │   │            DOCKER HOST                      │   │     │     │    │  │
│  │   │   │   │   │                                            │   │     │     │    │  │
│  │   │   │   │   │  ┌─────────┐  ┌─────────┐  ┌─────────┐    │   │     │     │    │  │
│  │   │   │   │   │  │  Nginx  │  │   Web   │  │ Public  │    │   │     │     │    │  │
│  │   │   │   │   │  │ (Proxy) │  │ Portal  │  │ Website │    │   │     │     │    │  │
│  │   │   │   │   │  │  :80    │  │  :3000  │  │  :3100  │    │   │     │     │    │  │
│  │   │   │   │   │  │  :443   │  │         │  │         │    │   │     │     │    │  │
│  │   │   │   │   │  └─────────┘  └─────────┘  └─────────┘    │   │     │     │    │  │
│  │   │   │   │   │                                            │   │     │     │    │  │
│  │   │   │   │   │  ┌─────────┐  ┌─────────┐  ┌─────────┐    │   │     │     │    │  │
│  │   │   │   │   │  │   API   │  │  Auth   │  │Employee │    │   │     │     │    │  │
│  │   │   │   │   │  │ Gateway │  │ Service │  │ Service │    │   │     │     │    │  │
│  │   │   │   │   │  │  :4000  │  │  :3001  │  │  :3002  │    │   │     │     │    │  │
│  │   │   │   │   │  └─────────┘  └─────────┘  └─────────┘    │   │     │     │    │  │
│  │   │   │   │   │                                            │   │     │     │    │  │
│  │   │   │   │   │  ┌─────────┐  ┌─────────┐  ┌─────────┐    │   │     │     │    │  │
│  │   │   │   │   │  │Attendance│ │ Project │  │  Task   │    │   │     │     │    │  │
│  │   │   │   │   │  │ Service │  │ Service │  │ Service │    │   │     │     │    │  │
│  │   │   │   │   │  │  :3003  │  │  :3004  │  │  :3005  │    │   │     │     │    │  │
│  │   │   │   │   │  └─────────┘  └─────────┘  └─────────┘    │   │     │     │    │  │
│  │   │   │   │   │                                            │   │     │     │    │  │
│  │   │   │   │   │  ┌─────────┐  ┌─────────┐  ┌─────────┐    │   │     │     │    │  │
│  │   │   │   │   │  │ Billing │  │Document │  │Notification│  │   │     │     │    │  │
│  │   │   │   │   │  │ Service │  │ Service │  │ Service │    │   │     │     │    │  │
│  │   │   │   │   │  │  :3006  │  │  :3007  │  │  :3008  │    │   │     │     │    │  │
│  │   │   │   │   │  └─────────┘  └─────────┘  └─────────┘    │   │     │     │    │  │
│  │   │   │   │   │                                            │   │     │     │    │  │
│  │   │   │   │   │  ┌─────────┐  ┌─────────┐                 │   │     │     │    │  │
│  │   │   │   │   │  │ Report  │  │   AI    │                 │   │     │     │    │  │
│  │   │   │   │   │  │ Service │  │ Service │                 │   │     │     │    │  │
│  │   │   │   │   │  │  :3009  │  │  :3012  │                 │   │     │     │    │  │
│  │   │   │   │   │  └─────────┘  └─────────┘                 │   │     │     │    │  │
│  │   │   │   │   │                                            │   │     │     │    │  │
│  │   │   │   │   │  ┌─────────┐  ┌─────────┐                 │   │     │     │    │  │
│  │   │   │   │   │  │PostgreSQL│ │  Redis  │                 │   │     │     │    │  │
│  │   │   │   │   │  │  :5432  │  │  :6379  │                 │   │     │     │    │  │
│  │   │   │   │   │  └─────────┘  └─────────┘                 │   │     │     │    │  │
│  │   │   │   │   │                                            │   │     │     │    │  │
│  │   │   │   │   └────────────────────────────────────────────┘   │     │     │    │  │
│  │   │   │   │                                                     │     │     │    │  │
│  │   │   │   └─────────────────────────────────────────────────────┘     │     │    │  │
│  │   │   │                                                               │     │    │  │
│  │   │   └───────────────────────────────────────────────────────────────┘     │    │  │
│  │   │                                                                          │    │  │
│  │   └──────────────────────────────────────────────────────────────────────────┘    │  │
│  │                                                                                    │  │
│  │   ┌──────────────────────────────────────────────────────────────────────────┐    │  │
│  │   │                    DATA SUBNET (10.0.20.0/24)                             │    │  │
│  │   │                                                                           │    │  │
│  │   │   ┌───────────────────────┐         ┌───────────────────────┐            │    │  │
│  │   │   │         EBS          │         │         S3            │            │    │  │
│  │   │   │   (Persistent Vols)  │         │   (File Storage)      │            │    │  │
│  │   │   │   100GB gp3          │         │   Bucket: coreorbit-  │            │    │  │
│  │   │   │                      │         │   oms-uploads         │            │    │  │
│  │   │   └───────────────────────┘         └───────────────────────┘            │    │  │
│  │   │                                                                           │    │  │
│  │   └──────────────────────────────────────────────────────────────────────────┘    │  │
│  │                                                                                    │  │
│  └───────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                          │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Container Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              DOCKER COMPOSE DEPLOYMENT                                   │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│   ┌─────────────────────────────────────────────────────────────────────────────────┐  │
│   │                           oms-network (bridge)                                   │  │
│   │                                                                                 │  │
│   │  ┌──────────────────────────────────────────────────────────────────────────┐  │  │
│   │  │                         REVERSE PROXY LAYER                               │  │  │
│   │  │                                                                          │  │  │
│   │  │   nginx ────────────────────────────────────────▶ Ports 80, 443         │  │  │
│   │  │    │                                                                     │  │  │
│   │  │    ├── www.coreorbitsoftware.com ───────────▶ public-website:3100       │  │  │
│   │  │    ├── portal.coreorbitsoftware.com ────────▶ web:3000                  │  │  │
│   │  │    ├── api.coreorbitsoftware.com ───────────▶ api-gateway:4000          │  │  │
│   │  │    └── *.coreorbitsoftware.com ─────────────▶ web:3000 (tenants)        │  │  │
│   │  │                                                                          │  │  │
│   │  └──────────────────────────────────────────────────────────────────────────┘  │  │
│   │                                                                                 │  │
│   │  ┌──────────────────────────────────────────────────────────────────────────┐  │  │
│   │  │                         APPLICATION LAYER                                 │  │  │
│   │  │                                                                          │  │  │
│   │  │  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐               │  │  │
│   │  │  │public-website │  │     web       │  │ api-gateway   │               │  │  │
│   │  │  │    :3100      │  │    :3000      │  │    :4000      │               │  │  │
│   │  │  │ (Next.js SSR) │  │ (Next.js SSR) │  │  (Express)    │               │  │  │
│   │  │  └───────────────┘  └───────────────┘  └───────┬───────┘               │  │  │
│   │  │                                                │                        │  │  │
│   │  └────────────────────────────────────────────────┼────────────────────────┘  │  │
│   │                                                   │                            │  │
│   │  ┌────────────────────────────────────────────────┼────────────────────────┐  │  │
│   │  │                         MICROSERVICES LAYER    │                         │  │  │
│   │  │                                                │                         │  │  │
│   │  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐│  │  │
│   │  │  │auth-service  │  │employee-svc  │  │attendance-svc│  │project-svc   ││  │  │
│   │  │  │   :3001      │  │   :3002      │  │   :3003      │  │   :3004      ││  │  │
│   │  │  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘│  │  │
│   │  │                                                                         │  │  │
│   │  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐│  │  │
│   │  │  │task-service  │  │billing-svc   │  │document-svc  │  │notification  ││  │  │
│   │  │  │   :3005      │  │   :3006      │  │   :3007      │  │   :3008      ││  │  │
│   │  │  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘│  │  │
│   │  │                                                                         │  │  │
│   │  │  ┌──────────────┐  ┌──────────────┐                                    │  │  │
│   │  │  │report-svc    │  │ai-service    │                                    │  │  │
│   │  │  │   :3009      │  │   :3012      │                                    │  │  │
│   │  │  └──────────────┘  └──────────────┘                                    │  │  │
│   │  │                                                                         │  │  │
│   │  └─────────────────────────────────────────────────────────────────────────┘  │  │
│   │                                                                                 │  │
│   │  ┌─────────────────────────────────────────────────────────────────────────┐  │  │
│   │  │                         DATA LAYER                                       │  │  │
│   │  │                                                                         │  │  │
│   │  │  ┌──────────────────────────┐    ┌──────────────────────────┐          │  │  │
│   │  │  │       PostgreSQL         │    │          Redis           │          │  │  │
│   │  │  │        :5432             │    │          :6379           │          │  │  │
│   │  │  │                          │    │                          │          │  │  │
│   │  │  │  Volume: postgres_data   │    │   Volume: redis_data     │          │  │  │
│   │  │  │                          │    │                          │          │  │  │
│   │  │  │  Databases:              │    │   Features:              │          │  │  │
│   │  │  │  - oms_master            │    │   - Session cache        │          │  │  │
│   │  │  │  - oms_tenant_*          │    │   - Query cache          │          │  │  │
│   │  │  │                          │    │   - Pub/Sub              │          │  │  │
│   │  │  └──────────────────────────┘    └──────────────────────────┘          │  │  │
│   │  │                                                                         │  │  │
│   │  └─────────────────────────────────────────────────────────────────────────┘  │  │
│   │                                                                                 │  │
│   └─────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                         │
│   ┌─────────────────────────────────────────────────────────────────────────────────┐  │
│   │                              VOLUMES                                             │  │
│   │                                                                                 │  │
│   │   postgres_data ──────────▶ /var/lib/postgresql/data                           │  │
│   │   redis_data ─────────────▶ /data                                              │  │
│   │   uploads_data ───────────▶ /app/uploads                                       │  │
│   │   nginx_ssl ──────────────▶ /etc/nginx/ssl                                     │  │
│   │   nginx_logs ─────────────▶ /var/log/nginx                                     │  │
│   │                                                                                 │  │
│   └─────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. AWS Infrastructure

### 3.1 AWS Services Used

| Service | Purpose | Configuration |
|---------|---------|---------------|
| **EC2** | Application hosting | t3.large, Ubuntu 22.04 |
| **VPC** | Network isolation | 10.0.0.0/16 CIDR |
| **Route 53** | DNS management | Hosted zone |
| **S3** | File storage | Standard, versioning enabled |
| **IAM** | Access management | Custom policies |
| **CloudWatch** | Monitoring | Logs, Metrics, Alarms |
| **SES** | Email service | Transactional emails |
| **ACM** | SSL certificates | Auto-renewal |
| **Elastic IP** | Static IP | 1 per instance |

### 3.2 EC2 Instance Specification

| Specification | Development | Staging | Production |
|---------------|-------------|---------|------------|
| **Instance Type** | t3.medium | t3.large | t3.xlarge or higher |
| **vCPUs** | 2 | 2 | 4+ |
| **Memory** | 4 GB | 8 GB | 16 GB+ |
| **Storage** | 50 GB gp3 | 100 GB gp3 | 200 GB gp3 |
| **Network** | Up to 5 Gbps | Up to 5 Gbps | Up to 10 Gbps |
| **Monthly Cost** | ~$35 | ~$70 | ~$140+ |

### 3.3 IAM Policies

```json
// EC2 Instance Role Policy
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::coreorbit-oms-uploads",
        "arn:aws:s3:::coreorbit-oms-uploads/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "ses:SendEmail",
        "ses:SendRawEmail"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:*"
    }
  ]
}
```

---

## 4. Network Architecture

### 4.1 Network Topology

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         NETWORK ARCHITECTURE                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   VPC: 10.0.0.0/16                                                          │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │                                                                     │  │
│   │   PUBLIC SUBNETS                                                    │  │
│   │   ┌───────────────────────┐   ┌───────────────────────┐            │  │
│   │   │  10.0.1.0/24 (AZ-a)   │   │  10.0.2.0/24 (AZ-b)   │            │  │
│   │   │                       │   │                       │            │  │
│   │   │  • ALB                │   │  • ALB                │            │  │
│   │   │  • NAT Gateway        │   │  • NAT Gateway        │            │  │
│   │   │  • Bastion Host       │   │                       │            │  │
│   │   │                       │   │                       │            │  │
│   │   └───────────────────────┘   └───────────────────────┘            │  │
│   │                                                                     │  │
│   │   PRIVATE SUBNETS                                                   │  │
│   │   ┌───────────────────────┐   ┌───────────────────────┐            │  │
│   │   │  10.0.10.0/24 (AZ-a)  │   │  10.0.20.0/24 (AZ-b)  │            │  │
│   │   │                       │   │                       │            │  │
│   │   │  • EC2 Instances      │   │  • EC2 Instances      │            │  │
│   │   │  • Docker Containers  │   │  • (Failover)         │            │  │
│   │   │                       │   │                       │            │  │
│   │   └───────────────────────┘   └───────────────────────┘            │  │
│   │                                                                     │  │
│   │   DATA SUBNETS                                                      │  │
│   │   ┌───────────────────────┐   ┌───────────────────────┐            │  │
│   │   │  10.0.30.0/24 (AZ-a)  │   │  10.0.40.0/24 (AZ-b)  │            │  │
│   │   │                       │   │                       │            │  │
│   │   │  • RDS (if migrated)  │   │  • RDS Replica        │            │  │
│   │   │  • ElastiCache        │   │  • ElastiCache        │            │  │
│   │   │                       │   │  (if migrated)        │            │  │
│   │   └───────────────────────┘   └───────────────────────┘            │  │
│   │                                                                     │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Security Groups

| Security Group | Inbound Rules | Outbound Rules |
|----------------|---------------|----------------|
| **sg-alb** | 80, 443 from 0.0.0.0/0 | All to VPC |
| **sg-ec2** | 80, 443 from sg-alb; 22 from sg-bastion | All |
| **sg-db** | 5432 from sg-ec2 | None |
| **sg-redis** | 6379 from sg-ec2 | None |
| **sg-bastion** | 22 from Admin IPs | All |

### 4.3 DNS Configuration

| Record | Type | Value |
|--------|------|-------|
| `coreorbitsoftware.com` | A | Elastic IP |
| `www.coreorbitsoftware.com` | A | Elastic IP |
| `portal.coreorbitsoftware.com` | A | Elastic IP |
| `api.coreorbitsoftware.com` | A | Elastic IP |
| `*.coreorbitsoftware.com` | A | Elastic IP |

---

## 5. Compute Resources

### 5.1 Container Resource Allocation

| Container | CPU Limit | Memory Limit | Memory Reserved |
|-----------|-----------|--------------|-----------------|
| nginx | 0.5 | 256 MB | 128 MB |
| web | 1.0 | 1 GB | 512 MB |
| public-website | 0.5 | 512 MB | 256 MB |
| api-gateway | 1.0 | 512 MB | 256 MB |
| auth-service | 0.5 | 512 MB | 256 MB |
| employee-service | 0.5 | 512 MB | 256 MB |
| attendance-service | 0.5 | 512 MB | 256 MB |
| project-service | 0.5 | 512 MB | 256 MB |
| task-service | 0.5 | 512 MB | 256 MB |
| billing-service | 0.5 | 512 MB | 256 MB |
| document-service | 0.5 | 512 MB | 256 MB |
| notification-service | 0.5 | 512 MB | 256 MB |
| report-service | 0.5 | 512 MB | 256 MB |
| ai-service | 1.0 | 1 GB | 512 MB |
| postgres | 2.0 | 2 GB | 1 GB |
| redis | 0.5 | 512 MB | 256 MB |
| **Total** | ~10 cores | ~10 GB | ~5 GB |

### 5.2 Auto-scaling Strategy (Future)

```
┌─────────────────────────────────────────────────────────────────┐
│                    AUTO-SCALING CONFIGURATION                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Metric-Based Scaling:                                          │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                                                           │ │
│  │  CPU Utilization > 70% for 5 minutes                     │ │
│  │       └──▶ Scale OUT (add instance)                      │ │
│  │                                                           │ │
│  │  CPU Utilization < 30% for 10 minutes                    │ │
│  │       └──▶ Scale IN (remove instance)                    │ │
│  │                                                           │ │
│  │  Memory Utilization > 80%                                │ │
│  │       └──▶ Scale OUT (add instance)                      │ │
│  │                                                           │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  Limits:                                                        │
│  • Minimum: 1 instance                                          │
│  • Maximum: 5 instances                                         │
│  • Cooldown: 300 seconds                                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Storage Architecture

### 6.1 Storage Types

| Storage Type | Service | Size | Purpose |
|--------------|---------|------|---------|
| **EBS** | gp3 | 100 GB | Root volume, Docker images |
| **EBS** | gp3 | 50 GB | PostgreSQL data |
| **S3** | Standard | Unlimited | File uploads, backups |
| **S3 Glacier** | Archive | Unlimited | Long-term backup archive |

### 6.2 S3 Bucket Structure

```
coreorbit-oms-uploads/
├── tenants/
│   ├── {tenant-id}/
│   │   ├── documents/
│   │   ├── avatars/
│   │   ├── exports/
│   │   └── temp/
│   └── ...
├── platform/
│   ├── logos/
│   ├── templates/
│   └── public-assets/
└── backups/
    ├── databases/
    │   ├── daily/
    │   ├── weekly/
    │   └── monthly/
    └── configs/
```

### 6.3 Backup Strategy

| Data Type | Frequency | Retention | Storage Class |
|-----------|-----------|-----------|---------------|
| Database (Full) | Daily 2 AM | 30 days | S3 Standard |
| Database (Incremental) | Hourly | 7 days | S3 Standard |
| File Uploads | Real-time | Indefinite | S3 Standard + IA |
| Application Logs | Real-time | 90 days | CloudWatch |
| Old Backups | Monthly | 1 year | S3 Glacier |

---

## 7. Database Infrastructure

### 7.1 PostgreSQL Configuration

| Parameter | Development | Production |
|-----------|-------------|------------|
| **Version** | 16-alpine | 16-alpine |
| **Max Connections** | 100 | 200 |
| **Shared Buffers** | 256MB | 2GB |
| **Effective Cache** | 512MB | 6GB |
| **Work Mem** | 4MB | 64MB |
| **Maintenance Work Mem** | 64MB | 512MB |

### 7.2 Database Security

```sql
-- Connection security
host    all    all    10.0.0.0/16    scram-sha-256
hostssl all    all    0.0.0.0/0      scram-sha-256

-- User permissions (principle of least privilege)
CREATE ROLE oms_app WITH LOGIN PASSWORD 'xxx' NOSUPERUSER;
GRANT CONNECT ON DATABASE oms_master TO oms_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO oms_app;
```

### 7.3 Connection Pooling

```
┌─────────────────────────────────────────────────────────────────┐
│                    CONNECTION POOLING                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Application ──▶ Prisma Client ──▶ Connection Pool ──▶ PostgreSQL
│                          │                │
│                          │                │
│                   ┌──────┴──────┐  ┌──────┴──────┐             │
│                   │ Pool Config │  │ Per Tenant  │             │
│                   │             │  │             │             │
│                   │ Min: 2      │  │ Isolated    │             │
│                   │ Max: 10     │  │ Connections │             │
│                   │ Idle: 10s   │  │             │             │
│                   └─────────────┘  └─────────────┘             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8. Caching Layer

### 8.1 Redis Configuration

| Parameter | Value |
|-----------|-------|
| **Version** | 7-alpine |
| **Max Memory** | 512MB |
| **Eviction Policy** | allkeys-lru |
| **Persistence** | AOF (appendonly) |
| **Password** | Required |

### 8.2 Cache Strategy

| Cache Type | TTL | Purpose |
|------------|-----|---------|
| Session Cache | 24 hours | User sessions |
| Query Cache | 5 minutes | Frequent DB queries |
| Static Data | 1 hour | Configurations, settings |
| Rate Limit | 15 minutes | API rate limiting |

### 8.3 Cache Keys Pattern

```
# Session: user:{userId}:session:{sessionId}
# Query: tenant:{tenantId}:query:{hash}
# Static: tenant:{tenantId}:settings
# Rate: ratelimit:{ip}:{endpoint}
```

---

## 9. Load Balancing & CDN

### 9.1 Nginx Load Balancing

```nginx
# Upstream configuration
upstream web_portal {
    least_conn;
    server web:3000 weight=1;
    keepalive 32;
}

upstream api_gateway {
    least_conn;
    server api-gateway:4000 weight=1;
    keepalive 32;
}

# Health checks
location /health {
    access_log off;
    return 200 "healthy\n";
}
```

### 9.2 CDN Configuration (CloudFlare)

| Setting | Value |
|---------|-------|
| **SSL Mode** | Full (Strict) |
| **Cache Level** | Standard |
| **Browser Cache TTL** | 4 hours |
| **Edge Cache TTL** | 2 hours |
| **Always Online** | On |
| **Auto Minify** | JS, CSS, HTML |

### 9.3 CDN Caching Rules

| Pattern | Cache Behavior |
|---------|----------------|
| `/_next/static/*` | Cache 365 days |
| `/*.ico, *.css, *.js` | Cache 7 days |
| `/*.png, *.jpg, *.svg` | Cache 30 days |
| `/api/*` | Bypass cache |
| `/*.html` | Cache 4 hours |

---

## 10. Security Infrastructure

### 10.1 Security Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SECURITY LAYERS                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  LAYER 1: Edge Security (CloudFlare)                                        │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │  • DDoS Mitigation (L3/L4/L7)                                         │ │
│  │  • Web Application Firewall (WAF)                                      │ │
│  │  • Bot Management                                                      │ │
│  │  • Rate Limiting (100k req/day free)                                  │ │
│  │  • SSL/TLS Termination                                                 │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  LAYER 2: Network Security (AWS)                                            │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │  • VPC Isolation                                                       │ │
│  │  • Security Groups (Firewall)                                          │ │
│  │  • Network ACLs                                                        │ │
│  │  • Private Subnets for Data                                           │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  LAYER 3: Host Security (EC2)                                               │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │  • UFW Firewall (only 22, 80, 443)                                    │ │
│  │  • Fail2Ban (SSH protection)                                          │ │
│  │  • Automatic Security Updates                                         │ │
│  │  • SSH Key Authentication Only                                        │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  LAYER 4: Application Security                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │  • JWT Authentication                                                  │ │
│  │  • RBAC Authorization                                                  │ │
│  │  • Input Validation (Zod)                                             │ │
│  │  • Rate Limiting (30 req/s)                                           │ │
│  │  • CORS Restrictions                                                   │ │
│  │  • Security Headers (CSP, X-Frame-Options, etc.)                      │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  LAYER 5: Data Security                                                     │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │  • Encryption at Rest (AES-256)                                       │ │
│  │  • Encryption in Transit (TLS 1.3)                                    │ │
│  │  • Database Password Protection                                        │ │
│  │  • Tenant Data Isolation                                               │ │
│  │  • Audit Logging                                                       │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 10.2 SSL/TLS Configuration

| Setting | Value |
|---------|-------|
| **TLS Version** | 1.2, 1.3 |
| **Cipher Suites** | ECDHE-ECDSA-AES128-GCM-SHA256 and higher |
| **HSTS** | max-age=31536000 |
| **Certificate** | Let's Encrypt (auto-renewal) |

---

## 11. Monitoring Infrastructure

### 11.1 Monitoring Stack

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        MONITORING ARCHITECTURE                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │                         DATA COLLECTION                              │  │
│   │                                                                     │  │
│   │   Application ──▶ Pino Logger ──▶ CloudWatch Logs                  │  │
│   │                                                                     │  │
│   │   Docker ────────▶ Docker Stats ──▶ CloudWatch Metrics             │  │
│   │                                                                     │  │
│   │   EC2 ───────────▶ CloudWatch Agent ──▶ CloudWatch Metrics         │  │
│   │                                                                     │  │
│   │   Nginx ─────────▶ Access/Error Logs ──▶ CloudWatch Logs           │  │
│   │                                                                     │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │                         ALERTING                                     │  │
│   │                                                                     │  │
│   │   CloudWatch Alarms ──▶ SNS Topic ──▶ Email/Slack/PagerDuty        │  │
│   │                                                                     │  │
│   │   Alert Conditions:                                                 │  │
│   │   • CPU > 80% for 5 minutes                                        │  │
│   │   • Memory > 85% for 5 minutes                                     │  │
│   │   • Disk > 80%                                                     │  │
│   │   • Error rate > 1% for 5 minutes                                  │  │
│   │   • Response time p95 > 2 seconds                                  │  │
│   │   • Service unhealthy for 2 minutes                                │  │
│   │                                                                     │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │                         DASHBOARDS                                   │  │
│   │                                                                     │  │
│   │   CloudWatch Dashboard:                                             │  │
│   │   • CPU/Memory utilization                                         │  │
│   │   • Network I/O                                                    │  │
│   │   • Request rate / Error rate                                      │  │
│   │   • Response time percentiles                                      │  │
│   │   • Database connections                                           │  │
│   │   • Container health                                               │  │
│   │                                                                     │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 11.2 Health Checks

| Check | Endpoint | Interval | Timeout |
|-------|----------|----------|---------|
| API Gateway | `/health` | 30s | 10s |
| Auth Service | `/health` | 30s | 10s |
| Web Portal | `/` | 30s | 10s |
| PostgreSQL | `pg_isready` | 10s | 5s |
| Redis | `redis-cli ping` | 10s | 5s |

---

## 12. CI/CD Pipeline

### 12.1 Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CI/CD PIPELINE                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   Git Push ──▶ GitHub Actions ──▶ Build ──▶ Test ──▶ Deploy                │
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │                         BUILD STAGE                                  │  │
│   │                                                                     │  │
│   │   1. Checkout code                                                  │  │
│   │   2. Install dependencies (npm ci)                                  │  │
│   │   3. Run linter (eslint)                                           │  │
│   │   4. Build packages (turbo build)                                  │  │
│   │   5. Build Docker images                                           │  │
│   │                                                                     │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │                         TEST STAGE                                   │  │
│   │                                                                     │  │
│   │   1. Run unit tests (jest)                                         │  │
│   │   2. Run integration tests                                         │  │
│   │   3. Run security scan (npm audit)                                 │  │
│   │   4. Type checking (tsc)                                          │  │
│   │                                                                     │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │                         DEPLOY STAGE                                 │  │
│   │                                                                     │  │
│   │   Staging (auto on develop branch):                                 │  │
│   │   1. SSH to staging server                                         │  │
│   │   2. Pull latest code                                              │  │
│   │   3. docker compose up -d --build                                  │  │
│   │                                                                     │  │
│   │   Production (manual on main branch):                               │  │
│   │   1. Require approval                                              │  │
│   │   2. SSH to production server                                      │  │
│   │   3. docker compose up -d --build                                  │  │
│   │   4. Run smoke tests                                               │  │
│   │   5. Notify team                                                   │  │
│   │                                                                     │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 12.2 Deployment Commands

```bash
# Manual deployment
./scripts/ec2-deploy.sh deploy

# Update only (no full sync)
./scripts/ec2-deploy.sh update

# Rollback
./scripts/ec2-deploy.sh rollback

# View status
./scripts/ec2-deploy.sh status
```

---

## 13. Cost Estimation

### 13.1 Monthly Cost Breakdown (Production)

| Resource | Specification | Monthly Cost (USD) |
|----------|---------------|-------------------|
| **EC2** | t3.large (1 instance) | $70 |
| **Elastic IP** | 1 IP | $4 |
| **EBS** | 100 GB gp3 | $10 |
| **S3** | 50 GB + 100k requests | $2 |
| **Data Transfer** | 100 GB out | $9 |
| **Route 53** | 1 hosted zone | $0.50 |
| **CloudWatch** | Logs + Metrics | $5 |
| **SES** | 10,000 emails | $1 |
| **Total** | | **~$102/month** |

### 13.2 Cost by Environment

| Environment | Monthly Cost |
|-------------|--------------|
| Development | ~$40 |
| Staging | ~$70 |
| Production (Small) | ~$100 |
| Production (Scaled) | ~$300-500 |

### 13.3 Cost Optimization Tips

1. **Reserved Instances** - 30-50% savings for 1-year commitment
2. **Spot Instances** - For non-critical workloads (70% savings)
3. **S3 Lifecycle Policies** - Move old data to Glacier
4. **Right-sizing** - Monitor and adjust instance sizes
5. **Auto-scaling** - Scale down during off-hours

---

## 14. Capacity Planning

### 14.1 Current Capacity

| Metric | Current | Capacity |
|--------|---------|----------|
| Concurrent Users | 100 | 500 |
| API Requests/sec | 50 | 200 |
| Database Connections | 30 | 100 |
| Storage Used | 20 GB | 100 GB |

### 14.2 Scaling Triggers

| Metric | Scale Up When | Scale Down When |
|--------|---------------|-----------------|
| CPU | > 70% avg | < 30% avg |
| Memory | > 80% | < 40% |
| Request Latency | p95 > 500ms | p95 < 100ms |
| DB Connections | > 80% max | < 30% max |

### 14.3 Growth Projections

| Timeline | Users | Infrastructure |
|----------|-------|----------------|
| Month 1-3 | 100 | Single EC2 t3.large |
| Month 4-6 | 500 | Single EC2 t3.xlarge |
| Month 7-12 | 2,000 | Multi-instance + RDS |
| Year 2 | 10,000 | ECS/EKS cluster |

---

## Appendix

### A. Infrastructure Checklist

- [ ] EC2 instance launched with correct AMI
- [ ] Security groups configured
- [ ] Elastic IP allocated and associated
- [ ] DNS records created in Route 53
- [ ] SSL certificates installed
- [ ] Docker and Docker Compose installed
- [ ] Environment variables configured
- [ ] Health checks passing
- [ ] Backups configured
- [ ] Monitoring and alerting set up
- [ ] CI/CD pipeline configured

### B. Maintenance Schedule

| Task | Frequency | Responsible |
|------|-----------|-------------|
| Security patches | Weekly | DevOps |
| Backup verification | Weekly | DevOps |
| Log rotation | Daily (automatic) | System |
| SSL renewal | Monthly (automatic) | Certbot |
| Cost review | Monthly | Finance/DevOps |
| Capacity review | Quarterly | DevOps/Engineering |

---

**Document Control**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Jan 2026 | CoreOrbit Team | Initial release |
| 2.0 | Mar 2026 | CoreOrbit Team | EC2 deployment update |

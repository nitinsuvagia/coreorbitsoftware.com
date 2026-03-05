# Technical Architecture Document

## Office Management SaaS Platform

**Version:** 2.0  
**Last Updated:** March 4, 2026  
**Document Owner:** CoreOrbit Software

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Overview](#2-system-overview)
3. [Architecture Principles](#3-architecture-principles)
4. [System Architecture](#4-system-architecture)
5. [Microservices Architecture](#5-microservices-architecture)
6. [Technology Stack](#6-technology-stack)
7. [Data Architecture](#7-data-architecture)
8. [Integration Architecture](#8-integration-architecture)
9. [Security Architecture](#9-security-architecture)
10. [Performance & Scalability](#10-performance--scalability)
11. [Monitoring & Observability](#11-monitoring--observability)
12. [Disaster Recovery](#12-disaster-recovery)

---

## 1. Executive Summary

The Office Management System (OMS) is a cloud-native, multi-tenant SaaS platform designed to streamline workplace operations. Built on a microservices architecture, it provides comprehensive tools for employee management, project tracking, attendance monitoring, document management, billing, and organizational administration.

### Key Highlights

| Aspect | Description |
|--------|-------------|
| **Architecture Style** | Microservices with Event-Driven Communication |
| **Deployment Model** | Docker Containers on AWS EC2/ECS |
| **Multi-tenancy** | Database-per-tenant isolation |
| **API Style** | RESTful APIs with OpenAPI specification |
| **Frontend** | Next.js 14 with App Router |
| **Backend** | Node.js + Express + TypeScript |

---

## 2. System Overview

### 2.1 Business Context

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           OFFICE MANAGEMENT PLATFORM                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌───────────────┐  ┌───────────────┐  ┌───────────────┐                  │
│   │   Employees   │  │   Managers    │  │   HR Admin    │                  │
│   │  (End Users)  │  │(Team Leads)   │  │(Tenant Admin) │                  │
│   └───────┬───────┘  └───────┬───────┘  └───────┬───────┘                  │
│           │                  │                  │                          │
│           └──────────────────┴──────────────────┘                          │
│                              │                                              │
│                              ▼                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │                     Web Portal (Next.js)                            │  │
│   │              portal.coreorbitsoftware.com                           │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                              │                                              │
│                              ▼                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │                     API Gateway (Express)                           │  │
│   │              api.coreorbitsoftware.com                              │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                              │                                              │
│           ┌──────────────────┼──────────────────┐                          │
│           ▼                  ▼                  ▼                          │
│   ┌───────────────┐  ┌───────────────┐  ┌───────────────┐                  │
│   │ Auth Service  │  │Employee Svc   │  │Attendance Svc │                  │
│   └───────────────┘  └───────────────┘  └───────────────┘                  │
│           │                  │                  │                          │
│   ┌───────────────┐  ┌───────────────┐  ┌───────────────┐                  │
│   │Project Service│  │ Task Service  │  │ Billing Svc   │                  │
│   └───────────────┘  └───────────────┘  └───────────────┘                  │
│           │                  │                  │                          │
│   ┌───────────────┐  ┌───────────────┐  ┌───────────────┐                  │
│   │Document Svc   │  │Notification   │  │ Report Svc    │                  │
│   └───────────────┘  └───────────────┘  └───────────────┘                  │
│                              │                                              │
│                              ▼                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │                     Data Layer                                      │  │
│   │     PostgreSQL (Master + Tenant DBs)    Redis    S3                │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Domain Model

```
┌─────────────────────────────────────────────────────────────────┐
│                      CORE DOMAINS                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐           │
│  │   Identity  │   │    HR &     │   │   Project   │           │
│  │  & Access   │   │  Employee   │   │ Management  │           │
│  │  Management │   │ Management  │   │             │           │
│  └─────────────┘   └─────────────┘   └─────────────┘           │
│                                                                 │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐           │
│  │ Attendance  │   │  Document   │   │  Billing &  │           │
│  │  & Leave    │   │ Management  │   │ Subscription│           │
│  └─────────────┘   └─────────────┘   └─────────────┘           │
│                                                                 │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐           │
│  │Notification │   │  Reporting  │   │     AI      │           │
│  │  & Alerts   │   │ & Analytics │   │  Assistant  │           │
│  └─────────────┘   └─────────────┘   └─────────────┘           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Architecture Principles

### 3.1 Guiding Principles

| Principle | Description | Implementation |
|-----------|-------------|----------------|
| **Separation of Concerns** | Each service handles one business domain | 11 independent microservices |
| **Single Responsibility** | Services are focused and maintainable | Domain-driven boundaries |
| **Loose Coupling** | Services are independent | REST APIs + Event Bus |
| **High Cohesion** | Related functionality grouped together | Bounded contexts |
| **Defense in Depth** | Multiple security layers | JWT + RBAC + Encryption |
| **Fail Fast** | Quick error detection and recovery | Health checks + Circuit breakers |
| **Infrastructure as Code** | Reproducible infrastructure | Docker + Terraform |

### 3.2 Design Patterns Used

| Pattern | Usage |
|---------|-------|
| **API Gateway** | Centralized routing, auth, rate limiting |
| **Database per Service** | Tenant isolation with separate databases |
| **Event-Driven Architecture** | Async communication via Redis Pub/Sub |
| **Repository Pattern** | Data access abstraction with Prisma |
| **Strategy Pattern** | Authentication providers (Local, SSO, LDAP) |
| **Observer Pattern** | Real-time notifications |
| **Circuit Breaker** | Fault tolerance in service calls |
| **Saga Pattern** | Distributed transaction management |

---

## 4. System Architecture

### 4.1 High-Level Architecture

```
                                    ┌─────────────────────────────────────┐
                                    │           INTERNET                  │
                                    └─────────────┬───────────────────────┘
                                                  │
                                    ┌─────────────▼───────────────────────┐
                                    │        CLOUDFLARE / AWS ALB         │
                                    │     (SSL Termination, DDoS, CDN)    │
                                    └─────────────┬───────────────────────┘
                                                  │
                    ┌─────────────────────────────┼─────────────────────────────┐
                    │                             │                             │
          ┌─────────▼─────────┐       ┌──────────▼──────────┐       ┌─────────▼─────────┐
          │  Public Website   │       │    Web Portal       │       │   API Gateway     │
          │      (Next.js)    │       │     (Next.js)       │       │    (Express)      │
          │   www.domain.com  │       │  portal.domain.com  │       │  api.domain.com   │
          │      :3100        │       │       :3000         │       │      :4000        │
          └───────────────────┘       └─────────────────────┘       └─────────┬─────────┘
                                                                              │
                                 ┌────────────────────────────────────────────┼────────────────────────────────────────────┐
                                 │                                            │                                            │
                    ┌────────────┴────────────┐              ┌────────────────┴────────────────┐             ┌────────────┴────────────┐
                    │    CORE SERVICES        │              │       BUSINESS SERVICES          │             │    SUPPORT SERVICES      │
                    │                         │              │                                  │             │                          │
                    │  ┌─────────────────┐   │              │  ┌─────────────────┐            │             │  ┌─────────────────┐     │
                    │  │  Auth Service   │   │              │  │Employee Service │            │             │  │Document Service │     │
                    │  │     :3001       │   │              │  │     :3002       │            │             │  │     :3007       │     │
                    │  └─────────────────┘   │              │  └─────────────────┘            │             │  └─────────────────┘     │
                    │                         │              │                                  │             │                          │
                    │  ┌─────────────────┐   │              │  ┌─────────────────┐            │             │  ┌─────────────────┐     │
                    │  │  AI Service     │   │              │  │Attendance Svc   │            │             │  │Notification Svc │     │
                    │  │     :3012       │   │              │  │     :3003       │            │             │  │     :3008       │     │
                    │  └─────────────────┘   │              │  └─────────────────┘            │             │  └─────────────────┘     │
                    │                         │              │                                  │             │                          │
                    └─────────────────────────┘              │  ┌─────────────────┐            │             │  ┌─────────────────┐     │
                                                             │  │Project Service  │            │             │  │ Report Service  │     │
                                                             │  │     :3004       │            │             │  │     :3009       │     │
                                                             │  └─────────────────┘            │             │  └─────────────────┘     │
                                                             │                                  │             │                          │
                                                             │  ┌─────────────────┐            │             └──────────────────────────┘
                                                             │  │  Task Service   │            │
                                                             │  │     :3005       │            │
                                                             │  └─────────────────┘            │
                                                             │                                  │
                                                             │  ┌─────────────────┐            │
                                                             │  │Billing Service  │            │
                                                             │  │     :3006       │            │
                                                             │  └─────────────────┘            │
                                                             │                                  │
                                                             └──────────────────────────────────┘
                                                                              │
                                    ┌─────────────────────────────────────────┼─────────────────────────────────────────┐
                                    │                                         │                                         │
                          ┌─────────▼─────────┐                   ┌──────────▼──────────┐                   ┌─────────▼─────────┐
                          │    PostgreSQL     │                   │       Redis         │                   │      AWS S3       │
                          │  (Master + Tenant │                   │   (Cache + PubSub)  │                   │  (File Storage)   │
                          │    Databases)     │                   │                     │                   │                   │
                          └───────────────────┘                   └─────────────────────┘                   └───────────────────┘
```

### 4.2 Service Communication

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         SERVICE COMMUNICATION PATTERNS                           │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                    SYNCHRONOUS (REST APIs)                              │   │
│  │                                                                         │   │
│  │    Client ──HTTP──▶ API Gateway ──HTTP──▶ Service ──HTTP──▶ Database   │   │
│  │                                                                         │   │
│  │    Used for: Real-time operations, CRUD, Data queries                  │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                    ASYNCHRONOUS (Event Bus)                             │   │
│  │                                                                         │   │
│  │    Service A ──Publish──▶ Redis PubSub ──Subscribe──▶ Service B        │   │
│  │                                                                         │   │
│  │    Used for: Notifications, Background jobs, Cross-service updates     │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                    SERVICE MESH (Internal)                              │   │
│  │                                                                         │   │
│  │    Service A ──Internal API──▶ Service B (via Docker network)          │   │
│  │                                                                         │   │
│  │    Used for: Internal service-to-service calls                         │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Microservices Architecture

### 5.1 Service Catalog

| Service | Port | Responsibility | Key Entities |
|---------|------|----------------|--------------|
| **API Gateway** | 4000 | Request routing, auth, rate limiting | Sessions, Logs |
| **Auth Service** | 3001 | Authentication, authorization, SSO | Users, Roles, Tokens |
| **Employee Service** | 3002 | Employee management, onboarding | Employees, Departments, Teams |
| **Attendance Service** | 3003 | Time tracking, leave management | Attendance, Leaves, Holidays |
| **Project Service** | 3004 | Project & client management | Projects, Clients, Milestones |
| **Task Service** | 3005 | Task management, workflows | Tasks, Comments, Time Entries |
| **Billing Service** | 3006 | Subscriptions, invoicing | Plans, Subscriptions, Invoices |
| **Document Service** | 3007 | File storage, document management | Files, Folders, Versions |
| **Notification Service** | 3008 | Email, push, in-app notifications | Notifications, Templates |
| **Report Service** | 3009 | Analytics, report generation | Reports, Dashboards |
| **AI Service** | 3012 | AI assistants, automation | AI Prompts, Responses |

### 5.2 Service Dependencies

```
                                    ┌─────────────────┐
                                    │   API Gateway   │
                                    │   (Port 4000)   │
                                    └────────┬────────┘
                                             │
            ┌─────────────┬─────────────┬────┴────┬─────────────┬─────────────┐
            │             │             │         │             │             │
            ▼             ▼             ▼         ▼             ▼             ▼
     ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
     │   Auth   │  │ Employee │  │Attendance│  │ Project  │  │   Task   │  │ Billing  │
     │  :3001   │  │  :3002   │  │  :3003   │  │  :3004   │  │  :3005   │  │  :3006   │
     └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘
          │             │             │             │             │             │
          │             │             │             │             │             │
          └─────────────┴─────────────┴──────┬──────┴─────────────┴─────────────┘
                                             │
                        ┌────────────────────┼────────────────────┐
                        │                    │                    │
                        ▼                    ▼                    ▼
                 ┌──────────┐         ┌──────────┐         ┌──────────┐
                 │ Document │         │Notification│       │  Report  │
                 │  :3007   │         │   :3008   │        │  :3009   │
                 └──────────┘         └──────────┘         └──────────┘

     ─────────────────────────────────────────────────────────────────────
                              SHARED INFRASTRUCTURE
     ─────────────────────────────────────────────────────────────────────

          ┌──────────────┐      ┌──────────────┐      ┌──────────────┐
          │  PostgreSQL  │      │    Redis     │      │   AWS S3     │
          │(Master+Tenant)│     │(Cache+PubSub)│      │   Storage    │
          └──────────────┘      └──────────────┘      └──────────────┘
```

### 5.3 Service Contracts

Each service exposes:
- **Health Check:** `GET /health` - Service availability
- **Readiness Check:** `GET /ready` - Service ready to accept traffic
- **API Version:** All APIs versioned under `/api/v1/`

---

## 6. Technology Stack

### 6.1 Frontend Technologies

| Component | Technology | Version | Purpose |
|-----------|------------|---------|---------|
| Framework | Next.js | 14.x | React framework with App Router |
| Language | TypeScript | 5.x | Type-safe JavaScript |
| Styling | Tailwind CSS | 3.x | Utility-first CSS |
| UI Components | shadcn/ui | latest | Accessible components |
| State Management | Zustand | 4.x | Lightweight state management |
| Forms | React Hook Form + Zod | 7.x | Form handling and validation |
| HTTP Client | Axios | 1.x | API requests |
| Charts | Recharts | 2.x | Data visualization |
| Tables | TanStack Table | 8.x | Data tables |
| Dates | date-fns | 3.x | Date manipulation |

### 6.2 Backend Technologies

| Component | Technology | Version | Purpose |
|-----------|------------|---------|---------|
| Runtime | Node.js | 20.x LTS | JavaScript runtime |
| Framework | Express.js | 4.x | Web application framework |
| Language | TypeScript | 5.x | Type-safe development |
| ORM | Prisma | 5.x | Database toolkit |
| Validation | zod | 3.x | Schema validation |
| Authentication | jsonwebtoken | 9.x | JWT handling |
| Password Hashing | bcryptjs | 2.x | Secure password hashing |
| Email | Nodemailer | 6.x | Email sending |
| File Upload | Multer | 1.x | Multipart form handling |
| Logging | Pino | 8.x | High-performance logging |

### 6.3 Infrastructure Technologies

| Component | Technology | Purpose |
|-----------|------------|---------|
| Containerization | Docker | Container runtime |
| Orchestration | Docker Compose | Multi-container apps |
| Database | PostgreSQL 16 | Primary data store |
| Cache | Redis 7 | Caching and pub/sub |
| File Storage | AWS S3 | Object storage |
| Email | AWS SES / SMTP | Transactional email |
| Reverse Proxy | Nginx | Load balancing, SSL |
| CI/CD | GitHub Actions | Automated deployments |

### 6.4 Development Tools

| Tool | Purpose |
|------|---------|
| Turbo | Monorepo build system |
| ESLint | Code linting |
| Prettier | Code formatting |
| Husky | Git hooks |
| Jest | Unit testing |
| tsx | TypeScript execution |
| Prisma Studio | Database GUI |

---

## 7. Data Architecture

### 7.1 Database Strategy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DATABASE ARCHITECTURE                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                        MASTER DATABASE                                 │ │
│  │                      (Database: oms_master)                            │ │
│  │                                                                       │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │ │
│  │  │  Platform   │  │   Tenants   │  │Subscriptions│  │   Pricing   │  │ │
│  │  │   Admins    │  │  Registry   │  │  & Billing  │  │    Plans    │  │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘  │ │
│  │                                                                       │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                    │                                        │
│                                    ▼                                        │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                       TENANT DATABASES                                 │ │
│  │            (One database per tenant for complete isolation)            │ │
│  │                                                                       │ │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐    │ │
│  │  │ oms_tenant_innovatelab │  │ oms_tenant_globex│  │ oms_tenant_xxx   │    │ │
│  │  │                  │  │                  │  │                  │    │ │
│  │  │ • Users          │  │ • Users          │  │ • Users          │    │ │
│  │  │ • Employees      │  │ • Employees      │  │ • Employees      │    │ │
│  │  │ • Departments    │  │ • Departments    │  │ • Departments    │    │ │
│  │  │ • Projects       │  │ • Projects       │  │ • Projects       │    │ │
│  │  │ • Tasks          │  │ • Tasks          │  │ • Tasks          │    │ │
│  │  │ • Attendance     │  │ • Attendance     │  │ • Attendance     │    │ │
│  │  │ • Documents      │  │ • Documents      │  │ • Documents      │    │ │
│  │  │ • ...            │  │ • ...            │  │ • ...            │    │ │
│  │  └──────────────────┘  └──────────────────┘  └──────────────────┘    │ │
│  │                                                                       │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 7.2 Master Database Schema (Key Tables)

| Table | Purpose |
|-------|---------|
| `platform_admins` | Super admins, sub-admins, support agents |
| `platform_admin_sessions` | Admin session management |
| `tenants` | Registered organizations |
| `tenant_settings` | Tenant-specific configurations |
| `tenant_subdomains` | Subdomain mappings |
| `pricing_plans` | Subscription plans |
| `subscriptions` | Active subscriptions |
| `invoices` | Billing records |
| `payments` | Payment transactions |

### 7.3 Tenant Database Schema (Key Tables)

| Domain | Tables |
|--------|--------|
| **Identity** | `users`, `user_sessions`, `roles`, `permissions`, `user_roles` |
| **Organization** | `departments`, `teams`, `designations`, `employees` |
| **Attendance** | `attendance`, `leave_requests`, `leave_balances`, `holidays` |
| **Projects** | `projects`, `clients`, `tasks`, `milestones`, `time_entries` |
| **Documents** | `folders`, `files`, `file_versions` |
| **HR** | `onboarding_tasks`, `performance_reviews`, `employee_badges` |

### 7.4 Data Flow

```
                    ┌──────────────┐
                    │   Request    │
                    └──────┬───────┘
                           │
                           ▼
                    ┌──────────────┐
                    │ API Gateway  │───────────▶ Identify Tenant
                    └──────┬───────┘              (from subdomain)
                           │
                           ▼
                    ┌──────────────┐
                    │ Auth Service │───────────▶ Validate Token
                    └──────┬───────┘              Get User Context
                           │
                           ▼
                    ┌──────────────┐
                    │Tenant DB Mgr │───────────▶ Get Tenant DB Connection
                    └──────┬───────┘              from Connection Pool
                           │
                           ▼
                    ┌──────────────┐
                    │   Service    │───────────▶ Execute Business Logic
                    └──────┬───────┘              with Tenant DB
                           │
                           ▼
                    ┌──────────────┐
                    │  Response    │
                    └──────────────┘
```

---

## 8. Integration Architecture

### 8.1 External Integrations

| Integration | Type | Purpose |
|-------------|------|---------|
| **AWS S3** | Storage | Document and file storage |
| **AWS SES** | Email | Transactional emails |
| **SendGrid** | Email | Marketing and notification emails |
| **Stripe** | Payment | Subscription billing |
| **Google OAuth** | Auth | Google SSO login |
| **Microsoft OAuth** | Auth | Microsoft SSO login |
| **OpenAI/Anthropic** | AI | AI assistant features |
| **Okta/Auth0** | SSO | Enterprise SSO |

### 8.2 Integration Patterns

```
┌─────────────────────────────────────────────────────────────────┐
│                    INTEGRATION LAYER                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                  OUTBOUND INTEGRATIONS                   │   │
│  │                                                          │   │
│  │   Service ──▶ Integration Adapter ──▶ External API      │   │
│  │                      │                                   │   │
│  │              ┌───────┴───────┐                          │   │
│  │              │   Patterns:   │                          │   │
│  │              │ • Circuit Breaker                        │   │
│  │              │ • Retry with Backoff                     │   │
│  │              │ • Timeout                                │   │
│  │              │ • Fallback                               │   │
│  │              └───────────────┘                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                  INBOUND INTEGRATIONS                    │   │
│  │                                                          │   │
│  │   Webhook URL ◀── External System                       │   │
│  │        │                                                 │   │
│  │        ▼                                                 │   │
│  │   Webhook Handler ──▶ Validate Signature                │   │
│  │        │                                                 │   │
│  │        ▼                                                 │   │
│  │   Process Event ──▶ Update System                       │   │
│  │                                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 9. Security Architecture

### 9.1 Security Layers

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SECURITY ARCHITECTURE                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Layer 1: NETWORK SECURITY                                                  │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │  • CloudFlare/WAF - DDoS protection, Bot filtering                    │ │
│  │  • AWS Security Groups - Network ACLs, Port restrictions              │ │
│  │  • TLS 1.3 - End-to-end encryption                                    │ │
│  │  • VPC - Private network isolation                                     │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  Layer 2: APPLICATION SECURITY                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │  • JWT Authentication - Stateless token-based auth                    │ │
│  │  • RBAC - Role-based access control                                   │ │
│  │  • Rate Limiting - API throttling (30 req/s)                          │ │
│  │  • Input Validation - Zod schema validation                           │ │
│  │  • CORS - Cross-origin restrictions                                   │ │
│  │  • CSP - Content Security Policy headers                              │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  Layer 3: DATA SECURITY                                                     │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │  • Encryption at Rest - AES-256 for sensitive data                    │ │
│  │  • Encryption in Transit - TLS for all connections                    │ │
│  │  • Password Hashing - bcrypt with salt                                │ │
│  │  • Tenant Isolation - Separate databases per tenant                   │ │
│  │  • Audit Logging - All critical operations logged                     │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  Layer 4: OPERATIONAL SECURITY                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │  • Fail2Ban - SSH brute-force protection                              │ │
│  │  • Secret Management - Environment variables, no hardcoded secrets    │ │
│  │  • Regular Updates - Automated security patches                       │ │
│  │  • Backup Encryption - Encrypted database backups                     │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 9.2 Authentication Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Client  │     │   API    │     │   Auth   │     │ Database │
│          │     │ Gateway  │     │ Service  │     │          │
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │                │
     │  1. Login      │                │                │
     │  (credentials) │                │                │
     │───────────────▶│                │                │
     │                │  2. Forward    │                │
     │                │───────────────▶│                │
     │                │                │  3. Verify     │
     │                │                │───────────────▶│
     │                │                │  4. User Data  │
     │                │                │◀───────────────│
     │                │  5. Generate   │                │
     │                │     JWT        │                │
     │                │◀───────────────│                │
     │  6. JWT Token  │                │                │
     │◀───────────────│                │                │
     │                │                │                │
     │  7. API Call   │                │                │
     │  (with JWT)    │                │                │
     │───────────────▶│                │                │
     │                │  8. Validate   │                │
     │                │     JWT        │                │
     │                │───────────────▶│                │
     │                │  9. Valid      │                │
     │                │◀───────────────│                │
     │                │                │                │
     │  10. Response  │                │                │
     │◀───────────────│                │                │
     │                │                │                │
```

---

## 10. Performance & Scalability

### 10.1 Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| API Response Time (p95) | < 200ms | ~150ms |
| Page Load Time | < 3s | ~2.5s |
| Time to First Byte | < 500ms | ~400ms |
| Concurrent Users | 1,000+ | Tested |
| Database Query Time (p95) | < 100ms | ~50ms |
| Uptime | 99.9% | Target |

### 10.2 Scalability Strategies

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        SCALABILITY ARCHITECTURE                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  HORIZONTAL SCALING                                                         │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                                                                       │ │
│  │    Load Balancer                                                      │ │
│  │         │                                                             │ │
│  │    ┌────┼────┬────────┐                                              │ │
│  │    ▼    ▼    ▼        ▼                                              │ │
│  │   App  App  App  ... App   (Auto-scaling based on CPU/Memory)        │ │
│  │   #1   #2   #3       #n                                              │ │
│  │                                                                       │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  CACHING STRATEGY                                                           │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                                                                       │ │
│  │  Request ──▶ Check Redis Cache ──▶ Hit? ──▶ Return Cached            │ │
│  │                     │                                                 │ │
│  │                     │ Miss                                            │ │
│  │                     ▼                                                 │ │
│  │              Query Database ──▶ Store in Cache ──▶ Return            │ │
│  │                                                                       │ │
│  │  Cache Types:                                                         │ │
│  │  • Session Cache (TTL: 24h)                                          │ │
│  │  • Query Cache (TTL: 5min)                                           │ │
│  │  • Static Data Cache (TTL: 1h)                                       │ │
│  │                                                                       │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  DATABASE OPTIMIZATION                                                      │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │  • Connection pooling (PgBouncer)                                     │ │
│  │  • Read replicas for reporting                                        │ │
│  │  • Indexed queries                                                    │ │
│  │  • Query optimization with EXPLAIN ANALYZE                            │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 11. Monitoring & Observability

### 11.1 Observability Stack

| Component | Tool | Purpose |
|-----------|------|---------|
| Logging | Pino + CloudWatch | Structured application logs |
| Metrics | CloudWatch Metrics | System and application metrics |
| Tracing | AWS X-Ray | Distributed tracing |
| APM | Datadog/New Relic | Application performance monitoring |
| Error Tracking | Sentry | Error aggregation and alerting |
| Uptime Monitoring | UptimeRobot | External availability checks |

### 11.2 Key Metrics

| Category | Metrics |
|----------|---------|
| **Application** | Request rate, Error rate, Response time |
| **Infrastructure** | CPU, Memory, Disk, Network I/O |
| **Database** | Connections, Query time, Lock waits |
| **Business** | Active users, API calls, Tenant usage |

---

## 12. Disaster Recovery

### 12.1 Backup Strategy

| Data | Frequency | Retention | Location |
|------|-----------|-----------|----------|
| Database (Full) | Daily | 30 days | S3 + Cross-region |
| Database (Incremental) | Hourly | 7 days | S3 |
| File Uploads | Real-time | Indefinite | S3 versioning |
| Application Logs | Real-time | 90 days | CloudWatch |
| Configuration | On change | 30 versions | Git |

### 12.2 Recovery Objectives

| Metric | Target |
|--------|--------|
| **RPO** (Recovery Point Objective) | < 1 hour |
| **RTO** (Recovery Time Objective) | < 4 hours |

### 12.3 Failover Strategy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DISASTER RECOVERY PLAN                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  PRIMARY REGION (us-east-1)           BACKUP REGION (us-west-2)            │
│  ┌─────────────────────────┐         ┌─────────────────────────┐           │
│  │                         │         │                         │           │
│  │   EC2 Instances         │         │   Standby EC2           │           │
│  │   (Active)              │ ──────▶ │   (Warm Standby)        │           │
│  │                         │ Sync    │                         │           │
│  │   RDS (Primary)         │         │   RDS (Read Replica)    │           │
│  │                         │ ──────▶ │                         │           │
│  │   S3 (Primary)          │ Sync    │   S3 (Replicated)       │           │
│  │                         │ ──────▶ │                         │           │
│  │                         │         │                         │           │
│  └─────────────────────────┘         └─────────────────────────┘           │
│                                                                             │
│  Failover Process:                                                          │
│  1. Detect failure (Health checks fail)                                     │
│  2. Update DNS (Route 53 health-based routing)                              │
│  3. Promote read replica to primary                                         │
│  4. Scale up standby instances                                              │
│  5. Verify services operational                                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Appendix

### A. Glossary

| Term | Definition |
|------|------------|
| **Tenant** | An organization using the SaaS platform |
| **Platform Admin** | CoreOrbit staff managing the platform |
| **Tenant Admin** | Customer admin managing their organization |
| **Subdomain** | Unique URL prefix for each tenant (e.g., innovatelab.coreorbitsoftware.com) |

### B. References

- [AWS EC2 Deployment Guide](AWS_EC2_DEPLOYMENT.md)
- [API Documentation](API_DOCUMENTATION.md)
- [Database Schema](DATABASE_SCHEMA.md)
- [Development Guide](../DEVELOPMENT.md)

---

**Document Control**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Jan 2026 | CoreOrbit Team | Initial release |
| 2.0 | Mar 2026 | CoreOrbit Team | Updated architecture |

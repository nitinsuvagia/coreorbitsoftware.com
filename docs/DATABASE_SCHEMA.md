# Database Schema Documentation

## Office Management SaaS Platform

**Version:** 1.0  
**Last Updated:** March 4, 2026

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [Master Database Schema](#3-master-database-schema)
4. [Tenant Database Schema](#4-tenant-database-schema)
5. [Entity Relationship Diagrams](#5-entity-relationship-diagrams)
6. [Database Migrations](#6-database-migrations)
7. [Indexing Strategy](#7-indexing-strategy)
8. [Data Retention](#8-data-retention)

---

## 1. Overview

### 1.1 Multi-Tenant Architecture

The Office Management platform uses a **database-per-tenant** architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                    PostgreSQL Cluster                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ oms_master  │  │oms_tenant_  │  │oms_tenant_  │  ...    │
│  │             │  │   acme      │  │  techcorp   │         │
│  │ - Admins    │  │ - Users     │  │ - Users     │         │
│  │ - Tenants   │  │ - Employees │  │ - Employees │         │
│  │ - Plans     │  │ - Projects  │  │ - Projects  │         │
│  │ - Billing   │  │ - Tasks     │  │ - Tasks     │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Database Naming Convention

| Database | Naming Pattern | Example |
|----------|---------------|---------|
| Master | `oms_master` | `oms_master` |
| Tenant | `oms_tenant_{slug}` | `oms_tenant_acme` |

### 1.3 ORM Technology

- **Prisma ORM** with separate schema files:
  - `prisma/master/schema.prisma` - Master database
  - `prisma/tenant/schema.prisma` - Tenant database template

---

## 2. Architecture

### 2.1 Separation of Concerns

| Database | Purpose | Data |
|----------|---------|------|
| **Master** | Platform management | Admins, tenants, subscriptions, billing |
| **Tenant** | Business data | Employees, projects, tasks, attendance |

### 2.2 Benefits

- **Data Isolation**: Complete tenant data separation
- **Security**: No cross-tenant data access possible
- **Performance**: Independent scaling per tenant
- **Compliance**: Easier GDPR/data residency compliance
- **Backup**: Independent backup/restore per tenant

### 2.3 Connection Management

```javascript
// Master database connection
const masterPrisma = new PrismaClient({
  datasources: {
    db: { url: process.env.MASTER_DATABASE_URL }
  }
});

// Tenant database connection (dynamic)
const tenantPrisma = getTenantClient(tenantSlug);
```

---

## 3. Master Database Schema

### 3.1 Schema Overview

The master database stores platform-level data.

```
oms_master/
├── Platform Administration
│   ├── platform_admins
│   ├── platform_admin_sessions
│   ├── platform_login_history
│   └── trusted_devices
├── Tenant Management
│   ├── tenants
│   ├── tenant_settings
│   ├── tenant_subdomains
│   └── custom_domains
├── Subscription & Billing
│   ├── subscription_plans
│   ├── subscriptions
│   ├── invoices
│   ├── payments
│   └── payment_methods
└── Platform Settings
    ├── usage_records
    └── platform_audit_log
```

### 3.2 Core Tables

#### 3.2.1 platform_admins

Platform administrators who manage the SaaS platform.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `email` | VARCHAR | Unique email |
| `username` | VARCHAR | Unique username |
| `password_hash` | VARCHAR | Bcrypt hashed password |
| `role` | ENUM | SUPER_ADMIN, SUB_ADMIN, ADMIN_USER, BILLING_ADMIN, SUPPORT_AGENT |
| `status` | ENUM | PENDING, ACTIVE, INACTIVE, LOCKED, SUSPENDED |
| `first_name` | VARCHAR | First name |
| `last_name` | VARCHAR | Last name |
| `display_name` | VARCHAR | Display name |
| `avatar` | VARCHAR | Profile image URL |
| `phone` | VARCHAR | Phone number |
| `timezone` | VARCHAR | Default "UTC" |
| `language` | VARCHAR | Default "en" |
| `mfa_enabled` | BOOLEAN | MFA status |
| `mfa_type` | ENUM | TOTP, SMS, EMAIL |
| `mfa_secret` | VARCHAR | MFA secret key |
| `mfa_backup_codes` | VARCHAR[] | Backup codes array |
| `password_changed_at` | TIMESTAMP | Last password change |
| `password_expires_at` | TIMESTAMP | Password expiration |
| `login_attempts` | INT | Failed login count |
| `locked_until` | TIMESTAMP | Account lock expiry |
| `allowed_ip_addresses` | VARCHAR[] | IP whitelist |
| `last_login_at` | TIMESTAMP | Last login time |
| `last_activity_at` | TIMESTAMP | Last activity time |
| `invited_by` | UUID | Inviter admin ID (FK) |
| `invited_at` | TIMESTAMP | Invitation time |
| `created_at` | TIMESTAMP | Created timestamp |
| `updated_at` | TIMESTAMP | Updated timestamp |
| `deleted_at` | TIMESTAMP | Soft delete timestamp |

**Indexes:**
- `email` (unique)
- `username` (unique)
- `status`
- `role`

---

#### 3.2.2 tenants

Organizations/companies using the platform.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `name` | VARCHAR | Company display name |
| `slug` | VARCHAR | Unique URL-safe identifier |
| `legal_name` | VARCHAR | Legal company name |
| `logo` | VARCHAR | Thumbnail logo URL |
| `report_logo` | VARCHAR | Full-size logo for reports |
| `status` | ENUM | PENDING, TRIAL, ACTIVE, SUSPENDED, INACTIVE, TERMINATED |
| `database_name` | VARCHAR | Tenant database name (unique) |
| `database_host` | VARCHAR | Optional custom host |
| `database_port` | INT | Optional custom port |
| `database_pool_size` | INT | Connection pool size (default 10) |
| `email` | VARCHAR | Primary contact email |
| `phone` | VARCHAR | Contact phone |
| `website` | VARCHAR | Company website |
| `address_line_1` | VARCHAR | Address line 1 |
| `address_line_2` | VARCHAR | Address line 2 |
| `city` | VARCHAR | City |
| `state` | VARCHAR | State/Province |
| `country` | VARCHAR | Country |
| `postal_code` | VARCHAR | Postal code |
| `trial_ends_at` | TIMESTAMP | Trial expiration |
| `activated_at` | TIMESTAMP | Activation time |
| `suspended_at` | TIMESTAMP | Suspension time |
| `terminated_at` | TIMESTAMP | Termination time |
| `metadata` | JSON | Additional metadata |
| `created_at` | TIMESTAMP | Created timestamp |
| `updated_at` | TIMESTAMP | Updated timestamp |
| `deleted_at` | TIMESTAMP | Soft delete timestamp |

**Indexes:**
- `slug` (unique)
- `database_name` (unique)
- `status`
- `email`

---

#### 3.2.3 tenant_settings

Configuration settings for each tenant.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `tenant_id` | UUID | Foreign key to tenants |
| `timezone` | VARCHAR | Default "UTC" |
| `date_format` | VARCHAR | Date format (default "YYYY-MM-DD") |
| `time_format` | ENUM | TWELVE_HOUR, TWENTY_FOUR_HOUR |
| `currency` | VARCHAR | Default "USD" |
| `language` | VARCHAR | Default "en" |
| `fiscal_year_start` | INT | Month (1-12) |
| `working_days` | INT[] | [1,2,3,4,5] = Mon-Fri |
| `work_start_time` | VARCHAR | Default "09:00" |
| `work_end_time` | VARCHAR | Default "18:00" |
| `break_start_time` | VARCHAR | Break start |
| `break_end_time` | VARCHAR | Break end |
| `weekly_working_hours` | JSON | Per-day configuration |

**Module Toggles:**
| Column | Type | Default |
|--------|------|---------|
| `module_employee` | BOOLEAN | true |
| `module_attendance` | BOOLEAN | true |
| `module_project` | BOOLEAN | true |
| `module_task` | BOOLEAN | true |
| `module_client` | BOOLEAN | true |
| `module_asset` | BOOLEAN | false |
| `module_hr_payroll` | BOOLEAN | false |
| `module_meeting` | BOOLEAN | true |
| `module_recruitment` | BOOLEAN | false |
| `module_resource` | BOOLEAN | false |
| `module_file` | BOOLEAN | true |

**Security Settings:**
| Column | Type | Default |
|--------|------|---------|
| `sso_enabled` | BOOLEAN | false |
| `mfa_required` | BOOLEAN | false |
| `ip_whitelist` | BOOLEAN | false |
| `password_min_length` | INT | 8 |
| `password_require_uppercase` | BOOLEAN | true |
| `password_require_numbers` | BOOLEAN | true |
| `password_require_symbols` | BOOLEAN | false |
| `password_expiry_days` | INT | null |
| `session_timeout_minutes` | INT | 60 |
| `max_login_attempts` | INT | 5 |
| `lockout_duration_minutes` | INT | 15 |

---

#### 3.2.4 subscription_plans

Available subscription plans.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `name` | VARCHAR | Plan name |
| `slug` | VARCHAR | URL-safe identifier |
| `description` | VARCHAR | Plan description |
| `tier` | ENUM | FREE, STARTER, PROFESSIONAL, ENTERPRISE, CUSTOM |
| `is_active` | BOOLEAN | Available for purchase |
| `is_public` | BOOLEAN | Visible to customers |
| `monthly_price` | DECIMAL(10,2) | Monthly price |
| `yearly_price` | DECIMAL(10,2) | Yearly price |
| `currency` | VARCHAR | Default "USD" |
| `max_users` | INT | User limit |
| `max_storage` | BIGINT | Storage limit (bytes) |
| `max_projects` | INT | Project limit |
| `max_clients` | INT | Client limit |
| `features` | JSON | Feature flags |
| `stripe_price_id_monthly` | VARCHAR | Stripe price ID |
| `stripe_price_id_yearly` | VARCHAR | Stripe price ID |

---

#### 3.2.5 subscriptions

Tenant subscriptions.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `tenant_id` | UUID | Foreign key (unique) |
| `plan_id` | UUID | Foreign key to plans |
| `status` | ENUM | TRIALING, ACTIVE, PAST_DUE, CANCELED, UNPAID, PAUSED |
| `billing_cycle` | ENUM | MONTHLY, QUARTERLY, YEARLY |
| `amount` | DECIMAL(10,2) | Current amount |
| `currency` | VARCHAR | Currency code |
| `max_users` | INT | Current user limit |
| `max_storage` | BIGINT | Current storage limit |
| `max_projects` | INT | Current project limit |
| `current_period_start` | TIMESTAMP | Billing period start |
| `current_period_end` | TIMESTAMP | Billing period end |
| `trial_start` | TIMESTAMP | Trial start date |
| `trial_end` | TIMESTAMP | Trial end date |
| `canceled_at` | TIMESTAMP | Cancellation time |
| `cancel_at_period_end` | BOOLEAN | Cancel at period end |
| `stripe_customer_id` | VARCHAR | Stripe customer ID |
| `stripe_subscription_id` | VARCHAR | Stripe subscription ID |

---

## 4. Tenant Database Schema

### 4.1 Schema Overview

Each tenant database contains business-specific data.

```
oms_tenant_{slug}/
├── User Management
│   ├── users
│   ├── user_sessions
│   ├── login_history
│   ├── roles
│   ├── permissions
│   └── user_roles
├── Organization
│   ├── departments
│   ├── teams
│   ├── team_members
│   └── designations
├── Employee Management
│   ├── employees
│   ├── employee_documents
│   ├── emergency_contacts
│   ├── bank_details
│   └── employee_educations
├── Attendance & Leave
│   ├── attendances
│   ├── leave_types
│   ├── leave_requests
│   ├── leave_balances
│   └── holidays
├── Project Management
│   ├── clients
│   ├── projects
│   ├── project_members
│   └── project_teams
├── Task Management
│   ├── tasks
│   ├── task_assignees
│   ├── task_checklists
│   ├── comments
│   └── time_entries
├── Document Management
│   ├── folders
│   ├── files
│   └── file_versions
├── Notifications
│   ├── notifications
│   └── notification_settings
└── System
    ├── audit_logs
    └── settings
```

### 4.2 Core Tables

#### 4.2.1 users

Tenant users who can log in to the portal.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `employee_id` | UUID | Optional link to employee (unique) |
| `email` | VARCHAR | Unique email |
| `username` | VARCHAR | Optional username |
| `password_hash` | VARCHAR | Bcrypt hashed password |
| `status` | ENUM | PENDING, ACTIVE, INACTIVE, LOCKED, SUSPENDED |
| `auth_provider` | ENUM | LOCAL, GOOGLE, MICROSOFT, SAML, LDAP, OAUTH, OIDC |
| `provider_id` | VARCHAR | External provider user ID |
| `first_name` | VARCHAR | First name |
| `last_name` | VARCHAR | Last name |
| `display_name` | VARCHAR | Display name |
| `avatar` | VARCHAR | Profile image URL |
| `phone` | VARCHAR | Phone number |
| `timezone` | VARCHAR | Default "UTC" |
| `language` | VARCHAR | Default "en" |
| `theme` | ENUM | LIGHT, DARK, SYSTEM |
| `notify_email` | BOOLEAN | Email notifications |
| `notify_push` | BOOLEAN | Push notifications |
| `notify_desktop` | BOOLEAN | Desktop notifications |
| `mfa_enabled` | BOOLEAN | MFA status |
| `mfa_secret` | VARCHAR | MFA secret |
| `mfa_backup_codes` | VARCHAR[] | Backup codes |
| `password_changed_at` | TIMESTAMP | Password change time |
| `login_attempts` | INT | Failed login count |
| `locked_until` | TIMESTAMP | Lock expiry |
| `email_verified` | BOOLEAN | Email verified status |
| `email_verified_at` | TIMESTAMP | Verification time |
| `last_login_at` | TIMESTAMP | Last login |
| `last_activity_at` | TIMESTAMP | Last activity |
| `created_at` | TIMESTAMP | Created timestamp |
| `updated_at` | TIMESTAMP | Updated timestamp |
| `deleted_at` | TIMESTAMP | Soft delete |

**Indexes:** `email` (unique), `employee_id` (unique), `status`

---

#### 4.2.2 employees

Employee records (may or may not have user accounts).

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `employee_code` | VARCHAR | Unique employee code (e.g., EMP-001) |
| `department_id` | UUID | Foreign key to departments |
| `reporting_manager_id` | UUID | Self-reference to manager |
| `designation_id` | UUID | Foreign key to designations |
| `first_name` | VARCHAR | First name |
| `last_name` | VARCHAR | Last name |
| `middle_name` | VARCHAR | Middle name |
| `display_name` | VARCHAR | Display name |
| `email` | VARCHAR | Work email (unique) |
| `personal_email` | VARCHAR | Personal email |
| `phone` | VARCHAR | Work phone |
| `mobile` | VARCHAR | Mobile number |
| `date_of_birth` | DATE | Date of birth |
| `gender` | ENUM | MALE, FEMALE, OTHER, PREFER_NOT_TO_SAY |
| `marital_status` | ENUM | SINGLE, MARRIED, DIVORCED, WIDOWED, OTHER |
| `nationality` | VARCHAR | Nationality |
| `blood_group` | VARCHAR | Blood group |
| `avatar` | VARCHAR | Profile image |

**Address Fields:**
| Column | Type |
|--------|------|
| `address_line_1` | VARCHAR |
| `address_line_2` | VARCHAR |
| `city` | VARCHAR |
| `state` | VARCHAR |
| `country` | VARCHAR |
| `postal_code` | VARCHAR |

**Employment Fields:**
| Column | Type | Description |
|--------|------|-------------|
| `employment_type` | ENUM | FULL_TIME, PART_TIME, CONTRACT, INTERN, CONSULTANT, TEMPORARY |
| `status` | ENUM | ACTIVE, ON_LEAVE, PROBATION, NOTICE_PERIOD, TERMINATED, RESIGNED, RETIRED |
| `join_date` | DATE | Employment start date |
| `confirmation_date` | DATE | Confirmation date |
| `probation_end_date` | DATE | Probation end |
| `exit_date` | DATE | Employment end date |
| `exit_reason` | VARCHAR | Exit reason |
| `work_location` | VARCHAR | Office location |
| `work_shift` | VARCHAR | Shift name |
| `base_salary` | DECIMAL(12,2) | Base compensation |
| `currency` | VARCHAR | Salary currency |
| `skills` | VARCHAR[] | Skill tags |
| `certifications` | VARCHAR[] | Certification tags |

**Indexes:** `email` (unique), `employee_code` (unique), `department_id`, `status`

---

#### 4.2.3 departments

Organizational departments.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `name` | VARCHAR | Department name |
| `code` | VARCHAR | Unique code |
| `description` | VARCHAR | Description |
| `parent_id` | UUID | Parent department (for hierarchy) |
| `manager_id` | UUID | Department manager (FK to employees) |
| `is_active` | BOOLEAN | Active status |
| `sort_order` | INT | Display order |
| `metadata` | JSON | Additional data |
| `created_at` | TIMESTAMP | Created |
| `updated_at` | TIMESTAMP | Updated |
| `deleted_at` | TIMESTAMP | Soft delete |

---

#### 4.2.4 projects

Project records.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `name` | VARCHAR | Project name |
| `code` | VARCHAR | Unique project code |
| `description` | TEXT | Project description |
| `client_id` | UUID | Foreign key to clients |
| `parent_id` | UUID | Parent project (for sub-projects) |
| `status` | ENUM | DRAFT, PLANNING, IN_PROGRESS, ON_HOLD, COMPLETED, CANCELLED, ARCHIVED |
| `priority` | ENUM | LOW, MEDIUM, HIGH, URGENT |
| `start_date` | DATE | Project start |
| `end_date` | DATE | Project end |
| `actual_start_date` | DATE | Actual start |
| `actual_end_date` | DATE | Actual end |
| `estimated_hours` | DECIMAL | Estimated hours |
| `budget` | DECIMAL | Project budget |
| `currency` | VARCHAR | Budget currency |
| `progress` | INT | Progress percentage |
| `is_billable` | BOOLEAN | Billable project |
| `billing_type` | ENUM | FIXED, HOURLY, MILESTONE |
| `hourly_rate` | DECIMAL | Hourly billing rate |
| `visibility` | ENUM | PUBLIC, PRIVATE, TEAM |
| `metadata` | JSON | Additional data |
| `created_at` | TIMESTAMP | Created |
| `updated_at` | TIMESTAMP | Updated |
| `deleted_at` | TIMESTAMP | Soft delete |

---

#### 4.2.5 tasks

Task records within projects.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `title` | VARCHAR | Task title |
| `description` | TEXT | Task description |
| `project_id` | UUID | Foreign key to projects |
| `parent_id` | UUID | Parent task (for subtasks) |
| `creator_id` | UUID | Task creator (FK to users) |
| `status` | ENUM | TODO, IN_PROGRESS, IN_REVIEW, BLOCKED, COMPLETED, CANCELLED |
| `priority` | ENUM | LOW, MEDIUM, HIGH, URGENT |
| `task_type` | ENUM | TASK, BUG, FEATURE, IMPROVEMENT, STORY, EPIC |
| `start_date` | DATE | Planned start |
| `due_date` | DATE | Due date |
| `completed_at` | TIMESTAMP | Completion time |
| `estimated_hours` | DECIMAL | Estimated hours |
| `actual_hours` | DECIMAL | Actual hours logged |
| `progress` | INT | Progress percentage |
| `is_billable` | BOOLEAN | Billable task |
| `sort_order` | INT | Display order |
| `tags` | VARCHAR[] | Task tags |
| `metadata` | JSON | Additional data |
| `created_at` | TIMESTAMP | Created |
| `updated_at` | TIMESTAMP | Updated |
| `deleted_at` | TIMESTAMP | Soft delete |

---

#### 4.2.6 attendances

Daily attendance records.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `employee_id` | UUID | Foreign key to employees |
| `date` | DATE | Attendance date |
| `check_in` | TIMESTAMP | Check-in time |
| `check_out` | TIMESTAMP | Check-out time |
| `check_in_location` | JSON | Location data |
| `check_out_location` | JSON | Location data |
| `status` | ENUM | PRESENT, ABSENT, HALF_DAY, LATE, ON_LEAVE, HOLIDAY, WEEKEND |
| `work_type` | ENUM | OFFICE, REMOTE, HYBRID, FIELD |
| `total_hours` | DECIMAL | Total worked hours |
| `overtime_hours` | DECIMAL | Overtime hours |
| `break_duration` | INT | Break minutes |
| `notes` | TEXT | Attendance notes |
| `is_regularized` | BOOLEAN | Manual regularization |
| `regularized_by` | UUID | Approver user ID |
| `regularize_reason` | TEXT | Regularization reason |
| `ip_address` | VARCHAR | Check-in IP |
| `device_info` | JSON | Device information |
| `created_at` | TIMESTAMP | Created |
| `updated_at` | TIMESTAMP | Updated |

**Unique constraint:** `(employee_id, date)`

---

#### 4.2.7 leave_requests

Employee leave requests.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `employee_id` | UUID | Foreign key to employees |
| `leave_type_id` | UUID | Foreign key to leave_types |
| `start_date` | DATE | Leave start date |
| `end_date` | DATE | Leave end date |
| `total_days` | DECIMAL | Total leave days |
| `reason` | TEXT | Leave reason |
| `status` | ENUM | PENDING, APPROVED, REJECTED, CANCELLED, WITHDRAWN |
| `approved_by` | UUID | Approver user ID |
| `approved_at` | TIMESTAMP | Approval time |
| `rejection_reason` | TEXT | Rejection reason |
| `attachment_url` | VARCHAR | Supporting document |
| `is_half_day` | BOOLEAN | Half-day leave |
| `half_day_type` | ENUM | FIRST_HALF, SECOND_HALF |
| `created_at` | TIMESTAMP | Created |
| `updated_at` | TIMESTAMP | Updated |

---

## 5. Entity Relationship Diagrams

### 5.1 Master Database ERD

```
┌─────────────────┐       ┌─────────────────┐
│ platform_admins │       │ subscription_   │
│─────────────────│       │     plans       │
│ id (PK)         │       │─────────────────│
│ email           │       │ id (PK)         │
│ role            │       │ name            │
│ status          │       │ tier            │
│ invited_by (FK) │───┐   │ monthly_price   │
└─────────────────┘   │   └────────┬────────┘
        │             │            │
        │             │            │
┌───────▼───────┐     │   ┌────────▼────────┐
│ platform_     │     │   │ subscriptions   │
│ admin_sessions│     │   │─────────────────│
│───────────────│     │   │ id (PK)         │
│ id (PK)       │     │   │ tenant_id (FK)  │──┐
│ admin_id (FK) │─────┘   │ plan_id (FK)    │──┘
│ token_hash    │         │ status          │
└───────────────┘         └────────┬────────┘
                                   │
┌─────────────────┐                │
│     tenants     │◄───────────────┘
│─────────────────│
│ id (PK)         │
│ name            │
│ slug            │
│ status          │
│ database_name   │
└────────┬────────┘
         │
         │     ┌─────────────────┐
         │     │ tenant_settings │
         ├────►│─────────────────│
         │     │ tenant_id (FK)  │
         │     │ timezone        │
         │     │ working_days    │
         │     └─────────────────┘
         │
         │     ┌─────────────────┐
         └────►│    invoices     │
               │─────────────────│
               │ tenant_id (FK)  │
               │ invoice_number  │
               │ total           │
               └─────────────────┘
```

### 5.2 Tenant Database ERD (Core)

```
┌─────────────────┐         ┌─────────────────┐
│     users       │         │     roles       │
│─────────────────│         │─────────────────│
│ id (PK)         │◄──┐     │ id (PK)         │
│ employee_id(FK) │   │     │ name            │
│ email           │   │     │ slug            │
│ status          │   │     └────────┬────────┘
└────────┬────────┘   │              │
         │            │     ┌────────▼────────┐
         │            │     │   user_roles    │
         │            │     │─────────────────│
         │            └─────│ user_id (FK)    │
         │                  │ role_id (FK)    │
         │                  └─────────────────┘
         │
┌────────▼────────┐         ┌─────────────────┐
│   employees     │         │  departments    │
│─────────────────│    ┌───►│─────────────────│
│ id (PK)         │◄───┤    │ id (PK)         │
│ department_id   │────┤    │ name            │
│ manager_id (FK) │────┼───►│ manager_id (FK) │
│ designation_id  │    │    │ parent_id (FK)  │
│ employee_code   │    │    └─────────────────┘
│ email           │    │
│ status          │    │    ┌─────────────────┐
└────────┬────────┘    └───►│  designations   │
         │                  │─────────────────│
         │                  │ id (PK)         │
         ▼                  │ name            │
┌─────────────────┐         │ level           │
│  attendances    │         └─────────────────┘
│─────────────────│
│ id (PK)         │         ┌─────────────────┐
│ employee_id(FK) │         │    projects     │
│ date            │         │─────────────────│
│ check_in        │    ┌───►│ id (PK)         │
│ check_out       │    │    │ name            │
│ status          │    │    │ client_id (FK)  │
└─────────────────┘    │    │ status          │
                       │    └────────┬────────┘
┌─────────────────┐    │             │
│ leave_requests  │    │    ┌────────▼────────┐
│─────────────────│    │    │     tasks       │
│ id (PK)         │    │    │─────────────────│
│ employee_id(FK) │    │    │ id (PK)         │
│ leave_type_id   │    │    │ project_id (FK) │
│ status          │    │    │ creator_id (FK) │
└─────────────────┘    │    │ parent_id (FK)  │
                       │    │ title           │
                       │    │ status          │
                       │    └────────┬────────┘
                       │             │
                       │    ┌────────▼────────┐
                       │    │ task_assignees  │
                       │    │─────────────────│
                       │    │ task_id (FK)    │
                       └────│ user_id (FK)    │
                            └─────────────────┘
```

---

## 6. Database Migrations

### 6.1 Migration Strategy

```bash
# Master database migrations
npx prisma migrate dev --schema=prisma/master/schema.prisma

# Apply to production
npx prisma migrate deploy --schema=prisma/master/schema.prisma
```

### 6.2 Tenant Database Migrations

Tenant migrations are applied dynamically when:
1. New tenant is created
2. Schema updates are deployed

```javascript
// Tenant migration service
async function migrateTenantDatabase(tenantSlug: string) {
  const databaseUrl = buildTenantDbUrl(tenantSlug);
  
  await execAsync(`
    DATABASE_URL="${databaseUrl}" \
    npx prisma migrate deploy \
    --schema=prisma/tenant/schema.prisma
  `);
}
```

### 6.3 Migration Best Practices

| Practice | Description |
|----------|-------------|
| **Backward Compatible** | Avoid breaking changes |
| **Incremental** | Small, focused migrations |
| **Tested** | Test on staging first |
| **Reversible** | Plan rollback strategy |
| **Zero Downtime** | Use concurrent index creation |

---

## 7. Indexing Strategy

### 7.1 Index Types Used

| Index Type | Use Case | Example |
|------------|----------|---------|
| **B-tree** | Equality, range queries | Primary keys, foreign keys |
| **Hash** | Exact matches | Session tokens |
| **GIN** | Array/JSONB search | Skills, tags |
| **Unique** | Uniqueness constraint | Email, codes |
| **Composite** | Multi-column queries | (tenant_id, date) |

### 7.2 Key Indexes

**Master Database:**
```sql
-- Tenant lookup
CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_status ON tenants(status);

-- Admin authentication
CREATE UNIQUE INDEX idx_admins_email ON platform_admins(email);
CREATE INDEX idx_admin_sessions_token ON platform_admin_sessions(token_hash);
```

**Tenant Database:**
```sql
-- User authentication
CREATE UNIQUE INDEX idx_users_email ON users(email);
CREATE INDEX idx_user_sessions_token ON user_sessions(token_hash);

-- Employee queries
CREATE INDEX idx_employees_department ON employees(department_id);
CREATE INDEX idx_employees_status ON employees(status);

-- Attendance queries
CREATE UNIQUE INDEX idx_attendance_emp_date ON attendances(employee_id, date);

-- Task queries
CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_tasks_status ON tasks(status);
```

---

## 8. Data Retention

### 8.1 Retention Policies

| Data Type | Retention Period | Action |
|-----------|------------------|--------|
| **Audit Logs** | 7 years | Archive to cold storage |
| **Session Data** | 30 days after expiry | Hard delete |
| **Login History** | 1 year | Soft delete then purge |
| **Notifications** | 90 days (read) | Hard delete |
| **Soft Deleted Records** | 90 days | Permanent deletion |
| **File Versions** | Keep last 10 versions | Purge older versions |

### 8.2 Data Cleanup Jobs

```javascript
// Daily cleanup job
const cleanupJobs = [
  { name: 'expiredSessions', retention: '30d' },
  { name: 'oldNotifications', retention: '90d' },
  { name: 'softDeletedRecords', retention: '90d' },
  { name: 'loginHistory', retention: '365d' },
];
```

### 8.3 Backup Strategy

| Backup Type | Frequency | Retention |
|-------------|-----------|-----------|
| **Full Backup** | Daily | 30 days |
| **Incremental** | Every 6 hours | 7 days |
| **WAL Archive** | Continuous | 7 days |
| **Offsite Copy** | Weekly | 90 days |

---

## Appendix

### A. Enum Reference

#### Master Database Enums
- `PlatformAdminRole`: SUPER_ADMIN, SUB_ADMIN, ADMIN_USER, BILLING_ADMIN, SUPPORT_AGENT
- `PlatformAdminStatus`: PENDING, ACTIVE, INACTIVE, LOCKED, SUSPENDED
- `TenantStatus`: PENDING, TRIAL, ACTIVE, SUSPENDED, INACTIVE, TERMINATED
- `SubscriptionStatus`: TRIALING, ACTIVE, PAST_DUE, CANCELED, UNPAID, PAUSED
- `PlanTier`: FREE, STARTER, PROFESSIONAL, ENTERPRISE, CUSTOM
- `BillingCycle`: MONTHLY, QUARTERLY, YEARLY

#### Tenant Database Enums
- `UserStatus`: PENDING, ACTIVE, INACTIVE, LOCKED, SUSPENDED
- `EmployeeStatus`: ACTIVE, ON_LEAVE, PROBATION, NOTICE_PERIOD, TERMINATED, RESIGNED, RETIRED
- `EmploymentType`: FULL_TIME, PART_TIME, CONTRACT, INTERN, CONSULTANT, TEMPORARY
- `Gender`: MALE, FEMALE, OTHER, PREFER_NOT_TO_SAY
- `ProjectStatus`: DRAFT, PLANNING, IN_PROGRESS, ON_HOLD, COMPLETED, CANCELLED, ARCHIVED
- `TaskStatus`: TODO, IN_PROGRESS, IN_REVIEW, BLOCKED, COMPLETED, CANCELLED
- `Priority`: LOW, MEDIUM, HIGH, URGENT
- `AttendanceStatus`: PRESENT, ABSENT, HALF_DAY, LATE, ON_LEAVE, HOLIDAY, WEEKEND
- `LeaveStatus`: PENDING, APPROVED, REJECTED, CANCELLED, WITHDRAWN

---

**Document Control**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Mar 2026 | CoreOrbit Team | Initial release |

-- CreateEnum
CREATE TYPE "PlatformAdminRole" AS ENUM ('SUPER_ADMIN', 'SUB_ADMIN', 'ADMIN_USER', 'BILLING_ADMIN', 'SUPPORT_AGENT');

-- CreateEnum
CREATE TYPE "PlatformAdminStatus" AS ENUM ('PENDING', 'ACTIVE', 'INACTIVE', 'LOCKED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "MfaType" AS ENUM ('TOTP', 'SMS', 'EMAIL');

-- CreateEnum
CREATE TYPE "DeviceType" AS ENUM ('DESKTOP', 'MOBILE', 'TABLET');

-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('PENDING', 'TRIAL', 'ACTIVE', 'SUSPENDED', 'INACTIVE', 'TERMINATED');

-- CreateEnum
CREATE TYPE "TimeFormat" AS ENUM ('TWELVE_HOUR', 'TWENTY_FOUR_HOUR');

-- CreateEnum
CREATE TYPE "SubdomainStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'RESERVED');

-- CreateEnum
CREATE TYPE "CustomDomainStatus" AS ENUM ('PENDING_VERIFICATION', 'DNS_VERIFICATION_FAILED', 'SSL_PENDING', 'SSL_FAILED', 'ACTIVE', 'SUSPENDED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "DnsVerificationType" AS ENUM ('CNAME', 'TXT');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'UNPAID', 'PAUSED');

-- CreateEnum
CREATE TYPE "BillingCycle" AS ENUM ('MONTHLY', 'QUARTERLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "PlanTier" AS ENUM ('STARTER', 'PROFESSIONAL', 'ENTERPRISE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "UsageMetric" AS ENUM ('ACTIVE_USERS', 'STORAGE_BYTES', 'API_CALLS', 'EMAILS_SENT', 'SMS_SENT', 'FILE_UPLOADS');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'CANCELED', 'REFUNDED', 'PARTIALLY_REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentMethodType" AS ENUM ('CARD', 'BANK_ACCOUNT', 'PAYPAL', 'OTHER');

-- CreateEnum
CREATE TYPE "AnnouncementType" AS ENUM ('INFO', 'WARNING', 'SUCCESS', 'ERROR', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "AnnouncementPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "TargetAudience" AS ENUM ('ALL', 'TENANTS_ONLY', 'PLATFORM_ADMINS_ONLY', 'SPECIFIC_TENANTS');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'WAITING_ON_CUSTOMER', 'WAITING_ON_SUPPORT', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "TicketPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "TicketCategory" AS ENUM ('BILLING', 'TECHNICAL', 'FEATURE_REQUEST', 'BUG_REPORT', 'ACCOUNT', 'GENERAL');

-- CreateEnum
CREATE TYPE "CreatedByType" AS ENUM ('PLATFORM_ADMIN', 'TENANT_USER');

-- CreateTable
CREATE TABLE "platform_admins" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "PlatformAdminRole" NOT NULL,
    "status" "PlatformAdminStatus" NOT NULL DEFAULT 'PENDING',
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "avatar" TEXT,
    "phone" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "language" TEXT NOT NULL DEFAULT 'en',
    "mfa_enabled" BOOLEAN NOT NULL DEFAULT false,
    "mfa_type" "MfaType",
    "mfa_secret" TEXT,
    "mfa_backup_codes" TEXT[],
    "password_changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "password_expires_at" TIMESTAMP(3),
    "login_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "allowed_ip_addresses" TEXT[],
    "last_login_at" TIMESTAMP(3),
    "last_activity_at" TIMESTAMP(3),
    "invited_by" TEXT,
    "invited_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "appearance_preferences" JSONB,

    CONSTRAINT "platform_admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_admin_sessions" (
    "id" TEXT NOT NULL,
    "admin_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "token_family" TEXT NOT NULL,
    "ip_address" TEXT NOT NULL,
    "user_agent" TEXT NOT NULL,
    "device_id" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_activity_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "platform_admin_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_login_history" (
    "id" TEXT NOT NULL,
    "admin_id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_address" TEXT NOT NULL,
    "user_agent" TEXT NOT NULL,
    "location" TEXT,
    "success" BOOLEAN NOT NULL,
    "failure_reason" TEXT,
    "mfa_used" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "platform_login_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trusted_devices" (
    "id" TEXT NOT NULL,
    "admin_id" TEXT NOT NULL,
    "device_name" TEXT NOT NULL,
    "device_type" "DeviceType" NOT NULL,
    "browser" TEXT NOT NULL,
    "os" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "last_used_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trusted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trusted_devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "admin_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "legal_name" TEXT,
    "logo" TEXT,
    "status" "TenantStatus" NOT NULL DEFAULT 'PENDING',
    "database_name" TEXT NOT NULL,
    "database_host" TEXT,
    "database_port" INTEGER,
    "database_pool_size" INTEGER NOT NULL DEFAULT 10,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "website" TEXT,
    "address_line_1" TEXT,
    "address_line_2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "postal_code" TEXT,
    "trial_ends_at" TIMESTAMP(3),
    "activated_at" TIMESTAMP(3),
    "suspended_at" TIMESTAMP(3),
    "terminated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "metadata" JSONB,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_settings" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "date_format" TEXT NOT NULL DEFAULT 'YYYY-MM-DD',
    "time_format" "TimeFormat" NOT NULL DEFAULT 'TWENTY_FOUR_HOUR',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "language" TEXT NOT NULL DEFAULT 'en',
    "fiscal_year_start" INTEGER NOT NULL DEFAULT 1,
    "working_days" INTEGER[] DEFAULT ARRAY[1, 2, 3, 4, 5]::INTEGER[],
    "work_start_time" TEXT NOT NULL DEFAULT '09:00',
    "work_end_time" TEXT NOT NULL DEFAULT '18:00',
    "break_start_time" TEXT,
    "break_end_time" TEXT,
    "module_employee" BOOLEAN NOT NULL DEFAULT true,
    "module_attendance" BOOLEAN NOT NULL DEFAULT true,
    "module_project" BOOLEAN NOT NULL DEFAULT true,
    "module_task" BOOLEAN NOT NULL DEFAULT true,
    "module_client" BOOLEAN NOT NULL DEFAULT true,
    "module_asset" BOOLEAN NOT NULL DEFAULT false,
    "module_hr_payroll" BOOLEAN NOT NULL DEFAULT false,
    "module_meeting" BOOLEAN NOT NULL DEFAULT true,
    "module_recruitment" BOOLEAN NOT NULL DEFAULT false,
    "module_resource" BOOLEAN NOT NULL DEFAULT false,
    "module_file" BOOLEAN NOT NULL DEFAULT true,
    "sso_enabled" BOOLEAN NOT NULL DEFAULT false,
    "mfa_required" BOOLEAN NOT NULL DEFAULT false,
    "ip_whitelist" BOOLEAN NOT NULL DEFAULT false,
    "audit_log_enabled" BOOLEAN NOT NULL DEFAULT true,
    "custom_fields" BOOLEAN NOT NULL DEFAULT false,
    "advanced_reporting" BOOLEAN NOT NULL DEFAULT false,
    "api_access" BOOLEAN NOT NULL DEFAULT false,
    "webhooks_enabled" BOOLEAN NOT NULL DEFAULT false,
    "primary_color" TEXT NOT NULL DEFAULT '#3B82F6',
    "secondary_color" TEXT NOT NULL DEFAULT '#1E40AF',
    "logo_url" TEXT,
    "favicon_url" TEXT,
    "custom_css" TEXT,
    "password_min_length" INTEGER NOT NULL DEFAULT 8,
    "password_require_uppercase" BOOLEAN NOT NULL DEFAULT true,
    "password_require_numbers" BOOLEAN NOT NULL DEFAULT true,
    "password_require_symbols" BOOLEAN NOT NULL DEFAULT false,
    "password_expiry_days" INTEGER,
    "session_timeout_minutes" INTEGER NOT NULL DEFAULT 60,
    "max_login_attempts" INTEGER NOT NULL DEFAULT 5,
    "lockout_duration_minutes" INTEGER NOT NULL DEFAULT 15,
    "allowed_ip_ranges" TEXT[],
    "integrations" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_subdomains" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "subdomain" TEXT NOT NULL,
    "status" "SubdomainStatus" NOT NULL DEFAULT 'PENDING',
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "ssl_certificate_id" TEXT,
    "verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_subdomains_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_domains" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "status" "CustomDomainStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "verification_type" "DnsVerificationType" NOT NULL DEFAULT 'CNAME',
    "verification_token" TEXT NOT NULL,
    "verified_at" TIMESTAMP(3),
    "ssl_certificate_id" TEXT,
    "ssl_expires_at" TIMESTAMP(3),
    "last_checked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_domains_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "billing_cycle" "BillingCycle" NOT NULL DEFAULT 'MONTHLY',
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "max_users" INTEGER NOT NULL,
    "max_storage" BIGINT NOT NULL,
    "max_projects" INTEGER,
    "max_clients" INTEGER,
    "current_period_start" TIMESTAMP(3) NOT NULL,
    "current_period_end" TIMESTAMP(3) NOT NULL,
    "trial_start" TIMESTAMP(3),
    "trial_end" TIMESTAMP(3),
    "canceled_at" TIMESTAMP(3),
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "stripe_customer_id" TEXT,
    "stripe_subscription_id" TEXT,
    "payment_method_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_plans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "tier" "PlanTier" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_public" BOOLEAN NOT NULL DEFAULT true,
    "monthly_price" DECIMAL(10,2) NOT NULL,
    "yearly_price" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "max_users" INTEGER NOT NULL,
    "max_storage" BIGINT NOT NULL,
    "max_projects" INTEGER,
    "max_clients" INTEGER,
    "features" JSONB NOT NULL,
    "stripe_price_id_monthly" TEXT,
    "stripe_price_id_yearly" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "subscription_id" TEXT,
    "invoice_number" TEXT NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "subtotal" DECIMAL(10,2) NOT NULL,
    "tax" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "discount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(10,2) NOT NULL,
    "amount_paid" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "amount_due" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "issue_date" TIMESTAMP(3) NOT NULL,
    "due_date" TIMESTAMP(3) NOT NULL,
    "paid_at" TIMESTAMP(3),
    "stripe_invoice_id" TEXT,
    "stripe_payment_intent_id" TEXT,
    "payment_method" TEXT,
    "line_items" JSONB NOT NULL,
    "notes" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_records" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "metric_id" TEXT NOT NULL,
    "metric" "UsageMetric",
    "quantity" BIGINT NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "unit_price" DECIMAL(10,4),
    "amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "invoiced" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usage_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "invoice_id" TEXT,
    "payment_method_id" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "stripe_payment_intent_id" TEXT,
    "stripe_charge_id" TEXT,
    "description" TEXT,
    "metadata" JSONB,
    "failure_reason" TEXT,
    "refunded_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "processed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_methods" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "subscription_id" TEXT,
    "type" "PaymentMethodType" NOT NULL DEFAULT 'CARD',
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "card_brand" TEXT,
    "card_last4" TEXT,
    "card_exp_month" INTEGER,
    "card_exp_year" INTEGER,
    "bank_name" TEXT,
    "bank_last4" TEXT,
    "stripe_payment_method_id" TEXT,
    "billing_name" TEXT,
    "billing_email" TEXT,
    "billing_address" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_audit_logs" (
    "id" TEXT NOT NULL,
    "admin_id" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resource_id" TEXT,
    "description" TEXT,
    "metadata" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announcements" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" "AnnouncementType" NOT NULL DEFAULT 'INFO',
    "priority" "AnnouncementPriority" NOT NULL DEFAULT 'NORMAL',
    "target_audience" "TargetAudience" NOT NULL DEFAULT 'ALL',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "starts_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ends_at" TIMESTAMP(3),
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_tickets" (
    "id" TEXT NOT NULL,
    "ticket_number" TEXT NOT NULL,
    "tenant_id" TEXT,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "TicketPriority" NOT NULL DEFAULT 'MEDIUM',
    "category" "TicketCategory" NOT NULL,
    "assigned_to" TEXT,
    "resolved_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),
    "created_by" TEXT NOT NULL,
    "created_by_type" "CreatedByType" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_messages" (
    "id" TEXT NOT NULL,
    "ticket_id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "sender_type" "CreatedByType" NOT NULL,
    "message" TEXT NOT NULL,
    "attachments" TEXT[],
    "is_internal" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "general" JSONB NOT NULL DEFAULT '{}',
    "email" JSONB NOT NULL DEFAULT '{}',
    "security" JSONB NOT NULL DEFAULT '{}',
    "billing" JSONB NOT NULL DEFAULT '{}',
    "integrations" JSONB NOT NULL DEFAULT '{}',
    "maintenance" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "platform_admins_email_key" ON "platform_admins"("email");

-- CreateIndex
CREATE UNIQUE INDEX "platform_admins_username_key" ON "platform_admins"("username");

-- CreateIndex
CREATE INDEX "platform_admins_email_idx" ON "platform_admins"("email");

-- CreateIndex
CREATE INDEX "platform_admins_status_idx" ON "platform_admins"("status");

-- CreateIndex
CREATE INDEX "platform_admins_role_idx" ON "platform_admins"("role");

-- CreateIndex
CREATE UNIQUE INDEX "platform_admin_sessions_token_hash_key" ON "platform_admin_sessions"("token_hash");

-- CreateIndex
CREATE INDEX "platform_admin_sessions_admin_id_idx" ON "platform_admin_sessions"("admin_id");

-- CreateIndex
CREATE INDEX "platform_admin_sessions_token_hash_idx" ON "platform_admin_sessions"("token_hash");

-- CreateIndex
CREATE INDEX "platform_admin_sessions_expires_at_idx" ON "platform_admin_sessions"("expires_at");

-- CreateIndex
CREATE INDEX "platform_login_history_admin_id_idx" ON "platform_login_history"("admin_id");

-- CreateIndex
CREATE INDEX "platform_login_history_timestamp_idx" ON "platform_login_history"("timestamp");

-- CreateIndex
CREATE INDEX "trusted_devices_admin_id_idx" ON "trusted_devices"("admin_id");

-- CreateIndex
CREATE UNIQUE INDEX "trusted_devices_admin_id_fingerprint_key" ON "trusted_devices"("admin_id", "fingerprint");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_key" ON "password_reset_tokens"("token");

-- CreateIndex
CREATE INDEX "password_reset_tokens_token_idx" ON "password_reset_tokens"("token");

-- CreateIndex
CREATE INDEX "password_reset_tokens_admin_id_idx" ON "password_reset_tokens"("admin_id");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_database_name_key" ON "tenants"("database_name");

-- CreateIndex
CREATE INDEX "tenants_slug_idx" ON "tenants"("slug");

-- CreateIndex
CREATE INDEX "tenants_status_idx" ON "tenants"("status");

-- CreateIndex
CREATE INDEX "tenants_email_idx" ON "tenants"("email");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_settings_tenant_id_key" ON "tenant_settings"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_subdomains_subdomain_key" ON "tenant_subdomains"("subdomain");

-- CreateIndex
CREATE INDEX "tenant_subdomains_tenant_id_idx" ON "tenant_subdomains"("tenant_id");

-- CreateIndex
CREATE INDEX "tenant_subdomains_subdomain_idx" ON "tenant_subdomains"("subdomain");

-- CreateIndex
CREATE UNIQUE INDEX "custom_domains_domain_key" ON "custom_domains"("domain");

-- CreateIndex
CREATE INDEX "custom_domains_tenant_id_idx" ON "custom_domains"("tenant_id");

-- CreateIndex
CREATE INDEX "custom_domains_domain_idx" ON "custom_domains"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_tenant_id_key" ON "subscriptions"("tenant_id");

-- CreateIndex
CREATE INDEX "subscriptions_tenant_id_idx" ON "subscriptions"("tenant_id");

-- CreateIndex
CREATE INDEX "subscriptions_status_idx" ON "subscriptions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_plans_slug_key" ON "subscription_plans"("slug");

-- CreateIndex
CREATE INDEX "subscription_plans_slug_idx" ON "subscription_plans"("slug");

-- CreateIndex
CREATE INDEX "subscription_plans_tier_idx" ON "subscription_plans"("tier");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoice_number_key" ON "invoices"("invoice_number");

-- CreateIndex
CREATE INDEX "invoices_tenant_id_idx" ON "invoices"("tenant_id");

-- CreateIndex
CREATE INDEX "invoices_subscription_id_idx" ON "invoices"("subscription_id");

-- CreateIndex
CREATE INDEX "invoices_status_idx" ON "invoices"("status");

-- CreateIndex
CREATE INDEX "invoices_invoice_number_idx" ON "invoices"("invoice_number");

-- CreateIndex
CREATE INDEX "usage_records_tenant_id_idx" ON "usage_records"("tenant_id");

-- CreateIndex
CREATE INDEX "usage_records_metric_idx" ON "usage_records"("metric");

-- CreateIndex
CREATE INDEX "usage_records_metric_id_idx" ON "usage_records"("metric_id");

-- CreateIndex
CREATE INDEX "usage_records_recorded_at_idx" ON "usage_records"("recorded_at");

-- CreateIndex
CREATE UNIQUE INDEX "usage_records_tenant_id_metric_id_period_start_period_end_key" ON "usage_records"("tenant_id", "metric_id", "period_start", "period_end");

-- CreateIndex
CREATE UNIQUE INDEX "payments_stripe_payment_intent_id_key" ON "payments"("stripe_payment_intent_id");

-- CreateIndex
CREATE INDEX "payments_tenant_id_idx" ON "payments"("tenant_id");

-- CreateIndex
CREATE INDEX "payments_invoice_id_idx" ON "payments"("invoice_id");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "payment_methods_stripe_payment_method_id_key" ON "payment_methods"("stripe_payment_method_id");

-- CreateIndex
CREATE INDEX "payment_methods_tenant_id_idx" ON "payment_methods"("tenant_id");

-- CreateIndex
CREATE INDEX "payment_methods_subscription_id_idx" ON "payment_methods"("subscription_id");

-- CreateIndex
CREATE INDEX "payment_methods_is_default_idx" ON "payment_methods"("is_default");

-- CreateIndex
CREATE INDEX "platform_audit_logs_admin_id_idx" ON "platform_audit_logs"("admin_id");

-- CreateIndex
CREATE INDEX "platform_audit_logs_action_idx" ON "platform_audit_logs"("action");

-- CreateIndex
CREATE INDEX "platform_audit_logs_resource_idx" ON "platform_audit_logs"("resource");

-- CreateIndex
CREATE INDEX "platform_audit_logs_timestamp_idx" ON "platform_audit_logs"("timestamp");

-- CreateIndex
CREATE INDEX "announcements_is_active_idx" ON "announcements"("is_active");

-- CreateIndex
CREATE INDEX "announcements_starts_at_ends_at_idx" ON "announcements"("starts_at", "ends_at");

-- CreateIndex
CREATE UNIQUE INDEX "support_tickets_ticket_number_key" ON "support_tickets"("ticket_number");

-- CreateIndex
CREATE INDEX "support_tickets_tenant_id_idx" ON "support_tickets"("tenant_id");

-- CreateIndex
CREATE INDEX "support_tickets_status_idx" ON "support_tickets"("status");

-- CreateIndex
CREATE INDEX "support_tickets_assigned_to_idx" ON "support_tickets"("assigned_to");

-- CreateIndex
CREATE INDEX "support_tickets_ticket_number_idx" ON "support_tickets"("ticket_number");

-- CreateIndex
CREATE INDEX "ticket_messages_ticket_id_idx" ON "ticket_messages"("ticket_id");

-- AddForeignKey
ALTER TABLE "platform_admins" ADD CONSTRAINT "platform_admins_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "platform_admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_admin_sessions" ADD CONSTRAINT "platform_admin_sessions_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "platform_admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_login_history" ADD CONSTRAINT "platform_login_history_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "platform_admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trusted_devices" ADD CONSTRAINT "trusted_devices_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "platform_admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "platform_admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_settings" ADD CONSTRAINT "tenant_settings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_subdomains" ADD CONSTRAINT "tenant_subdomains_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_domains" ADD CONSTRAINT "custom_domains_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_records" ADD CONSTRAINT "usage_records_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_payment_method_id_fkey" FOREIGN KEY ("payment_method_id") REFERENCES "payment_methods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_audit_logs" ADD CONSTRAINT "platform_audit_logs_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "platform_admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_messages" ADD CONSTRAINT "ticket_messages_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

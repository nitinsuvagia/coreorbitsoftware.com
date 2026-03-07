-- Add missing columns to tenant_settings table

-- Weekly Working Hours
ALTER TABLE "tenant_settings" ADD COLUMN "weekly_working_hours" JSONB;

-- Leave Calculation Settings
ALTER TABLE "tenant_settings" ADD COLUMN "exclude_holidays_from_leave" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "tenant_settings" ADD COLUMN "exclude_weekends_from_leave" BOOLEAN NOT NULL DEFAULT true;

-- Holiday Types Configuration
ALTER TABLE "tenant_settings" ADD COLUMN "enabled_holiday_types" JSONB DEFAULT '{"public": true, "optional": true, "restricted": true}';
ALTER TABLE "tenant_settings" ADD COLUMN "optional_holiday_quota" INTEGER NOT NULL DEFAULT 2;

-- Integration Settings
ALTER TABLE "tenant_settings" ADD COLUMN "integration_settings" JSONB DEFAULT '{}';

-- Email Settings (SMTP)
ALTER TABLE "tenant_settings" ADD COLUMN "smtp_host" TEXT;
ALTER TABLE "tenant_settings" ADD COLUMN "smtp_port" INTEGER NOT NULL DEFAULT 587;
ALTER TABLE "tenant_settings" ADD COLUMN "smtp_username" TEXT;
ALTER TABLE "tenant_settings" ADD COLUMN "smtp_password" TEXT;
ALTER TABLE "tenant_settings" ADD COLUMN "smtp_encryption" TEXT NOT NULL DEFAULT 'tls';
ALTER TABLE "tenant_settings" ADD COLUMN "smtp_from_email" TEXT;
ALTER TABLE "tenant_settings" ADD COLUMN "smtp_from_name" TEXT;
ALTER TABLE "tenant_settings" ADD COLUMN "email_configured" BOOLEAN NOT NULL DEFAULT false;

-- Employee Code Settings
ALTER TABLE "tenant_settings" ADD COLUMN "employee_code_auto_generate" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "tenant_settings" ADD COLUMN "employee_code_prefix" TEXT NOT NULL DEFAULT 'EMP';
ALTER TABLE "tenant_settings" ADD COLUMN "employee_code_include_year" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "tenant_settings" ADD COLUMN "employee_code_year_seq_digits" INTEGER NOT NULL DEFAULT 5;
ALTER TABLE "tenant_settings" ADD COLUMN "employee_code_total_seq_digits" INTEGER NOT NULL DEFAULT 5;
ALTER TABLE "tenant_settings" ADD COLUMN "employee_code_separator" TEXT NOT NULL DEFAULT '-';

-- Setup Checklist
ALTER TABLE "tenant_settings" ADD COLUMN "setup_checklist_dismissed" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "tenant_settings" ADD COLUMN "setup_checklist_dismissed_at" TIMESTAMP(3);

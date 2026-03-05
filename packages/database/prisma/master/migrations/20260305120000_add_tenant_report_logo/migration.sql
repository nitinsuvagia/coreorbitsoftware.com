-- Add report_logo column to tenants table
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "report_logo" TEXT;

-- Add grace_minutes_late column to tenant_settings
-- Controls how many minutes after workStartTime an employee can check in without being marked late
ALTER TABLE "tenant_settings" ADD COLUMN IF NOT EXISTS "grace_minutes_late" INTEGER NOT NULL DEFAULT 90;

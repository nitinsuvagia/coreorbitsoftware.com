-- Add jurisdiction-agnostic tax identifier (PAN/SSN/etc) to employees
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "tax_id" TEXT;

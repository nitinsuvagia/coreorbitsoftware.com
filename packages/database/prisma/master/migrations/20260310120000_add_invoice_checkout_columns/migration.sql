-- Add missing columns to invoices table
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "stripe_checkout_session_id" TEXT;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "card_brand" TEXT;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "card_last4" TEXT;

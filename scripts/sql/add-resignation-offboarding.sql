-- =============================================================================
-- RESIGNATION & OFFBOARDING TABLES
-- =============================================================================
-- Purpose: Tables for managing the resignation workflow and offboarding checklist
-- Flow: HR activates → Employee submits → HR reviews & finalizes → Notice period → Offboarding → Deactivation
-- =============================================================================

-- Ensure uuid support (gen_random_uuid is built-in for PG13+, but enable extension as fallback)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Resignation Status Enum
DO $$ BEGIN
  CREATE TYPE "ResignationStatus" AS ENUM (
    'ACTIVATED',          -- HR has activated resignation for the employee
    'SUBMITTED',          -- Employee has submitted resignation
    'UNDER_REVIEW',       -- HR is reviewing/discussing with PM/TL/Employee
    'APPROVED',           -- HR has approved and finalized last working day
    'WITHDRAWN',          -- Employee withdrew resignation (before approval)
    'CANCELLED'           -- HR cancelled the resignation
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Offboarding Status Enum
DO $$ BEGIN
  CREATE TYPE "OffboardingStatus" AS ENUM (
    'NOT_STARTED',
    'IN_PROGRESS',
    'COMPLETED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Offboarding Checklist Item Status Enum
DO $$ BEGIN
  CREATE TYPE "ChecklistItemStatus" AS ENUM (
    'PENDING',
    'COMPLETED',
    'NOT_APPLICABLE'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================================
-- RESIGNATIONS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS "resignations" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "employee_id" UUID NOT NULL REFERENCES "employees"("id") ON DELETE CASCADE,
    
    -- Status tracking
    "status" "ResignationStatus" NOT NULL DEFAULT 'ACTIVATED',
    
    -- HR Activation
    "activated_by" UUID NOT NULL,                       -- HR/Admin who activated
    "activated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "activation_notes" TEXT,                             -- HR notes when activating
    
    -- Employee Submission
    "submitted_at" TIMESTAMPTZ,
    "resignation_reason" TEXT,                           -- Employee's reason
    "personal_reason" TEXT,                              -- Additional personal reason (optional)
    "resignation_letter_url" TEXT,                       -- Uploaded resignation letter
    
    -- HR Review & Finalization
    "reviewed_by" UUID,                                  -- HR who reviewed
    "reviewed_at" TIMESTAMPTZ,
    "hr_summary" TEXT,                                   -- HR summary from discussion with PM/TL/Employee
    "hr_notes" TEXT,                                     -- Additional HR notes
    "last_working_date" DATE,                            -- Finalized last working day
    "notice_period_days" INTEGER,                        -- Notice period in days
    "notice_period_start_date" DATE,                     -- Notice period start
    
    -- Withdrawal/Cancellation
    "withdrawn_at" TIMESTAMPTZ,
    "withdrawal_reason" TEXT,
    "cancelled_at" TIMESTAMPTZ,
    "cancelled_by" UUID,
    "cancellation_reason" TEXT,
    
    -- Metadata
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS "idx_resignations_employee_id" ON "resignations"("employee_id");
CREATE INDEX IF NOT EXISTS "idx_resignations_status" ON "resignations"("status");
CREATE INDEX IF NOT EXISTS "idx_resignations_activated_at" ON "resignations"("activated_at");

-- =============================================================================
-- OFFBOARDING TABLE (linked to resignation)
-- =============================================================================
CREATE TABLE IF NOT EXISTS "offboardings" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "employee_id" UUID NOT NULL REFERENCES "employees"("id") ON DELETE CASCADE,
    "resignation_id" UUID REFERENCES "resignations"("id") ON DELETE SET NULL,
    
    -- Status
    "status" "OffboardingStatus" NOT NULL DEFAULT 'NOT_STARTED',
    
    -- Initiated by HR
    "started_by" UUID,
    "started_at" TIMESTAMPTZ,
    
    -- Completion
    "completed_by" UUID,
    "completed_at" TIMESTAMPTZ,
    "completion_notes" TEXT,
    
    -- Metadata
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_offboardings_employee_id" ON "offboardings"("employee_id");
CREATE INDEX IF NOT EXISTS "idx_offboardings_resignation_id" ON "offboardings"("resignation_id");
CREATE INDEX IF NOT EXISTS "idx_offboardings_status" ON "offboardings"("status");

-- =============================================================================
-- OFFBOARDING CHECKLIST ITEMS
-- =============================================================================
CREATE TABLE IF NOT EXISTS "offboarding_checklist_items" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "offboarding_id" UUID NOT NULL REFERENCES "offboardings"("id") ON DELETE CASCADE,
    
    -- Item details
    "category" VARCHAR(100) NOT NULL,             -- e.g., 'IT', 'HR', 'Finance', 'Admin', 'Knowledge Transfer'
    "title" VARCHAR(500) NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    
    -- Status
    "status" "ChecklistItemStatus" NOT NULL DEFAULT 'PENDING',
    "completed_by" UUID,
    "completed_at" TIMESTAMPTZ,
    "notes" TEXT,
    
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_offboarding_checklist_offboarding_id" ON "offboarding_checklist_items"("offboarding_id");

-- =============================================================================
-- DEFAULT OFFBOARDING CHECKLIST TEMPLATE
-- (Used to seed default items when offboarding is started)
-- =============================================================================
CREATE TABLE IF NOT EXISTS "offboarding_checklist_templates" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "category" VARCHAR(100) NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- SEED DEFAULT CHECKLIST TEMPLATE ITEMS
-- =============================================================================
INSERT INTO "offboarding_checklist_templates" ("category", "title", "description", "sort_order") VALUES
  -- IT & Systems
  ('IT', 'Revoke system access & credentials', 'Disable all system logins, VPN access, email accounts', 1),
  ('IT', 'Collect laptop/computer', 'Collect company-issued laptop, charger, and peripherals', 2),
  ('IT', 'Collect other IT equipment', 'Mouse, keyboard, headset, monitor, USB drives, etc.', 3),
  ('IT', 'Remove from software licenses', 'Remove from Slack, GitHub, Jira, Figma, etc.', 4),
  ('IT', 'Backup & transfer data', 'Ensure all work files are transferred to team/manager', 5),
  
  -- HR & Admin
  ('HR', 'Conduct exit interview', 'Schedule and complete exit interview', 6),
  ('HR', 'Process final settlement', 'Calculate and process pending salary, leave encashment, bonus', 7),
  ('HR', 'Collect ID card & access badge', 'Collect office ID card, access badges, keys', 8),
  ('HR', 'Update employee records', 'Mark employee status, update exit date in system', 9),
  ('HR', 'Issue experience/relieving letter', 'Prepare and issue relieving letter and experience certificate', 10),
  
  -- Finance
  ('Finance', 'Clear pending expense claims', 'Process any pending reimbursements or expense claims', 11),
  ('Finance', 'Recover company advances', 'Recover any pending salary advances or loans', 12),
  ('Finance', 'Stop payroll processing', 'Remove from payroll effective after last working date', 13),
  
  -- Knowledge Transfer
  ('Knowledge Transfer', 'Document handover notes', 'Employee documents all ongoing work and responsibilities', 14),
  ('Knowledge Transfer', 'Complete knowledge transfer sessions', 'Conduct KT sessions with successor/team', 15),
  ('Knowledge Transfer', 'Transfer project ownership', 'Reassign all owned projects, tasks, and responsibilities', 16),
  
  -- Admin
  ('Admin', 'Collect company property', 'Books, stationery, uniforms, or any other company property', 17),
  ('Admin', 'Remove from office directories', 'Update org chart, internal directories, emergency contacts', 18),
  ('Admin', 'Remove from insurance/benefits', 'Update group insurance, health benefits enrollment', 19)
ON CONFLICT DO NOTHING;

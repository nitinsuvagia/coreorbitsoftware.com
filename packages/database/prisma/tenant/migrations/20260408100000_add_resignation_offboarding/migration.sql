-- CreateEnum
CREATE TYPE "ResignationStatus" AS ENUM ('ACTIVATED', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'WITHDRAWN', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OffboardingStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ChecklistItemStatus" AS ENUM ('PENDING', 'COMPLETED', 'NOT_APPLICABLE');

-- CreateTable
CREATE TABLE "resignations" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "status" "ResignationStatus" NOT NULL DEFAULT 'ACTIVATED',
    "activated_by" TEXT,
    "activated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activation_notes" TEXT,
    "submitted_at" TIMESTAMP(3),
    "resignation_reason" TEXT,
    "personal_reason" TEXT,
    "resignation_letter_url" TEXT,
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "hr_summary" TEXT,
    "hr_notes" TEXT,
    "last_working_date" DATE,
    "notice_period_days" INTEGER,
    "notice_period_start_date" DATE,
    "withdrawn_at" TIMESTAMP(3),
    "withdrawal_reason" TEXT,
    "cancelled_at" TIMESTAMP(3),
    "cancelled_by" TEXT,
    "cancellation_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resignations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offboardings" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "resignation_id" TEXT,
    "status" "OffboardingStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "started_by" TEXT,
    "started_at" TIMESTAMP(3),
    "completed_by" TEXT,
    "completed_at" TIMESTAMP(3),
    "completion_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "offboardings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offboarding_checklist_items" (
    "id" TEXT NOT NULL,
    "offboarding_id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "status" "ChecklistItemStatus" NOT NULL DEFAULT 'PENDING',
    "completed_by" TEXT,
    "completed_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "offboarding_checklist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offboarding_checklist_templates" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "offboarding_checklist_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "resignations_employee_id_idx" ON "resignations"("employee_id");
CREATE INDEX "resignations_status_idx" ON "resignations"("status");
CREATE INDEX "resignations_activated_at_idx" ON "resignations"("activated_at");
CREATE INDEX "resignations_last_working_date_idx" ON "resignations"("last_working_date");

-- CreateIndex
CREATE INDEX "offboardings_employee_id_idx" ON "offboardings"("employee_id");
CREATE INDEX "offboardings_resignation_id_idx" ON "offboardings"("resignation_id");
CREATE INDEX "offboardings_status_idx" ON "offboardings"("status");

-- CreateIndex
CREATE INDEX "offboarding_checklist_items_offboarding_id_idx" ON "offboarding_checklist_items"("offboarding_id");
CREATE INDEX "offboarding_checklist_items_status_idx" ON "offboarding_checklist_items"("status");

-- AddForeignKey
ALTER TABLE "resignations" ADD CONSTRAINT "resignations_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offboardings" ADD CONSTRAINT "offboardings_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "offboardings" ADD CONSTRAINT "offboardings_resignation_id_fkey" FOREIGN KEY ("resignation_id") REFERENCES "resignations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offboarding_checklist_items" ADD CONSTRAINT "offboarding_checklist_items_offboarding_id_fkey" FOREIGN KEY ("offboarding_id") REFERENCES "offboardings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed default offboarding checklist templates
INSERT INTO "offboarding_checklist_templates" ("id", "category", "title", "description", "sort_order", "created_at", "updated_at") VALUES
  (gen_random_uuid(), 'IT', 'Revoke system access & SSO', 'Disable all application and SSO accounts', 1, NOW(), NOW()),
  (gen_random_uuid(), 'IT', 'Collect laptop / equipment', 'Retrieve company-issued hardware', 2, NOW(), NOW()),
  (gen_random_uuid(), 'IT', 'Revoke email access', 'Disable or forward email account', 3, NOW(), NOW()),
  (gen_random_uuid(), 'IT', 'Remove from Slack / Teams channels', 'Remove from all communication channels', 4, NOW(), NOW()),
  (gen_random_uuid(), 'IT', 'Revoke VPN & remote access', 'Disable VPN credentials and remote access', 5, NOW(), NOW()),
  (gen_random_uuid(), 'IT', 'Transfer file ownership', 'Transfer Google Drive / OneDrive files to manager', 6, NOW(), NOW()),
  (gen_random_uuid(), 'HR', 'Conduct exit interview', 'Schedule and complete exit interview', 7, NOW(), NOW()),
  (gen_random_uuid(), 'HR', 'Process final settlement', 'Calculate and process final pay, leave encashment', 8, NOW(), NOW()),
  (gen_random_uuid(), 'HR', 'Issue experience / relieving letter', 'Prepare and provide official letters', 9, NOW(), NOW()),
  (gen_random_uuid(), 'HR', 'Update employee records', 'Mark employee as exited in HRMS', 10, NOW(), NOW()),
  (gen_random_uuid(), 'HR', 'Recover ID card & access badges', 'Collect all physical ID and access cards', 11, NOW(), NOW()),
  (gen_random_uuid(), 'Finance', 'Settle expense claims', 'Process any pending reimbursements', 12, NOW(), NOW()),
  (gen_random_uuid(), 'Finance', 'Recover company credit card', 'Cancel and collect company credit cards', 13, NOW(), NOW()),
  (gen_random_uuid(), 'Finance', 'Process final payroll', 'Run final payroll with all adjustments', 14, NOW(), NOW()),
  (gen_random_uuid(), 'Knowledge Transfer', 'Document ongoing projects', 'Create handover documentation for all active work', 15, NOW(), NOW()),
  (gen_random_uuid(), 'Knowledge Transfer', 'Transfer project responsibilities', 'Formally hand over projects to designated successors', 16, NOW(), NOW()),
  (gen_random_uuid(), 'Knowledge Transfer', 'Share credentials & access info', 'Transfer any shared account credentials securely', 17, NOW(), NOW()),
  (gen_random_uuid(), 'Admin', 'Return parking pass / keys', 'Collect all office keys, parking passes, etc.', 18, NOW(), NOW()),
  (gen_random_uuid(), 'Admin', 'Notify relevant teams', 'Inform security, reception, and facilities', 19, NOW(), NOW());

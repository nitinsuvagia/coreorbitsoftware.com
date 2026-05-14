-- CreateEnum
CREATE TYPE "SalaryRunStatus" AS ENUM ('DRAFT', 'PROCESSING', 'FINALIZED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SalaryItemStatus" AS ENUM ('PENDING', 'PROCESSED', 'ERROR', 'PAID');

-- CreateTable
CREATE TABLE "salary_runs" (
    "id" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "period_label" TEXT NOT NULL,
    "status" "SalaryRunStatus" NOT NULL DEFAULT 'DRAFT',
    "total_working_days" INTEGER NOT NULL,
    "total_holidays" INTEGER NOT NULL,
    "source_file_id" TEXT,
    "source_file_key" TEXT,
    "source_file_name" TEXT,
    "imported_row_count" INTEGER NOT NULL DEFAULT 0,
    "failed_row_count" INTEGER NOT NULL DEFAULT 0,
    "import_errors" JSONB,
    "total_gross_earnings" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "total_gross_deductions" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "total_net_payable" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "created_by_id" TEXT NOT NULL,
    "finalized_at" TIMESTAMP(3),
    "finalized_by_id" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "salary_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "salary_run_items" (
    "id" TEXT NOT NULL,
    "salary_run_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "leave_taken" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "total_salary" DECIMAL(12,2) NOT NULL,
    "basic" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "dearness_allowance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "house_rent_allowance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "conveyance_allowance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "education_allowance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "cost_of_living_allowance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "medical_allowance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "food_canteen_allowance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "appraisal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "gross_earnings" DECIMAL(12,2) NOT NULL,
    "professional_tax" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "income_tax" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "meal_voucher" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "variable_deduction" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "gross_deductions" DECIMAL(12,2) NOT NULL,
    "net_payable" DECIMAL(12,2) NOT NULL,
    "extra_earnings" JSONB,
    "extra_deductions" JSONB,
    "raw_row" JSONB,
    "payslip_file_id" TEXT,
    "payslip_file_key" TEXT,
    "payslip_generated_at" TIMESTAMP(3),
    "status" "SalaryItemStatus" NOT NULL DEFAULT 'PENDING',
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "salary_run_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "salary_runs_year_month_idx" ON "salary_runs"("year", "month");

-- CreateIndex
CREATE INDEX "salary_runs_status_idx" ON "salary_runs"("status");

-- CreateIndex
CREATE INDEX "salary_run_items_employee_id_idx" ON "salary_run_items"("employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "salary_run_items_salary_run_id_employee_id_key" ON "salary_run_items"("salary_run_id", "employee_id");

-- AddForeignKey
ALTER TABLE "salary_run_items" ADD CONSTRAINT "salary_run_items_salary_run_id_fkey" FOREIGN KEY ("salary_run_id") REFERENCES "salary_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_run_items" ADD CONSTRAINT "salary_run_items_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Partial unique index: only one non-cancelled, non-deleted run per (month, year)
CREATE UNIQUE INDEX "salary_runs_period_active_unique"
    ON "salary_runs" ("month", "year")
    WHERE "status" <> 'CANCELLED' AND "deleted_at" IS NULL;

/**
 * Payroll / Salary Run Service
 *
 * Owns the lifecycle of a SalaryRun:
 *  - DRAFT  → import Excel → items materialized (PENDING)
 *  - DRAFT  → generate-payslips → items go to PROCESSED (or ERROR)
 *  - DRAFT  → finalize → status = FINALIZED (visible to employees)
 *  - any    → cancel → status = CANCELLED (allows recreating a run for that period)
 */

import { PrismaClient } from '.prisma/tenant-client';
import { logger } from '../../utils/logger';
import { getEventBus } from '@oms/event-bus';
import { parseSalaryExcel, ParsedSalaryRow } from './payroll-excel.service';
import { generatePayslipPdf } from './payslip-pdf.service';
import {
  resolveEmployeePayslipFolder,
  resolvePayrollRunsFolder,
  uploadFileToFolder,
} from './payroll-document.client';
import { getTenantProfile } from './tenant-profile.client';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const ALLOWED_EMPLOYEE_STATUSES = ['ACTIVE', 'ON_LEAVE', 'PROBATION', 'NOTICE_PERIOD'] as const;

export interface CreateRunInput {
  month: number;
  year: number;
  totalWorkingDays: number;
  totalHolidays: number;
  notes?: string | null;
}

function buildPeriodLabel(month: number, year: number): string {
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

/**
 * Compute default working days / holidays for a given month using the tenant's
 * working-day configuration + Holiday table. "Holidays" here means total non-working
 * days (weekends + listed holidays), as requested.
 */
export async function computePeriodDefaults(
  prisma: PrismaClient,
  month: number,
  year: number,
  workingDays: number[] = [1, 2, 3, 4, 5],
): Promise<{ totalWorkingDays: number; totalHolidays: number }> {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0)); // last day of month
  const daysInMonth = end.getUTCDate();

  const holidaysInMonth = await prisma.holiday.findMany({
    where: { date: { gte: start, lte: end } },
    select: { date: true },
  });
  const holidayDateSet = new Set(holidaysInMonth.map((h: any) => h.date.toISOString().slice(0, 10)));

  let working = 0;
  let nonWorking = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const day = new Date(Date.UTC(year, month - 1, d));
    const dow = day.getUTCDay(); // 0 = Sun
    const iso = day.toISOString().slice(0, 10);
    const isWeekend = !workingDays.includes(dow);
    const isHoliday = holidayDateSet.has(iso);
    if (isWeekend || isHoliday) nonWorking++;
    else working++;
  }
  return { totalWorkingDays: working, totalHolidays: nonWorking };
}

export async function listRuns(prisma: PrismaClient, filters: { year?: number; status?: string }) {
  return prisma.salaryRun.findMany({
    where: {
      deletedAt: null,
      ...(filters.year ? { year: filters.year } : {}),
      ...(filters.status ? { status: filters.status as any } : {}),
    },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
    include: { _count: { select: { items: true } } },
  });
}

export async function getRunWithItems(prisma: PrismaClient, runId: string) {
  return prisma.salaryRun.findFirst({
    where: { id: runId, deletedAt: null },
    include: {
      items: {
        include: {
          employee: {
            select: {
              id: true,
              employeeCode: true,
              displayName: true,
              firstName: true,
              lastName: true,
              email: true,
              taxId: true,
              status: true,
              designation: { select: { name: true } },
              department: { select: { name: true } },
            },
          },
        },
        orderBy: { employee: { employeeCode: 'asc' } },
      },
    },
  });
}

export async function createRun(prisma: PrismaClient, userId: string, input: CreateRunInput) {
  // Reject if a non-cancelled run already exists for this period.
  const existing = await prisma.salaryRun.findFirst({
    where: {
      month: input.month,
      year: input.year,
      deletedAt: null,
      status: { not: 'CANCELLED' },
    },
  });
  if (existing) {
    throw Object.assign(new Error('A salary run already exists for this period'), { code: 'DUPLICATE_PERIOD' });
  }

  return prisma.salaryRun.create({
    data: {
      month: input.month,
      year: input.year,
      periodLabel: buildPeriodLabel(input.month, input.year),
      totalWorkingDays: input.totalWorkingDays,
      totalHolidays: input.totalHolidays,
      notes: input.notes ?? null,
      createdById: userId,
    },
  });
}

export async function cancelRun(prisma: PrismaClient, runId: string) {
  const run = await prisma.salaryRun.findFirst({ where: { id: runId, deletedAt: null } });
  if (!run) throw Object.assign(new Error('Salary run not found'), { code: 'NOT_FOUND' });
  if (run.status === 'FINALIZED') {
    throw Object.assign(new Error('Finalized runs cannot be cancelled'), { code: 'FORBIDDEN' });
  }
  return prisma.salaryRun.update({ where: { id: runId }, data: { status: 'CANCELLED' } });
}

interface ImportSummary {
  importedRowCount: number;
  failedRowCount: number;
  errors: { rowNumber: number; field?: string; employeeCode?: string; message: string }[];
}

/**
 * Parse the Excel buffer, validate against employees, and upsert SalaryRunItem rows.
 * Does NOT generate PDFs. Pure data import.
 */
export async function importExcel(
  prisma: PrismaClient,
  runId: string,
  fileBuffer: Buffer,
  fileName: string,
  uploaderUserId: string,
  tenantSlug: string,
): Promise<ImportSummary> {
  const run = await prisma.salaryRun.findFirst({ where: { id: runId, deletedAt: null } });
  if (!run) throw Object.assign(new Error('Salary run not found'), { code: 'NOT_FOUND' });
  if (run.status === 'FINALIZED' || run.status === 'CANCELLED') {
    throw Object.assign(new Error('Cannot import into a finalized or cancelled run'), { code: 'FORBIDDEN' });
  }

  const parsed = parseSalaryExcel(fileBuffer);
  const errors: ImportSummary['errors'] = parsed.errors.map((e) => ({ ...e }));

  // Resolve employee codes -> employee records (must be in allowed statuses)
  const codes = parsed.rows.map((r) => r.employeeCode);
  const employees = await prisma.employee.findMany({
    where: { employeeCode: { in: codes }, deletedAt: null },
    select: { id: true, employeeCode: true, status: true },
  });
  const empByCode = new Map(employees.map((e: any) => [e.employeeCode, e]));

  const validRows: { row: ParsedSalaryRow; employeeId: string }[] = [];
  for (const row of parsed.rows) {
    const emp = empByCode.get(row.employeeCode);
    if (!emp) {
      errors.push({ rowNumber: row.rowNumber, field: 'employee_code', employeeCode: row.employeeCode, message: 'Employee not found' });
      continue;
    }
    if (!(ALLOWED_EMPLOYEE_STATUSES as readonly string[]).includes(emp.status)) {
      errors.push({ rowNumber: row.rowNumber, field: 'employee_status', employeeCode: row.employeeCode, message: `Employee status ${emp.status} is not eligible for payroll` });
      continue;
    }
    validRows.push({ row, employeeId: emp.id });
  }

  // Upload the source Excel to document-service
  let sourceFileRef: { fileId: string; key: string } | null = null;
  try {
    const folderId = await resolvePayrollRunsFolder({ tenantSlug, userId: uploaderUserId, year: run.year });
    const uploaded = await uploadFileToFolder({
      tenantSlug,
      userId: uploaderUserId,
      folderId,
      filename: fileName,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      content: fileBuffer,
      entityType: 'SALARY_RUN',
      entityId: runId,
    });
    sourceFileRef = { fileId: uploaded.fileId, key: uploaded.key };
  } catch (err: any) {
    logger.warn({ err: err.message, runId }, 'Failed to archive source Excel; continuing with import');
  }

  // Transactional upsert of items + run metadata
  await prisma.$transaction(async (tx: any) => {
    // Clear old items for this run (full replace semantics on re-import)
    await tx.salaryRunItem.deleteMany({ where: { salaryRunId: runId } });

    if (validRows.length > 0) {
      await tx.salaryRunItem.createMany({
        data: validRows.map(({ row, employeeId }) => ({
          salaryRunId: runId,
          employeeId,
          leaveTaken: row.leaveTaken,
          totalSalary: row.totalSalary,
          basic: row.basic,
          dearnessAllowance: row.dearnessAllowance,
          houseRentAllowance: row.houseRentAllowance,
          conveyanceAllowance: row.conveyanceAllowance,
          educationAllowance: row.educationAllowance,
          costOfLivingAllowance: row.costOfLivingAllowance,
          medicalAllowance: row.medicalAllowance,
          foodCanteenAllowance: row.foodCanteenAllowance,
          appraisal: row.appraisal,
          grossEarnings: row.grossEarnings,
          professionalTax: row.professionalTax,
          incomeTax: row.incomeTax,
          mealVoucher: row.mealVoucher,
          variableDeduction: row.variableDeduction,
          grossDeductions: row.grossDeductions,
          netPayable: row.netPayable,
          rawRow: row.rawRow as any,
          status: 'PENDING',
        })),
      });
    }

    // Aggregate totals
    const agg = await tx.salaryRunItem.aggregate({
      where: { salaryRunId: runId },
      _sum: { grossEarnings: true, grossDeductions: true, netPayable: true },
    });

    await tx.salaryRun.update({
      where: { id: runId },
      data: {
        status: 'DRAFT',
        sourceFileName: fileName,
        sourceFileId: sourceFileRef?.fileId ?? null,
        sourceFileKey: sourceFileRef?.key ?? null,
        importedRowCount: validRows.length,
        failedRowCount: errors.length,
        importErrors: errors as any,
        totalGrossEarnings: agg._sum.grossEarnings ?? 0,
        totalGrossDeductions: agg._sum.grossDeductions ?? 0,
        totalNetPayable: agg._sum.netPayable ?? 0,
      },
    });
  });

  return {
    importedRowCount: validRows.length,
    failedRowCount: errors.length,
    errors,
  };
}

/**
 * Generate and upload payslip PDFs for every item in the run.
 * Marks each item PROCESSED on success, ERROR on failure.
 */
export async function generatePayslips(
  prisma: PrismaClient,
  runId: string,
  uploaderUserId: string,
  tenantSlug: string,
): Promise<{ generated: number; failed: number }> {
  const run = await prisma.salaryRun.findFirst({
    where: { id: runId, deletedAt: null },
    include: {
      items: {
        include: {
          employee: {
            select: {
              id: true,
              employeeCode: true,
              displayName: true,
              firstName: true,
              lastName: true,
              taxId: true,
              designation: { select: { name: true } },
              department: { select: { name: true } },
            },
          },
        },
      },
    },
  });
  if (!run) throw Object.assign(new Error('Salary run not found'), { code: 'NOT_FOUND' });
  if (run.status === 'CANCELLED') {
    throw Object.assign(new Error('Cannot generate payslips for a cancelled run'), { code: 'FORBIDDEN' });
  }

  const tenant = await getTenantProfile(tenantSlug);

  let generated = 0;
  let failed = 0;

  for (const item of run.items) {
    try {
      const employeeName = `${item.employee.firstName} ${item.employee.lastName}`.trim();
      const folderId = await resolveEmployeePayslipFolder({
        tenantSlug,
        userId: uploaderUserId,
        employeeId: item.employee.id,
        employeeCode: item.employee.employeeCode,
        employeeName,
        year: run.year,
      });

      const pdfBuffer = await generatePayslipPdf({
        tenant,
        employee: {
          employeeCode: item.employee.employeeCode,
          displayName: item.employee.displayName,
          designation: item.employee.designation?.name ?? null,
          department: item.employee.department?.name ?? null,
          taxId: item.employee.taxId ?? null,
        },
        period: {
          month: run.month,
          year: run.year,
          periodLabel: run.periodLabel,
          totalWorkingDays: run.totalWorkingDays,
          totalHolidays: run.totalHolidays,
        },
        amounts: {
          leaveTaken: String(item.leaveTaken),
          totalSalary: String(item.totalSalary),
          basic: String(item.basic),
          dearnessAllowance: String(item.dearnessAllowance),
          houseRentAllowance: String(item.houseRentAllowance),
          conveyanceAllowance: String(item.conveyanceAllowance),
          educationAllowance: String(item.educationAllowance),
          costOfLivingAllowance: String(item.costOfLivingAllowance),
          medicalAllowance: String(item.medicalAllowance),
          foodCanteenAllowance: String(item.foodCanteenAllowance),
          appraisal: String(item.appraisal),
          grossEarnings: String(item.grossEarnings),
          professionalTax: String(item.professionalTax),
          incomeTax: String(item.incomeTax),
          mealVoucher: String(item.mealVoucher),
          variableDeduction: String(item.variableDeduction),
          grossDeductions: String(item.grossDeductions),
          netPayable: String(item.netPayable),
        },
      });

      const filename = `Payslip-${run.year}-${String(run.month).padStart(2, '0')}-${item.employee.employeeCode}.pdf`;
      const uploaded = await uploadFileToFolder({
        tenantSlug,
        userId: uploaderUserId,
        folderId,
        filename,
        mimeType: 'application/pdf',
        content: pdfBuffer,
        entityType: 'PAYSLIP',
        entityId: item.id,
      });

      await prisma.salaryRunItem.update({
        where: { id: item.id },
        data: {
          payslipFileId: uploaded.fileId,
          payslipFileKey: uploaded.key,
          payslipGeneratedAt: new Date(),
          status: 'PROCESSED',
          errorMessage: null,
        },
      });
      generated++;
    } catch (err: any) {
      failed++;
      logger.error({ err: err.message, runId, itemId: item.id }, 'Failed to generate payslip');
      await prisma.salaryRunItem.update({
        where: { id: item.id },
        data: { status: 'ERROR', errorMessage: err.message?.slice(0, 500) ?? 'Unknown error' },
      });
    }
  }

  return { generated, failed };
}

export async function finalizeRun(prisma: PrismaClient, runId: string, userId: string, tenantSlug: string) {
  const run = await prisma.salaryRun.findFirst({
    where: { id: runId, deletedAt: null },
    include: { items: { select: { id: true, status: true, payslipFileId: true, employeeId: true, netPayable: true } } },
  });
  if (!run) throw Object.assign(new Error('Salary run not found'), { code: 'NOT_FOUND' });
  if (run.status === 'FINALIZED') {
    throw Object.assign(new Error('Run is already finalized'), { code: 'CONFLICT' });
  }
  if (run.status === 'CANCELLED') {
    throw Object.assign(new Error('Cancelled runs cannot be finalized'), { code: 'FORBIDDEN' });
  }
  if (run.items.length === 0) {
    throw Object.assign(new Error('Cannot finalize an empty run'), { code: 'INVALID_STATE' });
  }
  const missingPdf = run.items.find((i: any) => !i.payslipFileId);
  if (missingPdf) {
    throw Object.assign(new Error('All items must have generated payslips before finalizing'), { code: 'INVALID_STATE' });
  }

  const updated = await prisma.salaryRun.update({
    where: { id: runId },
    data: { status: 'FINALIZED', finalizedAt: new Date(), finalizedById: userId },
  });

  // Publish notification event (best-effort)
  try {
    const employees = await prisma.employee.findMany({
      where: { id: { in: run.items.map((i: any) => i.employeeId) } },
      select: { id: true, firstName: true, lastName: true },
    });
    const empMap = new Map(employees.map((e: any) => [e.id, `${e.firstName} ${e.lastName}`.trim()]));

    let companyName: string | undefined;
    try {
      const profile = await getTenantProfile(tenantSlug);
      companyName = profile?.name;
    } catch {
      /* non-fatal */
    }

    const eventBus = getEventBus('employee-service');
    await eventBus.publishToTopic('payroll-run-finalized' as any, 'payroll.run_finalized', {
      runId: run.id,
      month: run.month,
      year: run.year,
      periodLabel: run.periodLabel,
      companyName,
      finalizedById: userId,
      items: run.items.map((i: any) => ({
        employeeId: i.employeeId,
        employeeName: empMap.get(i.employeeId) ?? '',
        netPayable: Number(i.netPayable),
        payslipFileId: i.payslipFileId,
      })),
    }, { tenantId: '', tenantSlug });
  } catch (err: any) {
    logger.warn({ err: err?.message, runId }, 'Failed to publish payroll-run-finalized event');
  }

  return updated;
}

export async function listEmployeePayslips(prisma: PrismaClient, employeeId: string) {
  const items = await prisma.salaryRunItem.findMany({
    where: {
      employeeId,
      payslipFileId: { not: null },
      salaryRun: { status: 'FINALIZED', deletedAt: null },
    },
    include: {
      salaryRun: { select: { id: true, month: true, year: true, periodLabel: true, finalizedAt: true } },
    },
    orderBy: [{ salaryRun: { year: 'desc' } }, { salaryRun: { month: 'desc' } }],
  });
  return items.map((i: any) => ({
    id: i.id,
    runId: i.salaryRunId,
    month: i.salaryRun.month,
    year: i.salaryRun.year,
    periodLabel: i.salaryRun.periodLabel,
    finalizedAt: i.salaryRun.finalizedAt,
    netPayable: i.netPayable,
    payslipFileId: i.payslipFileId,
    payslipFileKey: i.payslipFileKey,
    payslipGeneratedAt: i.payslipGeneratedAt,
  }));
}

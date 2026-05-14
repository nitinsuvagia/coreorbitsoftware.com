import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, api } from '@/lib/api/client';

// ============================================================================
// Types
// ============================================================================

export type SalaryRunStatus = 'DRAFT' | 'PROCESSING' | 'FINALIZED' | 'CANCELLED';
export type SalaryItemStatus = 'PENDING' | 'PROCESSED' | 'ERROR' | 'PAID';

export interface SalaryRun {
  id: string;
  month: number;
  year: number;
  periodLabel: string;
  status: SalaryRunStatus;
  totalWorkingDays: number;
  totalHolidays: number;
  sourceFileId: string | null;
  sourceFileKey: string | null;
  sourceFileName: string | null;
  importedRowCount: number;
  failedRowCount: number;
  importErrors: { rowNumber: number; field?: string; employeeCode?: string; message: string }[] | null;
  totalGrossEarnings: string;
  totalGrossDeductions: string;
  totalNetPayable: string;
  createdById: string;
  finalizedAt: string | null;
  finalizedById: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { items: number };
}

export interface SalaryRunItem {
  id: string;
  salaryRunId: string;
  employeeId: string;
  leaveTaken: string;
  totalSalary: string;
  basic: string;
  dearnessAllowance: string;
  houseRentAllowance: string;
  conveyanceAllowance: string;
  educationAllowance: string;
  costOfLivingAllowance: string;
  medicalAllowance: string;
  foodCanteenAllowance: string;
  appraisal: string;
  grossEarnings: string;
  professionalTax: string;
  incomeTax: string;
  mealVoucher: string;
  variableDeduction: string;
  grossDeductions: string;
  netPayable: string;
  status: SalaryItemStatus;
  errorMessage: string | null;
  payslipFileId: string | null;
  payslipFileKey: string | null;
  payslipGeneratedAt: string | null;
  employee: {
    id: string;
    employeeCode: string;
    displayName: string;
    firstName: string;
    lastName: string;
    email: string;
    taxId: string | null;
    status: string;
    designation: { name: string } | null;
    department: { name: string } | null;
  };
}

export interface SalaryRunDetail extends SalaryRun {
  items: SalaryRunItem[];
}

export interface EmployeePayslip {
  id: string;
  runId: string;
  month: number;
  year: number;
  periodLabel: string;
  finalizedAt: string;
  netPayable: string;
  payslipFileId: string;
  payslipFileKey: string;
  payslipGeneratedAt: string;
}

export interface ImportSummary {
  importedRowCount: number;
  failedRowCount: number;
  errors: { rowNumber: number; field?: string; employeeCode?: string; message: string }[];
}

// ============================================================================
// Queries
// ============================================================================

export function useSalaryRuns(filters?: { year?: number; status?: SalaryRunStatus }) {
  return useQuery({
    queryKey: ['salary-runs', filters],
    queryFn: () => get<SalaryRun[]>('/api/v1/payroll/runs', filters),
  });
}

export function useSalaryRun(runId: string | undefined) {
  return useQuery({
    queryKey: ['salary-run', runId],
    queryFn: () => get<SalaryRunDetail>(`/api/v1/payroll/runs/${runId}`),
    enabled: !!runId,
  });
}

export function usePeriodDefaults(month?: number, year?: number) {
  return useQuery({
    queryKey: ['payroll-period-defaults', month, year],
    queryFn: () => get<{ totalWorkingDays: number; totalHolidays: number }>('/api/v1/payroll/period-defaults', { month, year }),
    enabled: !!month && !!year,
  });
}

export function useEmployeePayslips(employeeId: string | undefined) {
  return useQuery({
    queryKey: ['employee-payslips', employeeId],
    queryFn: () => get<EmployeePayslip[]>(`/api/v1/payroll/employees/${employeeId}/payslips`),
    enabled: !!employeeId,
  });
}

// ============================================================================
// Mutations
// ============================================================================

export function useCreateSalaryRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { month: number; year: number; totalWorkingDays: number; totalHolidays: number; notes?: string }) =>
      post<SalaryRun>('/api/v1/payroll/runs', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['salary-runs'] }),
  });
}

export function useImportSalaryRun(runId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File): Promise<ImportSummary> => {
      const form = new FormData();
      form.append('file', file);
      const res = await api.post(`/api/v1/payroll/runs/${runId}/import`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data.data as ImportSummary;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['salary-run', runId] });
      qc.invalidateQueries({ queryKey: ['salary-runs'] });
    },
  });
}

export function useGeneratePayslips(runId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => post<{ generated: number; failed: number }>(`/api/v1/payroll/runs/${runId}/generate-payslips`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['salary-run', runId] }),
  });
}

export function useFinalizeSalaryRun(runId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => post<SalaryRun>(`/api/v1/payroll/runs/${runId}/finalize`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['salary-run', runId] });
      qc.invalidateQueries({ queryKey: ['salary-runs'] });
    },
  });
}

export function useCancelSalaryRun(runId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => post<SalaryRun>(`/api/v1/payroll/runs/${runId}/cancel`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['salary-run', runId] });
      qc.invalidateQueries({ queryKey: ['salary-runs'] });
    },
  });
}

/**
 * Fetches a short-lived public download URL for the payslip file from the
 * document service, then opens it in a new tab. The `/files/:id/download`
 * endpoint returns `{ url }` (a `/api/documents/files/download?key=...`
 * public URL) — it does NOT stream the file directly, so we cannot use it
 * as an `<a href>`.
 */
export async function openPayslip(fileId: string): Promise<void> {
  const result = await get<{ url: string }>(`/api/documents/files/${fileId}/download`, { inline: 'true' });
  if (!result?.url) {
    throw new Error('Download URL was not returned by the document service');
  }
  // Resolve to an absolute URL on the current origin (URL is a relative path).
  const absolute = result.url.startsWith('http') ? result.url : `${window.location.origin}${result.url}`;
  window.open(absolute, '_blank', 'noopener,noreferrer');
}

export function downloadTemplateUrl(): string {
  return '/api/v1/payroll/template.xlsx';
}

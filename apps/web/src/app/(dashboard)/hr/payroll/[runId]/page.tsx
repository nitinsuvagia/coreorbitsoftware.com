'use client';

import { useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  useSalaryRun,
  useImportSalaryRun,
  useGeneratePayslips,
  useFinalizeSalaryRun,
  useCancelSalaryRun,
  openPayslip,
  SalaryRunStatus,
} from '@/hooks/use-payroll';
import { useOrgFormatters } from '@/hooks/use-org-settings';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Upload,
  Download,
  FileText,
  Loader2,
  ChevronLeft,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Lock,
  Ban,
} from 'lucide-react';

const STATUS_VARIANTS: Record<SalaryRunStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  DRAFT: 'secondary',
  PROCESSING: 'outline',
  FINALIZED: 'default',
  CANCELLED: 'destructive',
};

export default function SalaryRunDetailPage() {
  const { runId } = useParams<{ runId: string }>();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const runQuery = useSalaryRun(runId);
  const importMutation = useImportSalaryRun(runId);
  const generateMutation = useGeneratePayslips(runId);
  const finalizeMutation = useFinalizeSalaryRun(runId);
  const cancelMutation = useCancelSalaryRun(runId);
  const { formatCurrency } = useOrgFormatters();

  const [confirmFinalize, setConfirmFinalize] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const run = runQuery.data;
  const isFinalized = run?.status === 'FINALIZED';
  const isCancelled = run?.status === 'CANCELLED';
  const isLocked = isFinalized || isCancelled;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const summary = await importMutation.mutateAsync(file);
      const msg = `Imported ${summary.importedRowCount} rows` + (summary.failedRowCount ? `, ${summary.failedRowCount} failed` : '');
      summary.failedRowCount ? toast.warning(msg) : toast.success(msg);
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? 'Import failed');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleGenerate = async () => {
    try {
      const result = await generateMutation.mutateAsync();
      const msg = `Generated ${result.generated} payslips` + (result.failed ? `, ${result.failed} failed` : '');
      result.failed ? toast.warning(msg) : toast.success(msg);
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? 'Generation failed');
    }
  };

  const handleFinalize = async () => {
    try {
      await finalizeMutation.mutateAsync();
      toast.success('Salary run finalized');
      setConfirmFinalize(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? 'Finalize failed');
    }
  };

  const handleCancel = async () => {
    try {
      await cancelMutation.mutateAsync();
      toast.success('Salary run cancelled');
      setConfirmCancel(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? 'Cancel failed');
    }
  };

  if (runQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!run) {
    return (
      <div className="py-20 text-center text-muted-foreground">
        Salary run not found.{' '}
        <Link href="/hr/payroll" className="text-primary underline">Back to list</Link>
      </div>
    );
  }

  const hasPayslips = run.items.some((i) => !!i.payslipFileId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/hr/payroll">
            <Button variant="ghost" size="icon"><ChevronLeft className="h-5 w-5" /></Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{run.periodLabel}</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant={STATUS_VARIANTS[run.status]}>{run.status}</Badge>
              <span>·</span>
              <span>Working days: {run.totalWorkingDays}</span>
              <span>·</span>
              <span>Holidays: {run.totalHolidays}</span>
              {run.finalizedAt && <><span>·</span><span>Finalized {new Date(run.finalizedAt).toLocaleDateString()}</span></>}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {!isLocked && (
            <>
              <input ref={fileInputRef} type="file" accept=".xlsx,.xls" hidden onChange={handleFileSelect} />
              <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={importMutation.isPending}>
                {importMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                Import Excel
              </Button>
              <Button variant="outline" onClick={handleGenerate} disabled={generateMutation.isPending || run.items.length === 0}>
                {generateMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                Generate Payslips
              </Button>
              <Button variant="destructive" onClick={() => setConfirmCancel(true)}>
                <Ban className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button onClick={() => setConfirmFinalize(true)} disabled={!hasPayslips}>
                <Lock className="mr-2 h-4 w-4" />
                Finalize
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardDescription>Gross Salary</CardDescription><CardTitle>{formatCurrency(Number(run.totalGrossEarnings))}</CardTitle></CardHeader>
        </Card>
        <Card>
          <CardHeader><CardDescription>Gross Deductions</CardDescription><CardTitle>{formatCurrency(Number(run.totalGrossDeductions))}</CardTitle></CardHeader>
        </Card>
        <Card>
          <CardHeader><CardDescription>Net Payable</CardDescription><CardTitle>{formatCurrency(Number(run.totalNetPayable))}</CardTitle></CardHeader>
        </Card>
      </div>

      {run.importErrors && run.importErrors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-700">
              <AlertTriangle className="h-4 w-4" />
              Import warnings ({run.importErrors.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-48 overflow-y-auto text-sm">
              <table className="w-full">
                <thead className="text-left text-muted-foreground">
                  <tr><th className="pb-2">Row</th><th>Employee Code</th><th>Field</th><th>Message</th></tr>
                </thead>
                <tbody>
                  {run.importErrors.map((e, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="py-1">{e.rowNumber}</td>
                      <td>{e.employeeCode ?? '-'}</td>
                      <td>{e.field ?? '-'}</td>
                      <td>{e.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Items ({run.items.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="relative overflow-x-auto">
            <table className="w-full text-sm border-separate border-spacing-0">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="sticky left-0 z-20 bg-muted px-3 py-2 border-b min-w-[140px]">Code</th>
                  <th className="sticky left-[140px] z-20 bg-muted px-3 py-2 border-b border-r min-w-[180px]">Name</th>
                  <th className="bg-muted/50 px-3 py-2 border-b">Designation</th>
                  <th className="bg-muted/50 px-3 py-2 border-b text-right">Total Salary</th>
                  <th className="bg-muted/50 px-3 py-2 border-b text-right">Basic</th>
                  <th className="bg-muted/50 px-3 py-2 border-b text-right">DA</th>
                  <th className="bg-muted/50 px-3 py-2 border-b text-right">HRA</th>
                  <th className="bg-muted/50 px-3 py-2 border-b text-right">CA</th>
                  <th className="bg-muted/50 px-3 py-2 border-b text-right">EA</th>
                  <th className="bg-muted/50 px-3 py-2 border-b text-right">COL</th>
                  <th className="bg-muted/50 px-3 py-2 border-b text-right">MA</th>
                  <th className="bg-muted/50 px-3 py-2 border-b text-right">Food</th>
                  <th className="bg-muted/50 px-3 py-2 border-b text-right">Appraisal</th>
                  <th className="bg-muted/50 px-3 py-2 border-b text-right font-semibold">Gross Salary</th>
                  <th className="bg-muted/50 px-3 py-2 border-b text-right">PT</th>
                  <th className="bg-muted/50 px-3 py-2 border-b text-right">TDS</th>
                  <th className="bg-muted/50 px-3 py-2 border-b text-right">ESIC</th>
                  <th className="bg-muted/50 px-3 py-2 border-b text-right">Var. Ded.</th>
                  <th className="bg-muted/50 px-3 py-2 border-b text-right font-semibold">Gross Deductions</th>
                  <th className="bg-muted/50 px-3 py-2 border-b text-right">Leave</th>
                  <th className="bg-muted/50 px-3 py-2 border-b">Status</th>
                  <th className="bg-muted/50 px-3 py-2 border-b">Payslip</th>
                  <th className="sticky right-0 z-20 bg-muted px-3 py-2 border-b border-l text-right min-w-[150px] font-semibold">Actual Salary</th>
                </tr>
              </thead>
              <tbody>
                {run.items.map((item, idx) => {
                  const rowBg = 'bg-background';
                  return (
                  <tr key={item.id} className={rowBg}>
                    <td className={`sticky left-0 z-10 ${rowBg} px-3 py-2 border-b font-mono text-xs whitespace-nowrap`}>{item.employee.employeeCode}</td>
                    <td className={`sticky left-[140px] z-10 ${rowBg} px-3 py-2 border-b border-r whitespace-nowrap`}>{item.employee.displayName}</td>
                    <td className="px-3 py-2 border-b text-muted-foreground whitespace-nowrap">{item.employee.designation?.name ?? '-'}</td>
                    <td className="px-3 py-2 border-b text-right tabular-nums whitespace-nowrap">{formatCurrency(Number(item.totalSalary))}</td>
                    <td className="px-3 py-2 border-b text-right tabular-nums whitespace-nowrap">{formatCurrency(Number(item.basic))}</td>
                    <td className="px-3 py-2 border-b text-right tabular-nums whitespace-nowrap">{formatCurrency(Number(item.dearnessAllowance))}</td>
                    <td className="px-3 py-2 border-b text-right tabular-nums whitespace-nowrap">{formatCurrency(Number(item.houseRentAllowance))}</td>
                    <td className="px-3 py-2 border-b text-right tabular-nums whitespace-nowrap">{formatCurrency(Number(item.conveyanceAllowance))}</td>
                    <td className="px-3 py-2 border-b text-right tabular-nums whitespace-nowrap">{formatCurrency(Number(item.educationAllowance))}</td>
                    <td className="px-3 py-2 border-b text-right tabular-nums whitespace-nowrap">{formatCurrency(Number(item.costOfLivingAllowance))}</td>
                    <td className="px-3 py-2 border-b text-right tabular-nums whitespace-nowrap">{formatCurrency(Number(item.medicalAllowance))}</td>
                    <td className="px-3 py-2 border-b text-right tabular-nums whitespace-nowrap">{formatCurrency(Number(item.foodCanteenAllowance))}</td>
                    <td className="px-3 py-2 border-b text-right tabular-nums whitespace-nowrap">{formatCurrency(Number(item.appraisal))}</td>
                    <td className="px-3 py-2 border-b text-right tabular-nums font-semibold whitespace-nowrap">{formatCurrency(Number(item.grossEarnings))}</td>
                    <td className="px-3 py-2 border-b text-right tabular-nums whitespace-nowrap">{formatCurrency(Number(item.professionalTax))}</td>
                    <td className="px-3 py-2 border-b text-right tabular-nums whitespace-nowrap">{formatCurrency(Number(item.incomeTax))}</td>
                    <td className="px-3 py-2 border-b text-right tabular-nums whitespace-nowrap">{formatCurrency(Number(item.mealVoucher))}</td>
                    <td className="px-3 py-2 border-b text-right tabular-nums whitespace-nowrap">{formatCurrency(Number(item.variableDeduction))}</td>
                    <td className="px-3 py-2 border-b text-right tabular-nums font-semibold whitespace-nowrap">{formatCurrency(Number(item.grossDeductions))}</td>
                    <td className="px-3 py-2 border-b text-right tabular-nums whitespace-nowrap">{Number(item.leaveTaken)}</td>
                    <td className="px-3 py-2 border-b whitespace-nowrap">
                      {item.status === 'PROCESSED' && <Badge variant="default"><CheckCircle2 className="mr-1 h-3 w-3" />Processed</Badge>}
                      {item.status === 'PENDING' && <Badge variant="secondary">Pending</Badge>}
                      {item.status === 'ERROR' && <Badge variant="destructive" title={item.errorMessage ?? undefined}><XCircle className="mr-1 h-3 w-3" />Error</Badge>}
                      {item.status === 'PAID' && <Badge variant="default">Paid</Badge>}
                    </td>
                    <td className="px-3 py-2 border-b whitespace-nowrap">
                      {item.payslipFileId ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            openPayslip(item.payslipFileId!).catch((err) =>
                              toast.error(err?.message || 'Failed to download payslip')
                            )
                          }
                        >
                          <Download className="h-3 w-3" />
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className={`sticky right-0 z-10 ${rowBg} px-3 py-2 border-b border-l text-right tabular-nums font-semibold whitespace-nowrap`}>{formatCurrency(Number(item.netPayable))}</td>
                  </tr>
                  );
                })}
                {run.items.length === 0 && (
                  <tr><td colSpan={23} className="py-10 text-center text-muted-foreground">No items yet. Import an Excel file to populate.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Finalize confirm */}
      <Dialog open={confirmFinalize} onOpenChange={setConfirmFinalize}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Finalize salary run?</DialogTitle>
            <DialogDescription>
              This will lock the run. Employees will be notified and payslips will become visible in their profiles. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmFinalize(false)}>Cancel</Button>
            <Button onClick={handleFinalize} disabled={finalizeMutation.isPending}>
              {finalizeMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Finalize
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel confirm */}
      <Dialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel salary run?</DialogTitle>
            <DialogDescription>
              The run will be marked CANCELLED. You can create a new run for the same period afterwards.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmCancel(false)}>Keep</Button>
            <Button variant="destructive" onClick={handleCancel} disabled={cancelMutation.isPending}>
              {cancelMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Cancel run
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

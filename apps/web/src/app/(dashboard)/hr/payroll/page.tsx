'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  useSalaryRuns,
  useCreateSalaryRun,
  usePeriodDefaults,
  downloadTemplateUrl,
  SalaryRunStatus,
} from '@/hooks/use-payroll';
import { useOrgFormatters } from '@/hooks/use-org-settings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Download, Plus, Loader2, FileSpreadsheet, ArrowRight } from 'lucide-react';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const STATUS_VARIANTS: Record<SalaryRunStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  DRAFT: 'secondary',
  PROCESSING: 'outline',
  FINALIZED: 'default',
  CANCELLED: 'destructive',
};

export default function PayrollListPage() {
  const router = useRouter();
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [yearFilter, setYearFilter] = useState<number | undefined>(currentYear);
  const [statusFilter, setStatusFilter] = useState<SalaryRunStatus | undefined>();
  const [createOpen, setCreateOpen] = useState(false);

  // New-run form state
  const [newMonth, setNewMonth] = useState(currentMonth);
  const [newYear, setNewYear] = useState(currentYear);
  const [newWorkingDays, setNewWorkingDays] = useState<number | ''>('');
  const [newHolidays, setNewHolidays] = useState<number | ''>('');
  const [newNotes, setNewNotes] = useState('');

  const runsQuery = useSalaryRuns({ year: yearFilter, status: statusFilter });
  const defaultsQuery = usePeriodDefaults(createOpen ? newMonth : undefined, createOpen ? newYear : undefined);
  const createMutation = useCreateSalaryRun();
  const { formatCurrency } = useOrgFormatters();

  // Auto-fill defaults when modal opens or month/year changes
  useMemo(() => {
    if (defaultsQuery.data) {
      if (newWorkingDays === '') setNewWorkingDays(defaultsQuery.data.totalWorkingDays);
      if (newHolidays === '') setNewHolidays(defaultsQuery.data.totalHolidays);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultsQuery.data]);

  const years = useMemo(() => {
    const arr: number[] = [];
    for (let y = currentYear + 1; y >= currentYear - 4; y--) arr.push(y);
    return arr;
  }, [currentYear]);

  const handleCreate = async () => {
    if (newWorkingDays === '' || newHolidays === '') {
      toast.error('Working days and holidays are required');
      return;
    }
    try {
      const run = await createMutation.mutateAsync({
        month: newMonth,
        year: newYear,
        totalWorkingDays: Number(newWorkingDays),
        totalHolidays: Number(newHolidays),
        notes: newNotes || undefined,
      });
      toast.success(`Salary run for ${MONTH_NAMES[newMonth - 1]} ${newYear} created`);
      setCreateOpen(false);
      router.push(`/hr/payroll/${run.id}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? 'Failed to create salary run');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Salary Runs</h1>
          <p className="text-muted-foreground">Monthly payroll processing</p>
        </div>
        <div className="flex gap-2">
          <a href={downloadTemplateUrl()} download>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Template
            </Button>
          </a>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Salary Run
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Select value={String(yearFilter ?? '')} onValueChange={(v) => setYearFilter(v ? Number(v) : undefined)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter ?? 'ALL'} onValueChange={(v) => setStatusFilter(v === 'ALL' ? undefined : (v as SalaryRunStatus))}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="FINALIZED">Finalized</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {runsQuery.isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : runsQuery.data && runsQuery.data.length > 0 ? (
            <div className="divide-y rounded-md border">
              {runsQuery.data.map((run) => (
                <Link
                  key={run.id}
                  href={`/hr/payroll/${run.id}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="font-medium">{run.periodLabel}</div>
                      <div className="text-sm text-muted-foreground">
                        {run._count?.items ?? 0} employees · Working days: {run.totalWorkingDays} · Holidays: {run.totalHolidays}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="font-semibold">{formatCurrency(Number(run.totalNetPayable))}</div>
                      <div className="text-xs text-muted-foreground">Net payable</div>
                    </div>
                    <Badge variant={STATUS_VARIANTS[run.status]}>{run.status}</Badge>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              No salary runs for the selected filters.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={(o) => { setCreateOpen(o); if (!o) { setNewWorkingDays(''); setNewHolidays(''); setNewNotes(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Salary Run</DialogTitle>
            <DialogDescription>
              Holidays = total non-working days (weekends + public holidays). Defaults are computed from your tenant calendar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Month</Label>
                <Select value={String(newMonth)} onValueChange={(v) => { setNewMonth(Number(v)); setNewWorkingDays(''); setNewHolidays(''); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MONTH_NAMES.map((m, i) => (
                      <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Year</Label>
                <Select value={String(newYear)} onValueChange={(v) => { setNewYear(Number(v)); setNewWorkingDays(''); setNewHolidays(''); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {years.map((y) => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Total Working Days</Label>
                <Input
                  type="number"
                  min={0}
                  max={31}
                  value={newWorkingDays}
                  onChange={(e) => setNewWorkingDays(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder={defaultsQuery.data ? String(defaultsQuery.data.totalWorkingDays) : '...'}
                />
              </div>
              <div>
                <Label>Total Holidays (incl. weekends)</Label>
                <Input
                  type="number"
                  min={0}
                  max={31}
                  value={newHolidays}
                  onChange={(e) => setNewHolidays(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder={defaultsQuery.data ? String(defaultsQuery.data.totalHolidays) : '...'}
                />
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={newNotes} onChange={(e) => setNewNotes(e.target.value)} placeholder="Optional notes for this run" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

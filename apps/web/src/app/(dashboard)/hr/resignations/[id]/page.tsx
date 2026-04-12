'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  useResignation,
  useSubmitResignation,
  useApproveResignation,
  useWithdrawResignation,
  useCancelResignation,
  useResignationOffboarding,
  useStartOffboarding,
  useUpdateChecklistItem,
  useAddChecklistItem,
  useCompleteOffboarding,
  ResignationStatus,
  Offboarding,
  ChecklistItem,
} from '@/hooks/use-resignation';
import { usePermissions } from '@/hooks/use-permissions';
import { useAuth } from '@/lib/auth/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { getInitials, cn } from '@/lib/utils';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  FileText,
  XCircle,
  AlertCircle,
  Calendar,
  User,
  Building,
  Briefcase,
  Loader2,
  UserMinus,
  ClipboardCheck,
  ClipboardList,
  Plus,
  Ban,
  Undo2,
  Send,
  Check,
  Minus,
} from 'lucide-react';
import Link from 'next/link';
import { format, differenceInDays, isPast, isToday } from 'date-fns';

// Status config
const STATUS_CONFIG: Record<ResignationStatus, { label: string; color: string; icon: typeof Clock }> = {
  ACTIVATED: { label: 'Activated - Awaiting Employee Submission', color: 'bg-blue-100 text-blue-800', icon: AlertCircle },
  SUBMITTED: { label: 'Submitted - Awaiting HR Review', color: 'bg-yellow-100 text-yellow-800', icon: FileText },
  UNDER_REVIEW: { label: 'Under Review by HR', color: 'bg-orange-100 text-orange-800', icon: Clock },
  APPROVED: { label: 'Approved - Notice Period', color: 'bg-red-100 text-red-800', icon: CheckCircle2 },
  WITHDRAWN: { label: 'Withdrawn by Employee', color: 'bg-gray-100 text-gray-800', icon: XCircle },
  CANCELLED: { label: 'Cancelled by HR', color: 'bg-gray-100 text-gray-800', icon: Ban },
};

export default function ResignationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const resignationId = params.id as string;
  const { isAdmin, hasAnyRole } = usePermissions();
  const { user } = useAuth();
  const isHR = hasAnyRole('hr_admin', 'hr_manager', 'tenant_admin');
  const isPM = hasAnyRole('project_manager');

  const { data: resignation, isLoading, refetch } = useResignation(resignationId);
  const { data: offboarding, refetch: refetchOffboarding } = useResignationOffboarding(resignationId);

  // Check if this is the logged-in employee's own resignation
  const isOwnResignation = !!user?.employeeRecordId && user.employeeRecordId === (resignation as any)?.employee_id;

  // Dialog states
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [offboardingConfirmOpen, setOffboardingConfirmOpen] = useState(false);
  const [completeConfirmOpen, setCompleteConfirmOpen] = useState(false);
  const [addItemDialogOpen, setAddItemDialogOpen] = useState(false);

  // Form state
  const [resignationReason, setResignationReason] = useState('');
  const [personalReason, setPersonalReason] = useState('');
  const [hrSummary, setHrSummary] = useState('');
  const [hrNotes, setHrNotes] = useState('');
  const [lastWorkingDate, setLastWorkingDate] = useState('');
  const [withdrawalReason, setWithdrawalReason] = useState('');
  const [cancellationReason, setCancellationReason] = useState('');
  const [completionNotes, setCompletionNotes] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('');
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemDescription, setNewItemDescription] = useState('');

  // Mutations
  const submitMutation = useSubmitResignation();
  const approveMutation = useApproveResignation();
  const withdrawMutation = useWithdrawResignation();
  const cancelMutation = useCancelResignation();
  const startOffboardingMutation = useStartOffboarding();
  const updateChecklistMutation = useUpdateChecklistItem();
  const addChecklistMutation = useAddChecklistItem();
  const completeOffboardingMutation = useCompleteOffboarding();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!resignation) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <UserMinus className="h-12 w-12 text-muted-foreground/50" />
        <p className="mt-4 text-lg font-medium">Resignation not found</p>
        <Link href="/hr/resignations">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Resignations
          </Button>
        </Link>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[resignation.status as ResignationStatus];
  const StatusIcon = statusConfig.icon;

  // Determine notice period remaining
  const lastWorkingDay = resignation.last_working_date ? new Date(resignation.last_working_date) : null;
  const daysRemaining = lastWorkingDay ? differenceInDays(lastWorkingDay, new Date()) : null;
  const isLastDayOrPast = lastWorkingDay ? (isPast(lastWorkingDay) || isToday(lastWorkingDay)) : false;

  // Offboarding progress
  const checklistItems = offboarding?.checklistItems || [];
  const completedItems = checklistItems.filter(i => i.status === 'COMPLETED' || i.status === 'NOT_APPLICABLE').length;
  const totalItems = checklistItems.length;
  const pendingItems = checklistItems.filter(i => i.status === 'PENDING').length;
  const progressPercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  // Group checklist by category
  const groupedChecklist = checklistItems.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, ChecklistItem[]>);

  // Handlers
  const handleSubmit = async () => {
    if (!resignationReason) { toast.error('Please provide a reason'); return; }
    try {
      await submitMutation.mutateAsync({ id: resignationId, data: { resignationReason, personalReason: personalReason || undefined } });
      toast.success('Resignation submitted');
      setSubmitDialogOpen(false);
      refetch();
    } catch (error: any) {
      toast.error(error?.response?.data?.error?.message || 'Failed to submit');
    }
  };

  const handleApprove = async () => {
    if (!hrSummary || !lastWorkingDate) { toast.error('Please fill required fields'); return; }
    try {
      await approveMutation.mutateAsync({
        id: resignationId,
        data: { hrSummary, hrNotes: hrNotes || undefined, lastWorkingDate },
      });
      toast.success('Resignation approved. Notice period started.');
      setApproveDialogOpen(false);
      refetch();
    } catch (error: any) {
      toast.error(error?.response?.data?.error?.message || 'Failed to approve');
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawalReason) { toast.error('Please provide a reason'); return; }
    try {
      await withdrawMutation.mutateAsync({ id: resignationId, data: { withdrawalReason } });
      toast.success('Resignation withdrawn');
      setWithdrawDialogOpen(false);
      refetch();
    } catch (error: any) {
      toast.error(error?.response?.data?.error?.message || 'Failed to withdraw');
    }
  };

  const handleCancel = async () => {
    if (!cancellationReason) { toast.error('Please provide a reason'); return; }
    try {
      await cancelMutation.mutateAsync({ id: resignationId, data: { cancellationReason } });
      toast.success('Resignation cancelled');
      setCancelDialogOpen(false);
      refetch();
    } catch (error: any) {
      toast.error(error?.response?.data?.error?.message || 'Failed to cancel');
    }
  };

  const handleStartOffboarding = async () => {
    try {
      await startOffboardingMutation.mutateAsync(resignationId);
      toast.success('Offboarding process started');
      setOffboardingConfirmOpen(false);
      refetchOffboarding();
    } catch (error: any) {
      toast.error(error?.response?.data?.error?.message || 'Failed to start offboarding');
    }
  };

  const handleToggleChecklistItem = async (item: ChecklistItem) => {
    const newStatus = item.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
    try {
      await updateChecklistMutation.mutateAsync({ itemId: item.id, data: { status: newStatus } });
      refetchOffboarding();
    } catch (error: any) {
      toast.error('Failed to update checklist item');
    }
  };

  const handleMarkNotApplicable = async (item: ChecklistItem) => {
    try {
      await updateChecklistMutation.mutateAsync({ itemId: item.id, data: { status: 'NOT_APPLICABLE' } });
      refetchOffboarding();
    } catch (error: any) {
      toast.error('Failed to update checklist item');
    }
  };

  const handleAddChecklistItem = async () => {
    if (!newItemCategory || !newItemTitle) { toast.error('Category and title required'); return; }
    try {
      await addChecklistMutation.mutateAsync({
        offboardingId: offboarding!.id,
        data: { category: newItemCategory, title: newItemTitle, description: newItemDescription || undefined },
      });
      toast.success('Checklist item added');
      setAddItemDialogOpen(false);
      setNewItemCategory('');
      setNewItemTitle('');
      setNewItemDescription('');
      refetchOffboarding();
    } catch (error: any) {
      toast.error('Failed to add item');
    }
  };

  const handleCompleteOffboarding = async () => {
    try {
      await completeOffboardingMutation.mutateAsync({
        offboardingId: offboarding!.id,
        data: { completionNotes: completionNotes || undefined },
      });
      toast.success('Offboarding completed. User account has been deactivated.');
      setCompleteConfirmOpen(false);
      refetch();
      refetchOffboarding();
    } catch (error: any) {
      toast.error(error?.response?.data?.error?.message || 'Failed to complete offboarding');
    }
  };

  return (
    <div className="space-y-6">
      {/* Back button & Header */}
      <div className="flex items-center gap-4">
        <Link href="/hr/resignations">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Resignation Details</h1>
        </div>
      </div>

      {/* Status Banner */}
      <div className={cn('rounded-lg p-4 flex items-center gap-3', statusConfig.color)}>
        <StatusIcon className="h-5 w-5" />
        <div className="flex-1">
          <p className="font-medium">{statusConfig.label}</p>
          {resignation.status === 'APPROVED' && daysRemaining !== null && (
            <p className="text-sm">
              {daysRemaining > 0
                ? `${daysRemaining} day(s) remaining until last working day`
                : daysRemaining === 0
                ? 'Today is the last working day'
                : `${Math.abs(daysRemaining)} day(s) past last working day`}
            </p>
          )}
        </div>
        {/* Action Buttons */}
        <div className="flex gap-2">
          {resignation.status === 'ACTIVATED' && (
            <>
              {/* Submit: employee's own or HR */}
              {(isOwnResignation || isHR) && (
                <Button size="sm" onClick={() => setSubmitDialogOpen(true)}>
                  <Send className="mr-1 h-3 w-3" /> Submit Resignation
                </Button>
              )}
              {isHR && (
                <Button size="sm" variant="outline" onClick={() => setCancelDialogOpen(true)}>
                  <Ban className="mr-1 h-3 w-3" /> Cancel
                </Button>
              )}
            </>
          )}
          {resignation.status === 'SUBMITTED' && isHR && (
            <>
              <Button size="sm" onClick={() => setApproveDialogOpen(true)}>
                <CheckCircle2 className="mr-1 h-3 w-3" /> Review & Approve
              </Button>
              <Button size="sm" variant="outline" onClick={() => setCancelDialogOpen(true)}>
                <Ban className="mr-1 h-3 w-3" /> Cancel
              </Button>
            </>
          )}
          {/* Withdraw: employee's own or HR */}
          {['ACTIVATED', 'SUBMITTED', 'UNDER_REVIEW'].includes(resignation.status) && (isOwnResignation || isHR) && (
            <Button size="sm" variant="outline" onClick={() => setWithdrawDialogOpen(true)}>
              <Undo2 className="mr-1 h-3 w-3" /> Withdraw
            </Button>
          )}
          {resignation.status === 'APPROVED' && isHR && !offboarding && (
            <Button size="sm" onClick={() => setOffboardingConfirmOpen(true)}>
              <ClipboardCheck className="mr-1 h-3 w-3" /> Start Offboarding
            </Button>
          )}
          {resignation.status === 'APPROVED' && isHR && (
            <Button size="sm" variant="outline" onClick={() => setCancelDialogOpen(true)}>
              <Ban className="mr-1 h-3 w-3" /> Cancel
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Employee Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Employee Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={resignation.employee_avatar || undefined} />
                <AvatarFallback>{getInitials(resignation.employee_name || '')}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{resignation.employee_name}</p>
                <p className="text-sm text-muted-foreground">{resignation.employee_code}</p>
              </div>
            </div>
            <Separator />
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4 text-muted-foreground" />
                <span>{resignation.department_name || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-muted-foreground" />
                <span>{resignation.designation_name || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>Activated by: {resignation.activated_by_name || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>Activated: {format(new Date(resignation.activated_at), 'MMM dd, yyyy')}</span>
              </div>
            </div>
            {resignation.activation_notes && (
              <>
                <Separator />
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Activation Notes</p>
                  <p className="text-sm">{resignation.activation_notes}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Resignation Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resignation Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {resignation.submitted_at ? (
              <>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Submitted</p>
                  <p className="text-sm">{format(new Date(resignation.submitted_at), 'MMM dd, yyyy hh:mm a')}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Reason</p>
                  <p className="text-sm">{resignation.resignation_reason}</p>
                </div>
                {resignation.personal_reason && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Personal Reason</p>
                    <p className="text-sm">{resignation.personal_reason}</p>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground italic">Employee has not yet submitted their resignation.</p>
            )}

            {resignation.hr_summary && (
              <>
                <Separator />
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">HR Summary (Discussion Notes)</p>
                  <p className="text-sm whitespace-pre-wrap">{resignation.hr_summary}</p>
                </div>
              </>
            )}
            {resignation.hr_notes && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Additional HR Notes</p>
                <p className="text-sm whitespace-pre-wrap">{resignation.hr_notes}</p>
              </div>
            )}
            {resignation.reviewed_by_name && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Reviewed By</p>
                <p className="text-sm">{resignation.reviewed_by_name} · {resignation.reviewed_at ? format(new Date(resignation.reviewed_at), 'MMM dd, yyyy') : ''}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notice Period & Key Dates */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Key Dates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {resignation.last_working_date ? (
              <>
                <div className="rounded-lg bg-destructive/10 p-3 text-center">
                  <p className="text-xs text-muted-foreground">Last Working Day</p>
                  <p className="text-lg font-bold text-destructive">
                    {format(new Date(resignation.last_working_date), 'EEEE, MMMM dd, yyyy')}
                  </p>
                  {daysRemaining !== null && daysRemaining >= 0 && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {daysRemaining === 0 ? 'Today' : `${daysRemaining} day(s) remaining`}
                    </p>
                  )}
                </div>

                {resignation.notice_period_days && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Notice Period</span>
                    <span className="font-medium">{resignation.notice_period_days} days</span>
                  </div>
                )}
                {resignation.notice_period_start_date && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Notice Start</span>
                    <span>{format(new Date(resignation.notice_period_start_date), 'MMM dd, yyyy')}</span>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground italic">Last working day not yet finalized.</p>
            )}

            {/* Withdrawal info */}
            {resignation.status === 'WITHDRAWN' && (
              <>
                <Separator />
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Withdrawn</p>
                  <p className="text-sm">{resignation.withdrawn_at ? format(new Date(resignation.withdrawn_at), 'MMM dd, yyyy') : ''}</p>
                  <p className="text-sm mt-1">{resignation.withdrawal_reason}</p>
                </div>
              </>
            )}

            {resignation.status === 'CANCELLED' && (
              <>
                <Separator />
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Cancelled</p>
                  <p className="text-sm">{resignation.cancelled_at ? format(new Date(resignation.cancelled_at), 'MMM dd, yyyy') : ''}</p>
                  <p className="text-sm mt-1">{resignation.cancellation_reason}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ================================================================== */}
      {/* OFFBOARDING SECTION */}
      {/* ================================================================== */}
      {resignation.status === 'APPROVED' && offboarding && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5" />
                  Offboarding Checklist
                </CardTitle>
                <CardDescription>
                  {offboarding.status === 'COMPLETED'
                    ? 'Offboarding completed'
                    : `${completedItems} of ${totalItems} items completed (${progressPercent}%)`}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {offboarding.status === 'IN_PROGRESS' && isHR && (
                  <>
                    <Button variant="outline" size="sm" onClick={() => setAddItemDialogOpen(true)}>
                      <Plus className="mr-1 h-3 w-3" /> Add Item
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={pendingItems > 0}
                      onClick={() => setCompleteConfirmOpen(true)}
                    >
                      <Check className="mr-1 h-3 w-3" /> Complete Offboarding
                    </Button>
                  </>
                )}
                {offboarding.status === 'COMPLETED' && (
                  <Badge variant="default" className="bg-green-600">
                    <CheckCircle2 className="mr-1 h-3 w-3" /> Completed
                  </Badge>
                )}
              </div>
            </div>

            {/* Progress bar */}
            {offboarding.status !== 'COMPLETED' && totalItems > 0 && (
              <div className="mt-3">
                <div className="h-2 w-full rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-primary transition-all"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            )}
          </CardHeader>

          <CardContent>
            <div className="space-y-6">
              {Object.entries(groupedChecklist).map(([category, items]) => (
                <div key={category}>
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    {category}
                  </h4>
                  <div className="space-y-1">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className={cn(
                          'flex items-start gap-3 rounded-md p-2 hover:bg-muted/50 transition-colors',
                          item.status === 'COMPLETED' && 'opacity-60',
                          item.status === 'NOT_APPLICABLE' && 'opacity-40'
                        )}
                      >
                        {offboarding.status === 'IN_PROGRESS' && isHR ? (
                          <Checkbox
                            checked={item.status === 'COMPLETED'}
                            onCheckedChange={() => handleToggleChecklistItem(item)}
                            disabled={item.status === 'NOT_APPLICABLE'}
                            className="mt-0.5"
                          />
                        ) : (
                          <div className="mt-0.5">
                            {item.status === 'COMPLETED' ? (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            ) : item.status === 'NOT_APPLICABLE' ? (
                              <Minus className="h-4 w-4 text-gray-400" />
                            ) : (
                              <Clock className="h-4 w-4 text-yellow-500" />
                            )}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            'text-sm font-medium',
                            item.status === 'COMPLETED' && 'line-through',
                            item.status === 'NOT_APPLICABLE' && 'line-through text-muted-foreground'
                          )}>
                            {item.title}
                          </p>
                          {item.description && (
                            <p className="text-xs text-muted-foreground">{item.description}</p>
                          )}
                          {item.completed_by_name && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Completed by {item.completed_by_name}
                              {item.completed_at && ` on ${format(new Date(item.completed_at), 'MMM dd')}`}
                            </p>
                          )}
                        </div>
                        {offboarding.status === 'IN_PROGRESS' && isHR && item.status === 'PENDING' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-muted-foreground"
                            onClick={() => handleMarkNotApplicable(item)}
                          >
                            N/A
                          </Button>
                        )}
                        {item.status === 'NOT_APPLICABLE' && (
                          <Badge variant="outline" className="text-xs shrink-0">N/A</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ================================================================== */}
      {/* DIALOGS */}
      {/* ================================================================== */}

      {/* Submit Resignation Dialog */}
      <Dialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Submit Resignation</DialogTitle>
            <DialogDescription>
              Please provide the reason for your resignation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Reason for Resignation *</Label>
              <Textarea
                placeholder="e.g., Career growth opportunity, relocation, personal reasons..."
                value={resignationReason}
                onChange={(e) => setResignationReason(e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Personal Reason (optional)</Label>
              <Textarea
                placeholder="Any additional personal details you'd like to share..."
                value={personalReason}
                onChange={(e) => setPersonalReason(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubmitDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitMutation.isPending}>
              {submitMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Resignation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve Resignation Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Review & Approve Resignation</DialogTitle>
            <DialogDescription>
              Add your discussion summary and finalize the last working day.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Discussion Summary *</Label>
              <Textarea
                placeholder="Summary of discussions with the employee, PM/TL, and HR decisions..."
                value={hrSummary}
                onChange={(e) => setHrSummary(e.target.value)}
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label>Additional Notes (optional)</Label>
              <Textarea
                placeholder="Any additional notes or observations..."
                value={hrNotes}
                onChange={(e) => setHrNotes(e.target.value)}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Last Working Day *</Label>
              <Input
                type="date"
                value={lastWorkingDate}
                onChange={(e) => setLastWorkingDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleApprove} disabled={approveMutation.isPending}>
              {approveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Approve & Start Notice Period
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Withdraw Dialog */}
      <Dialog open={withdrawDialogOpen} onOpenChange={setWithdrawDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Withdraw Resignation</DialogTitle>
            <DialogDescription>Are you sure you want to withdraw this resignation?</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <Label>Reason for Withdrawal *</Label>
            <Textarea
              placeholder="Why is this resignation being withdrawn?"
              value={withdrawalReason}
              onChange={(e) => setWithdrawalReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWithdrawDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleWithdraw} disabled={withdrawMutation.isPending}>
              {withdrawMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Withdraw Resignation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Resignation</DialogTitle>
            <DialogDescription>This will cancel the resignation process. If already approved, the employee will be reverted to Active status.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <Label>Reason for Cancellation *</Label>
            <Textarea
              placeholder="Why is this resignation being cancelled?"
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleCancel} disabled={cancelMutation.isPending}>
              {cancelMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Cancel Resignation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Start Offboarding Confirm */}
      <AlertDialog open={offboardingConfirmOpen} onOpenChange={setOffboardingConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Start Offboarding Process</AlertDialogTitle>
            <AlertDialogDescription>
              This will create an offboarding checklist for {resignation.employee_name}. You can then track each item to completion.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleStartOffboarding} disabled={startOffboardingMutation.isPending}>
              {startOffboardingMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Start Offboarding
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Checklist Item Dialog */}
      <Dialog open={addItemDialogOpen} onOpenChange={setAddItemDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Checklist Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Category *</Label>
              <Select value={newItemCategory} onValueChange={setNewItemCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IT">IT</SelectItem>
                  <SelectItem value="HR">HR</SelectItem>
                  <SelectItem value="Finance">Finance</SelectItem>
                  <SelectItem value="Knowledge Transfer">Knowledge Transfer</SelectItem>
                  <SelectItem value="Admin">Admin</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                placeholder="What needs to be done?"
                value={newItemTitle}
                onChange={(e) => setNewItemTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea
                placeholder="Additional details..."
                value={newItemDescription}
                onChange={(e) => setNewItemDescription(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddItemDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddChecklistItem} disabled={addChecklistMutation.isPending}>
              {addChecklistMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complete Offboarding Confirm */}
      <AlertDialog open={completeConfirmOpen} onOpenChange={setCompleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Complete Offboarding</AlertDialogTitle>
            <AlertDialogDescription>
              This will finalize the offboarding process and <strong>deactivate the user account</strong> for {resignation.employee_name}. They will no longer be able to log in. This action cannot be easily undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="px-6 pb-2">
            <Label>Completion Notes (optional)</Label>
            <Textarea
              placeholder="Any final notes..."
              value={completionNotes}
              onChange={(e) => setCompletionNotes(e.target.value)}
              rows={2}
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleCompleteOffboarding}
              disabled={completeOffboardingMutation.isPending}
            >
              {completeOffboardingMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Complete & Deactivate User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

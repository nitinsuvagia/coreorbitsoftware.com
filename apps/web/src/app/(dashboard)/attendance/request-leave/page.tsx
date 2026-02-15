'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import {
  Calendar,
  Loader2,
  ArrowLeft,
  Clock,
  CalendarDays,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth/auth-context';
import {
  useLeaveTypes,
  useLeaveBalance,
  useCreateLeave,
  LeaveType,
} from '@/hooks/use-attendance';
import { useEmployees } from '@/hooks/use-employees';
import { useLeaveCalculator } from '@/hooks/use-leave-calculator';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import Link from 'next/link';

// Duration types based on date selection
type DurationType = 
  | 'full_day'           // Full Day (single or multi-day)
  | 'first_half'         // First Half (single day only)
  | 'second_half'        // Second Half (single day only)
  | 'second_to_full'     // Second Half -> To Date Full Day (multi-day)
  | 'second_to_first'    // Second Half -> To Date First Half (multi-day)
  | 'full_to_first';     // Full Day -> To Date First Half (multi-day)

export default function RequestLeavePage() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [formData, setFormData] = useState({
    leaveTypeId: '',
    fromDate: '',
    toDate: '',
    durationType: 'full_day' as DurationType,
    reason: '',
  });
  
  const { data: leaveTypesResponse, isLoading: isLoadingTypes } = useLeaveTypes();
  const leaveTypes = (leaveTypesResponse as any)?.data || (leaveTypesResponse as any)?.items || leaveTypesResponse || [];
  
  const { data: leaveBalanceResponse } = useLeaveBalance();
  const leaveBalance = (leaveBalanceResponse as any)?.data || leaveBalanceResponse || [];
  
  // Fetch employees and find current user's employee record
  const { data: employeesResponse } = useEmployees({});
  const employees = (employeesResponse as any)?.data || (employeesResponse as any)?.items || [];
  
  // Find current user's employee record by email
  const currentEmployee = useMemo(() => {
    if (!user?.email || !employees.length) return null;
    return employees.find((emp: any) => emp.email === user.email);
  }, [user?.email, employees]);
  
  const createLeave = useCreateLeave();
  
  // Check if same date selected (single day leave)
  const isSingleDay = formData.fromDate && formData.toDate && formData.fromDate === formData.toDate;
  
  // Use leave calculator with org settings (excludes holidays and non-working days)
  const leaveCalc = useLeaveCalculator({
    fromDate: formData.fromDate,
    toDate: formData.toDate,
    durationType: formData.durationType,
  });
  
  // Get the calculated leave days
  const leaveDays = leaveCalc.leaveDays;
  const holidayDays = leaveCalc.holidayDays;
  const nonWorkingDays = leaveCalc.nonWorkingDays;
  
  // Get selected leave type balance
  const selectedTypeBalance = useMemo(() => {
    if (!formData.leaveTypeId) return null;
    return (leaveBalance as any[]).find((b: any) => 
      b.leaveTypeId === formData.leaveTypeId || b.leaveType?.id === formData.leaveTypeId
    );
  }, [formData.leaveTypeId, leaveBalance]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.leaveTypeId || !formData.fromDate || !formData.toDate) {
      toast.error('Please fill in all required fields.');
      return;
    }
    
    if (!formData.reason.trim() || formData.reason === '<p></p>') {
      toast.error('Please provide a reason for your leave request.');
      return;
    }
    
    if (!currentEmployee?.id) {
      toast.error('Employee profile not found. Please contact HR.');
      return;
    }
    
    // Determine half day settings based on duration type
    let isHalfDay = false;
    let halfDayType: 'first_half' | 'second_half' | undefined;
    
    // For single day leaves with half day
    if (formData.durationType === 'first_half') {
      isHalfDay = true;
      halfDayType = 'first_half';
    } else if (formData.durationType === 'second_half') {
      isHalfDay = true;
      halfDayType = 'second_half';
    }
    
    // Build reason with duration info for multi-day partial leaves
    let reason = formData.reason;
    if (formData.durationType === 'second_to_full') {
      reason = `[Duration: Second Half → Full Day]\n${formData.reason}`;
    } else if (formData.durationType === 'second_to_first') {
      reason = `[Duration: Second Half → First Half]\n${formData.reason}`;
    } else if (formData.durationType === 'full_to_first') {
      reason = `[Duration: Full Day → First Half]\n${formData.reason}`;
    }
    
    try {
      await createLeave.mutateAsync({
        employeeId: currentEmployee.id,
        leaveTypeId: formData.leaveTypeId,
        fromDate: formData.fromDate,
        toDate: formData.toDate,
        isHalfDay,
        halfDayType,
        reason,
      });
      
      toast.success('Leave request submitted successfully!');
      router.push('/attendance');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to submit leave request.');
    }
  };
  
  // Get duration label for summary
  const getDurationLabel = () => {
    if (!formData.fromDate || !formData.toDate) return '';
    
    const fromFormatted = format(parseISO(formData.fromDate), 'dd MMM');
    const toFormatted = format(parseISO(formData.toDate), 'dd MMM');
    
    if (isSingleDay) {
      switch (formData.durationType) {
        case 'first_half':
          return `${fromFormatted} (First Half)`;
        case 'second_half':
          return `${fromFormatted} (Second Half)`;
        default:
          return `${fromFormatted} (Full Day)`;
      }
    } else {
      switch (formData.durationType) {
        case 'second_to_full':
          return `${fromFormatted} (2nd Half) → ${toFormatted} (Full Day)`;
        case 'second_to_first':
          return `${fromFormatted} (2nd Half) → ${toFormatted} (1st Half)`;
        case 'full_to_first':
          return `${fromFormatted} (Full Day) → ${toFormatted} (1st Half)`;
        default:
          return `${fromFormatted} → ${toFormatted} (Full Days)`;
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/attendance">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Request Leave</h1>
          <p className="text-muted-foreground mt-1">
            Submit a new leave request for approval
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Leave Form */}
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Leave Details
              </CardTitle>
              <CardDescription>
                Fill in the details for your leave request
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Employee Info (Read Only) */}
                <div className="grid gap-2">
                  <Label>Employee</Label>
                  <div className="flex items-center gap-3 p-3 bg-muted rounded-md">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-semibold text-primary">
                        {user?.firstName?.charAt(0) || 'U'}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">{user?.firstName} {user?.lastName}</p>
                      <p className="text-sm text-muted-foreground">{user?.email}</p>
                    </div>
                  </div>
                </div>

                {/* Leave Type */}
                <div className="grid gap-2">
                  <Label htmlFor="leaveType">Leave Type *</Label>
                  <Select
                    value={formData.leaveTypeId}
                    onValueChange={(value) => setFormData({ ...formData, leaveTypeId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select leave type" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.isArray(leaveTypes) && leaveTypes.length > 0 ? (
                        (leaveTypes as any[]).map((type: any) => (
                          <SelectItem key={type.id} value={type.id}>
                            <div className="flex items-center gap-2">
                              <span>{type.name}</span>
                              {type.isPaid && (
                                <Badge variant="secondary" className="text-xs">Paid</Badge>
                              )}
                            </div>
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="_none" disabled>
                          No leave types available
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  {selectedTypeBalance && (
                    <p className="text-sm text-muted-foreground">
                      Available: <span className="font-medium text-foreground">
                        {selectedTypeBalance.remaining || selectedTypeBalance.balance || 0} days
                      </span>
                    </p>
                  )}
                </div>

                {/* Date Selection */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="fromDate">From Date *</Label>
                    <Input
                      id="fromDate"
                      type="date"
                      value={formData.fromDate}
                      onChange={(e) => setFormData({ ...formData, fromDate: e.target.value })}
                      min={format(new Date(), 'yyyy-MM-dd')}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="toDate">To Date *</Label>
                    <Input
                      id="toDate"
                      type="date"
                      value={formData.toDate}
                      onChange={(e) => setFormData({ ...formData, toDate: e.target.value })}
                      min={formData.fromDate || format(new Date(), 'yyyy-MM-dd')}
                    />
                  </div>
                </div>

                {/* Duration Type Options */}
                {formData.fromDate && formData.toDate && (
                  <div className="grid gap-2">
                    <Label>Duration Type</Label>
                    <Select
                      value={formData.durationType}
                      onValueChange={(value: DurationType) => 
                        setFormData({ ...formData, durationType: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {isSingleDay ? (
                          <>
                            <SelectItem value="full_day">
                              Full Day
                            </SelectItem>
                            <SelectItem value="first_half">
                              First Half
                            </SelectItem>
                            <SelectItem value="second_half">
                              Second Half
                            </SelectItem>
                          </>
                        ) : (
                          <>
                            <SelectItem value="full_day">
                              Full Day → Full Day
                            </SelectItem>
                            <SelectItem value="second_to_full">
                              Second Half → To Date Full Day
                            </SelectItem>
                            <SelectItem value="second_to_first">
                              Second Half → To Date First Half
                            </SelectItem>
                            <SelectItem value="full_to_first">
                              Full Day → To Date First Half
                            </SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      {getDurationLabel()}
                    </p>
                  </div>
                )}

                {/* Reason */}
                <div className="grid gap-2">
                  <Label htmlFor="reason">Reason *</Label>
                  <RichTextEditor
                    value={formData.reason}
                    onChange={(value) => setFormData({ ...formData, reason: value })}
                    placeholder="Explain the reason for your leave request..."
                    className="min-h-[150px]"
                  />
                </div>

                {/* Submit Buttons */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t">
                  <Button variant="outline" type="button" asChild>
                    <Link href="/attendance">Cancel</Link>
                  </Button>
                  <Button type="submit" disabled={createLeave.isPending}>
                    {createLeave.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Submit Request
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Summary Sidebar */}
        <div className="space-y-6">
          {/* Leave Summary */}
          <Card className="border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-primary" />
                Leave Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.fromDate && formData.toDate ? (
                <>
                  {/* Applying Leave Duration - Main Highlight */}
                  <div className="bg-primary/5 rounded-lg p-4 text-center border border-primary/10">
                    <p className="text-sm text-muted-foreground mb-1">Applying Leave</p>
                    <p className="text-2xl font-bold text-primary">
                      {leaveDays} {leaveDays === 1 ? 'Day' : 'Days'}
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      {isSingleDay ? (
                        <>
                          {format(parseISO(formData.fromDate), 'EEE, dd MMM yyyy')}
                          {formData.durationType !== 'full_day' && (
                            <span className="text-primary font-medium">
                              {' '}({formData.durationType === 'first_half' ? 'First Half' : 'Second Half'})
                            </span>
                          )}
                        </>
                      ) : (
                        <>
                          {format(parseISO(formData.fromDate), 'dd MMM')} → {format(parseISO(formData.toDate), 'dd MMM yyyy')}
                        </>
                      )}
                    </p>
                    {!isSingleDay && formData.durationType !== 'full_day' && (
                      <Badge variant="outline" className="mt-2">
                        {formData.durationType === 'second_to_full' && '2nd Half → Full Day'}
                        {formData.durationType === 'second_to_first' && '2nd Half → 1st Half'}
                        {formData.durationType === 'full_to_first' && 'Full Day → 1st Half'}
                      </Badge>
                    )}
                  </div>

                  {/* Excluded Days Info */}
                  {(holidayDays > 0 || nonWorkingDays > 0) && (
                    <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Info className="h-3 w-3" />
                        <span>Excluded from leave count:</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {holidayDays > 0 && (
                          <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                            {holidayDays} {holidayDays === 1 ? 'Holiday' : 'Holidays'}
                          </Badge>
                        )}
                        {nonWorkingDays > 0 && (
                          <Badge variant="outline" className="text-xs bg-gray-50 text-gray-700 border-gray-200">
                            {nonWorkingDays} Weekend{nonWorkingDays > 1 ? 's' : ''}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Selected Leave Type Balance */}
                  {formData.leaveTypeId && selectedTypeBalance && (
                    <div className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          {selectedTypeBalance.leaveType?.name || selectedTypeBalance.leaveTypeName || 'Selected Leave'}
                        </span>
                        <Badge variant={
                          ((selectedTypeBalance.remaining || selectedTypeBalance.balance || 0) - leaveDays) >= 0 
                            ? 'secondary' 
                            : 'destructive'
                        }>
                          {selectedTypeBalance.remaining || selectedTypeBalance.balance || 0} available
                        </Badge>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>After this request</span>
                          <span className={
                            ((selectedTypeBalance.remaining || selectedTypeBalance.balance || 0) - leaveDays) >= 0 
                              ? 'text-green-600 font-medium' 
                              : 'text-red-600 font-medium'
                          }>
                            {Math.max(0, (selectedTypeBalance.remaining || selectedTypeBalance.balance || 0) - leaveDays)} days remaining
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all ${
                              ((selectedTypeBalance.remaining || selectedTypeBalance.balance || 0) - leaveDays) >= 0 
                                ? 'bg-primary' 
                                : 'bg-red-500'
                            }`}
                            style={{ 
                              width: `${Math.min(100, Math.max(0, 
                                (((selectedTypeBalance.remaining || selectedTypeBalance.balance || 0) - leaveDays) / 
                                (selectedTypeBalance.total || selectedTypeBalance.entitled || 1)) * 100
                              ))}%` 
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-6">
                  <CalendarDays className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Select dates to see leave summary
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Leave Balance */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Leave Balance</CardTitle>
              <CardDescription>Your available leave quota</CardDescription>
            </CardHeader>
            <CardContent>
              {Array.isArray(leaveBalance) && leaveBalance.length > 0 ? (
                <div className="space-y-3">
                  {(leaveBalance as any[]).map((balance: any) => {
                    const remaining = balance.remaining || balance.balance || 0;
                    const total = balance.total || balance.entitled || 0;
                    const percentage = total > 0 ? (remaining / total) * 100 : 0;
                    const isSelected = formData.leaveTypeId === (balance.leaveTypeId || balance.leaveType?.id);
                    
                    return (
                      <div 
                        key={balance.id || balance.leaveTypeId} 
                        className={`p-3 rounded-lg border transition-all ${
                          isSelected ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                        }`}
                      >
                        <div className="flex justify-between items-center mb-2">
                          <span className={`text-sm font-medium ${isSelected ? 'text-primary' : ''}`}>
                            {balance.leaveType?.name || balance.leaveTypeName || 'Leave'}
                          </span>
                          <span className="text-sm font-semibold">
                            {remaining} / {total}
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-1.5">
                          <div 
                            className={`h-1.5 rounded-full transition-all ${
                              remaining > 0 ? 'bg-primary' : 'bg-muted-foreground/30'
                            }`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-sm text-muted-foreground">
                    No leave balance information available
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

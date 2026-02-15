'use client';
// @ts-nocheck - Temporarily disable type checking due to type inference issues with dynamic data

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, getDate, differenceInDays, getDay } from 'date-fns';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Clock,
  Users,
  AlertCircle,
  Loader2,
  Filter,
  CalendarDays,
  UserCheck,
  UserX,
  CalendarClock,
  Building2,
  FileText,
  Search,
  MoreVertical,
  Eye,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth/auth-context';
import { getAvatarColor } from '@/lib/utils';
import {
  useLeaves,
  useLeaveTypes,
  useApproveLeave,
  useRejectLeave,
  useCreateLeave,
  useAttendance,
  LeaveRequest,
  LeaveType,
} from '@/hooks/use-attendance';
import { useDepartments, useEmployees } from '@/hooks/use-employees';
import { useLeaveCalculator } from '@/hooks/use-leave-calculator';
import { useHolidays } from '@/hooks/use-holidays';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { get } from '@/lib/api/client';
import type { OrganizationSettings } from '@/app/(dashboard)/organization/types';

const STATUS_BADGES: Record<string, { color: string; label: string }> = {
  pending: { color: 'bg-amber-100 text-amber-800', label: 'Pending' },
  approved: { color: 'bg-green-100 text-green-800', label: 'Approved' },
  rejected: { color: 'bg-red-100 text-red-800', label: 'Rejected' },
  cancelled: { color: 'bg-gray-100 text-gray-800', label: 'Cancelled' },
};

// Leave type default colors (fallback) - for calendar cells
const DEFAULT_LEAVE_COLORS: Record<string, { bg: string; text: string; border?: string }> = {
  CASUAL: { bg: 'bg-blue-100', text: 'text-blue-700' },
  SICK: { bg: 'bg-pink-100', text: 'text-pink-700' },
  ANNUAL: { bg: 'bg-cyan-100', text: 'text-cyan-700' },
  UNPAID: { bg: 'bg-orange-100', text: 'text-orange-700' },
  LWP: { bg: 'bg-orange-100', text: 'text-orange-700' },
  MATERNITY: { bg: 'bg-fuchsia-100', text: 'text-fuchsia-700' },
  PATERNITY: { bg: 'bg-indigo-100', text: 'text-indigo-700' },
  COMPENSATORY: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
};

// Helper to convert hex color to RGB values
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  } : null;
}

// Get leave color styles from hex or fallback to defaults
function getLeaveColorStyles(code: string, hexColor?: string): { bg: string; text: string } {
  if (hexColor) {
    const rgb = hexToRgb(hexColor);
    if (rgb) {
      // Check if it's a light or dark color to determine text color
      const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
      return {
        bg: hexColor,
        text: luminance > 0.5 ? '#374151' : '#FFFFFF', // dark text for light bg, white for dark
      };
    }
  }
  return DEFAULT_LEAVE_COLORS[code] || { bg: 'bg-blue-100', text: 'text-blue-700' };
}

// Holiday type colors - distinct from leaves
const HOLIDAY_COLORS: Record<string, { bg: string; text: string; cellBg: string }> = {
  public: { bg: 'bg-rose-100', text: 'text-rose-700', cellBg: 'bg-rose-50' },      // Rose - mandatory off
  optional: { bg: 'bg-amber-100', text: 'text-amber-700', cellBg: 'bg-amber-50' }, // Amber - choice-based
  restricted: { bg: 'bg-purple-100', text: 'text-purple-700', cellBg: 'bg-purple-50' }, // Purple - special
};

export default function LeaveManagementPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'requests' | 'calendar'>('requests');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('pending');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null);
  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');
  const [rejectionReason, setRejectionReason] = useState('');
  // Duration types based on date selection
  type DurationType = 
    | 'full_day'           // Full Day (single or multi-day)
    | 'first_half'         // First Half (single day only)
    | 'second_half'        // Second Half (single day only)
    | 'second_to_full'     // Second Half -> To Date Full Day (multi-day)
    | 'second_to_first'    // Second Half -> To Date First Half (multi-day)
    | 'full_to_first';     // Full Day -> To Date First Half (multi-day)
  
  // Create leave dialog state
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newLeaveData, setNewLeaveData] = useState({
    employeeId: '',
    leaveTypeId: '',
    fromDate: '',
    toDate: '',
    durationType: 'full_day' as DurationType,
    reason: '',
  });
  
  // Check if same date selected (single day leave)
  const isCreateSingleDay = newLeaveData.fromDate && newLeaveData.toDate && newLeaveData.fromDate === newLeaveData.toDate;

  // Queries
  const { data: leavesResponse, isLoading: isLoadingLeaves } = useLeaves({ 
    status: selectedStatus === 'all' ? undefined : selectedStatus,
  });
  // leavesResponse is the array directly since API client unwraps response.data.data
  const leaves = Array.isArray(leavesResponse) 
    ? leavesResponse 
    : (leavesResponse as any)?.data || [];
  
  // Fetch ALL leaves for calendar (regardless of status filter)
  const { data: allLeavesResponse } = useLeaves({});
  const allLeaves = Array.isArray(allLeavesResponse) 
    ? allLeavesResponse 
    : (allLeavesResponse as any)?.data || [];

  const { data: leaveTypesResponse } = useLeaveTypes();
  const leaveTypes = (leaveTypesResponse as any)?.data || (leaveTypesResponse as any)?.items || leaveTypesResponse || [];

  const { data: departmentsResponse } = useDepartments();
  const departments = (departmentsResponse as any)?.data || departmentsResponse || [];

  const { data: employeesResponse } = useEmployees({});
  const employees = (employeesResponse as any)?.data || (employeesResponse as any)?.items || [];

  // Fetch organization settings for working days
  const { data: orgSettingsResponse } = useQuery({
    queryKey: ['org-settings-full'],
    queryFn: () => get<{ settings: OrganizationSettings }>('/api/v1/organization/settings'),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
  const orgSettings = (orgSettingsResponse as any)?.settings || null;
  
  // Determine non-working days from org settings (default: Saturday=6, Sunday=0)
  const nonWorkingDays = useMemo(() => {
    if (orgSettings?.weeklyWorkingHours) {
      const days: number[] = [];
      const dayMap: Record<string, number> = {
        sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
        thursday: 4, friday: 5, saturday: 6
      };
      Object.entries(orgSettings.weeklyWorkingHours).forEach(([dayName, config]: [string, any]) => {
        if (!config?.isWorkingDay) {
          days.push(dayMap[dayName]);
        }
      });
      return days;
    }
    // Default: Saturday and Sunday are non-working
    return [0, 6];
  }, [orgSettings]);

  // Fetch holidays for calendar
  const { data: holidaysResponse } = useHolidays({ 
    year: calendarMonth.getFullYear(),
  });
  const holidays = (holidaysResponse as any)?.data || holidaysResponse || [];

  // Fetch attendance for calendar
  const { data: attendanceResponse } = useAttendance({
    startDate: format(startOfMonth(calendarMonth), 'yyyy-MM-dd'),
    endDate: format(endOfMonth(calendarMonth), 'yyyy-MM-dd'),
  });
  const attendanceRecords = (attendanceResponse as any)?.items || attendanceResponse || [];

  // Mutations
  const approveLeave = useApproveLeave();
  const rejectLeave = useRejectLeave();
  const createLeave = useCreateLeave();

  // Filter leaves
  const filteredLeaves = useMemo(() => {
    let result = leaves;

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter((leave: any) => {
        const empName = `${leave.employee?.firstName || ''} ${leave.employee?.lastName || ''}`.toLowerCase();
        const empId = leave.employee?.employeeId?.toLowerCase() || '';
        return empName.includes(term) || empId.includes(term);
      });
    }

    if (selectedDepartment !== 'all') {
      result = result.filter((leave: any) => 
        leave.employee?.department?.name === selectedDepartment
      );
    }

    if (selectedEmployee !== 'all') {
      result = result.filter((leave: any) => leave.employeeId === selectedEmployee);
    }

    return result;
  }, [leaves, selectedDepartment, selectedEmployee, searchTerm]);

  // Categorize leaves
  const pendingLeaves = useMemo(() => 
    filteredLeaves.filter((l: any) => l.status === 'pending'),
    [filteredLeaves]
  );

  const approvedLeaves = useMemo(() => 
    filteredLeaves.filter((l: any) => l.status === 'approved'),
    [filteredLeaves]
  );

  const rejectedLeaves = useMemo(() => 
    filteredLeaves.filter((l: any) => l.status === 'rejected'),
    [filteredLeaves]
  );

  // Stats
  const stats = useMemo(() => ({
    total: filteredLeaves.length,
    pending: pendingLeaves.length,
    approved: approvedLeaves.length,
    rejected: rejectedLeaves.length,
  }), [filteredLeaves, pendingLeaves, approvedLeaves, rejectedLeaves]);

  // Calendar data
  const calendarDays = useMemo(() => {
    const start = startOfMonth(calendarMonth);
    const end = endOfMonth(calendarMonth);
    return eachDayOfInterval({ start, end });
  }, [calendarMonth]);

  // Map holidays by date
  const holidaysByDate = useMemo(() => {
    const map: Record<string, { name: string; type?: string }> = {};
    holidays.forEach((holiday: any) => {
      if (holiday.date) {
        const key = format(parseISO(holiday.date), 'yyyy-MM-dd');
        map[key] = { name: holiday.name, type: holiday.type || 'public' };
      }
    });
    return map;
  }, [holidays]);

  // Map attendance by employee and date
  const attendanceByEmpDate = useMemo(() => {
    const map: Record<string, Record<string, string>> = {};
    (attendanceRecords || []).forEach((record: any) => {
      const empId = record.employeeId;
      const dateKey = format(parseISO(record.date), 'yyyy-MM-dd');
      if (!map[empId]) map[empId] = {};
      map[empId][dateKey] = record.status; // 'present', 'absent', 'late', 'half-day', 'on-leave'
    });
    return map;
  }, [attendanceRecords]);

  // Map ALL leaves (regardless of status) to calendar by employee and date
  const leavesByEmpDate = useMemo(() => {
    const map: Record<string, Record<string, { leave: LeaveRequest; code: string; colors: { bg: string; text: string } }>> = {};
    
    allLeaves.forEach((leave: LeaveRequest) => {
      if (leave.status !== 'approved' && leave.status !== 'pending') return; // Only show approved and pending
      
      const fromDate = leave.fromDate || leave.startDate;
      const toDate = leave.toDate || leave.endDate;
      if (!fromDate || !toDate) return;

      const start = parseISO(fromDate);
      const end = parseISO(toDate);
      const days = eachDayOfInterval({ start, end });
      
      // Get leave type code
      let leaveTypeCode = 'LV';
      if (typeof leave.leaveType === 'string') {
        const type = leaveTypes.find((t: any) => t.id === leave.leaveType || t.code === leave.leaveType);
        leaveTypeCode = type?.code || leave.leaveType;
      } else if ((leave as any).leaveType?.code) {
        leaveTypeCode = (leave as any).leaveType.code;
      } else if (leave.leaveTypeId) {
        const type = leaveTypes.find((t: any) => t.id === leave.leaveTypeId);
        leaveTypeCode = type?.code || 'LV';
      }

      days.forEach((day) => {
        const dateKey = format(day, 'yyyy-MM-dd');
        const empId = leave.employeeId;
        
        if (!map[empId]) map[empId] = {};
        if (!map[empId][dateKey]) {
          const leaveColors = DEFAULT_LEAVE_COLORS[leaveTypeCode] || { bg: 'bg-blue-100', text: 'text-blue-700' };
          map[empId][dateKey] = {
            leave,
            code: leaveTypeCode.length <= 3 ? leaveTypeCode : leaveTypeCode.substring(0, 2),
            colors: leaveColors,
          };
        }
      });
    });

    return map;
  }, [allLeaves, leaveTypes]);

  // Map leaves to calendar (legacy for other parts)
  const leavesByDate = useMemo(() => {
    const map: Record<string, { leave: LeaveRequest; color: { bg: string; text: string; border?: string } }[]> = {};
    
    approvedLeaves.forEach((leave: any) => {
      const fromDate = leave.fromDate || leave.startDate;
      const toDate = leave.toDate || leave.endDate;
      if (!fromDate || !toDate) return;

      const start = parseISO(fromDate);
      const end = parseISO(toDate);
      const days = eachDayOfInterval({ start, end });

      days.forEach((day) => {
        const key = format(day, 'yyyy-MM-dd');
        if (!map[key]) map[key] = [];
        
        const leaveTypeCode = typeof leave.leaveType === 'string' 
          ? leave.leaveType 
          : (leave.leaveType as LeaveType)?.code || 'CASUAL';
        
        map[key].push({
          leave,
          color: DEFAULT_LEAVE_COLORS[leaveTypeCode] || { bg: 'bg-blue-500', text: 'text-blue-700' },
        });
      });
    });

    return map;
  }, [approvedLeaves]);

  const getEmployeeName = (leave: LeaveRequest) => {
    if (leave.employee) {
      return `${leave.employee.firstName} ${leave.employee.lastName}`;
    }
    return 'Unknown Employee';
  };

  const getLeaveTypeName = (leave: LeaveRequest) => {
    if (typeof leave.leaveType === 'string') {
      const type = leaveTypes.find((t: any) => t.id === leave.leaveType || t.code === leave.leaveType);
      return type?.name || leave.leaveType;
    }
    return (leave.leaveType as LeaveType)?.name || 'Unknown';
  };

  const getLeaveTypeCode = (leave: LeaveRequest) => {
    if (typeof leave.leaveType === 'string') {
      const type = leaveTypes.find((t: any) => t.id === leave.leaveType || t.code === leave.leaveType);
      return type?.code || leave.leaveType;
    }
    return (leave.leaveType as LeaveType)?.code || 'LEAVE';
  };

  // Helper to strip HTML tags from text (for rich text editor content)
  const stripHtml = (html: string) => {
    if (!html) return '';
    return html.replace(/<[^>]*>/g, '').trim();
  };

  // Handler for viewing leave details
  const handleViewDetails = (leave: LeaveRequest) => {
    setSelectedLeave(leave);
    setIsDetailDialogOpen(true);
  };

  const handleAction = (leave: LeaveRequest, action: 'approve' | 'reject') => {
    setSelectedLeave(leave);
    setActionType(action);
    setRejectionReason('');
    setIsActionDialogOpen(true);
  };

  const confirmAction = async () => {
    if (!selectedLeave || !user) return;

    try {
      if (actionType === 'approve') {
        await approveLeave.mutateAsync({
          leaveRequestId: selectedLeave.id,
          approverId: user.id,
        });
        toast.success(`Leave request for ${getEmployeeName(selectedLeave)} has been approved.`);
      } else {
        if (!rejectionReason.trim()) {
          toast.error('Please provide a reason for rejection.');
          return;
        }
        await rejectLeave.mutateAsync({
          leaveRequestId: selectedLeave.id,
          approverId: user.id,
          reason: rejectionReason,
        });
        toast.success(`Leave request for ${getEmployeeName(selectedLeave)} has been rejected.`);
      }
      setIsActionDialogOpen(false);
      setSelectedLeave(null);
    } catch (err: any) {
      toast.error(err?.message || `Failed to ${actionType} leave.`);
    }
  };

  // Use leave calculator for create form (excludes holidays and non-working days)
  const createLeaveCalc = useLeaveCalculator({
    fromDate: newLeaveData.fromDate,
    toDate: newLeaveData.toDate,
    durationType: newLeaveData.durationType,
  });
  
  const createFormLeaveDays = createLeaveCalc.leaveDays;
  const createFormHolidayDays = createLeaveCalc.holidayDays;
  const createFormNonWorkingDays = createLeaveCalc.nonWorkingDays;

  const handleCreateLeave = async () => {
    if (!newLeaveData.employeeId || !newLeaveData.leaveTypeId || !newLeaveData.fromDate || !newLeaveData.toDate) {
      toast.error('Please fill in all required fields.');
      return;
    }
    
    if (!newLeaveData.reason.trim() || newLeaveData.reason === '<p></p>') {
      toast.error('Please provide a reason for the leave request.');
      return;
    }

    // Determine half day settings based on duration type
    let isHalfDay = false;
    let halfDayType: 'first_half' | 'second_half' | undefined;
    
    // For single day leaves with half day
    if (newLeaveData.durationType === 'first_half') {
      isHalfDay = true;
      halfDayType = 'first_half';
    } else if (newLeaveData.durationType === 'second_half') {
      isHalfDay = true;
      halfDayType = 'second_half';
    }
    
    // Build reason with duration info for multi-day partial leaves
    let reason = newLeaveData.reason;
    if (newLeaveData.durationType === 'second_to_full') {
      reason = `[Duration: Second Half → Full Day]\n${newLeaveData.reason}`;
    } else if (newLeaveData.durationType === 'second_to_first') {
      reason = `[Duration: Second Half → First Half]\n${newLeaveData.reason}`;
    } else if (newLeaveData.durationType === 'full_to_first') {
      reason = `[Duration: Full Day → First Half]\n${newLeaveData.reason}`;
    }

    try {
      await createLeave.mutateAsync({
        employeeId: newLeaveData.employeeId,
        leaveTypeId: newLeaveData.leaveTypeId,
        fromDate: newLeaveData.fromDate,
        toDate: newLeaveData.toDate,
        isHalfDay,
        halfDayType,
        reason,
      });
      
      const emp = (employees as any[]).find((e: any) => e.id === newLeaveData.employeeId);
      const empName = emp ? `${emp.firstName} ${emp.lastName}` : 'Employee';
      toast.success(`Leave request created for ${empName}.`);
      
      setIsCreateDialogOpen(false);
      resetCreateForm();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create leave request.');
    }
  };

  const resetCreateForm = () => {
    setNewLeaveData({
      employeeId: '',
      leaveTypeId: '',
      fromDate: '',
      toDate: '',
      durationType: 'full_day',
      reason: '',
    });
  };

  const LeaveTable = ({ data, showActions }: { data: LeaveRequest[]; showActions?: boolean }) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Employee</TableHead>
          <TableHead>Department</TableHead>
          <TableHead>Leave Type</TableHead>
          <TableHead>From - To</TableHead>
          <TableHead>Days</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Reason</TableHead>
          {showActions && <TableHead className="text-right">Actions</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.length === 0 ? (
          <TableRow>
            <TableCell colSpan={showActions ? 8 : 7} className="text-center py-8 text-muted-foreground">
              No leave requests found
            </TableCell>
          </TableRow>
        ) : (
          data.map((leave) => (
            <TableRow 
              key={leave.id} 
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => handleViewDetails(leave)}
            >
              <TableCell className="font-medium">
                <div>
                  {getEmployeeName(leave)}
                  {leave.employee?.employeeId && (
                    <span className="text-xs text-muted-foreground block">
                      {leave.employee.employeeId}
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                {leave.employee?.department?.name || '-'}
              </TableCell>
              <TableCell>
                <Badge variant="outline">
                  {getLeaveTypeName(leave)}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="text-sm">
                  {format(parseISO(leave.fromDate || leave.startDate || ''), 'dd MMM')} - {' '}
                  {format(parseISO(leave.toDate || leave.endDate || ''), 'dd MMM yyyy')}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="secondary">
                  {leave.totalDays} {leave.totalDays === 1 ? 'day' : 'days'}
                  {leave.isHalfDay && ' (Half)'}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge className={STATUS_BADGES[leave.status]?.color || 'bg-gray-100'}>
                  {STATUS_BADGES[leave.status]?.label || leave.status}
                </Badge>
              </TableCell>
              <TableCell className="max-w-[200px] truncate" title={stripHtml(leave.reason)}>
                {stripHtml(leave.reason)}
              </TableCell>
              {showActions && (
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-green-600 border-green-600 hover:bg-green-50"
                      onClick={(e) => { e.stopPropagation(); handleAction(leave, 'approve'); }}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 border-red-600 hover:bg-red-50"
                      onClick={(e) => { e.stopPropagation(); handleAction(leave, 'reject'); }}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Leave Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage employee leave requests, balances, and calendar
          </p>
        </div>
        <Button onClick={() => { resetCreateForm(); setIsCreateDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Leave
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoadingLeaves ? <Skeleton className="h-8 w-16" /> : stats.total}
            </div>
            <p className="text-xs text-muted-foreground">All leave requests</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <CalendarClock className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {isLoadingLeaves ? <Skeleton className="h-8 w-16" /> : stats.pending}
            </div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <UserCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {isLoadingLeaves ? <Skeleton className="h-8 w-16" /> : stats.approved}
            </div>
            <p className="text-xs text-muted-foreground">Approved requests</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <UserX className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {isLoadingLeaves ? <Skeleton className="h-8 w-16" /> : stats.rejected}
            </div>
            <p className="text-xs text-muted-foreground">Rejected requests</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters - JD Listing Style */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search employee name or ID..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              {selectedStatus === 'all' ? 'All Status' : selectedStatus.charAt(0).toUpperCase() + selectedStatus.slice(1)}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setSelectedStatus('all')}>
              All Status
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSelectedStatus('pending')}>
              Pending
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSelectedStatus('approved')}>
              Approved
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSelectedStatus('rejected')}>
              Rejected
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Building2 className="mr-2 h-4 w-4" />
              {selectedDepartment === 'all' ? 'All Departments' : selectedDepartment}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setSelectedDepartment('all')}>
              All Departments
            </DropdownMenuItem>
            {(departments as any[]).map((dept: any) => (
              <DropdownMenuItem key={dept.id} onClick={() => setSelectedDepartment(dept.name)}>
                {dept.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'requests' | 'calendar')}>
          <TabsList>
            <TabsTrigger value="requests" className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              Requests
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex items-center gap-1">
              <CalendarDays className="h-4 w-4" />
              Calendar
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Leave Requests Table */}
      {activeTab === 'requests' && (
        <Card>
          <CardContent className="p-0">
            {isLoadingLeaves ? (
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-4 font-medium">Employee</th>
                    <th className="text-left p-4 font-medium">Department</th>
                    <th className="text-left p-4 font-medium">Leave Type</th>
                    <th className="text-left p-4 font-medium">Duration</th>
                    <th className="text-left p-4 font-medium">Days</th>
                    <th className="text-left p-4 font-medium">Status</th>
                    <th className="text-left p-4 font-medium hidden md:table-cell">Reason</th>
                    <th className="text-right p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b">
                      <td className="p-4"><Skeleton className="h-4 w-32" /></td>
                      <td className="p-4"><Skeleton className="h-4 w-24" /></td>
                      <td className="p-4"><Skeleton className="h-5 w-20" /></td>
                      <td className="p-4"><Skeleton className="h-4 w-28" /></td>
                      <td className="p-4"><Skeleton className="h-5 w-12" /></td>
                      <td className="p-4"><Skeleton className="h-5 w-16" /></td>
                      <td className="p-4 hidden md:table-cell"><Skeleton className="h-4 w-40" /></td>
                      <td className="p-4 text-right"><Skeleton className="h-8 w-8 ml-auto" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : filteredLeaves.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4">
                <div className="rounded-full bg-primary/10 p-6 mb-4">
                  <FileText className="h-16 w-16 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">No Leave Requests Found</h3>
                <p className="text-muted-foreground text-center max-w-md mb-6">
                  {selectedStatus === 'pending' 
                    ? 'No pending leave requests to review.'
                    : 'No leave requests match your current filters.'}
                </p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-4 font-medium">Employee</th>
                    <th className="text-left p-4 font-medium">Department</th>
                    <th className="text-left p-4 font-medium">Leave Type</th>
                    <th className="text-left p-4 font-medium">Duration</th>
                    <th className="text-left p-4 font-medium">Days</th>
                    <th className="text-left p-4 font-medium">Status</th>
                    <th className="text-left p-4 font-medium hidden md:table-cell">Reason</th>
                    <th className="text-right p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeaves.map((leave: any) => (
                    <tr 
                      key={leave.id} 
                      className="border-b hover:bg-muted/50 cursor-pointer"
                      onClick={() => handleViewDetails(leave)}
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={leave.employee?.avatar} alt={getEmployeeName(leave)} />
                            <AvatarFallback className={`${getAvatarColor(leave.employee?.firstName + leave.employee?.lastName + leave.employeeId).className} text-sm font-semibold`}>
                              {leave.employee?.firstName?.[0]}{leave.employee?.lastName?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{getEmployeeName(leave)}</div>
                            {leave.employee?.employeeId && (
                              <span className="text-xs text-muted-foreground">
                                {leave.employee.employeeId}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">{leave.employee?.department?.name || '-'}</td>
                      <td className="p-4">
                        <Badge variant="outline">{getLeaveTypeName(leave)}</Badge>
                      </td>
                      <td className="p-4">
                        <div className="text-sm">
                          {format(parseISO(leave.fromDate || leave.startDate || ''), 'dd MMM')} - {' '}
                          {format(parseISO(leave.toDate || leave.endDate || ''), 'dd MMM yyyy')}
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge variant="secondary">
                          {leave.totalDays} {leave.totalDays === 1 ? 'day' : 'days'}
                          {leave.isHalfDay && ' (Half)'}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <Badge className={STATUS_BADGES[leave.status]?.color || 'bg-gray-100'}>
                          {STATUS_BADGES[leave.status]?.label || leave.status}
                        </Badge>
                      </td>
                      <td className="p-4 hidden md:table-cell">
                        <span className="max-w-[200px] truncate block" title={stripHtml(leave.reason)}>
                          {stripHtml(leave.reason)}
                        </span>
                      </td>
                      <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                        {leave.status === 'pending' ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleAction(leave, 'approve')}
                                className="text-green-600"
                              >
                                <Check className="h-4 w-4 mr-2" />
                                Approve
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleAction(leave, 'reject')}
                                className="text-red-600"
                              >
                                <X className="h-4 w-4 mr-2" />
                                Reject
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Leave Calendar */}
      {activeTab === 'calendar' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5" />
                  Attendance & Leave Calendar
                </CardTitle>
                <CardDescription>
                  Employee-wise attendance and leave calendar view
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCalendarMonth(subMonths(calendarMonth, 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="font-semibold min-w-[150px] text-center">
                  {format(calendarMonth, 'MMMM yyyy')}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Legend */}
            <div className="space-y-3 mb-6 pb-4 border-b">
              {/* Row 1: Present, Weekends and Holidays */}
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-green-100 text-green-700 flex items-center justify-center text-xs font-bold">P</div>
                  <span className="text-sm text-muted-foreground">Present</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-gray-200 flex items-center justify-center text-xs text-gray-500 font-medium">W</div>
                  <span className="text-sm text-muted-foreground">Weekend</span>
                </div>
                {orgSettings?.enabledHolidayTypes?.public !== false && (
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-rose-100 flex items-center justify-center text-xs text-rose-700 font-medium">PH</div>
                    <span className="text-sm text-muted-foreground">Public Holiday</span>
                  </div>
                )}
                {orgSettings?.enabledHolidayTypes?.optional !== false && (
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-amber-100 flex items-center justify-center text-xs text-amber-700 font-medium">OH</div>
                    <span className="text-sm text-muted-foreground">Optional Holiday</span>
                  </div>
                )}
                {orgSettings?.enabledHolidayTypes?.restricted !== false && (
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-purple-100 flex items-center justify-center text-xs text-purple-700 font-medium">RH</div>
                    <span className="text-sm text-muted-foreground">Restricted Holiday</span>
                  </div>
                )}
              </div>
              
              {/* Row 2: Leave Types - dynamically from configured leave types */}
              <div className="flex flex-wrap gap-4">
                {leaveTypes.map((lt: any) => {
                  const colorStyles = getLeaveColorStyles(lt.code, lt.color);
                  const isHexColor = lt.color?.startsWith('#');
                  return (
                    <div key={lt.id} className="flex items-center gap-2">
                      <div 
                        className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold ${!isHexColor ? `${colorStyles.bg} ${colorStyles.text}` : ''}`}
                        style={isHexColor ? { 
                          backgroundColor: `${colorStyles.bg}20`, 
                          color: colorStyles.bg 
                        } : undefined}
                      >
                        {lt.code.substring(0, 2)}
                      </div>
                      <span className="text-sm text-muted-foreground">{lt.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="sticky left-0 bg-background p-2 text-left border min-w-[200px] z-10">
                      Employee
                    </th>
                    {calendarDays.map((day) => {
                      const dayIsWeekend = nonWorkingDays.includes(getDay(day));
                      const dateKey = format(day, 'yyyy-MM-dd');
                      const holiday = holidaysByDate[dateKey];
                      const holidayColors = holiday ? HOLIDAY_COLORS[holiday.type || 'public'] || HOLIDAY_COLORS.public : null;
                      
                      return (
                        <th
                          key={day.toISOString()}
                          className={`p-1 text-center border min-w-[40px] text-xs font-medium ${
                            dayIsWeekend ? 'bg-gray-100' : holiday ? holidayColors?.cellBg : ''
                          }`}
                        >
                          <div>{format(day, 'd')}</div>
                          <div className={`${dayIsWeekend ? 'text-gray-400' : 'text-muted-foreground'}`}>
                            {format(day, 'EEE')}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {(employees as any[]).slice(0, 50).map((emp: any) => {
                    return (
                      <tr key={emp.id}>
                        <td className="sticky left-0 bg-background p-2 border font-medium z-10">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={emp.avatar} alt={`${emp.firstName} ${emp.lastName}`} />
                              <AvatarFallback className={`${getAvatarColor(emp.firstName + emp.lastName + emp.id).className} text-xs font-semibold`}>
                                {emp.firstName?.[0]}{emp.lastName?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="text-sm">{emp.firstName} {emp.lastName}</div>
                              <div className="text-xs text-muted-foreground">{emp.employeeId}</div>
                            </div>
                          </div>
                        </td>
                        {calendarDays.map((day) => {
                          const dateKey = format(day, 'yyyy-MM-dd');
                          const dayIsWeekend = nonWorkingDays.includes(getDay(day));
                          const holiday = holidaysByDate[dateKey];
                          const empLeave = leavesByEmpDate[emp.id]?.[dateKey];
                          const attendance = attendanceByEmpDate[emp.id]?.[dateKey];
                          
                          // Priority: Weekend > Holiday > Leave > Attendance > Empty
                          let cellContent = null;
                          let cellClass = 'p-1 text-center border h-8';
                          let title = '';
                          
                          if (dayIsWeekend) {
                            cellClass += ' bg-gray-100';
                            cellContent = <span className="text-gray-400 text-xs">-</span>;
                            title = format(day, 'EEEE');
                          } else if (holiday) {
                            const holidayColors = HOLIDAY_COLORS[holiday.type || 'public'] || HOLIDAY_COLORS.public;
                            cellClass += ` ${holidayColors.cellBg}`;
                            cellContent = (
                              <div className={`w-full h-6 rounded ${holidayColors.bg} flex items-center justify-center text-xs ${holidayColors.text} font-medium`}>
                                H
                              </div>
                            );
                            title = `Holiday: ${holiday.name} (${holiday.type || 'public'})`;
                          } else if (empLeave) {
                            cellContent = (
                              <div 
                                className={`w-full h-6 rounded ${empLeave.colors.bg} flex items-center justify-center text-xs ${empLeave.colors.text} font-bold`}
                              >
                                {empLeave.code}
                              </div>
                            );
                            title = `${getLeaveTypeName(empLeave.leave)} (${empLeave.leave.status})`;
                          } else if (attendance === 'present' || attendance === 'late') {
                            cellContent = (
                              <div className="w-full h-6 rounded bg-green-100 flex items-center justify-center text-xs text-green-700 font-bold">
                                P
                              </div>
                            );
                            title = attendance === 'late' ? 'Present (Late)' : 'Present';
                          } else if (attendance === 'half-day') {
                            cellContent = (
                              <div className="w-full h-6 rounded bg-yellow-100 flex items-center justify-center text-xs text-yellow-700 font-bold">
                                ½
                              </div>
                            );
                            title = 'Half Day';
                          } else if (attendance === 'absent') {
                            cellContent = (
                              <div className="w-full h-6 rounded bg-red-100 flex items-center justify-center text-xs text-red-700 font-bold">
                                A
                              </div>
                            );
                            title = 'Absent';
                          } else {
                            // No data - show empty or dash for past dates
                            const today = new Date();
                            if (day < today) {
                              cellContent = <span className="text-gray-300 text-xs">-</span>;
                            }
                          }

                          return (
                            <td
                              key={day.toISOString()}
                              className={cellClass}
                              title={title}
                            >
                              {cellContent}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {(employees as any[]).length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No employees to display in calendar</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Approve/Reject Dialog */}
      <Dialog open={isActionDialogOpen} onOpenChange={setIsActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' ? 'Approve Leave Request' : 'Reject Leave Request'}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'approve'
                ? 'Are you sure you want to approve this leave request?'
                : 'Please provide a reason for rejecting this leave request.'}
            </DialogDescription>
          </DialogHeader>

          {selectedLeave && (
            <div className="py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Employee:</span>
                  <p className="font-medium">{getEmployeeName(selectedLeave)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Leave Type:</span>
                  <p className="font-medium">{getLeaveTypeName(selectedLeave)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Duration:</span>
                  <p className="font-medium">
                    {format(parseISO(selectedLeave.fromDate || selectedLeave.startDate || ''), 'dd MMM yyyy')} - {' '}
                    {format(parseISO(selectedLeave.toDate || selectedLeave.endDate || ''), 'dd MMM yyyy')}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Days:</span>
                  <p className="font-medium">{selectedLeave.totalDays} day(s)</p>
                </div>
              </div>

              <div>
                <span className="text-muted-foreground text-sm">Reason:</span>
                <p className="mt-1 p-3 bg-muted rounded-md text-sm">{stripHtml(selectedLeave.reason)}</p>
              </div>

              {actionType === 'reject' && (
                <div className="grid gap-2">
                  <Label htmlFor="rejectionReason">Rejection Reason *</Label>
                  <Textarea
                    id="rejectionReason"
                    placeholder="Please provide a reason for rejection..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={3}
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsActionDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={confirmAction}
              disabled={approveLeave.isPending || rejectLeave.isPending}
              className={actionType === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {(approveLeave.isPending || rejectLeave.isPending) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {actionType === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Leave Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Leave Request</DialogTitle>
            <DialogDescription>
              Create a leave request on behalf of an employee
            </DialogDescription>
          </DialogHeader>

          <div className="grid md:grid-cols-5 gap-6 py-4">
            {/* Form Fields - Left Side */}
            <div className="md:col-span-3 space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="employee">Employee *</Label>
                <Select
                  value={newLeaveData.employeeId}
                  onValueChange={(value) => setNewLeaveData({ ...newLeaveData, employeeId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {(employees as any[]).map((emp: any) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName} {emp.employeeId ? `(${emp.employeeId})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="leaveType">Leave Type *</Label>
                <Select
                  value={newLeaveData.leaveTypeId}
                  onValueChange={(value) => setNewLeaveData({ ...newLeaveData, leaveTypeId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select leave type" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.isArray(leaveTypes) && leaveTypes.length > 0 ? (
                      (leaveTypes as any[]).map((type: any) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="_none" disabled>
                        No leave types available
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="fromDate">From Date *</Label>
                  <Input
                    id="fromDate"
                    type="date"
                    value={newLeaveData.fromDate}
                    onChange={(e) => setNewLeaveData({ ...newLeaveData, fromDate: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="toDate">To Date *</Label>
                  <Input
                    id="toDate"
                    type="date"
                    value={newLeaveData.toDate}
                    onChange={(e) => setNewLeaveData({ ...newLeaveData, toDate: e.target.value })}
                    min={newLeaveData.fromDate}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Duration Type</Label>
                <Select
                  value={newLeaveData.durationType}
                  onValueChange={(value: DurationType) => 
                    setNewLeaveData({ ...newLeaveData, durationType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {isCreateSingleDay ? (
                      <>
                        <SelectItem value="full_day">Full Day</SelectItem>
                        <SelectItem value="first_half">First Half</SelectItem>
                        <SelectItem value="second_half">Second Half</SelectItem>
                      </>
                    ) : (
                      <>
                        <SelectItem value="full_day">Full Day → Full Day</SelectItem>
                        <SelectItem value="second_to_full">Second Half → To Date Full Day</SelectItem>
                        <SelectItem value="second_to_first">Second Half → To Date First Half</SelectItem>
                        <SelectItem value="full_to_first">Full Day → To Date First Half</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="reason">Reason *</Label>
                <RichTextEditor
                  value={newLeaveData.reason}
                  onChange={(value) => setNewLeaveData({ ...newLeaveData, reason: value })}
                  placeholder="Enter reason for leave..."
                  className="min-h-[100px]"
                />
              </div>
            </div>

            {/* Summary - Right Side */}
            <div className="md:col-span-2">
              <div className="sticky top-0 space-y-4">
                <div className="border rounded-lg p-4 bg-muted/30">
                  <h4 className="text-sm font-medium text-muted-foreground mb-3">Leave Summary</h4>
                  
                  {newLeaveData.fromDate && newLeaveData.toDate ? (
                    <div className="space-y-4">
                      {/* Applying Leave Duration */}
                      <div className="bg-primary/5 rounded-lg p-4 text-center border border-primary/10">
                        <p className="text-xs text-muted-foreground mb-1">Applying Leave</p>
                        <p className="text-2xl font-bold text-primary">
                          {createFormLeaveDays} {createFormLeaveDays === 1 ? 'Day' : 'Days'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {isCreateSingleDay ? (
                            <>
                              {format(parseISO(newLeaveData.fromDate), 'EEE, dd MMM yyyy')}
                              {newLeaveData.durationType !== 'full_day' && (
                                <span className="text-primary font-medium block mt-1">
                                  ({newLeaveData.durationType === 'first_half' ? 'First Half' : 'Second Half'})
                                </span>
                              )}
                            </>
                          ) : (
                            <>
                              {format(parseISO(newLeaveData.fromDate), 'dd MMM')} → {format(parseISO(newLeaveData.toDate), 'dd MMM yyyy')}
                              {newLeaveData.durationType !== 'full_day' && (
                                <span className="text-primary font-medium block mt-1">
                                  {newLeaveData.durationType === 'second_to_full' && '(2nd Half → Full Day)'}
                                  {newLeaveData.durationType === 'second_to_first' && '(2nd Half → 1st Half)'}
                                  {newLeaveData.durationType === 'full_to_first' && '(Full Day → 1st Half)'}
                                </span>
                              )}
                            </>
                          )}
                        </p>
                      </div>

                      {/* Excluded Days Info */}
                      {(createFormHolidayDays > 0 || createFormNonWorkingDays > 0) && (
                        <div className="bg-muted/50 rounded-lg p-2 space-y-1">
                          <p className="text-xs text-muted-foreground">Excluded from leave count:</p>
                          <div className="flex flex-wrap gap-1">
                            {createFormHolidayDays > 0 && (
                              <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                                {createFormHolidayDays} Holiday{createFormHolidayDays > 1 ? 's' : ''}
                              </Badge>
                            )}
                            {createFormNonWorkingDays > 0 && (
                              <Badge variant="outline" className="text-xs bg-gray-50 text-gray-700 border-gray-200">
                                {createFormNonWorkingDays} Weekend{createFormNonWorkingDays > 1 ? 's' : ''}
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Selected Employee */}
                      {newLeaveData.employeeId && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">Employee: </span>
                          <span className="font-medium">
                            {(() => {
                              const emp = (employees as any[]).find((e: any) => e.id === newLeaveData.employeeId);
                              return emp ? `${emp.firstName} ${emp.lastName}` : '';
                            })()}
                          </span>
                        </div>
                      )}

                      {/* Selected Leave Type */}
                      {newLeaveData.leaveTypeId && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">Leave Type: </span>
                          <span className="font-medium">
                            {(leaveTypes as any[]).find((t: any) => t.id === newLeaveData.leaveTypeId)?.name || ''}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <CalendarDays className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
                      <p className="text-xs text-muted-foreground">
                        Select dates to see summary
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateLeave} disabled={createLeave.isPending}>
              {createLeave.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Leave
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Leave Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Leave Request Details</DialogTitle>
            <DialogDescription>
              View complete information about this leave request
            </DialogDescription>
          </DialogHeader>
          {selectedLeave && (
            <div className="space-y-4">
              {/* Employee Info */}
              <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={selectedLeave.employee?.avatar} alt={getEmployeeName(selectedLeave)} />
                  <AvatarFallback className={`${getAvatarColor((selectedLeave.employee?.firstName || '') + (selectedLeave.employee?.lastName || '') + (selectedLeave.employeeId || '')).className} text-lg font-semibold`}>
                    {selectedLeave.employee?.firstName?.[0]}{selectedLeave.employee?.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-semibold">{getEmployeeName(selectedLeave)}</div>
                  {selectedLeave.employee?.employeeId && (
                    <div className="text-sm text-muted-foreground">ID: {selectedLeave.employee.employeeId}</div>
                  )}
                  {selectedLeave.employee?.department?.name && (
                    <div className="text-sm text-muted-foreground">{selectedLeave.employee.department.name}</div>
                  )}
                </div>
              </div>

              {/* Leave Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-muted-foreground">Leave Type</label>
                  <div>
                    <Badge variant="outline" className="text-base">
                      {getLeaveTypeName(selectedLeave)}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <div>
                    <Badge className={STATUS_BADGES[selectedLeave.status]?.color || 'bg-gray-100'}>
                      {STATUS_BADGES[selectedLeave.status]?.label || selectedLeave.status}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-muted-foreground">From Date</label>
                  <div className="font-medium">
                    {format(parseISO(selectedLeave.fromDate || selectedLeave.startDate || ''), 'dd MMM yyyy')}
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-muted-foreground">To Date</label>
                  <div className="font-medium">
                    {format(parseISO(selectedLeave.toDate || selectedLeave.endDate || ''), 'dd MMM yyyy')}
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-muted-foreground">Total Days</label>
                  <div>
                    <Badge variant="secondary" className="text-base">
                      {selectedLeave.totalDays} {selectedLeave.totalDays === 1 ? 'day' : 'days'}
                      {selectedLeave.isHalfDay && ' (Half Day)'}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-muted-foreground">Applied On</label>
                  <div className="font-medium">
                    {selectedLeave.createdAt ? format(parseISO(selectedLeave.createdAt), 'dd MMM yyyy') : '-'}
                  </div>
                </div>
              </div>

              {/* Reason */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-muted-foreground">Reason</label>
                <div className="p-3 rounded-lg bg-muted/50 text-sm">
                  {stripHtml(selectedLeave.reason) || 'No reason provided'}
                </div>
              </div>

              {/* Approval Info - show if approved or rejected */}
              {(selectedLeave.status === 'approved' || selectedLeave.status === 'rejected') && (
                <div className="space-y-2 pt-2 border-t">
                  <label className="text-sm font-medium text-muted-foreground">
                    {selectedLeave.status === 'approved' ? 'Approved' : 'Rejected'} By
                  </label>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <div className="font-medium">
                      {typeof selectedLeave.approvedBy === 'object' && selectedLeave.approvedBy 
                        ? `${(selectedLeave.approvedBy as any).firstName || ''} ${(selectedLeave.approvedBy as any).lastName || 'Manager'}`
                        : selectedLeave.approvedBy || 'Manager'}
                    </div>
                    {selectedLeave.approvedAt && (
                      <div className="text-sm text-muted-foreground">
                        on {format(parseISO(selectedLeave.approvedAt), 'dd MMM yyyy HH:mm')}
                      </div>
                    )}
                    {selectedLeave.rejectionReason && (
                      <div className="mt-2 text-sm text-red-600">
                        Reason: {stripHtml(selectedLeave.rejectionReason)}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailDialogOpen(false)}>
              Close
            </Button>
            {selectedLeave?.status === 'pending' && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="text-green-600 border-green-600 hover:bg-green-50"
                  onClick={() => {
                    setIsDetailDialogOpen(false);
                    handleAction(selectedLeave!, 'approve');
                  }}
                >
                  <Check className="h-4 w-4 mr-1" />
                  Approve
                </Button>
                <Button
                  variant="outline"
                  className="text-red-600 border-red-600 hover:bg-red-50"
                  onClick={() => {
                    setIsDetailDialogOpen(false);
                    handleAction(selectedLeave!, 'reject');
                  }}
                >
                  <X className="h-4 w-4 mr-1" />
                  Reject
                </Button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

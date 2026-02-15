import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, put, del } from '@/lib/api/client';

// Attendance types
export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employee?: { firstName: string; lastName: string; employeeId: string; departmentId?: string };
  date: string;
  checkIn?: string;
  checkOut?: string;
  status: 'present' | 'absent' | 'late' | 'half-day' | 'on-leave';
  workHours?: number;
  overtime?: number;
  notes?: string;
}

export interface AttendanceFilters {
  employeeId?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  page?: number;
  limit?: number;
}

// Attendance
export function useAttendance(filters: AttendanceFilters = {}) {
  return useQuery({
    queryKey: ['attendance', filters],
    queryFn: () => get<{ items: AttendanceRecord[]; total: number }>('/api/attendance', filters),
  });
}

export function useMyAttendance(filters: AttendanceFilters = {}) {
  return useQuery({
    queryKey: ['my-attendance', filters],
    queryFn: () => get<{ items: AttendanceRecord[]; total: number }>('/api/attendance/my', filters),
  });
}

export function useCheckIn() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data?: { notes?: string }) => post<AttendanceRecord>('/api/attendance/check-in', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['my-attendance'] });
    },
  });
}

export function useCheckOut() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data?: { notes?: string }) => post<AttendanceRecord>('/api/attendance/check-out', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['my-attendance'] });
    },
  });
}

// Leave types
export interface LeaveType {
  id: string;
  name: string;
  code: string;
  description?: string;
  defaultDaysPerYear: number;
  carryForwardAllowed: boolean;
  maxCarryForwardDays?: number;
  requiresApproval: boolean;
  isPaid: boolean;
  color?: string;
  isActive: boolean;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employee?: { 
    firstName: string; 
    lastName: string; 
    employeeId?: string;
    avatar?: string;
    department?: { name: string };
  };
  leaveTypeId?: string;
  leaveType?: LeaveType | string;
  fromDate?: string;
  toDate?: string;
  startDate?: string;
  endDate?: string;
  totalDays: number;
  isHalfDay?: boolean;
  halfDayType?: 'first_half' | 'second_half';
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  approvedBy?: string;
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  createdAt: string;
}

export interface LeaveFilters {
  employeeId?: string;
  status?: string;
  leaveType?: string;
  leaveTypeId?: string;
  departmentId?: string;
  startDate?: string;
  endDate?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
  pageSize?: number;
}

export function useLeaves(filters: LeaveFilters = {}) {
  return useQuery({
    queryKey: ['leaves', filters],
    queryFn: () => get<{ data: LeaveRequest[]; total: number; page?: number; pageSize?: number }>('/api/v1/attendance/leaves/requests', filters),
  });
}

export function useMyLeaves(filters: LeaveFilters = {}) {
  return useQuery({
    queryKey: ['my-leaves', filters],
    queryFn: () => get<{ data: LeaveRequest[]; total: number }>('/api/v1/attendance/leaves/requests/my', filters),
  });
}

export function usePendingLeaves(managerId?: string) {
  return useQuery({
    queryKey: ['leaves', 'pending', managerId],
    queryFn: () => get<{ data: LeaveRequest[] }>(`/api/v1/attendance/leaves/requests/pending${managerId ? `?managerId=${managerId}` : ''}`),
  });
}

export function useCreateLeave() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: {
      employeeId: string;
      leaveTypeId: string;
      fromDate: string;
      toDate: string;
      isHalfDay?: boolean;
      halfDayType?: 'first_half' | 'second_half';
      reason: string;
    }) => post<{ data: LeaveRequest; message: string }>('/api/v1/attendance/leaves/requests', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaves'] });
      queryClient.invalidateQueries({ queryKey: ['my-leaves'] });
      queryClient.invalidateQueries({ queryKey: ['leave-balance'] });
    },
  });
}

export function useApproveLeave() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ leaveRequestId, approverId, comments }: { 
      leaveRequestId: string; 
      approverId: string;
      comments?: string;
    }) =>
      post<{ data: LeaveRequest; message: string }>('/api/v1/attendance/leaves/requests/approve', { 
        leaveRequestId, 
        approverId,
        comments 
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaves'] });
      queryClient.invalidateQueries({ queryKey: ['leave-balance'] });
    },
  });
}

export function useRejectLeave() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ leaveRequestId, approverId, reason }: { 
      leaveRequestId: string; 
      approverId: string;
      reason: string;
    }) =>
      post<{ data: LeaveRequest; message: string }>('/api/v1/attendance/leaves/requests/reject', { 
        leaveRequestId, 
        approverId,
        reason 
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaves'] });
      queryClient.invalidateQueries({ queryKey: ['leave-balance'] });
    },
  });
}

export function useCancelLeave() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      post<{ data: LeaveRequest; message: string }>(`/api/v1/attendance/leaves/requests/${id}/cancel`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaves'] });
      queryClient.invalidateQueries({ queryKey: ['my-leaves'] });
      queryClient.invalidateQueries({ queryKey: ['leave-balance'] });
    },
  });
}

// Leave balances
export interface LeaveBalance {
  id?: string;
  employeeId?: string;
  leaveTypeId?: string;
  leaveType: string | LeaveType;
  year?: number;
  totalDays: number;
  usedDays: number;
  pendingDays?: number;
  remainingDays: number;
  carryForwardDays?: number;
  total?: number;
  used?: number;
  remaining?: number;
}

export function useLeaveBalance(employeeId?: string, year?: number) {
  const currentYear = year || new Date().getFullYear();
  return useQuery({
    queryKey: ['leave-balance', employeeId, currentYear],
    queryFn: () => {
      if (employeeId) {
        return get<{ data: LeaveBalance[] }>(`/api/v1/attendance/leaves/balances/${employeeId}?year=${currentYear}`);
      }
      return get<{ data: LeaveBalance[] }>('/api/v1/attendance/leaves/balance');
    },
  });
}

export function useAllLeaveBalances(year?: number) {
  const currentYear = year || new Date().getFullYear();
  return useQuery({
    queryKey: ['leave-balances', 'all', currentYear],
    queryFn: () => get<{ data: { employeeId: string; employee: { firstName: string; lastName: string; employeeId: string; department?: { name: string } }; balances: LeaveBalance[] }[] }>(`/api/v1/attendance/leaves/balances?year=${currentYear}`),
  });
}

export function useAdjustLeaveBalance() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: {
      employeeId: string;
      leaveTypeId: string;
      year: number;
      adjustmentDays: number;
      reason: string;
    }) => post<{ data: LeaveBalance; message: string }>('/api/v1/attendance/leaves/balances/adjust', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-balance'] });
      queryClient.invalidateQueries({ queryKey: ['leave-balances'] });
    },
  });
}

// Leave Types
export function useLeaveTypes(activeOnly: boolean = true) {
  return useQuery({
    queryKey: ['leave-types', activeOnly],
    queryFn: () => get<{ data: LeaveType[] }>(`/api/v1/attendance/leaves/types?activeOnly=${activeOnly}`),
  });
}

export function useCreateLeaveType() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: Omit<LeaveType, 'id' | 'isActive'>) =>
      post<{ data: LeaveType; message: string }>('/api/v1/attendance/leaves/types', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-types'] });
    },
  });
}

export function useUpdateLeaveType() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<LeaveType> }) =>
      put<{ data: LeaveType; message: string }>(`/api/v1/attendance/leaves/types/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-types'] });
    },
  });
}

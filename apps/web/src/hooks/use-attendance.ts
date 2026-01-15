import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, put, del } from '@/lib/api/client';

// Attendance types
export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employee?: { firstName: string; lastName: string; employeeId: string };
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
export interface LeaveRequest {
  id: string;
  employeeId: string;
  employee?: { firstName: string; lastName: string };
  leaveType: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
}

export interface LeaveFilters {
  employeeId?: string;
  status?: string;
  leaveType?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export function useLeaves(filters: LeaveFilters = {}) {
  return useQuery({
    queryKey: ['leaves', filters],
    queryFn: () => get<{ items: LeaveRequest[]; total: number }>('/api/attendance/leaves', filters),
  });
}

export function useMyLeaves(filters: LeaveFilters = {}) {
  return useQuery({
    queryKey: ['my-leaves', filters],
    queryFn: () => get<{ items: LeaveRequest[]; total: number }>('/api/attendance/leaves/my', filters),
  });
}

export function useCreateLeave() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: Partial<LeaveRequest>) => post<LeaveRequest>('/api/attendance/leaves', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaves'] });
      queryClient.invalidateQueries({ queryKey: ['my-leaves'] });
    },
  });
}

export function useApproveLeave() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => post(`/api/attendance/leaves/${id}/approve`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaves'] });
    },
  });
}

export function useRejectLeave() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      post(`/api/attendance/leaves/${id}/reject`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaves'] });
    },
  });
}

// Leave balances
export interface LeaveBalance {
  leaveType: string;
  total: number;
  used: number;
  remaining: number;
}

export function useLeaveBalance() {
  return useQuery({
    queryKey: ['leave-balance'],
    queryFn: () => get<LeaveBalance[]>('/api/attendance/leaves/balance'),
  });
}

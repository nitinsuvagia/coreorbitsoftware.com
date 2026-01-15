/**
 * Attendance Events - Attendance and leave events
 */

export interface AttendanceMarkedEvent {
  tenantId: string;
  employeeId: string;
  attendanceId: string;
  date: Date;
  checkIn?: Date;
  checkOut?: Date;
  status: string;
  source: string;
}

export interface LeaveRequestedEvent {
  tenantId: string;
  employeeId: string;
  leaveRequestId: string;
  leaveTypeId: string;
  startDate: Date;
  endDate: Date;
  totalDays: number;
  approverId: string;
  requestedAt: Date;
}

export interface LeaveApprovedEvent {
  tenantId: string;
  employeeId: string;
  leaveRequestId: string;
  approverId: string;
  approvedAt: Date;
}

export interface LeaveRejectedEvent {
  tenantId: string;
  employeeId: string;
  leaveRequestId: string;
  approverId: string;
  rejectionReason: string;
  rejectedAt: Date;
}

export interface LeaveCancelledEvent {
  tenantId: string;
  employeeId: string;
  leaveRequestId: string;
  cancelledBy: string;
  reason?: string;
  cancelledAt: Date;
}

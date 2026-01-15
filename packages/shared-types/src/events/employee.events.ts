/**
 * Employee Events - Employee lifecycle events
 */

export interface EmployeeCreatedEvent {
  tenantId: string;
  employeeId: string;
  employeeCode: string;
  email: string;
  departmentId: string;
  designationId: string;
  dateOfJoining: Date;
  createdBy: string;
  createdAt: Date;
}

export interface EmployeeUpdatedEvent {
  tenantId: string;
  employeeId: string;
  changes: Record<string, { old: unknown; new: unknown }>;
  updatedBy: string;
  updatedAt: Date;
}

export interface EmployeeOnboardedEvent {
  tenantId: string;
  employeeId: string;
  onboardingId: string;
  completedAt: Date;
}

export interface EmployeePromotedEvent {
  tenantId: string;
  employeeId: string;
  previousDesignationId: string;
  newDesignationId: string;
  previousDepartmentId?: string;
  newDepartmentId?: string;
  effectiveDate: Date;
  promotedBy: string;
}

export interface EmployeeResignedEvent {
  tenantId: string;
  employeeId: string;
  resignationDate: Date;
  lastWorkingDate: Date;
  reason?: string;
}

export interface EmployeeTerminatedEvent {
  tenantId: string;
  employeeId: string;
  terminationDate: Date;
  reason: string;
  terminatedBy: string;
}

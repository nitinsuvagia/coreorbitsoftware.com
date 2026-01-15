/**
 * Resource Allocation Types - Resource management
 */

import { AuditableEntity } from '../common';

export type AllocationStatus = 'tentative' | 'confirmed' | 'cancelled';
export type AllocationUnit = 'hours' | 'percentage' | 'days';

export interface ResourceAllocation extends AuditableEntity {
  tenantId: string;
  employeeId: string;
  projectId: string;
  startDate: Date;
  endDate: Date;
  allocation: number;
  unit: AllocationUnit;
  role?: string;
  status: AllocationStatus;
  billable: boolean;
  billableRate?: number;
  notes?: string;
  approvedBy?: string;
  approvedAt?: Date;
}

export interface ResourceCapacity {
  employeeId: string;
  date: Date;
  totalCapacity: number;
  allocatedCapacity: number;
  availableCapacity: number;
  unit: AllocationUnit;
  allocations: {
    projectId: string;
    projectName: string;
    allocation: number;
  }[];
}

export interface TeamCapacity {
  teamId?: string;
  departmentId?: string;
  startDate: Date;
  endDate: Date;
  totalCapacity: number;
  allocatedCapacity: number;
  availableCapacity: number;
  utilizationPercentage: number;
  members: ResourceCapacity[];
}

export interface AllocationConflict {
  employeeId: string;
  date: Date;
  totalAllocation: number;
  maxAllocation: number;
  projects: {
    projectId: string;
    projectName: string;
    allocation: number;
  }[];
}

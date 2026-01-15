/**
 * Department & Designation Types - Organizational structure
 */

import { AuditableEntity, BaseEntity } from '../common';

export interface Department extends AuditableEntity {
  tenantId: string;
  name: string;
  code: string;
  description?: string;
  parentId?: string;
  headId?: string;
  costCenter?: string;
  budget?: number;
  isActive: boolean;
  employeeCount?: number;
  children?: Department[];
}

export interface Designation extends BaseEntity {
  tenantId: string;
  name: string;
  code: string;
  description?: string;
  departmentId?: string;
  level: number;
  grade?: string;
  isActive: boolean;
  employeeCount?: number;
  salaryRange?: SalaryRange;
}

export interface SalaryRange {
  min: number;
  max: number;
  currency: string;
}

export interface OrganizationChart {
  employee: {
    id: string;
    name: string;
    avatar?: string;
    designation: string;
    department: string;
  };
  children: OrganizationChart[];
}

/**
 * Resource Demand Types - Resource planning
 */

import { AuditableEntity, BaseEntity } from '../common';

export type DemandStatus = 'draft' | 'submitted' | 'approved' | 'fulfilled' | 'cancelled';
export type DemandPriority = 'low' | 'medium' | 'high' | 'critical';

export interface ResourceDemand extends AuditableEntity {
  tenantId: string;
  projectId: string;
  requesterId: string;
  title: string;
  description?: string;
  status: DemandStatus;
  priority: DemandPriority;
  skills: SkillRequirement[];
  quantity: number;
  startDate: Date;
  endDate: Date;
  allocation: number;
  allocationUnit: 'hours' | 'percentage';
  experience: {
    min: number;
    max?: number;
  };
  designationId?: string;
  departmentPreference?: string[];
  locationPreference?: string[];
  notes?: string;
  approvedBy?: string;
  approvedAt?: Date;
  fulfilledResources?: FulfilledResource[];
}

export interface SkillRequirement {
  skillId: string;
  skillName: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  isRequired: boolean;
}

export interface FulfilledResource {
  employeeId: string;
  allocationId: string;
  startDate: Date;
  endDate: Date;
  allocation: number;
  assignedAt: Date;
  assignedBy: string;
}

export interface BenchResource {
  employeeId: string;
  skills: string[];
  experience: number;
  designation: string;
  department: string;
  benchStartDate: Date;
  expectedEndDate?: Date;
  availableFrom?: Date;
  preferredProjects?: string[];
  notes?: string;
}

export interface ResourceSkill extends BaseEntity {
  tenantId: string;
  name: string;
  category: string;
  description?: string;
  isActive: boolean;
}

export interface SkillMatrix {
  employeeId: string;
  skills: {
    skillId: string;
    skillName: string;
    category: string;
    level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    yearsOfExperience: number;
    lastUsed?: Date;
    certifications?: string[];
  }[];
}

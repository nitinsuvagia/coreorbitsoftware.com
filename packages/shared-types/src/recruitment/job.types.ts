/**
 * Job Types - Job descriptions and postings
 */

import { AuditableEntity } from '../common';

export type JobStatus = 'draft' | 'open' | 'on_hold' | 'closed' | 'cancelled';
export type JobEmploymentType = 'full_time' | 'part_time' | 'contract' | 'intern' | 'freelance';
export type ExperienceLevel = 'entry' | 'junior' | 'mid' | 'senior' | 'lead' | 'principal' | 'executive';

export interface JobDescription extends AuditableEntity {
  tenantId: string;
  title: string;
  code: string;
  departmentId: string;
  designationId?: string;
  description: string;
  requirements: string;
  responsibilities: string;
  qualifications: string[];
  skills: JobSkill[];
  employmentType: JobEmploymentType;
  experienceLevel: ExperienceLevel;
  experienceMin: number;
  experienceMax?: number;
  salaryRange?: JobSalaryRange;
  location: JobLocation;
  status: JobStatus;
  openings: number;
  filledCount: number;
  hiringManagerId: string;
  recruiterId?: string;
  interviewPanel: string[];
  stages: RecruitmentStage[];
  publishedAt?: Date;
  closingDate?: Date;
  isRemote: boolean;
  benefits?: string[];
  tags: string[];
}

export interface JobSkill {
  name: string;
  level: 'nice_to_have' | 'preferred' | 'required';
  yearsRequired?: number;
}

export interface JobSalaryRange {
  min: number;
  max: number;
  currency: string;
  period: 'hourly' | 'monthly' | 'yearly';
  isNegotiable: boolean;
  showOnPosting: boolean;
}

export interface JobLocation {
  type: 'onsite' | 'remote' | 'hybrid';
  city?: string;
  state?: string;
  country?: string;
  timezone?: string;
  remoteRegions?: string[];
}

export interface RecruitmentStage {
  id: string;
  name: string;
  order: number;
  type: 'screening' | 'interview' | 'assessment' | 'offer' | 'custom';
  isRequired: boolean;
  interviewers?: string[];
  duration?: number;
  scorecardId?: string;
}

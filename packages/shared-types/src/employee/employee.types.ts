/**
 * Employee Types - Core employee data
 */

import { AuditableEntity } from '../common';

export type EmployeeStatus = 'pending' | 'active' | 'on_leave' | 'resigned' | 'terminated';
export type EmploymentType = 'full_time' | 'part_time' | 'contract' | 'intern' | 'freelance';
export type Gender = 'male' | 'female' | 'other' | 'prefer_not_to_say';
export type MaritalStatus = 'single' | 'married' | 'divorced' | 'widowed';

export interface Employee extends AuditableEntity {
  tenantId: string;
  userId?: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  personalEmail?: string;
  avatar?: string;
  status: EmployeeStatus;
  employmentType: EmploymentType;
  departmentId: string;
  designationId: string;
  reportingManagerId?: string;
  dateOfJoining: Date;
  dateOfLeaving?: Date;
  probationEndDate?: Date;
  confirmationDate?: Date;
  personalInfo: EmployeePersonalInfo;
  workInfo: EmployeeWorkInfo;
  documents: EmployeeDocument[];
  skills: EmployeeSkill[];
  bankDetails?: EmployeeBankDetails;
  emergencyContacts: EmergencyContact[];
  metadata?: Record<string, unknown>;
}

export interface EmployeePersonalInfo {
  dateOfBirth?: Date;
  gender?: Gender;
  maritalStatus?: MaritalStatus;
  bloodGroup?: string;
  nationality?: string;
  currentAddress?: Address;
  permanentAddress?: Address;
  identificationDocuments?: IdentificationDocument[];
}

export interface Address {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface IdentificationDocument {
  type: 'passport' | 'national_id' | 'driving_license' | 'pan' | 'aadhar' | 'ssn' | 'other';
  number: string;
  issuedBy?: string;
  issuedDate?: Date;
  expiryDate?: Date;
  documentUrl?: string;
}

export interface EmployeeWorkInfo {
  workEmail: string;
  workPhone?: string;
  officeLocation?: string;
  desk?: string;
  shiftId?: string;
  isRemote: boolean;
  noticePeriodDays: number;
}

export interface EmployeeDocument {
  id: string;
  type: string;
  name: string;
  url: string;
  uploadedAt: Date;
  uploadedBy: string;
  isVerified: boolean;
  verifiedBy?: string;
  verifiedAt?: Date;
}

export interface EmployeeSkill {
  skillId: string;
  name: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  yearsOfExperience?: number;
  certifications?: string[];
  lastUsed?: Date;
}

export interface EmployeeBankDetails {
  bankName: string;
  accountNumber: string;
  accountHolderName: string;
  ifscCode?: string;
  swiftCode?: string;
  branchName?: string;
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  email?: string;
  address?: Address;
  isPrimary: boolean;
}

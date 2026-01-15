/**
 * Client Types - Client management
 */

import { AuditableEntity } from '../common';

export type ClientStatus = 'prospect' | 'active' | 'inactive' | 'churned';
export type ClientType = 'individual' | 'company' | 'government' | 'non_profit';

export interface Client extends AuditableEntity {
  tenantId: string;
  name: string;
  code: string;
  type: ClientType;
  status: ClientStatus;
  industry?: string;
  website?: string;
  logo?: string;
  description?: string;
  address: ClientAddress;
  billingAddress?: ClientAddress;
  contacts: ClientContact[];
  accountManagerId?: string;
  tags: string[];
  metadata?: Record<string, unknown>;
  statistics: ClientStatistics;
}

export interface ClientAddress {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface ClientContact {
  id: string;
  name: string;
  email: string;
  phone?: string;
  designation?: string;
  department?: string;
  isPrimary: boolean;
  isActive: boolean;
}

export interface ClientStatistics {
  totalProjects: number;
  activeProjects: number;
  totalRevenue: number;
  outstandingAmount: number;
  lifetimeValue: number;
  averageProjectValue: number;
  lastProjectDate?: Date;
}

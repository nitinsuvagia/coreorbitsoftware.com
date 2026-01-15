// Organization types

export interface OrganizationSettings {
  timezone: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  currency: string;
  language: string;
  fiscalYearStart: number;
  workingDays: number[];
  workStartTime: string;
  workEndTime: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  legalName?: string;
  logo?: string;
  status: string;
  email: string;
  phone?: string;
  website?: string;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
  };
  settings?: OrganizationSettings;
  plan?: SubscriptionPlan;
  subscription?: {
    id: string;
    planId: string;
    status: 'ACTIVE' | 'TRIAL' | 'CANCELLED' | 'PAST_DUE' | 'PAUSED';
    billingCycle: 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
    currentPeriodStart: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
    maxUsers: number;
    maxStorage: number;
    maxProjects?: number;
    maxClients?: number;
    stripeSubscriptionId?: string;
    stripeCustomerId?: string;
  };
  trialEndsAt?: string;
  activatedAt?: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
  managerId?: string;
  manager?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  _count?: {
    employees: number;
  };
}

export interface Designation {
  id: string;
  name: string;
  code: string;
  level: number;
  description?: string;
  isActive: boolean;
  _count?: {
    employees: number;
  };
}

export interface TeamMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar?: string;
  role: 'OWNER' | 'ADMIN' | 'MANAGER' | 'MEMBER';
  status: 'ACTIVE' | 'PENDING' | 'SUSPENDED';
  department?: string;
  joinedAt: string;
}

export interface Invoice {
  id: string;
  number: string;
  date: string;
  dueDate: string;
  amount: number;
  status: 'PAID' | 'PENDING' | 'OVERDUE';
  downloadUrl?: string;
}

export interface Integration {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'communication' | 'storage' | 'calendar' | 'hr' | 'productivity';
  connected: boolean;
  connectedAt?: string;
}

// Subscription Plan from Platform Admin
export interface SubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  description?: string;
  tier: 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE' | 'CUSTOM';
  monthlyPrice: number;
  yearlyPrice: number;
  currency: string;
  maxUsers: number; // -1 = unlimited
  maxStorage: number; // in bytes
  maxStorageGB: number;
  maxProjects?: number; // -1 = unlimited
  maxClients?: number; // -1 = unlimited
  features: {
    customDomain: boolean;
    ssoEnabled: boolean;
    advancedReports: boolean;
    apiAccess: boolean;
    prioritySupport: boolean;
    whiteLabel: boolean;
  };
  isActive: boolean;
  isPublic: boolean;
}

// Current subscription details
export interface Subscription {
  id: string;
  planId: string;
  plan: SubscriptionPlan;
  status: 'ACTIVE' | 'TRIAL' | 'CANCELLED' | 'PAST_DUE' | 'PAUSED';
  billingCycle: 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  maxUsers: number;
  maxStorage: number;
  maxProjects?: number;
  maxClients?: number;
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
}

// Payment method details
export interface PaymentMethod {
  id: string;
  type: 'card' | 'bank_account';
  brand?: string; // visa, mastercard, etc.
  last4: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
}

export interface BillingInfo {
  // Current subscription
  subscription: Subscription | null;
  // Available plans for upgrade/downgrade
  availablePlans: SubscriptionPlan[];
  // Payment method
  paymentMethod: PaymentMethod | null;
  // Derived billing info
  nextBillingDate: string | null;
  monthlyAmount: number;
  // Legacy compatibility
  cardLast4: string;
  cardBrand: string;
}

// Form types
export interface DepartmentFormData {
  name: string;
  code: string;
  description: string;
}

export interface DesignationFormData {
  name: string;
  code: string;
  level: number;
  description: string;
}

export interface InviteFormData {
  email: string;
  role: TeamMember['role'];
}

// Error types
export interface OrgFormErrors {
  name?: string;
  email?: string;
  website?: string;
}

export interface DeptFormErrors {
  name?: string;
  code?: string;
}

export interface DesigFormErrors {
  name?: string;
  code?: string;
  level?: string;
}

export interface SettingsFormErrors {
  timezone?: string;
  dateFormat?: string;
  timeFormat?: string;
  currency?: string;
}

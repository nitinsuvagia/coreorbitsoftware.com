/**
 * @package @office-management/shared-types
 * 
 * Shared TypeScript types for Office Management System
 * Organized by domain modules for scalability
 */

// Common types - Base entities and API responses
export * from './common';

// Tenant types - Multi-tenancy
export * from './tenant';

// Auth types - Authentication & Authorization
export * from './auth';

// Employee types - Employee management
export * from './employee';

// Attendance types - Attendance & Leave
export * from './attendance';

// Project types - Project management
export * from './project';

// Task types - Task & Sprint management
export * from './task';

// Recruitment types - ATS & Hiring
export * from './recruitment';

// Client types - Client management & Billing
export * from './client';

// Asset types - IT Asset management
export * from './asset';

// HR Payroll types - Salary, Payroll, Performance
export * from './hr-payroll';

// Meeting types - Room booking & Meetings
export * from './meeting';

// Notification types - Notifications & Announcements
export * from './notification';

// Resource types - Resource allocation & Planning
export * from './resource';

// Domain Events - Event-driven architecture
export * from './events';

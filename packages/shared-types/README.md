# @oms/shared-types

Shared TypeScript types and interfaces for the Office Management System.

## Installation

This package is part of the monorepo and is automatically available to other packages.

```bash
# From any package in the monorepo
npm install @oms/shared-types
```

## Usage

```typescript
import { 
  Employee, 
  CreateEmployeeDTO,
  User,
  TokenPayload,
  Project,
  Task 
} from '@oms/shared-types';

// Use types in your code
const employee: Employee = {
  id: '123',
  firstName: 'John',
  lastName: 'Doe',
  // ... other fields
};
```

## Available Types

### Common
- `BaseEntity` - Base fields for all entities (id, createdAt, updatedAt)
- `AuditableEntity` - Adds createdBy, updatedBy
- `SoftDeletable` - Adds deletedAt, deletedBy, isDeleted
- `PaginationParams` - Pagination request parameters
- `PaginatedResponse<T>` - Paginated response wrapper
- `ApiResponse<T>` - Standard API response wrapper

### Tenant (Multi-tenancy)
- `Tenant` - Tenant organization
- `TenantSettings` - Tenant configuration
- `SubscriptionPlanDetails` - Subscription plans
- `TenantBilling` - Billing information

### Authentication
- `User` - User account
- `Role` - User roles
- `Permission` - Granular permissions
- `Session` - User sessions
- `TokenPayload` - JWT payload
- `AuthTokens` - Access & refresh tokens

### Employee
- `Employee` - Employee profile
- `Department` - Departments
- `Designation` - Job titles/designations
- `EmployeeSkill` - Skills with proficiency
- `OnboardingChecklist` - Onboarding tasks

### Attendance & Leave
- `Attendance` - Daily attendance
- `LeaveRequest` - Leave applications
- `LeaveBalance` - Leave quotas
- `Shift` - Work shifts
- `Holiday` - Company holidays

### Project
- `Project` - Projects
- `ProjectMember` - Team members
- `Milestone` - Project milestones

### Task
- `Task` - Tasks/issues
- `TaskComment` - Comments
- `TaskTimeLog` - Time entries
- `Sprint` - Agile sprints

### Recruitment
- `JobDescription` - Job postings
- `Candidate` - Candidate profiles
- `Application` - Job applications
- `SkillTest` - Assessment tests
- `Interview` - Interview schedules
- `InterviewFeedback` - Feedback forms
- `Offer` - Job offers

### Client
- `Client` - Client/customer profiles
- `Contract` - Contracts
- `Invoice` - Invoices
- `Payment` - Payments

### Asset
- `Asset` - Hardware/assets
- `AssetCategory` - Categories
- `SoftwareLicense` - Software licenses

### HR & Payroll
- `SalaryStructure` - Salary components
- `Payslip` - Monthly payslips
- `Reimbursement` - Expense claims
- `PerformanceReview` - Performance reviews

### Meeting
- `MeetingRoom` - Conference rooms
- `RoomBooking` - Room reservations
- `Meeting` - Meetings
- `CalendarEvent` - Calendar events

### Notification
- `Notification` - Notifications
- `NotificationPreference` - User preferences
- `Announcement` - Company announcements

### Resource
- `ResourceAllocation` - Project allocations
- `ResourceDemand` - Resource requests
- `BenchResource` - Bench tracking

### Events (Domain Events)
- All domain events for event-driven architecture
- See `events.ts` for complete list

## Building

```bash
npm run build
```

## Development

```bash
npm run dev
```

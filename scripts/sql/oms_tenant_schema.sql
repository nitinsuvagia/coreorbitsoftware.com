-- =============================================================================
-- OMS TENANT DATABASE SCHEMA
-- =============================================================================
-- Purpose: Complete schema for tenant databases (oms_tenant_{slug})
-- Each tenant gets their own database with this schema
-- Run this after creating the tenant database
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- DROP EXISTING (for clean reinstall)
-- =============================================================================
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO public;

-- =============================================================================
-- ENUMS
-- =============================================================================

-- User & Auth enums
CREATE TYPE "UserStatus" AS ENUM ('PENDING', 'ACTIVE', 'INACTIVE', 'LOCKED', 'SUSPENDED');
CREATE TYPE "AuthProvider" AS ENUM ('LOCAL', 'GOOGLE', 'MICROSOFT', 'SAML', 'LDAP', 'OAUTH', 'OIDC');
CREATE TYPE "Theme" AS ENUM ('LIGHT', 'DARK', 'SYSTEM');
CREATE TYPE "PermissionScope" AS ENUM ('OWN', 'TEAM', 'DEPARTMENT', 'ALL');
CREATE TYPE "PermissionLevel" AS ENUM ('VIEW', 'EDIT', 'DELETE', 'ADMIN');

-- Team enum
CREATE TYPE "TeamMemberRole" AS ENUM ('LEAD', 'MEMBER', 'VIEWER');

-- Employee enums
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY');
CREATE TYPE "MaritalStatus" AS ENUM ('SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED', 'OTHER');
CREATE TYPE "EmploymentType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN', 'INTERNSHIP', 'CONSULTANT', 'TEMPORARY');
CREATE TYPE "EmployeeStatus" AS ENUM ('ACTIVE', 'ON_LEAVE', 'PROBATION', 'NOTICE_PERIOD', 'TERMINATED', 'RESIGNED', 'RETIRED');

-- Document enum
CREATE TYPE "DocumentType" AS ENUM ('RESUME', 'ID_PROOF', 'ADDRESS_PROOF', 'EDUCATION', 'EXPERIENCE', 'OFFER_LETTER', 'CONTRACT', 'NDA', 'TAX_FORM', 'CERTIFICATION', 'OTHER');

-- Bank enum
CREATE TYPE "BankAccountType" AS ENUM ('SAVINGS', 'CHECKING', 'CURRENT');

-- Education enums
CREATE TYPE "EducationType" AS ENUM ('HIGH_SCHOOL', 'INTERMEDIATE', 'DIPLOMA', 'BACHELORS', 'MASTERS', 'DOCTORATE', 'POST_DOCTORATE', 'CERTIFICATION', 'VOCATIONAL', 'OTHER');
CREATE TYPE "InstitutionType" AS ENUM ('SCHOOL', 'COLLEGE', 'UNIVERSITY', 'INSTITUTE', 'ONLINE', 'OTHER');
CREATE TYPE "GradeType" AS ENUM ('PERCENTAGE', 'CGPA_10', 'CGPA_4', 'GRADE_LETTER', 'DIVISION', 'PASS_FAIL');

-- Calendar enums
CREATE TYPE "CalendarEventType" AS ENUM ('MEETING', 'TASK', 'REMINDER', 'LEAVE', 'HOLIDAY', 'BIRTHDAY', 'OTHER');
CREATE TYPE "CalendarEventStatus" AS ENUM ('CONFIRMED', 'TENTATIVE', 'CANCELLED');
CREATE TYPE "AttendeeStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'TENTATIVE');

-- Holiday enums
CREATE TYPE "holiday_type" AS ENUM ('PUBLIC', 'OPTIONAL', 'RESTRICTED');
CREATE TYPE "employee_optional_holiday_status" AS ENUM ('OPTED', 'CANCELLED');

-- Performance enum
CREATE TYPE "ReviewStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'ACKNOWLEDGED', 'COMPLETED');

-- Notification enum
CREATE TYPE "notification_type" AS ENUM ('INFO', 'SUCCESS', 'WARNING', 'CRITICAL');

-- Todo enums
CREATE TYPE "todo_priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
CREATE TYPE "todo_status" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- HR Alert enum
CREATE TYPE "hr_alert_type" AS ENUM ('INFO', 'SUCCESS', 'WARNING', 'CRITICAL');

-- Activity enum
CREATE TYPE "activity_type" AS ENUM ('HIRE', 'EXIT', 'PROMOTION', 'TRAINING', 'LEAVE', 'PERFORMANCE', 'DOCUMENT', 'GRIEVANCE', 'INTERVIEW', 'CANDIDATE', 'ONBOARDING', 'OFFBOARDING', 'COMPLIANCE', 'ATTENDANCE');

-- Job/Recruitment enums
CREATE TYPE "JobStatus" AS ENUM ('OPEN', 'ON_HOLD', 'CLOSED', 'COMPLETED');
CREATE TYPE "CandidateStatus" AS ENUM ('APPLIED', 'SCREENING', 'SHORTLISTED', 'INTERVIEWED', 'OFFERED', 'OFFER_ACCEPTED', 'ONBOARDING_IN_PROGRESS', 'ONBOARDING_COMPLETED', 'HIRED', 'REJECTED', 'WITHDRAWN');
CREATE TYPE "CandidateStage" AS ENUM ('APPLICATION', 'PHONE_SCREEN', 'TECHNICAL_INTERVIEW', 'HR_INTERVIEW', 'FINAL_INTERVIEW', 'OFFER', 'ONBOARDING');

-- Interview enums
CREATE TYPE "InterviewType" AS ENUM ('PHONE_SCREEN', 'TECHNICAL', 'HR', 'MANAGER', 'FINAL', 'ASSIGNMENT', 'ASSESSMENT');
CREATE TYPE "InterviewMode" AS ENUM ('VIDEO', 'PHONE', 'IN_PERSON');
CREATE TYPE "InterviewStatus" AS ENUM ('SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'RESCHEDULED', 'NO_SHOW');
CREATE TYPE "Recommendation" AS ENUM ('STRONG_HIRE', 'HIRE', 'MAYBE', 'NO_HIRE', 'STRONG_NO_HIRE');

-- Assessment enums
CREATE TYPE "AssessmentDifficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD', 'EXPERT');
CREATE TYPE "AssessmentTestStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE "AssessmentQuestionType" AS ENUM ('MULTIPLE_CHOICE', 'MULTIPLE_SELECT', 'TRUE_FALSE', 'SHORT_ANSWER', 'ESSAY', 'CODING');
CREATE TYPE "AssessmentInvitationStatus" AS ENUM ('PENDING', 'SENT', 'OPENED', 'STARTED', 'COMPLETED', 'EXPIRED', 'CANCELLED');
CREATE TYPE "AssessmentResultStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'TERMINATED', 'TIMED_OUT');

-- Email Template enum
CREATE TYPE "EmailTemplateCategory" AS ENUM ('SYSTEM', 'HR', 'RECRUITMENT', 'ATTENDANCE', 'PROJECT', 'CUSTOM');

-- =============================================================================
-- TABLES
-- =============================================================================

-- Designations (no FK dependencies)
CREATE TABLE "designations" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "name" VARCHAR(255) NOT NULL,
    "code" VARCHAR(50) NOT NULL UNIQUE,
    "level" INTEGER NOT NULL DEFAULT 1,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Departments
CREATE TABLE "departments" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "name" VARCHAR(255) NOT NULL,
    "code" VARCHAR(50) NOT NULL UNIQUE,
    "description" TEXT,
    "parent_id" UUID,
    "manager_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "deleted_at" TIMESTAMPTZ
);

-- Employees
CREATE TABLE "employees" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "employee_code" VARCHAR(50) NOT NULL UNIQUE,
    "department_id" UUID,
    "reporting_manager_id" UUID,
    "designation_id" UUID,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "middle_name" VARCHAR(100),
    "display_name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL UNIQUE,
    "personal_email" VARCHAR(255),
    "phone" VARCHAR(50),
    "mobile" VARCHAR(50),
    "date_of_birth" DATE,
    "gender" "Gender",
    "marital_status" "MaritalStatus",
    "nationality" VARCHAR(100),
    "blood_group" VARCHAR(10),
    "avatar" TEXT,
    "address_line_1" TEXT,
    "address_line_2" TEXT,
    "city" VARCHAR(100),
    "state" VARCHAR(100),
    "country" VARCHAR(100),
    "postal_code" VARCHAR(20),
    "employment_type" "EmploymentType" NOT NULL DEFAULT 'FULL_TIME',
    "status" "EmployeeStatus" NOT NULL DEFAULT 'ACTIVE',
    "join_date" DATE NOT NULL,
    "confirmation_date" DATE,
    "probation_end_date" DATE,
    "exit_date" DATE,
    "exit_reason" TEXT,
    "work_location" VARCHAR(255),
    "work_shift" VARCHAR(100),
    "timezone" VARCHAR(50) NOT NULL DEFAULT 'UTC',
    "base_salary" DECIMAL(12,2),
    "currency" VARCHAR(10) NOT NULL DEFAULT 'USD',
    "skills" TEXT[] DEFAULT '{}',
    "certifications" TEXT[] DEFAULT '{}',
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "deleted_at" TIMESTAMPTZ
);

-- Users (tenant employees who can login)
CREATE TABLE "users" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "employee_id" UUID UNIQUE,
    "email" VARCHAR(255) NOT NULL UNIQUE,
    "username" VARCHAR(100) UNIQUE,
    "password_hash" TEXT,
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING',
    "auth_provider" "AuthProvider" NOT NULL DEFAULT 'LOCAL',
    "provider_id" VARCHAR(255),
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "display_name" VARCHAR(255) NOT NULL,
    "avatar" TEXT,
    "phone" VARCHAR(50),
    "timezone" VARCHAR(50) NOT NULL DEFAULT 'UTC',
    "language" VARCHAR(10) NOT NULL DEFAULT 'en',
    "theme" "Theme" NOT NULL DEFAULT 'SYSTEM',
    "appearance_preferences" JSONB,
    "notify_email" BOOLEAN NOT NULL DEFAULT true,
    "notify_push" BOOLEAN NOT NULL DEFAULT true,
    "notify_desktop" BOOLEAN NOT NULL DEFAULT true,
    "mfa_enabled" BOOLEAN NOT NULL DEFAULT false,
    "mfa_secret" TEXT,
    "mfa_backup_codes" TEXT[] DEFAULT '{}',
    "password_changed_at" TIMESTAMPTZ,
    "login_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMPTZ,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "email_verified_at" TIMESTAMPTZ,
    "last_login_at" TIMESTAMPTZ,
    "last_activity_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "deleted_at" TIMESTAMPTZ
);

-- User Sessions
CREATE TABLE "user_sessions" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL UNIQUE,
    "token_family" VARCHAR(255) NOT NULL,
    "ip_address" VARCHAR(50) NOT NULL,
    "user_agent" TEXT NOT NULL,
    "device_id" VARCHAR(255),
    "expires_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "last_activity_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "revoked_at" TIMESTAMPTZ
);

-- Login History
CREATE TABLE "login_history" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "timestamp" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "ip_address" VARCHAR(50) NOT NULL,
    "user_agent" TEXT NOT NULL,
    "location" VARCHAR(255),
    "success" BOOLEAN NOT NULL,
    "failure_reason" TEXT,
    "mfa_used" BOOLEAN NOT NULL DEFAULT false
);

-- Password Reset Tokens
CREATE TABLE "password_reset_tokens" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "token" VARCHAR(255) NOT NULL UNIQUE,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "used_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Email Verification Tokens
CREATE TABLE "email_verification_tokens" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "token" VARCHAR(255) NOT NULL UNIQUE,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "used_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Roles
CREATE TABLE "roles" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "name" VARCHAR(100) NOT NULL UNIQUE,
    "slug" VARCHAR(100) NOT NULL UNIQUE,
    "description" TEXT,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Permissions
CREATE TABLE "permissions" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "resource" VARCHAR(100) NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "description" TEXT,
    UNIQUE("resource", "action")
);

-- Role Permissions
CREATE TABLE "role_permissions" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "role_id" UUID NOT NULL,
    "permission_id" UUID NOT NULL,
    "scope" "PermissionScope" NOT NULL DEFAULT 'ALL',
    "conditions" JSONB,
    UNIQUE("role_id", "permission_id")
);

-- User Roles
CREATE TABLE "user_roles" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "assigned_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "assigned_by" UUID,
    "expires_at" TIMESTAMPTZ,
    UNIQUE("user_id", "role_id")
);

-- Teams
CREATE TABLE "teams" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "name" VARCHAR(255) NOT NULL,
    "code" VARCHAR(50) NOT NULL UNIQUE,
    "description" TEXT,
    "department_id" UUID,
    "leader_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "color" VARCHAR(20) DEFAULT 'blue',
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "deleted_at" TIMESTAMPTZ
);

-- Team Members
CREATE TABLE "team_members" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "team_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "team_role" "TeamMemberRole" NOT NULL DEFAULT 'MEMBER',
    "joined_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "left_at" TIMESTAMPTZ,
    UNIQUE("team_id", "employee_id")
);

-- Employee Documents
CREATE TABLE "employee_documents" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "employee_id" UUID NOT NULL,
    "type" "DocumentType" NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "expiry_date" DATE,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "verified_by" UUID,
    "verified_at" TIMESTAMPTZ,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Emergency Contacts
CREATE TABLE "emergency_contacts" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "employee_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "relationship" VARCHAR(100) NOT NULL,
    "phone" VARCHAR(50) NOT NULL,
    "alternate_phone" VARCHAR(50),
    "email" VARCHAR(255),
    "address" TEXT,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Bank Details
CREATE TABLE "bank_details" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "employee_id" UUID NOT NULL,
    "bank_name" VARCHAR(255) NOT NULL,
    "branch_name" VARCHAR(255),
    "account_number" VARCHAR(50) NOT NULL,
    "account_type" "BankAccountType" NOT NULL DEFAULT 'SAVINGS',
    "account_holder_name" VARCHAR(255),
    "routing_number" VARCHAR(50),
    "swift_code" VARCHAR(20),
    "ifsc_code" VARCHAR(20),
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Employee Education
CREATE TABLE "employee_educations" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "employee_id" UUID NOT NULL,
    "education_type" "EducationType" NOT NULL,
    "institution_name" VARCHAR(255) NOT NULL,
    "institution_type" "InstitutionType" NOT NULL DEFAULT 'UNIVERSITY',
    "degree" VARCHAR(255),
    "field_of_study" VARCHAR(255),
    "specialization" VARCHAR(255),
    "enrollment_year" INTEGER NOT NULL,
    "completion_year" INTEGER,
    "is_ongoing" BOOLEAN NOT NULL DEFAULT false,
    "grade_type" "GradeType" NOT NULL DEFAULT 'PERCENTAGE',
    "grade" VARCHAR(50),
    "percentage" DECIMAL(5,2),
    "board_university" VARCHAR(255),
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Employee Custom Fields
CREATE TABLE "employee_custom_fields" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "employee_id" UUID NOT NULL,
    "field_key" VARCHAR(100) NOT NULL,
    "field_value" TEXT,
    "field_type" VARCHAR(50) NOT NULL DEFAULT 'text',
    "source" VARCHAR(50),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE("employee_id", "field_key")
);

-- Folders
CREATE TABLE "folders" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "name" VARCHAR(255) NOT NULL,
    "path" TEXT NOT NULL,
    "parent_id" UUID,
    "depth" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "color" VARCHAR(20),
    "is_starred" BOOLEAN NOT NULL DEFAULT false,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMPTZ,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Folder Permissions
CREATE TABLE "folder_permissions" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "folder_id" UUID NOT NULL,
    "user_id" UUID,
    "role_id" UUID,
    "permission" "PermissionLevel" NOT NULL DEFAULT 'VIEW',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE("folder_id", "user_id"),
    UNIQUE("folder_id", "role_id")
);

-- Files
CREATE TABLE "files" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "folder_id" UUID,
    "name" VARCHAR(255) NOT NULL,
    "storage_name" VARCHAR(255) NOT NULL,
    "storage_key" TEXT NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "size" INTEGER NOT NULL,
    "description" TEXT,
    "tags" TEXT[] DEFAULT '{}',
    "thumbnails" JSONB,
    "entity_type" VARCHAR(100),
    "entity_id" UUID,
    "uploaded_by" UUID NOT NULL,
    "current_version" INTEGER NOT NULL DEFAULT 1,
    "is_starred" BOOLEAN NOT NULL DEFAULT false,
    "is_shared" BOOLEAN NOT NULL DEFAULT false,
    "share_link" VARCHAR(255),
    "share_expiry" TIMESTAMPTZ,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- File Permissions
CREATE TABLE "file_permissions" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "file_id" UUID NOT NULL,
    "user_id" UUID,
    "role_id" UUID,
    "permission" "PermissionLevel" NOT NULL DEFAULT 'VIEW',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE("file_id", "user_id"),
    UNIQUE("file_id", "role_id")
);

-- File Versions
CREATE TABLE "file_versions" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "file_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "storage_name" VARCHAR(255) NOT NULL,
    "storage_key" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "uploaded_by" UUID NOT NULL,
    "change_note" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE("file_id", "version")
);

-- Calendar Events
CREATE TABLE "calendar_events" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "start_time" TIMESTAMPTZ NOT NULL,
    "end_time" TIMESTAMPTZ NOT NULL,
    "all_day" BOOLEAN NOT NULL DEFAULT false,
    "location" VARCHAR(255),
    "meeting_url" TEXT,
    "type" "CalendarEventType" NOT NULL DEFAULT 'MEETING',
    "status" "CalendarEventStatus" NOT NULL DEFAULT 'CONFIRMED',
    "recurrence" JSONB,
    "reminders" INTEGER[] DEFAULT '{}',
    "color" VARCHAR(20),
    "is_private" BOOLEAN NOT NULL DEFAULT false,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Calendar Attendees
CREATE TABLE "calendar_attendees" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "event_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "status" "AttendeeStatus" NOT NULL DEFAULT 'PENDING',
    "is_organizer" BOOLEAN NOT NULL DEFAULT false,
    "is_required" BOOLEAN NOT NULL DEFAULT true,
    "responded_at" TIMESTAMPTZ,
    UNIQUE("event_id", "user_id")
);

-- Holidays
CREATE TABLE "holidays" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "name" VARCHAR(100) NOT NULL,
    "date" DATE NOT NULL,
    "type" "holiday_type" NOT NULL DEFAULT 'PUBLIC',
    "description" VARCHAR(500),
    "is_recurring" BOOLEAN NOT NULL DEFAULT false,
    "applies_to_all" BOOLEAN NOT NULL DEFAULT true,
    "created_by" UUID,
    "updated_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE("date", "name")
);

-- Holiday Departments
CREATE TABLE "holiday_departments" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "holiday_id" UUID NOT NULL,
    "department_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE("holiday_id", "department_id")
);

-- Employee Optional Holidays
CREATE TABLE "employee_optional_holidays" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "employee_id" UUID NOT NULL,
    "holiday_id" UUID NOT NULL,
    "year" INTEGER NOT NULL,
    "status" "employee_optional_holiday_status" NOT NULL DEFAULT 'OPTED',
    "opted_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "cancelled_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE("employee_id", "holiday_id", "year")
);

-- Attendance
CREATE TABLE "attendances" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "employee_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "check_in_time" TIMESTAMPTZ,
    "check_out_time" TIMESTAMPTZ,
    "check_in_location" JSONB,
    "check_out_location" JSONB,
    "check_in_device" VARCHAR(255),
    "check_out_device" VARCHAR(255),
    "work_minutes" INTEGER NOT NULL DEFAULT 0,
    "overtime_minutes" INTEGER NOT NULL DEFAULT 0,
    "break_minutes" INTEGER NOT NULL DEFAULT 0,
    "status" VARCHAR(50) NOT NULL DEFAULT 'present',
    "is_late" BOOLEAN NOT NULL DEFAULT false,
    "is_early_leave" BOOLEAN NOT NULL DEFAULT false,
    "is_remote" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "created_by" UUID,
    "updated_by" UUID
);

-- Leave Types
CREATE TABLE "leave_types" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(50) NOT NULL UNIQUE,
    "description" TEXT,
    "default_days_per_year" INTEGER NOT NULL,
    "accrual_type" VARCHAR(50) NOT NULL DEFAULT 'yearly',
    "carry_forward_allowed" BOOLEAN NOT NULL DEFAULT false,
    "max_carry_forward_days" INTEGER,
    "requires_approval" BOOLEAN NOT NULL DEFAULT true,
    "is_paid" BOOLEAN NOT NULL DEFAULT true,
    "color" VARCHAR(20) NOT NULL DEFAULT '#3B82F6',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "created_by" UUID,
    "updated_by" UUID
);

-- Leave Requests
CREATE TABLE "leave_requests" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "employee_id" UUID NOT NULL,
    "leave_type_id" UUID NOT NULL,
    "from_date" DATE NOT NULL,
    "to_date" DATE NOT NULL,
    "total_days" DECIMAL(4,1) NOT NULL,
    "is_half_day" BOOLEAN NOT NULL DEFAULT false,
    "half_day_type" VARCHAR(50),
    "reason" TEXT NOT NULL,
    "attachment_url" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'pending',
    "approved_by" UUID,
    "approved_at" TIMESTAMPTZ,
    "approver_comments" TEXT,
    "rejection_reason" TEXT,
    "cancelled_by" UUID,
    "cancelled_at" TIMESTAMPTZ,
    "cancellation_reason" TEXT,
    "created_by" UUID,
    "updated_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Leave Balances
CREATE TABLE "leave_balances" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "employee_id" UUID NOT NULL,
    "leave_type_id" UUID NOT NULL,
    "year" INTEGER NOT NULL,
    "total_days" DECIMAL(4,1) NOT NULL,
    "used_days" DECIMAL(4,1) NOT NULL DEFAULT 0,
    "pending_days" DECIMAL(4,1) NOT NULL DEFAULT 0,
    "carry_forward_days" DECIMAL(4,1) NOT NULL DEFAULT 0,
    "adjustment_days" DECIMAL(4,1) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE("employee_id", "leave_type_id", "year")
);

-- Leave Balance Adjustments
CREATE TABLE "leave_balance_adjustments" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "leave_balance_id" UUID NOT NULL,
    "adjustment_days" DECIMAL(4,1) NOT NULL,
    "reason" TEXT NOT NULL,
    "adjusted_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Performance Reviews
CREATE TABLE "performance_reviews" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "employee_id" UUID NOT NULL,
    "reviewer_id" UUID NOT NULL,
    "review_period" VARCHAR(100) NOT NULL,
    "performance_score" DECIMAL(3,1) NOT NULL,
    "quality_of_work" DECIMAL(3,1),
    "productivity" DECIMAL(3,1),
    "communication" DECIMAL(3,1),
    "teamwork" DECIMAL(3,1),
    "initiative" DECIMAL(3,1),
    "punctuality" DECIMAL(3,1),
    "strengths" TEXT,
    "areas_for_improvement" TEXT,
    "goals" TEXT,
    "reviewer_comments" TEXT,
    "employee_comments" TEXT,
    "status" "ReviewStatus" NOT NULL DEFAULT 'DRAFT',
    "review_date" DATE,
    "acknowledged_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Project Members
CREATE TABLE "project_members" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "employee_id" UUID NOT NULL
);

-- Project Teams
CREATE TABLE "project_teams" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "team_id" UUID NOT NULL
);

-- Tasks
CREATE TABLE "tasks" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "created_by_id" UUID NOT NULL
);

-- Task Assignees
CREATE TABLE "task_assignees" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "task_id" UUID NOT NULL,
    "user_id" UUID NOT NULL
);

-- Timesheets
CREATE TABLE "timesheets" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "employee_id" UUID NOT NULL
);

-- Time Entries
CREATE TABLE "time_entries" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "task_id" UUID
);

-- Asset Assignments
CREATE TABLE "asset_assignments" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "employee_id" UUID NOT NULL
);

-- Notifications
CREATE TABLE "notifications" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "type" "notification_type" NOT NULL DEFAULT 'INFO',
    "category" VARCHAR(100),
    "title" VARCHAR(255) NOT NULL,
    "message" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMPTZ,
    "action_url" TEXT,
    "action_label" VARCHAR(100),
    "metadata" JSONB,
    "expires_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User Todos
CREATE TABLE "user_todos" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "due_date" DATE,
    "due_time" TIMESTAMPTZ,
    "priority" "todo_priority" NOT NULL DEFAULT 'MEDIUM',
    "status" "todo_status" NOT NULL DEFAULT 'PENDING',
    "is_completed" BOOLEAN NOT NULL DEFAULT false,
    "completed_at" TIMESTAMPTZ,
    "category" VARCHAR(100),
    "tags" TEXT[] DEFAULT '{}',
    "reminder" TIMESTAMPTZ,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- HR Alerts
CREATE TABLE "hr_alerts" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "type" "hr_alert_type" NOT NULL DEFAULT 'INFO',
    "category" VARCHAR(100) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_dismissed" BOOLEAN NOT NULL DEFAULT false,
    "dismissed_by" UUID,
    "dismissed_at" TIMESTAMPTZ,
    "action_url" TEXT,
    "action_label" VARCHAR(100),
    "priority" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "expires_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Activities
CREATE TABLE "activities" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "type" "activity_type" NOT NULL,
    "action" VARCHAR(255) NOT NULL,
    "entity_type" VARCHAR(100) NOT NULL,
    "entity_id" UUID NOT NULL,
    "entity_name" VARCHAR(255),
    "user_id" UUID,
    "user_name" VARCHAR(255),
    "details" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Comments
CREATE TABLE "comments" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "task_id" UUID
);

-- Audit Logs
CREATE TABLE "audit_logs" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "user_id" UUID
);

-- Job Descriptions
CREATE TABLE "job_descriptions" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "title" VARCHAR(255) NOT NULL,
    "department" VARCHAR(255) NOT NULL,
    "location" VARCHAR(255) NOT NULL,
    "employment_type" "EmploymentType" NOT NULL,
    "salary_min" INTEGER NOT NULL,
    "salary_max" INTEGER NOT NULL,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'USD',
    "status" "JobStatus" NOT NULL DEFAULT 'OPEN',
    "openings" INTEGER NOT NULL DEFAULT 1,
    "experience_min" INTEGER NOT NULL DEFAULT 0,
    "experience_max" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "requirements" TEXT[] DEFAULT '{}',
    "responsibilities" TEXT[] DEFAULT '{}',
    "benefits" TEXT[] DEFAULT '{}',
    "tech_stack" TEXT[] DEFAULT '{}',
    "posted_date" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "closing_date" DATE NOT NULL,
    "total_applied" INTEGER,
    "shortlisted" INTEGER,
    "interviewed" INTEGER,
    "hired" INTEGER,
    "created_by" UUID,
    "updated_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "deleted_at" TIMESTAMPTZ
);

-- Job Candidates
CREATE TABLE "job_candidates" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "job_id" UUID NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(50),
    "resume_url" TEXT,
    "cover_letter" TEXT,
    "linkedin_url" TEXT,
    "portfolio_url" TEXT,
    "source" VARCHAR(100),
    "status" "CandidateStatus" NOT NULL DEFAULT 'APPLIED',
    "stage" "CandidateStage" NOT NULL DEFAULT 'APPLICATION',
    "rating" INTEGER DEFAULT 0,
    "current_company" VARCHAR(255),
    "current_role" VARCHAR(255),
    "experience_years" INTEGER,
    "expected_salary" INTEGER,
    "notice_period" VARCHAR(100),
    "skills" TEXT[] DEFAULT '{}',
    "notes" TEXT,
    "interview_notes" TEXT,
    "applied_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "screened_at" TIMESTAMPTZ,
    "interviewed_at" TIMESTAMPTZ,
    "offered_at" TIMESTAMPTZ,
    "hired_at" TIMESTAMPTZ,
    "rejected_at" TIMESTAMPTZ,
    "offer_token" VARCHAR(255) UNIQUE,
    "offer_expires_at" TIMESTAMPTZ,
    "offer_salary" INTEGER,
    "offer_currency" VARCHAR(10) DEFAULT 'INR',
    "offer_joining_date" DATE,
    "offer_designation" VARCHAR(255),
    "offer_department" VARCHAR(255),
    "offer_terms_accepted" BOOLEAN NOT NULL DEFAULT false,
    "offer_signature" TEXT,
    "offer_responded_at" TIMESTAMPTZ,
    "offer_response" VARCHAR(50),
    "offer_letter_url" TEXT,
    "onboarding_token" VARCHAR(255) UNIQUE,
    "onboarding_expires_at" TIMESTAMPTZ,
    "onboarding_started_at" TIMESTAMPTZ,
    "onboarding_completed_at" TIMESTAMPTZ,
    "onboarding_temp_password" TEXT,
    "onboarding_address" JSONB,
    "onboarding_emergency" JSONB,
    "onboarding_education" JSONB,
    "onboarding_documents" JSONB,
    "onboarding_bank_details" JSONB,
    "onboarding_personal" JSONB,
    "onboarding_declarations" JSONB,
    "onboarding_signature" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Interviews
CREATE TABLE "interviews" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "candidate_id" UUID NOT NULL,
    "job_id" UUID NOT NULL,
    "type" "InterviewType" NOT NULL,
    "round_number" INTEGER NOT NULL DEFAULT 1,
    "total_rounds" INTEGER NOT NULL DEFAULT 4,
    "scheduled_at" TIMESTAMPTZ NOT NULL,
    "duration" INTEGER NOT NULL DEFAULT 60,
    "mode" "InterviewMode" NOT NULL,
    "meeting_link" TEXT,
    "location" VARCHAR(255),
    "instructions" TEXT,
    "status" "InterviewStatus" NOT NULL DEFAULT 'SCHEDULED',
    "assessment_test_id" UUID,
    "started_at" TIMESTAMPTZ,
    "completed_at" TIMESTAMPTZ,
    "cancelled_at" TIMESTAMPTZ,
    "cancel_reason" TEXT,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Interview Panelists
CREATE TABLE "interview_panelists" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "interview_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "is_lead" BOOLEAN NOT NULL DEFAULT false,
    "joined_at" TIMESTAMPTZ,
    "feedback_submitted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE("interview_id", "employee_id")
);

-- Interview Feedback
CREATE TABLE "interview_feedback" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "interview_id" UUID NOT NULL,
    "interviewer_id" UUID NOT NULL,
    "technical_rating" INTEGER,
    "problem_solving_rating" INTEGER,
    "communication_rating" INTEGER,
    "cultural_fit_rating" INTEGER,
    "leadership_rating" INTEGER,
    "overall_rating" INTEGER NOT NULL DEFAULT 0,
    "strengths" TEXT,
    "weaknesses" TEXT,
    "comments" TEXT,
    "recommendation" "Recommendation" NOT NULL,
    "is_draft" BOOLEAN NOT NULL DEFAULT false,
    "submitted_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE("interview_id", "interviewer_id")
);

-- Assessment Tests
CREATE TABLE "assessment_tests" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "instructions" TEXT,
    "category" VARCHAR(100),
    "difficulty" "AssessmentDifficulty" NOT NULL DEFAULT 'MEDIUM',
    "duration" INTEGER NOT NULL DEFAULT 60,
    "passing_score" INTEGER NOT NULL DEFAULT 70,
    "max_attempts" INTEGER NOT NULL DEFAULT 1,
    "shuffle_questions" BOOLEAN NOT NULL DEFAULT false,
    "shuffle_options" BOOLEAN NOT NULL DEFAULT false,
    "show_results" BOOLEAN NOT NULL DEFAULT true,
    "proctoring" BOOLEAN NOT NULL DEFAULT false,
    "webcam_required" BOOLEAN NOT NULL DEFAULT false,
    "fullscreen" BOOLEAN NOT NULL DEFAULT true,
    "tab_switch_limit" INTEGER NOT NULL DEFAULT 3,
    "status" "AssessmentTestStatus" NOT NULL DEFAULT 'DRAFT',
    "published_at" TIMESTAMPTZ,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Assessment Sections
CREATE TABLE "assessment_sections" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "test_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "time_limit" INTEGER,
    "weightage" FLOAT NOT NULL DEFAULT 0,
    "selection_mode" VARCHAR(50),
    "random_count" INTEGER DEFAULT 0,
    "shuffle_questions" BOOLEAN DEFAULT false,
    "category" VARCHAR(100),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Assessment Questions
CREATE TABLE "assessment_questions" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "test_id" UUID,
    "section_id" UUID,
    "type" "AssessmentQuestionType" NOT NULL,
    "question" TEXT NOT NULL,
    "code" TEXT,
    "code_language" VARCHAR(50),
    "options" JSONB,
    "correct_answer" TEXT,
    "explanation" TEXT,
    "category" VARCHAR(100),
    "difficulty" "AssessmentDifficulty",
    "tags" JSONB,
    "points" INTEGER NOT NULL DEFAULT 1,
    "negative_marking" FLOAT NOT NULL DEFAULT 0,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Assessment Invitations
CREATE TABLE "assessment_invitations" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "test_id" UUID NOT NULL,
    "candidate_id" UUID,
    "interview_id" UUID UNIQUE,
    "candidate_email" VARCHAR(255) NOT NULL,
    "candidate_name" VARCHAR(255) NOT NULL,
    "assessment_code" VARCHAR(100) NOT NULL UNIQUE,
    "valid_from" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "valid_until" TIMESTAMPTZ NOT NULL,
    "status" "AssessmentInvitationStatus" NOT NULL DEFAULT 'PENDING',
    "email_sent_at" TIMESTAMPTZ,
    "reminder_sent_at" TIMESTAMPTZ,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Assessment Results
CREATE TABLE "assessment_results" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "invitation_id" UUID NOT NULL UNIQUE,
    "test_id" UUID NOT NULL,
    "test_name" VARCHAR(255) NOT NULL,
    "candidate_email" VARCHAR(255) NOT NULL,
    "candidate_name" VARCHAR(255) NOT NULL,
    "started_at" TIMESTAMPTZ NOT NULL,
    "completed_at" TIMESTAMPTZ,
    "time_taken" INTEGER,
    "total_questions" INTEGER NOT NULL,
    "attempted" INTEGER NOT NULL DEFAULT 0,
    "correct" INTEGER NOT NULL DEFAULT 0,
    "wrong" INTEGER NOT NULL DEFAULT 0,
    "skipped" INTEGER NOT NULL DEFAULT 0,
    "score" FLOAT NOT NULL DEFAULT 0,
    "max_score" INTEGER NOT NULL,
    "obtained_score" FLOAT NOT NULL,
    "passed" BOOLEAN NOT NULL DEFAULT false,
    "tab_switch_count" INTEGER NOT NULL DEFAULT 0,
    "warnings_count" INTEGER NOT NULL DEFAULT 0,
    "browser_info" TEXT,
    "ip_address" VARCHAR(50),
    "status" "AssessmentResultStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Assessment Answers
CREATE TABLE "assessment_answers" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "result_id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "answer" TEXT,
    "selected_options" JSONB,
    "is_correct" BOOLEAN,
    "points_earned" FLOAT NOT NULL DEFAULT 0,
    "time_taken" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE("result_id", "question_id")
);

-- Email Templates
CREATE TABLE "email_templates" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "name" VARCHAR(100) NOT NULL UNIQUE,
    "display_name" VARCHAR(255) NOT NULL,
    "category" "EmailTemplateCategory" NOT NULL DEFAULT 'SYSTEM',
    "description" TEXT,
    "subject" VARCHAR(500) NOT NULL,
    "html_content" TEXT NOT NULL,
    "text_content" TEXT,
    "variables" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_by" UUID,
    "updated_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Users
CREATE INDEX "idx_users_email" ON "users"("email");
CREATE INDEX "idx_users_status" ON "users"("status");

-- User Sessions
CREATE INDEX "idx_user_sessions_user_id" ON "user_sessions"("user_id");
CREATE INDEX "idx_user_sessions_token_hash" ON "user_sessions"("token_hash");

-- Login History
CREATE INDEX "idx_login_history_user_id" ON "login_history"("user_id");
CREATE INDEX "idx_login_history_timestamp" ON "login_history"("timestamp");

-- Password Reset Tokens
CREATE INDEX "idx_password_reset_tokens_token" ON "password_reset_tokens"("token");
CREATE INDEX "idx_password_reset_tokens_user_id" ON "password_reset_tokens"("user_id");

-- Email Verification Tokens
CREATE INDEX "idx_email_verification_tokens_token" ON "email_verification_tokens"("token");
CREATE INDEX "idx_email_verification_tokens_user_id" ON "email_verification_tokens"("user_id");

-- Roles
CREATE INDEX "idx_roles_slug" ON "roles"("slug");

-- Departments
CREATE INDEX "idx_departments_code" ON "departments"("code");
CREATE INDEX "idx_departments_parent_id" ON "departments"("parent_id");

-- Teams
CREATE INDEX "idx_teams_code" ON "teams"("code");
CREATE INDEX "idx_teams_department_id" ON "teams"("department_id");
CREATE INDEX "idx_teams_is_default" ON "teams"("is_default");

-- Employees
CREATE INDEX "idx_employees_email" ON "employees"("email");
CREATE INDEX "idx_employees_employee_code" ON "employees"("employee_code");
CREATE INDEX "idx_employees_department_id" ON "employees"("department_id");
CREATE INDEX "idx_employees_status" ON "employees"("status");

-- Designations
CREATE INDEX "idx_designations_code" ON "designations"("code");

-- Employee Documents
CREATE INDEX "idx_employee_documents_employee_id" ON "employee_documents"("employee_id");
CREATE INDEX "idx_employee_documents_type" ON "employee_documents"("type");

-- Emergency Contacts
CREATE INDEX "idx_emergency_contacts_employee_id" ON "emergency_contacts"("employee_id");

-- Bank Details
CREATE INDEX "idx_bank_details_employee_id" ON "bank_details"("employee_id");

-- Employee Educations
CREATE INDEX "idx_employee_educations_employee_id" ON "employee_educations"("employee_id");
CREATE INDEX "idx_employee_educations_education_type" ON "employee_educations"("education_type");

-- Employee Custom Fields
CREATE INDEX "idx_employee_custom_fields_employee_id" ON "employee_custom_fields"("employee_id");
CREATE INDEX "idx_employee_custom_fields_field_key" ON "employee_custom_fields"("field_key");

-- Folders
CREATE INDEX "idx_folders_parent_id" ON "folders"("parent_id");
CREATE INDEX "idx_folders_path" ON "folders"("path");
CREATE INDEX "idx_folders_is_deleted" ON "folders"("is_deleted");
CREATE INDEX "idx_folders_is_starred" ON "folders"("is_starred");

-- Folder Permissions
CREATE INDEX "idx_folder_permissions_folder_id" ON "folder_permissions"("folder_id");

-- Files
CREATE INDEX "idx_files_folder_id" ON "files"("folder_id");
CREATE INDEX "idx_files_entity" ON "files"("entity_type", "entity_id");
CREATE INDEX "idx_files_uploaded_by" ON "files"("uploaded_by");
CREATE INDEX "idx_files_is_starred" ON "files"("is_starred");
CREATE INDEX "idx_files_is_deleted" ON "files"("is_deleted");

-- File Permissions
CREATE INDEX "idx_file_permissions_file_id" ON "file_permissions"("file_id");

-- File Versions
CREATE INDEX "idx_file_versions_file_id" ON "file_versions"("file_id");

-- Calendar Events
CREATE INDEX "idx_calendar_events_created_by_id" ON "calendar_events"("created_by_id");
CREATE INDEX "idx_calendar_events_time" ON "calendar_events"("start_time", "end_time");

-- Calendar Attendees
CREATE INDEX "idx_calendar_attendees_user_id" ON "calendar_attendees"("user_id");

-- Holidays
CREATE INDEX "idx_holidays_date" ON "holidays"("date");
CREATE INDEX "idx_holidays_type" ON "holidays"("type");

-- Employee Optional Holidays
CREATE INDEX "idx_employee_optional_holidays_employee_year" ON "employee_optional_holidays"("employee_id", "year");
CREATE INDEX "idx_employee_optional_holidays_holiday_id" ON "employee_optional_holidays"("holiday_id");

-- Attendance
CREATE INDEX "idx_attendances_employee_date" ON "attendances"("employee_id", "date");
CREATE INDEX "idx_attendances_date" ON "attendances"("date");
CREATE INDEX "idx_attendances_status" ON "attendances"("status");

-- Leave Types
-- (code already unique)

-- Leave Balances
-- (unique constraint handles index)

-- Performance Reviews
CREATE INDEX "idx_performance_reviews_employee_id" ON "performance_reviews"("employee_id");
CREATE INDEX "idx_performance_reviews_reviewer_id" ON "performance_reviews"("reviewer_id");
CREATE INDEX "idx_performance_reviews_review_period" ON "performance_reviews"("review_period");
CREATE INDEX "idx_performance_reviews_status" ON "performance_reviews"("status");

-- Notifications
CREATE INDEX "idx_notifications_user_id" ON "notifications"("user_id");
CREATE INDEX "idx_notifications_is_read" ON "notifications"("is_read");
CREATE INDEX "idx_notifications_type" ON "notifications"("type");
CREATE INDEX "idx_notifications_created_at" ON "notifications"("created_at");

-- User Todos
CREATE INDEX "idx_user_todos_user_id" ON "user_todos"("user_id");
CREATE INDEX "idx_user_todos_status" ON "user_todos"("status");
CREATE INDEX "idx_user_todos_due_date" ON "user_todos"("due_date");
CREATE INDEX "idx_user_todos_is_completed" ON "user_todos"("is_completed");

-- HR Alerts
CREATE INDEX "idx_hr_alerts_is_active" ON "hr_alerts"("is_active");
CREATE INDEX "idx_hr_alerts_type" ON "hr_alerts"("type");
CREATE INDEX "idx_hr_alerts_category" ON "hr_alerts"("category");
CREATE INDEX "idx_hr_alerts_created_at" ON "hr_alerts"("created_at");

-- Activities
CREATE INDEX "idx_activities_entity_type" ON "activities"("entity_type");
CREATE INDEX "idx_activities_type" ON "activities"("type");
CREATE INDEX "idx_activities_created_at" ON "activities"("created_at");

-- Job Descriptions
CREATE INDEX "idx_job_descriptions_status" ON "job_descriptions"("status");
CREATE INDEX "idx_job_descriptions_department" ON "job_descriptions"("department");
CREATE INDEX "idx_job_descriptions_posted_date" ON "job_descriptions"("posted_date");

-- Job Candidates
CREATE INDEX "idx_job_candidates_job_id" ON "job_candidates"("job_id");
CREATE INDEX "idx_job_candidates_email" ON "job_candidates"("email");
CREATE INDEX "idx_job_candidates_status" ON "job_candidates"("status");
CREATE INDEX "idx_job_candidates_stage" ON "job_candidates"("stage");

-- Interviews
CREATE INDEX "idx_interviews_candidate_id" ON "interviews"("candidate_id");
CREATE INDEX "idx_interviews_job_id" ON "interviews"("job_id");
CREATE INDEX "idx_interviews_status" ON "interviews"("status");
CREATE INDEX "idx_interviews_scheduled_at" ON "interviews"("scheduled_at");
CREATE INDEX "idx_interviews_assessment_test_id" ON "interviews"("assessment_test_id");

-- Interview Panelists
CREATE INDEX "idx_interview_panelists_interview_id" ON "interview_panelists"("interview_id");
CREATE INDEX "idx_interview_panelists_employee_id" ON "interview_panelists"("employee_id");

-- Interview Feedback
CREATE INDEX "idx_interview_feedback_interview_id" ON "interview_feedback"("interview_id");
CREATE INDEX "idx_interview_feedback_interviewer_id" ON "interview_feedback"("interviewer_id");

-- Assessment Tests
CREATE INDEX "idx_assessment_tests_status" ON "assessment_tests"("status");
CREATE INDEX "idx_assessment_tests_category" ON "assessment_tests"("category");

-- Assessment Sections
CREATE INDEX "idx_assessment_sections_test_id" ON "assessment_sections"("test_id");

-- Assessment Questions
CREATE INDEX "idx_assessment_questions_test_id" ON "assessment_questions"("test_id");
CREATE INDEX "idx_assessment_questions_section_id" ON "assessment_questions"("section_id");
CREATE INDEX "idx_assessment_questions_type" ON "assessment_questions"("type");
CREATE INDEX "idx_assessment_questions_category" ON "assessment_questions"("category");
CREATE INDEX "idx_assessment_questions_difficulty" ON "assessment_questions"("difficulty");

-- Assessment Invitations
CREATE INDEX "idx_assessment_invitations_test_id" ON "assessment_invitations"("test_id");
CREATE INDEX "idx_assessment_invitations_candidate_id" ON "assessment_invitations"("candidate_id");
CREATE INDEX "idx_assessment_invitations_assessment_code" ON "assessment_invitations"("assessment_code");
CREATE INDEX "idx_assessment_invitations_status" ON "assessment_invitations"("status");

-- Assessment Results
CREATE INDEX "idx_assessment_results_invitation_id" ON "assessment_results"("invitation_id");
CREATE INDEX "idx_assessment_results_test_id" ON "assessment_results"("test_id");
CREATE INDEX "idx_assessment_results_status" ON "assessment_results"("status");
CREATE INDEX "idx_assessment_results_passed" ON "assessment_results"("passed");

-- Assessment Answers
CREATE INDEX "idx_assessment_answers_result_id" ON "assessment_answers"("result_id");
CREATE INDEX "idx_assessment_answers_question_id" ON "assessment_answers"("question_id");

-- Email Templates
CREATE INDEX "idx_email_templates_category" ON "email_templates"("category");
CREATE INDEX "idx_email_templates_is_active" ON "email_templates"("is_active");

-- =============================================================================
-- FOREIGN KEYS
-- =============================================================================

-- Departments
ALTER TABLE "departments" ADD CONSTRAINT "fk_departments_parent" FOREIGN KEY ("parent_id") REFERENCES "departments"("id");
ALTER TABLE "departments" ADD CONSTRAINT "fk_departments_manager" FOREIGN KEY ("manager_id") REFERENCES "employees"("id");

-- Employees
ALTER TABLE "employees" ADD CONSTRAINT "fk_employees_department" FOREIGN KEY ("department_id") REFERENCES "departments"("id");
ALTER TABLE "employees" ADD CONSTRAINT "fk_employees_reporting_manager" FOREIGN KEY ("reporting_manager_id") REFERENCES "employees"("id");
ALTER TABLE "employees" ADD CONSTRAINT "fk_employees_designation" FOREIGN KEY ("designation_id") REFERENCES "designations"("id");

-- Users
ALTER TABLE "users" ADD CONSTRAINT "fk_users_employee" FOREIGN KEY ("employee_id") REFERENCES "employees"("id");

-- User Sessions
ALTER TABLE "user_sessions" ADD CONSTRAINT "fk_user_sessions_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;

-- Login History
ALTER TABLE "login_history" ADD CONSTRAINT "fk_login_history_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;

-- Password Reset Tokens
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "fk_password_reset_tokens_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;

-- Email Verification Tokens
ALTER TABLE "email_verification_tokens" ADD CONSTRAINT "fk_email_verification_tokens_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;

-- Role Permissions
ALTER TABLE "role_permissions" ADD CONSTRAINT "fk_role_permissions_role" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE;
ALTER TABLE "role_permissions" ADD CONSTRAINT "fk_role_permissions_permission" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE;

-- User Roles
ALTER TABLE "user_roles" ADD CONSTRAINT "fk_user_roles_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "user_roles" ADD CONSTRAINT "fk_user_roles_role" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE;

-- Teams
ALTER TABLE "teams" ADD CONSTRAINT "fk_teams_department" FOREIGN KEY ("department_id") REFERENCES "departments"("id");
ALTER TABLE "teams" ADD CONSTRAINT "fk_teams_leader" FOREIGN KEY ("leader_id") REFERENCES "employees"("id");

-- Team Members
ALTER TABLE "team_members" ADD CONSTRAINT "fk_team_members_team" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE;
ALTER TABLE "team_members" ADD CONSTRAINT "fk_team_members_employee" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE;

-- Employee Documents
ALTER TABLE "employee_documents" ADD CONSTRAINT "fk_employee_documents_employee" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE;

-- Emergency Contacts
ALTER TABLE "emergency_contacts" ADD CONSTRAINT "fk_emergency_contacts_employee" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE;

-- Bank Details
ALTER TABLE "bank_details" ADD CONSTRAINT "fk_bank_details_employee" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE;

-- Employee Educations
ALTER TABLE "employee_educations" ADD CONSTRAINT "fk_employee_educations_employee" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE;

-- Employee Custom Fields
ALTER TABLE "employee_custom_fields" ADD CONSTRAINT "fk_employee_custom_fields_employee" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE;

-- Folders
ALTER TABLE "folders" ADD CONSTRAINT "fk_folders_parent" FOREIGN KEY ("parent_id") REFERENCES "folders"("id");
ALTER TABLE "folders" ADD CONSTRAINT "fk_folders_creator" FOREIGN KEY ("created_by") REFERENCES "users"("id");

-- Folder Permissions
ALTER TABLE "folder_permissions" ADD CONSTRAINT "fk_folder_permissions_folder" FOREIGN KEY ("folder_id") REFERENCES "folders"("id") ON DELETE CASCADE;

-- Files
ALTER TABLE "files" ADD CONSTRAINT "fk_files_folder" FOREIGN KEY ("folder_id") REFERENCES "folders"("id");
ALTER TABLE "files" ADD CONSTRAINT "fk_files_uploader" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id");

-- File Permissions
ALTER TABLE "file_permissions" ADD CONSTRAINT "fk_file_permissions_file" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE CASCADE;

-- File Versions
ALTER TABLE "file_versions" ADD CONSTRAINT "fk_file_versions_file" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE CASCADE;
ALTER TABLE "file_versions" ADD CONSTRAINT "fk_file_versions_uploader" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id");

-- Calendar Events
ALTER TABLE "calendar_events" ADD CONSTRAINT "fk_calendar_events_creator" FOREIGN KEY ("created_by_id") REFERENCES "users"("id");

-- Calendar Attendees
ALTER TABLE "calendar_attendees" ADD CONSTRAINT "fk_calendar_attendees_event" FOREIGN KEY ("event_id") REFERENCES "calendar_events"("id") ON DELETE CASCADE;
ALTER TABLE "calendar_attendees" ADD CONSTRAINT "fk_calendar_attendees_user" FOREIGN KEY ("user_id") REFERENCES "users"("id");

-- Holiday Departments
ALTER TABLE "holiday_departments" ADD CONSTRAINT "fk_holiday_departments_holiday" FOREIGN KEY ("holiday_id") REFERENCES "holidays"("id") ON DELETE CASCADE;
ALTER TABLE "holiday_departments" ADD CONSTRAINT "fk_holiday_departments_department" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE CASCADE;

-- Employee Optional Holidays
ALTER TABLE "employee_optional_holidays" ADD CONSTRAINT "fk_employee_optional_holidays_employee" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE;
ALTER TABLE "employee_optional_holidays" ADD CONSTRAINT "fk_employee_optional_holidays_holiday" FOREIGN KEY ("holiday_id") REFERENCES "holidays"("id") ON DELETE CASCADE;

-- Attendance
ALTER TABLE "attendances" ADD CONSTRAINT "fk_attendances_employee" FOREIGN KEY ("employee_id") REFERENCES "employees"("id");

-- Leave Requests
ALTER TABLE "leave_requests" ADD CONSTRAINT "fk_leave_requests_employee" FOREIGN KEY ("employee_id") REFERENCES "employees"("id");
ALTER TABLE "leave_requests" ADD CONSTRAINT "fk_leave_requests_leave_type" FOREIGN KEY ("leave_type_id") REFERENCES "leave_types"("id");

-- Leave Balances
ALTER TABLE "leave_balances" ADD CONSTRAINT "fk_leave_balances_employee" FOREIGN KEY ("employee_id") REFERENCES "employees"("id");
ALTER TABLE "leave_balances" ADD CONSTRAINT "fk_leave_balances_leave_type" FOREIGN KEY ("leave_type_id") REFERENCES "leave_types"("id");

-- Leave Balance Adjustments
ALTER TABLE "leave_balance_adjustments" ADD CONSTRAINT "fk_leave_balance_adjustments_balance" FOREIGN KEY ("leave_balance_id") REFERENCES "leave_balances"("id");

-- Performance Reviews
ALTER TABLE "performance_reviews" ADD CONSTRAINT "fk_performance_reviews_employee" FOREIGN KEY ("employee_id") REFERENCES "employees"("id");

-- Project Members
ALTER TABLE "project_members" ADD CONSTRAINT "fk_project_members_employee" FOREIGN KEY ("employee_id") REFERENCES "employees"("id");

-- Project Teams
ALTER TABLE "project_teams" ADD CONSTRAINT "fk_project_teams_team" FOREIGN KEY ("team_id") REFERENCES "teams"("id");

-- Tasks
ALTER TABLE "tasks" ADD CONSTRAINT "fk_tasks_creator" FOREIGN KEY ("created_by_id") REFERENCES "users"("id");

-- Task Assignees
ALTER TABLE "task_assignees" ADD CONSTRAINT "fk_task_assignees_task" FOREIGN KEY ("task_id") REFERENCES "tasks"("id");
ALTER TABLE "task_assignees" ADD CONSTRAINT "fk_task_assignees_user" FOREIGN KEY ("user_id") REFERENCES "users"("id");

-- Timesheets
ALTER TABLE "timesheets" ADD CONSTRAINT "fk_timesheets_employee" FOREIGN KEY ("employee_id") REFERENCES "employees"("id");

-- Time Entries
ALTER TABLE "time_entries" ADD CONSTRAINT "fk_time_entries_user" FOREIGN KEY ("user_id") REFERENCES "users"("id");
ALTER TABLE "time_entries" ADD CONSTRAINT "fk_time_entries_task" FOREIGN KEY ("task_id") REFERENCES "tasks"("id");

-- Asset Assignments
ALTER TABLE "asset_assignments" ADD CONSTRAINT "fk_asset_assignments_employee" FOREIGN KEY ("employee_id") REFERENCES "employees"("id");

-- Notifications
ALTER TABLE "notifications" ADD CONSTRAINT "fk_notifications_user" FOREIGN KEY ("user_id") REFERENCES "users"("id");

-- User Todos
ALTER TABLE "user_todos" ADD CONSTRAINT "fk_user_todos_user" FOREIGN KEY ("user_id") REFERENCES "users"("id");

-- Comments
ALTER TABLE "comments" ADD CONSTRAINT "fk_comments_user" FOREIGN KEY ("user_id") REFERENCES "users"("id");
ALTER TABLE "comments" ADD CONSTRAINT "fk_comments_task" FOREIGN KEY ("task_id") REFERENCES "tasks"("id");

-- Audit Logs
ALTER TABLE "audit_logs" ADD CONSTRAINT "fk_audit_logs_user" FOREIGN KEY ("user_id") REFERENCES "users"("id");

-- Job Candidates
ALTER TABLE "job_candidates" ADD CONSTRAINT "fk_job_candidates_job" FOREIGN KEY ("job_id") REFERENCES "job_descriptions"("id") ON DELETE CASCADE;

-- Interviews
ALTER TABLE "interviews" ADD CONSTRAINT "fk_interviews_candidate" FOREIGN KEY ("candidate_id") REFERENCES "job_candidates"("id") ON DELETE CASCADE;
ALTER TABLE "interviews" ADD CONSTRAINT "fk_interviews_assessment_test" FOREIGN KEY ("assessment_test_id") REFERENCES "assessment_tests"("id");

-- Interview Panelists
ALTER TABLE "interview_panelists" ADD CONSTRAINT "fk_interview_panelists_interview" FOREIGN KEY ("interview_id") REFERENCES "interviews"("id") ON DELETE CASCADE;
ALTER TABLE "interview_panelists" ADD CONSTRAINT "fk_interview_panelists_employee" FOREIGN KEY ("employee_id") REFERENCES "employees"("id");

-- Interview Feedback
ALTER TABLE "interview_feedback" ADD CONSTRAINT "fk_interview_feedback_interview" FOREIGN KEY ("interview_id") REFERENCES "interviews"("id") ON DELETE CASCADE;
ALTER TABLE "interview_feedback" ADD CONSTRAINT "fk_interview_feedback_interviewer" FOREIGN KEY ("interviewer_id") REFERENCES "employees"("id");

-- Assessment Sections
ALTER TABLE "assessment_sections" ADD CONSTRAINT "fk_assessment_sections_test" FOREIGN KEY ("test_id") REFERENCES "assessment_tests"("id") ON DELETE CASCADE;

-- Assessment Questions
ALTER TABLE "assessment_questions" ADD CONSTRAINT "fk_assessment_questions_test" FOREIGN KEY ("test_id") REFERENCES "assessment_tests"("id") ON DELETE CASCADE;
ALTER TABLE "assessment_questions" ADD CONSTRAINT "fk_assessment_questions_section" FOREIGN KEY ("section_id") REFERENCES "assessment_sections"("id") ON DELETE SET NULL;

-- Assessment Invitations
ALTER TABLE "assessment_invitations" ADD CONSTRAINT "fk_assessment_invitations_test" FOREIGN KEY ("test_id") REFERENCES "assessment_tests"("id") ON DELETE CASCADE;
ALTER TABLE "assessment_invitations" ADD CONSTRAINT "fk_assessment_invitations_candidate" FOREIGN KEY ("candidate_id") REFERENCES "job_candidates"("id") ON DELETE SET NULL;
ALTER TABLE "assessment_invitations" ADD CONSTRAINT "fk_assessment_invitations_interview" FOREIGN KEY ("interview_id") REFERENCES "interviews"("id") ON DELETE SET NULL;

-- Assessment Results
ALTER TABLE "assessment_results" ADD CONSTRAINT "fk_assessment_results_invitation" FOREIGN KEY ("invitation_id") REFERENCES "assessment_invitations"("id") ON DELETE CASCADE;

-- Assessment Answers
ALTER TABLE "assessment_answers" ADD CONSTRAINT "fk_assessment_answers_result" FOREIGN KEY ("result_id") REFERENCES "assessment_results"("id") ON DELETE CASCADE;
ALTER TABLE "assessment_answers" ADD CONSTRAINT "fk_assessment_answers_question" FOREIGN KEY ("question_id") REFERENCES "assessment_questions"("id") ON DELETE CASCADE;

-- =============================================================================
-- PRISMA MIGRATIONS TABLE (for Prisma compatibility)
-- =============================================================================
CREATE TABLE "_prisma_migrations" (
    "id" VARCHAR(36) PRIMARY KEY,
    "checksum" VARCHAR(64) NOT NULL,
    "finished_at" TIMESTAMPTZ,
    "migration_name" VARCHAR(255) NOT NULL,
    "logs" TEXT,
    "rolled_back_at" TIMESTAMPTZ,
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "applied_steps_count" INTEGER NOT NULL DEFAULT 0
);

-- Mark this schema as migrated
INSERT INTO "_prisma_migrations" (id, checksum, migration_name, finished_at, applied_steps_count)
VALUES (
    gen_random_uuid()::text,
    'sql_schema_init_' || to_char(NOW(), 'YYYYMMDDHH24MISS'),
    '00000000000000_sql_schema_init',
    NOW(),
    1
);

-- =============================================================================
-- DONE
-- =============================================================================

-- ============================================================================
-- Default seed data for new tenant databases
-- This script should be run after creating the database schema
-- ============================================================================

-- ============================================================================
-- ROLES (System default roles)
-- ============================================================================
INSERT INTO roles (id, name, slug, description, is_system, is_default, created_at, updated_at)
VALUES 
  ('role-admin', 'Administrator', 'admin', 'Full system access', true, false, NOW(), NOW()),
  ('role-hr', 'HR Manager', 'hr-manager', 'HR management access', true, false, NOW(), NOW()),
  ('role-employee', 'Employee', 'employee', 'Standard employee access', true, true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- LEAVE TYPES (Default leave types for organizations)
-- ============================================================================
INSERT INTO leave_types (id, name, code, description, default_days_per_year, carry_forward_allowed, max_carry_forward_days, requires_approval, is_paid, color, is_active, created_at, updated_at)
VALUES 
  (gen_random_uuid(), 'Casual Leave', 'CASUAL', 'Casual leave for personal reasons', 12, true, 10, true, true, '#3B82F6', true, NOW(), NOW()),
  (gen_random_uuid(), 'Earned Leave', 'EARNED', 'Privilege/Earned leave', 15, true, 15, true, true, '#10B981', true, NOW(), NOW()),
  (gen_random_uuid(), 'Sick Leave', 'SICK', 'Medical/Sick leave', 6, false, NULL, true, true, '#EF4444', true, NOW(), NOW()),
  (gen_random_uuid(), 'Leave Without Pay', 'LWP', 'Unpaid leave', 0, false, NULL, true, false, '#F97316', true, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Note: The following tables start EMPTY for new tenants:
-- - users (created during onboarding)
-- - employees (created when users are added)
-- - departments (created by admin)
-- - designations (created by admin)
-- - permissions (defined by application code)
-- - role_permissions (assigned by admin)
-- - All transactional tables (attendances, leave_requests, tasks, etc.)
-- ============================================================================

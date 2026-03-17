-- ============================================================================
-- RBAC: Seed Permissions & Role-Permission Mappings
-- Run against tenant database: oms_tenant_softqube
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. INSERT PERMISSIONS
-- ============================================================================
INSERT INTO permissions (id, resource, action, description) VALUES
  -- Dashboard
  ('perm-dashboard-view',       'dashboard',    'view',   'View main dashboard'),
  ('perm-admin360-view',        'admin_360',    'view',   'View Admin 360° overview'),

  -- Employees
  ('perm-employees-read',       'employees',    'read',   'View employee list and profiles'),
  ('perm-employees-write',      'employees',    'write',  'Create and edit employees'),
  ('perm-employees-delete',     'employees',    'delete', 'Delete/terminate employees'),

  -- HR Recruitment
  ('perm-hr-jobs-read',         'hr_jobs',      'read',   'View job descriptions'),
  ('perm-hr-jobs-write',        'hr_jobs',      'write',  'Create/edit job descriptions'),
  ('perm-hr-candidates-read',   'hr_candidates','read',   'View candidates'),
  ('perm-hr-candidates-write',  'hr_candidates','write',  'Manage candidates'),
  ('perm-hr-interviews-read',   'hr_interviews','read',   'View interviews'),
  ('perm-hr-interviews-write',  'hr_interviews','write',  'Schedule/manage interviews'),
  ('perm-hr-assessments-read',  'hr_assessments','read',  'View assessments'),
  ('perm-hr-assessments-write', 'hr_assessments','write', 'Create/manage assessments'),

  -- Holidays
  ('perm-holidays-read',        'holidays',     'read',   'View holidays calendar'),
  ('perm-holidays-write',       'holidays',     'write',  'Manage holidays'),

  -- Leave
  ('perm-leave-self',           'leave',        'self',   'Apply/view own leave'),
  ('perm-leave-read',           'leave',        'read',   'View all leave requests'),
  ('perm-leave-write',          'leave',        'write',  'Approve/reject leave requests'),

  -- Attendance
  ('perm-attendance-self',      'attendance',   'self',   'View/mark own attendance'),
  ('perm-attendance-read',      'attendance',   'read',   'View all attendance records'),
  ('perm-attendance-write',     'attendance',   'write',  'Manage attendance records'),
  ('perm-attendance-monitor',   'attendance_monitor', 'view', 'Access Attendance Monitor page'),

  -- Performance
  ('perm-performance-self',     'performance',  'self',   'View own performance reviews'),
  ('perm-performance-read',     'performance',  'read',   'View all performance reviews'),
  ('perm-performance-write',    'performance',  'write',  'Create/manage performance reviews'),

  -- Documents
  ('perm-documents-self',       'documents',    'self',   'View/upload own documents'),
  ('perm-documents-read',       'documents',    'read',   'View all documents'),
  ('perm-documents-write',      'documents',    'write',  'Manage all documents'),

  -- Projects
  ('perm-projects-read',        'projects',     'read',   'View projects'),
  ('perm-projects-write',       'projects',     'write',  'Create/manage projects'),

  -- Tasks
  ('perm-tasks-read',           'tasks',        'read',   'View tasks'),
  ('perm-tasks-write',          'tasks',        'write',  'Create/manage tasks'),

  -- Reports
  ('perm-reports-view',         'reports',      'view',   'View reports'),

  -- Billing
  ('perm-billing-view',         'billing',      'view',   'View billing information'),
  ('perm-billing-manage',       'billing',      'manage', 'Manage billing/subscriptions'),

  -- Organization
  ('perm-org-view',             'organization', 'view',   'View organization settings'),
  ('perm-org-manage',           'organization', 'manage', 'Manage organization settings'),

  -- Settings
  ('perm-settings-view',        'settings',     'view',   'View system settings'),
  ('perm-settings-manage',      'settings',     'manage', 'Manage system settings'),

  -- Notifications
  ('perm-notifications-read',   'notifications','read',   'View notifications')

ON CONFLICT (resource, action) DO NOTHING;

-- ============================================================================
-- 2. ROLE-PERMISSION MAPPINGS
-- ============================================================================

-- Role IDs:
-- tenant_admin:    173c18e0-8a93-4c1c-aece-f107e1f8b240
-- hr_manager:      419602c4-cd98-4949-bfa6-a78b8ab901f8
-- project_manager: f0e95f37-e519-4404-8c64-1bf8344c1de6
-- team_lead:       ddea158d-31e8-440c-875f-27d57d0ca6d0
-- employee:        de717df9-f0c7-456c-b721-d43fc55b900e
-- viewer:          01a55381-b857-46bc-bf70-68478bb53adb

-- ─────────────────────────────────────────────────────────────────────────────
-- TENANT ADMIN: ALL permissions
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO role_permissions (id, role_id, permission_id, scope)
SELECT
  'rp-admin-' || p.id,
  '173c18e0-8a93-4c1c-aece-f107e1f8b240',
  p.id,
  'ALL'
FROM permissions p
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- HR MANAGER: Full HR + employee management + dashboard + reports
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO role_permissions (id, role_id, permission_id, scope) VALUES
  ('rp-hr-dashboard-view',       '419602c4-cd98-4949-bfa6-a78b8ab901f8', 'perm-dashboard-view',       'ALL'),
  ('rp-hr-admin360-view',        '419602c4-cd98-4949-bfa6-a78b8ab901f8', 'perm-admin360-view',        'ALL'),
  ('rp-hr-employees-read',       '419602c4-cd98-4949-bfa6-a78b8ab901f8', 'perm-employees-read',       'ALL'),
  ('rp-hr-employees-write',      '419602c4-cd98-4949-bfa6-a78b8ab901f8', 'perm-employees-write',      'ALL'),
  ('rp-hr-employees-delete',     '419602c4-cd98-4949-bfa6-a78b8ab901f8', 'perm-employees-delete',     'ALL'),
  ('rp-hr-jobs-read',            '419602c4-cd98-4949-bfa6-a78b8ab901f8', 'perm-hr-jobs-read',         'ALL'),
  ('rp-hr-jobs-write',           '419602c4-cd98-4949-bfa6-a78b8ab901f8', 'perm-hr-jobs-write',        'ALL'),
  ('rp-hr-candidates-read',      '419602c4-cd98-4949-bfa6-a78b8ab901f8', 'perm-hr-candidates-read',   'ALL'),
  ('rp-hr-candidates-write',     '419602c4-cd98-4949-bfa6-a78b8ab901f8', 'perm-hr-candidates-write',  'ALL'),
  ('rp-hr-interviews-read',      '419602c4-cd98-4949-bfa6-a78b8ab901f8', 'perm-hr-interviews-read',   'ALL'),
  ('rp-hr-interviews-write',     '419602c4-cd98-4949-bfa6-a78b8ab901f8', 'perm-hr-interviews-write',  'ALL'),
  ('rp-hr-assessments-read',     '419602c4-cd98-4949-bfa6-a78b8ab901f8', 'perm-hr-assessments-read',  'ALL'),
  ('rp-hr-assessments-write',    '419602c4-cd98-4949-bfa6-a78b8ab901f8', 'perm-hr-assessments-write', 'ALL'),
  ('rp-hr-holidays-read',        '419602c4-cd98-4949-bfa6-a78b8ab901f8', 'perm-holidays-read',        'ALL'),
  ('rp-hr-holidays-write',       '419602c4-cd98-4949-bfa6-a78b8ab901f8', 'perm-holidays-write',       'ALL'),
  ('rp-hr-leave-self',           '419602c4-cd98-4949-bfa6-a78b8ab901f8', 'perm-leave-self',           'ALL'),
  ('rp-hr-leave-read',           '419602c4-cd98-4949-bfa6-a78b8ab901f8', 'perm-leave-read',           'ALL'),
  ('rp-hr-leave-write',          '419602c4-cd98-4949-bfa6-a78b8ab901f8', 'perm-leave-write',          'ALL'),
  ('rp-hr-attendance-self',      '419602c4-cd98-4949-bfa6-a78b8ab901f8', 'perm-attendance-self',      'ALL'),
  ('rp-hr-attendance-read',      '419602c4-cd98-4949-bfa6-a78b8ab901f8', 'perm-attendance-read',      'ALL'),
  ('rp-hr-attendance-write',     '419602c4-cd98-4949-bfa6-a78b8ab901f8', 'perm-attendance-write',     'ALL'),
  ('rp-hr-performance-self',     '419602c4-cd98-4949-bfa6-a78b8ab901f8', 'perm-performance-self',     'ALL'),
  ('rp-hr-performance-read',     '419602c4-cd98-4949-bfa6-a78b8ab901f8', 'perm-performance-read',     'ALL'),
  ('rp-hr-performance-write',    '419602c4-cd98-4949-bfa6-a78b8ab901f8', 'perm-performance-write',    'ALL'),
  ('rp-hr-documents-self',       '419602c4-cd98-4949-bfa6-a78b8ab901f8', 'perm-documents-self',       'ALL'),
  ('rp-hr-documents-read',       '419602c4-cd98-4949-bfa6-a78b8ab901f8', 'perm-documents-read',       'ALL'),
  ('rp-hr-documents-write',      '419602c4-cd98-4949-bfa6-a78b8ab901f8', 'perm-documents-write',      'ALL'),
  ('rp-hr-reports-view',         '419602c4-cd98-4949-bfa6-a78b8ab901f8', 'perm-reports-view',         'ALL'),
  ('rp-hr-notifications-read',   '419602c4-cd98-4949-bfa6-a78b8ab901f8', 'perm-notifications-read',   'ALL')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- PROJECT MANAGER: Projects, tasks, view employees, dashboard, reports
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO role_permissions (id, role_id, permission_id, scope) VALUES
  ('rp-pm-dashboard-view',       'f0e95f37-e519-4404-8c64-1bf8344c1de6', 'perm-dashboard-view',       'ALL'),
  ('rp-pm-employees-read',       'f0e95f37-e519-4404-8c64-1bf8344c1de6', 'perm-employees-read',       'ALL'),
  ('rp-pm-projects-read',        'f0e95f37-e519-4404-8c64-1bf8344c1de6', 'perm-projects-read',        'ALL'),
  ('rp-pm-projects-write',       'f0e95f37-e519-4404-8c64-1bf8344c1de6', 'perm-projects-write',       'ALL'),
  ('rp-pm-tasks-read',           'f0e95f37-e519-4404-8c64-1bf8344c1de6', 'perm-tasks-read',           'ALL'),
  ('rp-pm-tasks-write',          'f0e95f37-e519-4404-8c64-1bf8344c1de6', 'perm-tasks-write',          'ALL'),
  ('rp-pm-leave-self',           'f0e95f37-e519-4404-8c64-1bf8344c1de6', 'perm-leave-self',           'ALL'),
  ('rp-pm-leave-read',           'f0e95f37-e519-4404-8c64-1bf8344c1de6', 'perm-leave-read',           'TEAM'),
  ('rp-pm-attendance-self',      'f0e95f37-e519-4404-8c64-1bf8344c1de6', 'perm-attendance-self',      'ALL'),
  ('rp-pm-attendance-read',      'f0e95f37-e519-4404-8c64-1bf8344c1de6', 'perm-attendance-read',      'TEAM'),
  ('rp-pm-performance-self',     'f0e95f37-e519-4404-8c64-1bf8344c1de6', 'perm-performance-self',     'ALL'),
  ('rp-pm-documents-self',       'f0e95f37-e519-4404-8c64-1bf8344c1de6', 'perm-documents-self',       'ALL'),
  ('rp-pm-reports-view',         'f0e95f37-e519-4404-8c64-1bf8344c1de6', 'perm-reports-view',         'ALL'),
  ('rp-pm-notifications-read',   'f0e95f37-e519-4404-8c64-1bf8344c1de6', 'perm-notifications-read',   'ALL'),
  ('rp-pm-holidays-read',        'f0e95f37-e519-4404-8c64-1bf8344c1de6', 'perm-holidays-read',        'ALL')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- TEAM LEAD: Team management, tasks, view employees, dashboard
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO role_permissions (id, role_id, permission_id, scope) VALUES
  ('rp-tl-dashboard-view',       'ddea158d-31e8-440c-875f-27d57d0ca6d0', 'perm-dashboard-view',       'ALL'),
  ('rp-tl-employees-read',       'ddea158d-31e8-440c-875f-27d57d0ca6d0', 'perm-employees-read',       'TEAM'),
  ('rp-tl-projects-read',        'ddea158d-31e8-440c-875f-27d57d0ca6d0', 'perm-projects-read',        'ALL'),
  ('rp-tl-tasks-read',           'ddea158d-31e8-440c-875f-27d57d0ca6d0', 'perm-tasks-read',           'ALL'),
  ('rp-tl-tasks-write',          'ddea158d-31e8-440c-875f-27d57d0ca6d0', 'perm-tasks-write',          'TEAM'),
  ('rp-tl-leave-self',           'ddea158d-31e8-440c-875f-27d57d0ca6d0', 'perm-leave-self',           'ALL'),
  ('rp-tl-leave-read',           'ddea158d-31e8-440c-875f-27d57d0ca6d0', 'perm-leave-read',           'TEAM'),
  ('rp-tl-leave-write',          'ddea158d-31e8-440c-875f-27d57d0ca6d0', 'perm-leave-write',          'TEAM'),
  ('rp-tl-attendance-self',      'ddea158d-31e8-440c-875f-27d57d0ca6d0', 'perm-attendance-self',      'ALL'),
  ('rp-tl-attendance-read',      'ddea158d-31e8-440c-875f-27d57d0ca6d0', 'perm-attendance-read',      'TEAM'),
  ('rp-tl-performance-self',     'ddea158d-31e8-440c-875f-27d57d0ca6d0', 'perm-performance-self',     'ALL'),
  ('rp-tl-performance-read',     'ddea158d-31e8-440c-875f-27d57d0ca6d0', 'perm-performance-read',     'TEAM'),
  ('rp-tl-documents-self',       'ddea158d-31e8-440c-875f-27d57d0ca6d0', 'perm-documents-self',       'ALL'),
  ('rp-tl-holidays-read',        'ddea158d-31e8-440c-875f-27d57d0ca6d0', 'perm-holidays-read',        'ALL'),
  ('rp-tl-notifications-read',   'ddea158d-31e8-440c-875f-27d57d0ca6d0', 'perm-notifications-read',   'ALL')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- EMPLOYEE: Self-service only (own profile, leave, attendance, documents)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO role_permissions (id, role_id, permission_id, scope) VALUES
  ('rp-emp-dashboard-view',      'de717df9-f0c7-456c-b721-d43fc55b900e', 'perm-dashboard-view',       'OWN'),
  ('rp-emp-leave-self',          'de717df9-f0c7-456c-b721-d43fc55b900e', 'perm-leave-self',           'OWN'),
  ('rp-emp-attendance-self',     'de717df9-f0c7-456c-b721-d43fc55b900e', 'perm-attendance-self',      'OWN'),
  ('rp-emp-performance-self',    'de717df9-f0c7-456c-b721-d43fc55b900e', 'perm-performance-self',     'OWN'),
  ('rp-emp-documents-self',      'de717df9-f0c7-456c-b721-d43fc55b900e', 'perm-documents-self',       'OWN'),
  ('rp-emp-holidays-read',       'de717df9-f0c7-456c-b721-d43fc55b900e', 'perm-holidays-read',        'ALL'),
  ('rp-emp-notifications-read',  'de717df9-f0c7-456c-b721-d43fc55b900e', 'perm-notifications-read',   'OWN'),
  ('rp-emp-tasks-read',          'de717df9-f0c7-456c-b721-d43fc55b900e', 'perm-tasks-read',           'OWN'),
  ('rp-emp-tasks-write',         'de717df9-f0c7-456c-b721-d43fc55b900e', 'perm-tasks-write',          'OWN'),
  ('rp-emp-projects-read',       'de717df9-f0c7-456c-b721-d43fc55b900e', 'perm-projects-read',        'OWN')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- VIEWER: Read-only access to most data
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO role_permissions (id, role_id, permission_id, scope) VALUES
  ('rp-vw-dashboard-view',       '01a55381-b857-46bc-bf70-68478bb53adb', 'perm-dashboard-view',       'ALL'),
  ('rp-vw-employees-read',       '01a55381-b857-46bc-bf70-68478bb53adb', 'perm-employees-read',       'ALL'),
  ('rp-vw-projects-read',        '01a55381-b857-46bc-bf70-68478bb53adb', 'perm-projects-read',        'ALL'),
  ('rp-vw-tasks-read',           '01a55381-b857-46bc-bf70-68478bb53adb', 'perm-tasks-read',           'ALL'),
  ('rp-vw-reports-view',         '01a55381-b857-46bc-bf70-68478bb53adb', 'perm-reports-view',         'ALL'),
  ('rp-vw-holidays-read',        '01a55381-b857-46bc-bf70-68478bb53adb', 'perm-holidays-read',        'ALL'),
  ('rp-vw-notifications-read',   '01a55381-b857-46bc-bf70-68478bb53adb', 'perm-notifications-read',   'ALL')
ON CONFLICT (role_id, permission_id) DO NOTHING;

COMMIT;

-- Verify
SELECT r.name, COUNT(rp.id) as permissions
FROM roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id
GROUP BY r.name
ORDER BY permissions DESC;

-- ============================================================================
-- MIGRATION: Update Default Role Permissions (v2)
-- Run against tenant database: oms_tenant_softqube
--
-- Changes:
--   Project Manager: REMOVE employees:read, reports:view
--                    ADD    leave:write
--   Team Lead:       REMOVE leave:write, performance:read
--   Viewer:          REMOVE employees:read, projects:read, tasks:read, reports:view
-- ============================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- PROJECT MANAGER (f0e95f37-e519-4404-8c64-1bf8344c1de6)
-- ─────────────────────────────────────────────────────────────────────────────

-- Remove: HR Dashboard / Employees View
DELETE FROM role_permissions
WHERE role_id = 'f0e95f37-e519-4404-8c64-1bf8344c1de6'
  AND permission_id = 'perm-employees-read';

-- Remove: Reports
DELETE FROM role_permissions
WHERE role_id = 'f0e95f37-e519-4404-8c64-1bf8344c1de6'
  AND permission_id = 'perm-reports-view';

-- Add: Leave Request Manage (approve/reject)
INSERT INTO role_permissions (id, role_id, permission_id, scope)
VALUES ('rp-pm-leave-write', 'f0e95f37-e519-4404-8c64-1bf8344c1de6', 'perm-leave-write', 'ALL')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- TEAM LEAD (ddea158d-31e8-440c-875f-27d57d0ca6d0)
-- ─────────────────────────────────────────────────────────────────────────────

-- Remove: Leave Request (Manager) — approve/reject
DELETE FROM role_permissions
WHERE role_id = 'ddea158d-31e8-440c-875f-27d57d0ca6d0'
  AND permission_id = 'perm-leave-write';

-- Remove: Performance Reviews
DELETE FROM role_permissions
WHERE role_id = 'ddea158d-31e8-440c-875f-27d57d0ca6d0'
  AND permission_id = 'perm-performance-read';

-- ─────────────────────────────────────────────────────────────────────────────
-- VIEWER (01a55381-b857-46bc-bf70-68478bb53adb)
-- ─────────────────────────────────────────────────────────────────────────────

-- Remove: HR Dashboard / Employees View
DELETE FROM role_permissions
WHERE role_id = '01a55381-b857-46bc-bf70-68478bb53adb'
  AND permission_id = 'perm-employees-read';

-- Remove: Projects
DELETE FROM role_permissions
WHERE role_id = '01a55381-b857-46bc-bf70-68478bb53adb'
  AND permission_id = 'perm-projects-read';

-- Remove: Tasks
DELETE FROM role_permissions
WHERE role_id = '01a55381-b857-46bc-bf70-68478bb53adb'
  AND permission_id = 'perm-tasks-read';

-- Remove: Reports
DELETE FROM role_permissions
WHERE role_id = '01a55381-b857-46bc-bf70-68478bb53adb'
  AND permission_id = 'perm-reports-view';

COMMIT;

-- Verify changes
SELECT r.name, p.resource, p.action, rp.scope
FROM role_permissions rp
JOIN roles r ON r.id = rp.role_id
JOIN permissions p ON p.id = rp.permission_id
WHERE r.id IN (
  'f0e95f37-e519-4404-8c64-1bf8344c1de6',  -- project_manager
  'ddea158d-31e8-440c-875f-27d57d0ca6d0',  -- team_lead
  '01a55381-b857-46bc-bf70-68478bb53adb'   -- viewer
)
ORDER BY r.name, p.resource, p.action;

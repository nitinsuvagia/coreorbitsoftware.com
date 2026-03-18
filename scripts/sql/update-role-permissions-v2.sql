-- ============================================================================
-- MIGRATION: Update Default Role Permissions (v2)
-- Run against tenant database: oms_tenant_softqube
--
-- Uses slug/name lookups so it works regardless of actual role UUIDs.
--
-- Changes:
--   Project Manager: REMOVE employees:read, reports:view
--                    ADD    leave:write
--   Team Lead:       REMOVE leave:write, performance:read
--   Viewer:          REMOVE employees:read, projects:read, tasks:read, reports:view
-- ============================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- PROJECT MANAGER
-- ─────────────────────────────────────────────────────────────────────────────

-- Remove: HR Dashboard / Employees View
DELETE FROM role_permissions
WHERE role_id IN (SELECT id FROM roles WHERE slug = 'project_manager' OR name ILIKE 'project manager')
  AND permission_id IN (SELECT id FROM permissions WHERE resource = 'employees' AND action = 'read');

-- Remove: Reports
DELETE FROM role_permissions
WHERE role_id IN (SELECT id FROM roles WHERE slug = 'project_manager' OR name ILIKE 'project manager')
  AND permission_id IN (SELECT id FROM permissions WHERE resource = 'reports' AND action = 'view');

-- Add: Leave Request Manage (approve/reject)
INSERT INTO role_permissions (id, role_id, permission_id, scope)
SELECT
  'rp-pm-leave-write-' || r.id,
  r.id,
  p.id,
  'ALL'
FROM roles r, permissions p
WHERE (r.slug = 'project_manager' OR r.name ILIKE 'project manager')
  AND p.resource = 'leave' AND p.action = 'write'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- TEAM LEAD
-- ─────────────────────────────────────────────────────────────────────────────

-- Remove: Leave Request (Manager) — approve/reject
DELETE FROM role_permissions
WHERE role_id IN (SELECT id FROM roles WHERE slug = 'team_lead' OR name ILIKE 'team lead')
  AND permission_id IN (SELECT id FROM permissions WHERE resource = 'leave' AND action = 'write');

-- Remove: Performance Reviews
DELETE FROM role_permissions
WHERE role_id IN (SELECT id FROM roles WHERE slug = 'team_lead' OR name ILIKE 'team lead')
  AND permission_id IN (SELECT id FROM permissions WHERE resource = 'performance' AND action = 'read');

-- ─────────────────────────────────────────────────────────────────────────────
-- VIEWER
-- ─────────────────────────────────────────────────────────────────────────────

-- Remove: HR Dashboard / Employees View
DELETE FROM role_permissions
WHERE role_id IN (SELECT id FROM roles WHERE slug = 'viewer' OR name ILIKE 'viewer')
  AND permission_id IN (SELECT id FROM permissions WHERE resource = 'employees' AND action = 'read');

-- Remove: Projects
DELETE FROM role_permissions
WHERE role_id IN (SELECT id FROM roles WHERE slug = 'viewer' OR name ILIKE 'viewer')
  AND permission_id IN (SELECT id FROM permissions WHERE resource = 'projects' AND action = 'read');

-- Remove: Tasks
DELETE FROM role_permissions
WHERE role_id IN (SELECT id FROM roles WHERE slug = 'viewer' OR name ILIKE 'viewer')
  AND permission_id IN (SELECT id FROM permissions WHERE resource = 'tasks' AND action = 'read');

-- Remove: Reports
DELETE FROM role_permissions
WHERE role_id IN (SELECT id FROM roles WHERE slug = 'viewer' OR name ILIKE 'viewer')
  AND permission_id IN (SELECT id FROM permissions WHERE resource = 'reports' AND action = 'view');

COMMIT;

-- Verify: show remaining permissions for these 3 roles
SELECT r.name, p.resource, p.action, rp.scope
FROM role_permissions rp
JOIN roles r ON r.id = rp.role_id
JOIN permissions p ON p.id = rp.permission_id
WHERE r.slug IN ('project_manager', 'team_lead', 'viewer')
   OR r.name ILIKE ANY(ARRAY['project manager', 'team lead', 'viewer'])
ORDER BY r.name, p.resource, p.action;

-- Add hr_dashboard:view permission separate from employees:read
-- This allows granting HR Dashboard page access independently of
-- the generic "view employee list" permission.

INSERT INTO permissions (id, resource, action, description)
VALUES (
  'perm-hr-dashboard-view',
  'hr_dashboard',
  'view',
  'Access the HR Dashboard page'
)
ON CONFLICT (resource, action) DO NOTHING;

-- Grant to Owner, Admin, and HR roles (by slug, safe for any tenant)
INSERT INTO role_permissions (id, role_id, permission_id, scope)
SELECT
  'rp-' || r.id || '-hr-dashboard-view',
  r.id,
  'perm-hr-dashboard-view',
  'ALL'
FROM roles r
WHERE r.slug IN ('owner', 'admin', 'hr', 'hr_manager', 'tenant_admin')
ON CONFLICT (role_id, permission_id) DO NOTHING;

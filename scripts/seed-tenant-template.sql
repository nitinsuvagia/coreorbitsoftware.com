-- ============================================================================
-- Seed Tenant Template Database
-- This script seeds the oms_tenant_template database with default data
-- Run this after running migrations on tenant_template
-- ============================================================================

-- Connect to tenant_template database
\c oms_tenant_template;

-- ============================================================================
-- ROLES
-- ============================================================================

-- Clean up old role system (old slugs: admin, employee, hr-manager, etc.)
DELETE FROM user_roles WHERE role_id IN (SELECT id FROM roles WHERE slug IN ('admin', 'administrator', 'hr-manager'));
DELETE FROM role_permissions WHERE role_id IN (SELECT id FROM roles WHERE slug IN ('admin', 'administrator', 'hr-manager'));
DELETE FROM roles WHERE slug IN ('admin', 'administrator', 'hr-manager');

-- Fix any roles with non-UUID IDs (from old seeding systems)
DELETE FROM user_roles WHERE role_id IN (SELECT id FROM roles WHERE id NOT SIMILAR TO '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}');
DELETE FROM role_permissions WHERE role_id IN (SELECT id FROM roles WHERE id NOT SIMILAR TO '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}');
DELETE FROM roles WHERE id NOT SIMILAR TO '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';

INSERT INTO roles (id, name, slug, is_system, is_default, description, created_at, updated_at)
VALUES 
  (gen_random_uuid(), 'Tenant Owner', 'tenant_owner', true, false, 'Full access including billing management', NOW(), NOW()),
  (gen_random_uuid(), 'Tenant Admin', 'tenant_admin', true, false, 'Full access to tenant (no billing)', NOW(), NOW()),
  (gen_random_uuid(), 'HR Manager', 'hr_manager', true, false, 'Manage employees, attendance, leaves', NOW(), NOW()),
  (gen_random_uuid(), 'Project Manager', 'project_manager', true, false, 'Manage projects and tasks', NOW(), NOW()),
  (gen_random_uuid(), 'Team Lead', 'team_lead', true, false, 'Manage team members and tasks', NOW(), NOW()),
  (gen_random_uuid(), 'Employee', 'employee', true, true, 'Basic employee access', NOW(), NOW()),
  (gen_random_uuid(), 'Viewer', 'viewer', true, false, 'Read-only access', NOW(), NOW())
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_system = EXCLUDED.is_system,
  is_default = EXCLUDED.is_default,
  updated_at = NOW();

-- ============================================================================
-- PERMISSIONS
-- ============================================================================

-- Core resources
INSERT INTO permissions (id, resource, action, description) VALUES
  -- Employees
  (gen_random_uuid(), 'employees', 'view', 'View employees'),
  (gen_random_uuid(), 'employees', 'create', 'Create employees'),
  (gen_random_uuid(), 'employees', 'update', 'Update employees'),
  (gen_random_uuid(), 'employees', 'delete', 'Delete employees'),
  (gen_random_uuid(), 'employees', 'manage', 'Manage employees'),
  -- Departments
  (gen_random_uuid(), 'departments', 'view', 'View departments'),
  (gen_random_uuid(), 'departments', 'create', 'Create departments'),
  (gen_random_uuid(), 'departments', 'update', 'Update departments'),
  (gen_random_uuid(), 'departments', 'delete', 'Delete departments'),
  -- Designations
  (gen_random_uuid(), 'designations', 'view', 'View designations'),
  (gen_random_uuid(), 'designations', 'create', 'Create designations'),
  (gen_random_uuid(), 'designations', 'update', 'Update designations'),
  (gen_random_uuid(), 'designations', 'delete', 'Delete designations'),
  -- Roles
  (gen_random_uuid(), 'roles', 'view', 'View roles'),
  (gen_random_uuid(), 'roles', 'create', 'Create roles'),
  (gen_random_uuid(), 'roles', 'update', 'Update roles'),
  (gen_random_uuid(), 'roles', 'delete', 'Delete roles'),
  (gen_random_uuid(), 'roles', 'assign', 'Assign roles'),
  -- Users
  (gen_random_uuid(), 'users', 'view', 'View users'),
  (gen_random_uuid(), 'users', 'create', 'Create users'),
  (gen_random_uuid(), 'users', 'update', 'Update users'),
  (gen_random_uuid(), 'users', 'delete', 'Delete users'),
  (gen_random_uuid(), 'users', 'manage', 'Manage users'),
  -- Attendance
  (gen_random_uuid(), 'attendance', 'view', 'View attendance'),
  (gen_random_uuid(), 'attendance', 'create', 'Create attendance'),
  (gen_random_uuid(), 'attendance', 'update', 'Update attendance'),
  (gen_random_uuid(), 'attendance', 'delete', 'Delete attendance'),
  (gen_random_uuid(), 'attendance', 'manage', 'Manage attendance'),
  (gen_random_uuid(), 'attendance', 'approve', 'Approve attendance'),
  -- Leaves
  (gen_random_uuid(), 'leaves', 'view', 'View leaves'),
  (gen_random_uuid(), 'leaves', 'create', 'Create leaves'),
  (gen_random_uuid(), 'leaves', 'update', 'Update leaves'),
  (gen_random_uuid(), 'leaves', 'delete', 'Delete leaves'),
  (gen_random_uuid(), 'leaves', 'manage', 'Manage leaves'),
  (gen_random_uuid(), 'leaves', 'approve', 'Approve leaves'),
  -- Leave Types
  (gen_random_uuid(), 'leave_types', 'view', 'View leave types'),
  (gen_random_uuid(), 'leave_types', 'create', 'Create leave types'),
  (gen_random_uuid(), 'leave_types', 'update', 'Update leave types'),
  (gen_random_uuid(), 'leave_types', 'delete', 'Delete leave types'),
  -- Holidays
  (gen_random_uuid(), 'holidays', 'view', 'View holidays'),
  (gen_random_uuid(), 'holidays', 'create', 'Create holidays'),
  (gen_random_uuid(), 'holidays', 'update', 'Update holidays'),
  (gen_random_uuid(), 'holidays', 'delete', 'Delete holidays'),
  -- Projects
  (gen_random_uuid(), 'projects', 'view', 'View projects'),
  (gen_random_uuid(), 'projects', 'create', 'Create projects'),
  (gen_random_uuid(), 'projects', 'update', 'Update projects'),
  (gen_random_uuid(), 'projects', 'delete', 'Delete projects'),
  (gen_random_uuid(), 'projects', 'manage', 'Manage projects'),
  -- Tasks
  (gen_random_uuid(), 'tasks', 'view', 'View tasks'),
  (gen_random_uuid(), 'tasks', 'create', 'Create tasks'),
  (gen_random_uuid(), 'tasks', 'update', 'Update tasks'),
  (gen_random_uuid(), 'tasks', 'delete', 'Delete tasks'),
  (gen_random_uuid(), 'tasks', 'manage', 'Manage tasks'),
  (gen_random_uuid(), 'tasks', 'assign', 'Assign tasks'),
  -- Documents
  (gen_random_uuid(), 'documents', 'view', 'View documents'),
  (gen_random_uuid(), 'documents', 'create', 'Create documents'),
  (gen_random_uuid(), 'documents', 'update', 'Update documents'),
  (gen_random_uuid(), 'documents', 'delete', 'Delete documents'),
  (gen_random_uuid(), 'documents', 'manage', 'Manage documents'),
  -- Folders
  (gen_random_uuid(), 'folders', 'view', 'View folders'),
  (gen_random_uuid(), 'folders', 'create', 'Create folders'),
  (gen_random_uuid(), 'folders', 'update', 'Update folders'),
  (gen_random_uuid(), 'folders', 'delete', 'Delete folders'),
  (gen_random_uuid(), 'folders', 'manage', 'Manage folders'),
  -- Reports
  (gen_random_uuid(), 'reports', 'view', 'View reports'),
  (gen_random_uuid(), 'reports', 'create', 'Create reports'),
  (gen_random_uuid(), 'reports', 'export', 'Export reports'),
  -- Candidates
  (gen_random_uuid(), 'candidates', 'view', 'View candidates'),
  (gen_random_uuid(), 'candidates', 'create', 'Create candidates'),
  (gen_random_uuid(), 'candidates', 'update', 'Update candidates'),
  (gen_random_uuid(), 'candidates', 'delete', 'Delete candidates'),
  (gen_random_uuid(), 'candidates', 'manage', 'Manage candidates'),
  -- Job Descriptions
  (gen_random_uuid(), 'job_descriptions', 'view', 'View job descriptions'),
  (gen_random_uuid(), 'job_descriptions', 'create', 'Create job descriptions'),
  (gen_random_uuid(), 'job_descriptions', 'update', 'Update job descriptions'),
  (gen_random_uuid(), 'job_descriptions', 'delete', 'Delete job descriptions'),
  (gen_random_uuid(), 'job_descriptions', 'publish', 'Publish job descriptions'),
  -- Interviews
  (gen_random_uuid(), 'interviews', 'view', 'View interviews'),
  (gen_random_uuid(), 'interviews', 'create', 'Create interviews'),
  (gen_random_uuid(), 'interviews', 'update', 'Update interviews'),
  (gen_random_uuid(), 'interviews', 'delete', 'Delete interviews'),
  (gen_random_uuid(), 'interviews', 'conduct', 'Conduct interviews'),
  -- Settings
  (gen_random_uuid(), 'settings', 'view', 'View settings'),
  (gen_random_uuid(), 'settings', 'update', 'Update settings'),
  -- Tenant
  (gen_random_uuid(), 'tenant', 'view', 'View tenant'),
  (gen_random_uuid(), 'tenant', 'update', 'Update tenant'),
  (gen_random_uuid(), 'tenant', 'manage', 'Manage tenant'),
  -- Billing (Tenant Owner only)
  (gen_random_uuid(), 'billing', 'view', 'View billing'),
  (gen_random_uuid(), 'billing', 'manage', 'Manage billing'),
  (gen_random_uuid(), 'billing', 'update', 'Update billing'),
  -- Subscriptions
  (gen_random_uuid(), 'subscriptions', 'view', 'View subscriptions'),
  (gen_random_uuid(), 'subscriptions', 'create', 'Create subscriptions'),
  (gen_random_uuid(), 'subscriptions', 'update', 'Update subscriptions'),
  (gen_random_uuid(), 'subscriptions', 'cancel', 'Cancel subscriptions'),
  -- Invoices
  (gen_random_uuid(), 'invoices', 'view', 'View invoices'),
  (gen_random_uuid(), 'invoices', 'download', 'Download invoices'),
  -- Payments
  (gen_random_uuid(), 'payments', 'view', 'View payments'),
  (gen_random_uuid(), 'payments', 'create', 'Create payments')
ON CONFLICT (resource, action) DO NOTHING;

-- ============================================================================
-- DEPARTMENTS
-- ============================================================================

INSERT INTO departments (id, name, code, description, created_at, updated_at)
VALUES 
  (gen_random_uuid(), 'Engineering', 'ENG', 'Software development, architecture, and DevOps', NOW(), NOW()),
  (gen_random_uuid(), 'Product', 'PROD', 'Product management and UX/UI design', NOW(), NOW()),
  (gen_random_uuid(), 'Quality Assurance', 'QA', 'Testing, automation, and quality control', NOW(), NOW()),
  (gen_random_uuid(), 'Human Resources', 'HR', 'Recruitment, employee relations, and payroll', NOW(), NOW()),
  (gen_random_uuid(), 'Finance & Accounts', 'FIN', 'Accounting, budgeting, and financial planning', NOW(), NOW()),
  (gen_random_uuid(), 'Operations', 'OPS', 'IT infrastructure, facilities, and administration', NOW(), NOW()),
  (gen_random_uuid(), 'Sales', 'SALES', 'Business development and client acquisition', NOW(), NOW()),
  (gen_random_uuid(), 'Marketing', 'MKT', 'Digital marketing, branding, and content', NOW(), NOW()),
  (gen_random_uuid(), 'Customer Success', 'CS', 'Support, client management, and onboarding', NOW(), NOW()),
  (gen_random_uuid(), 'Legal & Compliance', 'LEGAL', 'Contracts, compliance, and data privacy', NOW(), NOW())
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- DESIGNATIONS
-- ============================================================================

INSERT INTO designations (id, name, code, level, created_at, updated_at)
VALUES 
  -- C-Suite (Level 1)
  (gen_random_uuid(), 'Chief Executive Officer', 'CEO', 1, NOW(), NOW()),
  (gen_random_uuid(), 'Chief Technology Officer', 'CTO', 1, NOW(), NOW()),
  (gen_random_uuid(), 'Chief Financial Officer', 'CFO', 1, NOW(), NOW()),
  (gen_random_uuid(), 'Chief Operating Officer', 'COO', 1, NOW(), NOW()),
  (gen_random_uuid(), 'Chief Product Officer', 'CPO', 1, NOW(), NOW()),
  (gen_random_uuid(), 'Chief Marketing Officer', 'CMO', 1, NOW(), NOW()),
  -- Directors (Level 2)
  (gen_random_uuid(), 'Director of Engineering', 'DIR_ENG', 2, NOW(), NOW()),
  (gen_random_uuid(), 'Director of Product', 'DIR_PROD', 2, NOW(), NOW()),
  (gen_random_uuid(), 'Director of HR', 'DIR_HR', 2, NOW(), NOW()),
  (gen_random_uuid(), 'Director of Sales', 'DIR_SALES', 2, NOW(), NOW()),
  (gen_random_uuid(), 'Director of QA', 'DIR_QA', 2, NOW(), NOW()),
  (gen_random_uuid(), 'Director of Operations', 'DIR_OPS', 2, NOW(), NOW()),
  -- Managers (Level 3)
  (gen_random_uuid(), 'Engineering Manager', 'MGR_ENG', 3, NOW(), NOW()),
  (gen_random_uuid(), 'Project Manager', 'MGR_PROJ', 3, NOW(), NOW()),
  (gen_random_uuid(), 'Product Manager', 'MGR_PROD', 3, NOW(), NOW()),
  (gen_random_uuid(), 'HR Manager', 'MGR_HR', 3, NOW(), NOW()),
  (gen_random_uuid(), 'QA Manager', 'MGR_QA', 3, NOW(), NOW()),
  (gen_random_uuid(), 'Account Manager', 'MGR_ACC', 3, NOW(), NOW()),
  (gen_random_uuid(), 'Operations Manager', 'MGR_OPS', 3, NOW(), NOW()),
  -- Team Leads (Level 4)
  (gen_random_uuid(), 'Technical Lead', 'TECH_LEAD', 4, NOW(), NOW()),
  (gen_random_uuid(), 'Team Lead', 'TEAM_LEAD', 4, NOW(), NOW()),
  (gen_random_uuid(), 'QA Lead', 'QA_LEAD', 4, NOW(), NOW()),
  -- Senior Level (Level 5)
  (gen_random_uuid(), 'Senior Software Engineer', 'SR_SWE', 5, NOW(), NOW()),
  (gen_random_uuid(), 'Senior Frontend Developer', 'SR_FE', 5, NOW(), NOW()),
  (gen_random_uuid(), 'Senior Backend Developer', 'SR_BE', 5, NOW(), NOW()),
  (gen_random_uuid(), 'Senior Full Stack Developer', 'SR_FS', 5, NOW(), NOW()),
  (gen_random_uuid(), 'Senior DevOps Engineer', 'SR_DEVOPS', 5, NOW(), NOW()),
  (gen_random_uuid(), 'Senior QA Engineer', 'SR_QA', 5, NOW(), NOW()),
  (gen_random_uuid(), 'Senior UI/UX Designer', 'SR_DESIGN', 5, NOW(), NOW()),
  (gen_random_uuid(), 'Senior Data Analyst', 'SR_DATA', 5, NOW(), NOW()),
  (gen_random_uuid(), 'Senior Business Analyst', 'SR_BA', 5, NOW(), NOW()),
  -- Mid Level (Level 6)
  (gen_random_uuid(), 'Software Engineer', 'SWE', 6, NOW(), NOW()),
  (gen_random_uuid(), 'Frontend Developer', 'FE_DEV', 6, NOW(), NOW()),
  (gen_random_uuid(), 'Backend Developer', 'BE_DEV', 6, NOW(), NOW()),
  (gen_random_uuid(), 'Full Stack Developer', 'FS_DEV', 6, NOW(), NOW()),
  (gen_random_uuid(), 'DevOps Engineer', 'DEVOPS', 6, NOW(), NOW()),
  (gen_random_uuid(), 'QA Engineer', 'QA_ENG', 6, NOW(), NOW()),
  (gen_random_uuid(), 'UI/UX Designer', 'DESIGNER', 6, NOW(), NOW()),
  (gen_random_uuid(), 'Data Analyst', 'DATA_ANALYST', 6, NOW(), NOW()),
  (gen_random_uuid(), 'Business Analyst', 'BA', 6, NOW(), NOW()),
  (gen_random_uuid(), 'Technical Writer', 'TECH_WRITER', 6, NOW(), NOW()),
  -- Junior Level (Level 7)
  (gen_random_uuid(), 'Junior Software Engineer', 'JR_SWE', 7, NOW(), NOW()),
  (gen_random_uuid(), 'Junior Developer', 'JR_DEV', 7, NOW(), NOW()),
  (gen_random_uuid(), 'Junior QA Engineer', 'JR_QA', 7, NOW(), NOW()),
  (gen_random_uuid(), 'Associate Designer', 'ASSOC_DESIGN', 7, NOW(), NOW()),
  -- Entry/Intern (Level 8)
  (gen_random_uuid(), 'Trainee', 'TRAINEE', 8, NOW(), NOW()),
  (gen_random_uuid(), 'Intern', 'INTERN', 8, NOW(), NOW()),
  -- Support/Admin Roles (Level 6)
  (gen_random_uuid(), 'HR Executive', 'HR_EXEC', 6, NOW(), NOW()),
  (gen_random_uuid(), 'Accountant', 'ACCOUNTANT', 6, NOW(), NOW()),
  (gen_random_uuid(), 'Executive Assistant', 'EXEC_ASST', 6, NOW(), NOW()),
  (gen_random_uuid(), 'Office Administrator', 'OFFICE_ADMIN', 6, NOW(), NOW()),
  (gen_random_uuid(), 'Technical Support Engineer', 'TECH_SUPPORT', 6, NOW(), NOW()),
  (gen_random_uuid(), 'Sales Executive', 'SALES_EXEC', 6, NOW(), NOW()),
  (gen_random_uuid(), 'Marketing Executive', 'MKT_EXEC', 6, NOW(), NOW()),
  (gen_random_uuid(), 'Content Writer', 'CONTENT_WRITER', 6, NOW(), NOW()),
  (gen_random_uuid(), 'Recruiter', 'RECRUITER', 6, NOW(), NOW())
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- LEAVE TYPES
-- ============================================================================

-- Clean up old leave types with different codes (CASUAL, EARNED, SICK vs CL, EL, SL)
DELETE FROM leave_types WHERE code IN ('CASUAL', 'EARNED', 'SICK');

INSERT INTO leave_types (id, name, code, description, default_days_per_year, carry_forward_allowed, max_carry_forward_days, requires_approval, is_paid, color, created_at, updated_at)
VALUES 
  (gen_random_uuid(), 'Casual Leave', 'CL', 'For personal work and urgent matters', 12, false, NULL, true, true, '#3B82F6', NOW(), NOW()),
  (gen_random_uuid(), 'Sick Leave', 'SL', 'For illness and medical appointments', 12, false, NULL, true, true, '#EF4444', NOW(), NOW()),
  (gen_random_uuid(), 'Earned Leave', 'EL', 'Privilege leave earned based on service', 15, true, 30, true, true, '#10B981', NOW(), NOW()),
  (gen_random_uuid(), 'Maternity Leave', 'ML', 'For childbirth and post-natal care', 182, false, NULL, true, true, '#EC4899', NOW(), NOW()),
  (gen_random_uuid(), 'Paternity Leave', 'PL', 'For fathers after childbirth', 15, false, NULL, true, true, '#8B5CF6', NOW(), NOW()),
  (gen_random_uuid(), 'Bereavement Leave', 'BL', 'For death of immediate family member', 5, false, NULL, true, true, '#6B7280', NOW(), NOW()),
  (gen_random_uuid(), 'Compensatory Off', 'COMP', 'Compensatory off for working on holidays/weekends', 0, true, 5, true, true, '#F59E0B', NOW(), NOW()),
  (gen_random_uuid(), 'Leave Without Pay', 'LWP', 'Unpaid leave when all other leaves are exhausted', 0, false, NULL, true, false, '#9CA3AF', NOW(), NOW())
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- ASSIGN PERMISSIONS TO ROLES
-- ============================================================================

-- Helper function to assign all permissions of a resource to a role
DO $$
DECLARE
  tenant_owner_id UUID;
  tenant_admin_id UUID;
  hr_manager_id UUID;
  project_manager_id UUID;
  team_lead_id UUID;
  employee_id UUID;
  viewer_id UUID;
BEGIN
  -- Get role IDs
  SELECT id INTO tenant_owner_id FROM roles WHERE slug = 'tenant_owner';
  SELECT id INTO tenant_admin_id FROM roles WHERE slug = 'tenant_admin';
  SELECT id INTO hr_manager_id FROM roles WHERE slug = 'hr_manager';
  SELECT id INTO project_manager_id FROM roles WHERE slug = 'project_manager';
  SELECT id INTO team_lead_id FROM roles WHERE slug = 'team_lead';
  SELECT id INTO employee_id FROM roles WHERE slug = 'employee';
  SELECT id INTO viewer_id FROM roles WHERE slug = 'viewer';
  
  -- Tenant Owner: ALL permissions
  INSERT INTO role_permissions (id, role_id, permission_id)
  SELECT gen_random_uuid(), tenant_owner_id, p.id
  FROM permissions p
  ON CONFLICT (role_id, permission_id) DO NOTHING;
  
  -- Tenant Admin: All permissions EXCEPT billing
  INSERT INTO role_permissions (id, role_id, permission_id)
  SELECT gen_random_uuid(), tenant_admin_id, p.id
  FROM permissions p
  WHERE p.resource NOT IN ('billing', 'subscriptions', 'invoices', 'payments')
  ON CONFLICT (role_id, permission_id) DO NOTHING;
  
  -- HR Manager: HR-related permissions
  INSERT INTO role_permissions (id, role_id, permission_id)
  SELECT gen_random_uuid(), hr_manager_id, p.id
  FROM permissions p
  WHERE p.resource IN ('employees', 'attendance', 'leaves', 'leave_types', 'holidays', 
                       'documents', 'folders', 'candidates', 'job_descriptions', 'interviews')
     OR (p.resource = 'departments' AND p.action = 'view')
     OR (p.resource = 'designations' AND p.action = 'view')
     OR (p.resource = 'users' AND p.action = 'view')
     OR (p.resource = 'reports' AND p.action IN ('view', 'create', 'export'))
  ON CONFLICT (role_id, permission_id) DO NOTHING;
  
  -- Project Manager: Project-related permissions
  INSERT INTO role_permissions (id, role_id, permission_id)
  SELECT gen_random_uuid(), project_manager_id, p.id
  FROM permissions p
  WHERE p.resource IN ('projects', 'tasks', 'documents', 'folders')
     OR (p.resource = 'employees' AND p.action = 'view')
     OR (p.resource = 'departments' AND p.action = 'view')
     OR (p.resource = 'designations' AND p.action = 'view')
     OR (p.resource = 'attendance' AND p.action = 'view')
     OR (p.resource = 'leaves' AND p.action = 'view')
     OR (p.resource = 'reports' AND p.action IN ('view', 'create', 'export'))
  ON CONFLICT (role_id, permission_id) DO NOTHING;
  
  -- Team Lead: Team-related permissions
  INSERT INTO role_permissions (id, role_id, permission_id)
  SELECT gen_random_uuid(), team_lead_id, p.id
  FROM permissions p
  WHERE (p.resource = 'tasks')
     OR (p.resource = 'employees' AND p.action = 'view')
     OR (p.resource = 'attendance' AND p.action IN ('view', 'approve'))
     OR (p.resource = 'leaves' AND p.action IN ('view', 'approve'))
     OR (p.resource = 'projects' AND p.action = 'view')
     OR (p.resource = 'documents' AND p.action IN ('view', 'create'))
     OR (p.resource = 'folders' AND p.action = 'view')
     OR (p.resource = 'reports' AND p.action = 'view')
  ON CONFLICT (role_id, permission_id) DO NOTHING;
  
  -- Employee: Basic permissions
  INSERT INTO role_permissions (id, role_id, permission_id)
  SELECT gen_random_uuid(), employee_id, p.id
  FROM permissions p
  WHERE (p.resource = 'employees' AND p.action = 'view')
     OR (p.resource = 'attendance' AND p.action IN ('view', 'create'))
     OR (p.resource = 'leaves' AND p.action IN ('view', 'create'))
     OR (p.resource = 'projects' AND p.action = 'view')
     OR (p.resource = 'tasks' AND p.action IN ('view', 'create', 'update'))
     OR (p.resource = 'documents' AND p.action IN ('view', 'create'))
     OR (p.resource = 'folders' AND p.action = 'view')
  ON CONFLICT (role_id, permission_id) DO NOTHING;
  
  -- Viewer: Read-only permissions
  INSERT INTO role_permissions (id, role_id, permission_id)
  SELECT gen_random_uuid(), viewer_id, p.id
  FROM permissions p
  WHERE p.action = 'view'
    AND p.resource IN ('employees', 'departments', 'designations', 'attendance', 
                       'leaves', 'holidays', 'projects', 'tasks', 'documents', 
                       'folders', 'reports')
  ON CONFLICT (role_id, permission_id) DO NOTHING;
END $$;

-- ============================================================================
-- SUMMARY
-- ============================================================================

-- Count inserted records
SELECT 'Roles' as table_name, COUNT(*) as count FROM roles
UNION ALL
SELECT 'Permissions', COUNT(*) FROM permissions
UNION ALL
SELECT 'Departments', COUNT(*) FROM departments
UNION ALL
SELECT 'Designations', COUNT(*) FROM designations
UNION ALL
SELECT 'Leave Types', COUNT(*) FROM leave_types
UNION ALL
SELECT 'Role Permissions', COUNT(*) FROM role_permissions;

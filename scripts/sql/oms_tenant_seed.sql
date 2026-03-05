-- =============================================================================
-- OMS TENANT DATABASE SEED DATA
-- =============================================================================
-- Purpose: Initial data for tenant databases
-- Run this after creating the tenant schema
-- =============================================================================

-- =============================================================================
-- DEFAULT ROLES
-- =============================================================================
INSERT INTO "roles" (id, name, slug, description, is_system, is_default, created_at, updated_at)
VALUES
  (uuid_generate_v4(), 'Administrator', 'admin', 'Full administrative access to all features', true, false, NOW(), NOW()),
  (uuid_generate_v4(), 'HR Manager', 'hr-manager', 'Manage employees, recruitment, attendance, and leaves', true, false, NOW(), NOW()),
  (uuid_generate_v4(), 'Manager', 'manager', 'Manage team members, approve leaves, view reports', true, false, NOW(), NOW()),
  (uuid_generate_v4(), 'Employee', 'employee', 'Basic employee access', true, true, NOW(), NOW()),
  (uuid_generate_v4(), 'Recruiter', 'recruiter', 'Manage job postings and candidates', true, false, NOW(), NOW()),
  (uuid_generate_v4(), 'Viewer', 'viewer', 'Read-only access', true, false, NOW(), NOW())
ON CONFLICT (slug) DO NOTHING;

-- =============================================================================
-- DEFAULT PERMISSIONS
-- =============================================================================
INSERT INTO "permissions" (id, resource, action, description) VALUES
  -- Dashboard
  (uuid_generate_v4(), 'dashboard', 'view', 'View dashboard'),
  (uuid_generate_v4(), 'dashboard', 'view_analytics', 'View analytics and reports'),
  
  -- Employees
  (uuid_generate_v4(), 'employees', 'view', 'View employees'),
  (uuid_generate_v4(), 'employees', 'create', 'Create employees'),
  (uuid_generate_v4(), 'employees', 'update', 'Update employees'),
  (uuid_generate_v4(), 'employees', 'delete', 'Delete employees'),
  (uuid_generate_v4(), 'employees', 'import', 'Import employees'),
  (uuid_generate_v4(), 'employees', 'export', 'Export employees'),
  
  -- Departments
  (uuid_generate_v4(), 'departments', 'view', 'View departments'),
  (uuid_generate_v4(), 'departments', 'create', 'Create departments'),
  (uuid_generate_v4(), 'departments', 'update', 'Update departments'),
  (uuid_generate_v4(), 'departments', 'delete', 'Delete departments'),
  
  -- Teams
  (uuid_generate_v4(), 'teams', 'view', 'View teams'),
  (uuid_generate_v4(), 'teams', 'create', 'Create teams'),
  (uuid_generate_v4(), 'teams', 'update', 'Update teams'),
  (uuid_generate_v4(), 'teams', 'delete', 'Delete teams'),
  
  -- Attendance
  (uuid_generate_v4(), 'attendance', 'view', 'View attendance'),
  (uuid_generate_v4(), 'attendance', 'view_all', 'View all employees attendance'),
  (uuid_generate_v4(), 'attendance', 'manage', 'Manage attendance records'),
  (uuid_generate_v4(), 'attendance', 'check_in', 'Check in for attendance'),
  (uuid_generate_v4(), 'attendance', 'check_out', 'Check out for attendance'),
  
  -- Leave
  (uuid_generate_v4(), 'leave', 'view', 'View leave requests'),
  (uuid_generate_v4(), 'leave', 'view_all', 'View all employees leave requests'),
  (uuid_generate_v4(), 'leave', 'request', 'Request leave'),
  (uuid_generate_v4(), 'leave', 'approve', 'Approve leave requests'),
  (uuid_generate_v4(), 'leave', 'reject', 'Reject leave requests'),
  (uuid_generate_v4(), 'leave', 'manage_types', 'Manage leave types'),
  
  -- Recruitment
  (uuid_generate_v4(), 'recruitment', 'view', 'View recruitment'),
  (uuid_generate_v4(), 'recruitment', 'manage_jobs', 'Manage job descriptions'),
  (uuid_generate_v4(), 'recruitment', 'manage_candidates', 'Manage candidates'),
  (uuid_generate_v4(), 'recruitment', 'manage_interviews', 'Manage interviews'),
  (uuid_generate_v4(), 'recruitment', 'manage_assessments', 'Manage assessments'),
  
  -- Documents
  (uuid_generate_v4(), 'documents', 'view', 'View documents'),
  (uuid_generate_v4(), 'documents', 'upload', 'Upload documents'),
  (uuid_generate_v4(), 'documents', 'download', 'Download documents'),
  (uuid_generate_v4(), 'documents', 'delete', 'Delete documents'),
  (uuid_generate_v4(), 'documents', 'manage_folders', 'Manage folders'),
  
  -- Reports
  (uuid_generate_v4(), 'reports', 'view', 'View reports'),
  (uuid_generate_v4(), 'reports', 'export', 'Export reports'),
  
  -- Settings
  (uuid_generate_v4(), 'settings', 'view', 'View settings'),
  (uuid_generate_v4(), 'settings', 'manage', 'Manage settings'),
  
  -- Users
  (uuid_generate_v4(), 'users', 'view', 'View users'),
  (uuid_generate_v4(), 'users', 'create', 'Create users'),
  (uuid_generate_v4(), 'users', 'update', 'Update users'),
  (uuid_generate_v4(), 'users', 'delete', 'Delete users'),
  (uuid_generate_v4(), 'users', 'manage_roles', 'Manage user roles'),
  
  -- Holidays
  (uuid_generate_v4(), 'holidays', 'view', 'View holidays'),
  (uuid_generate_v4(), 'holidays', 'manage', 'Manage holidays'),
  
  -- Performance
  (uuid_generate_v4(), 'performance', 'view', 'View performance reviews'),
  (uuid_generate_v4(), 'performance', 'view_all', 'View all performance reviews'),
  (uuid_generate_v4(), 'performance', 'manage', 'Manage performance reviews')
ON CONFLICT (resource, action) DO NOTHING;

-- =============================================================================
-- ASSIGN PERMISSIONS TO ROLES
-- =============================================================================

-- Admin gets all permissions
INSERT INTO "role_permissions" (id, role_id, permission_id, scope)
SELECT uuid_generate_v4(), r.id, p.id, 'ALL'
FROM "roles" r, "permissions" p
WHERE r.slug = 'admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- HR Manager permissions
INSERT INTO "role_permissions" (id, role_id, permission_id, scope)
SELECT uuid_generate_v4(), r.id, p.id, 'ALL'
FROM "roles" r, "permissions" p
WHERE r.slug = 'hr-manager' 
  AND p.resource IN ('dashboard', 'employees', 'departments', 'teams', 'attendance', 'leave', 'recruitment', 'documents', 'reports', 'holidays', 'performance')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Manager permissions
INSERT INTO "role_permissions" (id, role_id, permission_id, scope)
SELECT uuid_generate_v4(), r.id, p.id, 'TEAM'
FROM "roles" r, "permissions" p
WHERE r.slug = 'manager' 
  AND (
    (p.resource = 'dashboard' AND p.action = 'view')
    OR (p.resource = 'employees' AND p.action = 'view')
    OR (p.resource = 'teams' AND p.action = 'view')
    OR (p.resource = 'attendance' AND p.action IN ('view', 'view_all'))
    OR (p.resource = 'leave' AND p.action IN ('view', 'view_all', 'approve', 'reject'))
    OR (p.resource = 'documents' AND p.action IN ('view', 'upload', 'download'))
    OR (p.resource = 'reports' AND p.action = 'view')
    OR (p.resource = 'performance' AND p.action IN ('view', 'view_all', 'manage'))
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Employee permissions
INSERT INTO "role_permissions" (id, role_id, permission_id, scope)
SELECT uuid_generate_v4(), r.id, p.id, 'OWN'
FROM "roles" r, "permissions" p
WHERE r.slug = 'employee' 
  AND (
    (p.resource = 'dashboard' AND p.action = 'view')
    OR (p.resource = 'attendance' AND p.action IN ('view', 'check_in', 'check_out'))
    OR (p.resource = 'leave' AND p.action IN ('view', 'request'))
    OR (p.resource = 'documents' AND p.action IN ('view', 'upload', 'download'))
    OR (p.resource = 'holidays' AND p.action = 'view')
    OR (p.resource = 'performance' AND p.action = 'view')
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Recruiter permissions
INSERT INTO "role_permissions" (id, role_id, permission_id, scope)
SELECT uuid_generate_v4(), r.id, p.id, 'ALL'
FROM "roles" r, "permissions" p
WHERE r.slug = 'recruiter' 
  AND (
    (p.resource = 'dashboard' AND p.action = 'view')
    OR (p.resource = 'recruitment')
    OR (p.resource = 'documents' AND p.action IN ('view', 'upload', 'download'))
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Viewer permissions
INSERT INTO "role_permissions" (id, role_id, permission_id, scope)
SELECT uuid_generate_v4(), r.id, p.id, 'ALL'
FROM "roles" r, "permissions" p
WHERE r.slug = 'viewer' 
  AND p.action = 'view'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- =============================================================================
-- DEFAULT LEAVE TYPES
-- =============================================================================
INSERT INTO "leave_types" (id, name, code, description, default_days_per_year, accrual_type, carry_forward_allowed, max_carry_forward_days, requires_approval, is_paid, color, is_active, created_at, updated_at)
VALUES
  (uuid_generate_v4(), 'Casual Leave', 'CL', 'For personal or casual purposes', 12, 'yearly', true, 5, true, true, '#3B82F6', true, NOW(), NOW()),
  (uuid_generate_v4(), 'Sick Leave', 'SL', 'For illness or medical appointments', 12, 'yearly', false, 0, true, true, '#EF4444', true, NOW(), NOW()),
  (uuid_generate_v4(), 'Earned Leave', 'EL', 'Accrued based on service', 15, 'monthly', true, 30, true, true, '#10B981', true, NOW(), NOW()),
  (uuid_generate_v4(), 'Maternity Leave', 'ML', 'For female employees expecting a child', 182, 'yearly', false, 0, true, true, '#EC4899', true, NOW(), NOW()),
  (uuid_generate_v4(), 'Paternity Leave', 'PL', 'For male employees expecting a child', 15, 'yearly', false, 0, true, true, '#8B5CF6', true, NOW(), NOW()),
  (uuid_generate_v4(), 'Compensatory Off', 'CO', 'For working on holidays or weekends', 0, 'yearly', true, 10, true, true, '#F59E0B', true, NOW(), NOW()),
  (uuid_generate_v4(), 'Work From Home', 'WFH', 'Work from home day', 24, 'yearly', false, 0, true, true, '#6366F1', true, NOW(), NOW()),
  (uuid_generate_v4(), 'Leave Without Pay', 'LWP', 'Unpaid leave', 0, 'yearly', false, 0, true, false, '#9CA3AF', true, NOW(), NOW()),
  (uuid_generate_v4(), 'Bereavement Leave', 'BL', 'For death of immediate family member', 5, 'yearly', false, 0, true, true, '#1F2937', true, NOW(), NOW())
ON CONFLICT (code) DO NOTHING;

-- =============================================================================
-- DEFAULT DESIGNATIONS
-- =============================================================================
INSERT INTO "designations" (id, name, code, level, description, is_active, created_at, updated_at)
VALUES
  -- Executive Level
  (uuid_generate_v4(), 'Chief Executive Officer', 'CEO', 1, 'Top executive responsible for overall management', true, NOW(), NOW()),
  (uuid_generate_v4(), 'Chief Technology Officer', 'CTO', 2, 'Head of technology and engineering', true, NOW(), NOW()),
  (uuid_generate_v4(), 'Chief Operating Officer', 'COO', 2, 'Head of operations', true, NOW(), NOW()),
  (uuid_generate_v4(), 'Chief Financial Officer', 'CFO', 2, 'Head of finance', true, NOW(), NOW()),
  (uuid_generate_v4(), 'Chief Human Resources Officer', 'CHRO', 2, 'Head of human resources', true, NOW(), NOW()),
  
  -- Director Level
  (uuid_generate_v4(), 'Director of Engineering', 'DOE', 3, 'Director overseeing engineering teams', true, NOW(), NOW()),
  (uuid_generate_v4(), 'Director of Product', 'DOP', 3, 'Director overseeing product development', true, NOW(), NOW()),
  (uuid_generate_v4(), 'Director of Sales', 'DOS', 3, 'Director overseeing sales', true, NOW(), NOW()),
  
  -- Manager Level
  (uuid_generate_v4(), 'Engineering Manager', 'EM', 4, 'Manager of engineering team', true, NOW(), NOW()),
  (uuid_generate_v4(), 'Project Manager', 'PM', 4, 'Manager of projects', true, NOW(), NOW()),
  (uuid_generate_v4(), 'HR Manager', 'HRM', 4, 'Manager of HR operations', true, NOW(), NOW()),
  (uuid_generate_v4(), 'Finance Manager', 'FM', 4, 'Manager of finance operations', true, NOW(), NOW()),
  
  -- Lead Level
  (uuid_generate_v4(), 'Technical Lead', 'TL', 5, 'Lead developer or technical expert', true, NOW(), NOW()),
  (uuid_generate_v4(), 'Team Lead', 'TML', 5, 'Team leader', true, NOW(), NOW()),
  
  -- Senior Level
  (uuid_generate_v4(), 'Senior Software Engineer', 'SSE', 6, 'Senior developer', true, NOW(), NOW()),
  (uuid_generate_v4(), 'Senior Designer', 'SD', 6, 'Senior UI/UX designer', true, NOW(), NOW()),
  (uuid_generate_v4(), 'Senior QA Engineer', 'SQA', 6, 'Senior quality assurance engineer', true, NOW(), NOW()),
  
  -- Mid Level
  (uuid_generate_v4(), 'Software Engineer', 'SE', 7, 'Software developer', true, NOW(), NOW()),
  (uuid_generate_v4(), 'UI/UX Designer', 'UD', 7, 'UI/UX designer', true, NOW(), NOW()),
  (uuid_generate_v4(), 'QA Engineer', 'QA', 7, 'Quality assurance engineer', true, NOW(), NOW()),
  (uuid_generate_v4(), 'DevOps Engineer', 'DE', 7, 'DevOps/Infrastructure engineer', true, NOW(), NOW()),
  (uuid_generate_v4(), 'HR Executive', 'HRE', 7, 'Human resources executive', true, NOW(), NOW()),
  (uuid_generate_v4(), 'Accountant', 'ACC', 7, 'Accountant', true, NOW(), NOW()),
  
  -- Junior Level
  (uuid_generate_v4(), 'Junior Software Engineer', 'JSE', 8, 'Junior developer', true, NOW(), NOW()),
  (uuid_generate_v4(), 'Junior Designer', 'JD', 8, 'Junior UI/UX designer', true, NOW(), NOW()),
  
  -- Entry Level
  (uuid_generate_v4(), 'Trainee', 'TRN', 9, 'Training position', true, NOW(), NOW()),
  (uuid_generate_v4(), 'Intern', 'INT', 10, 'Internship position', true, NOW(), NOW())
ON CONFLICT (code) DO NOTHING;

-- =============================================================================
-- DEFAULT EMAIL TEMPLATES
-- =============================================================================
INSERT INTO "email_templates" (id, name, display_name, category, description, subject, html_content, text_content, variables, is_active, is_default, created_at, updated_at)
VALUES
  -- Welcome Email
  (uuid_generate_v4(), 'welcome', 'Welcome Email', 'SYSTEM', 
   'Sent when a new employee is onboarded',
   'Welcome to {{companyName}}!',
   '<h1>Welcome, {{firstName}}!</h1><p>We''re excited to have you join {{companyName}}. Your login credentials have been set up.</p><p>Please login at: <a href="{{portalUrl}}">{{portalUrl}}</a></p><p>Best regards,<br>{{companyName}} Team</p>',
   'Welcome, {{firstName}}!\n\nWe''re excited to have you join {{companyName}}.\n\nPlease login at: {{portalUrl}}\n\nBest regards,\n{{companyName}} Team',
   '[{"name": "firstName", "description": "Employee first name"}, {"name": "companyName", "description": "Company name"}, {"name": "portalUrl", "description": "Portal URL"}]',
   true, true, NOW(), NOW()),
  
  -- Password Reset
  (uuid_generate_v4(), 'password-reset', 'Password Reset', 'SYSTEM',
   'Sent when user requests password reset',
   'Reset Your Password',
   '<h1>Password Reset Request</h1><p>Hi {{firstName}},</p><p>We received a request to reset your password. Click the link below to reset it:</p><p><a href="{{resetUrl}}">Reset Password</a></p><p>This link will expire in 24 hours.</p><p>If you didn''t request this, please ignore this email.</p>',
   'Hi {{firstName}},\n\nWe received a request to reset your password. Visit the following link:\n\n{{resetUrl}}\n\nThis link will expire in 24 hours.\n\nIf you didn''t request this, please ignore this email.',
   '[{"name": "firstName", "description": "User first name"}, {"name": "resetUrl", "description": "Password reset URL"}]',
   true, true, NOW(), NOW()),
  
  -- Leave Approved
  (uuid_generate_v4(), 'leave-approved', 'Leave Approved', 'HR',
   'Sent when leave request is approved',
   'Your Leave Request Has Been Approved',
   '<h1>Leave Approved</h1><p>Hi {{firstName}},</p><p>Your leave request for {{leaveType}} from {{fromDate}} to {{toDate}} has been approved.</p><p>Approved by: {{approverName}}</p><p>Comments: {{comments}}</p>',
   'Hi {{firstName}},\n\nYour leave request for {{leaveType}} from {{fromDate}} to {{toDate}} has been approved.\n\nApproved by: {{approverName}}\nComments: {{comments}}',
   '[{"name": "firstName"}, {"name": "leaveType"}, {"name": "fromDate"}, {"name": "toDate"}, {"name": "approverName"}, {"name": "comments"}]',
   true, true, NOW(), NOW()),
  
  -- Leave Rejected
  (uuid_generate_v4(), 'leave-rejected', 'Leave Rejected', 'HR',
   'Sent when leave request is rejected',
   'Your Leave Request Has Been Rejected',
   '<h1>Leave Rejected</h1><p>Hi {{firstName}},</p><p>Unfortunately, your leave request for {{leaveType}} from {{fromDate}} to {{toDate}} has been rejected.</p><p>Reason: {{reason}}</p><p>Please contact your manager for further details.</p>',
   'Hi {{firstName}},\n\nUnfortunately, your leave request for {{leaveType}} from {{fromDate}} to {{toDate}} has been rejected.\n\nReason: {{reason}}\n\nPlease contact your manager for further details.',
   '[{"name": "firstName"}, {"name": "leaveType"}, {"name": "fromDate"}, {"name": "toDate"}, {"name": "reason"}]',
   true, true, NOW(), NOW()),
  
  -- Interview Invitation
  (uuid_generate_v4(), 'interview-invitation', 'Interview Invitation', 'RECRUITMENT',
   'Sent to invite candidates for interview',
   'Interview Invitation - {{jobTitle}} at {{companyName}}',
   '<h1>Interview Invitation</h1><p>Dear {{candidateName}},</p><p>We are pleased to invite you for an interview for the position of <strong>{{jobTitle}}</strong>.</p><p><strong>Interview Details:</strong></p><ul><li>Date: {{interviewDate}}</li><li>Time: {{interviewTime}}</li><li>Mode: {{interviewMode}}</li><li>{{#if meetingLink}}Meeting Link: <a href="{{meetingLink}}">{{meetingLink}}</a>{{/if}}</li></ul><p>{{instructions}}</p><p>Please confirm your availability.</p><p>Best regards,<br>{{companyName}} Recruitment Team</p>',
   'Dear {{candidateName}},\n\nWe are pleased to invite you for an interview for the position of {{jobTitle}}.\n\nInterview Details:\n- Date: {{interviewDate}}\n- Time: {{interviewTime}}\n- Mode: {{interviewMode}}\n- Meeting Link: {{meetingLink}}\n\n{{instructions}}\n\nPlease confirm your availability.\n\nBest regards,\n{{companyName}} Recruitment Team',
   '[{"name": "candidateName"}, {"name": "jobTitle"}, {"name": "companyName"}, {"name": "interviewDate"}, {"name": "interviewTime"}, {"name": "interviewMode"}, {"name": "meetingLink"}, {"name": "instructions"}]',
   true, true, NOW(), NOW()),
  
  -- Offer Letter
  (uuid_generate_v4(), 'offer-letter', 'Job Offer', 'RECRUITMENT',
   'Sent to extend job offer to candidates',
   'Job Offer - {{jobTitle}} at {{companyName}}',
   '<h1>Congratulations!</h1><p>Dear {{candidateName}},</p><p>We are pleased to offer you the position of <strong>{{jobTitle}}</strong> at {{companyName}}.</p><p><strong>Offer Details:</strong></p><ul><li>Designation: {{designation}}</li><li>Department: {{department}}</li><li>Salary: {{salary}} {{currency}} per annum</li><li>Joining Date: {{joiningDate}}</li></ul><p>Please review and accept your offer: <a href="{{offerUrl}}">{{offerUrl}}</a></p><p>This offer is valid until {{expiryDate}}.</p><p>Welcome to the team!</p><p>Best regards,<br>{{companyName}} HR Team</p>',
   'Congratulations!\n\nDear {{candidateName}},\n\nWe are pleased to offer you the position of {{jobTitle}} at {{companyName}}.\n\nOffer Details:\n- Designation: {{designation}}\n- Department: {{department}}\n- Salary: {{salary}} {{currency}} per annum\n- Joining Date: {{joiningDate}}\n\nPlease review and accept your offer: {{offerUrl}}\n\nThis offer is valid until {{expiryDate}}.\n\nWelcome to the team!\n\nBest regards,\n{{companyName}} HR Team',
   '[{"name": "candidateName"}, {"name": "jobTitle"}, {"name": "companyName"}, {"name": "designation"}, {"name": "department"}, {"name": "salary"}, {"name": "currency"}, {"name": "joiningDate"}, {"name": "offerUrl"}, {"name": "expiryDate"}]',
   true, true, NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- =============================================================================
-- DONE
-- =============================================================================

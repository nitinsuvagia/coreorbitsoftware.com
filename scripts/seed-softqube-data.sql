-- Seed Roles
INSERT INTO roles (id, name, slug, description, is_system, is_default, created_at, updated_at) VALUES
('role-admin', 'Administrator', 'admin', 'Full system access', true, false, NOW(), NOW()),
('role-hr', 'HR Manager', 'hr-manager', 'HR management access', true, false, NOW(), NOW()),
('role-employee', 'Employee', 'employee', 'Standard employee access', true, true, NOW(), NOW())
ON CONFLICT (slug) DO NOTHING;

-- Seed Employees
INSERT INTO employees (id, employee_code, department_id, designation_id, first_name, last_name, display_name, email, phone, join_date, status, timezone, currency, created_at, updated_at) VALUES
('emp-001', 'EMP001', (SELECT id FROM departments WHERE code = 'ENG'), (SELECT id FROM designations WHERE code = 'SR_SWE'), 'Rahul', 'Sharma', 'Rahul Sharma', 'rahul.sharma@softqube.com', '+91-9876543210', '2024-01-15', 'ACTIVE', 'Asia/Kolkata', 'INR', NOW(), NOW()),
('emp-002', 'EMP002', (SELECT id FROM departments WHERE code = 'ENG'), (SELECT id FROM designations WHERE code = 'SWE'), 'Priya', 'Patel', 'Priya Patel', 'priya.patel@softqube.com', '+91-9876543211', '2024-03-01', 'ACTIVE', 'Asia/Kolkata', 'INR', NOW(), NOW()),
('emp-003', 'EMP003', (SELECT id FROM departments WHERE code = 'HR'), (SELECT id FROM designations WHERE code = 'MGR_HR'), 'Amit', 'Kumar', 'Amit Kumar', 'amit.kumar@softqube.com', '+91-9876543212', '2023-06-15', 'ACTIVE', 'Asia/Kolkata', 'INR', NOW(), NOW()),
('emp-004', 'EMP004', (SELECT id FROM departments WHERE code = 'ENG'), (SELECT id FROM designations WHERE code = 'TECH_LEAD'), 'Sneha', 'Gupta', 'Sneha Gupta', 'sneha.gupta@softqube.com', '+91-9876543213', '2023-09-01', 'ACTIVE', 'Asia/Kolkata', 'INR', NOW(), NOW()),
('emp-005', 'EMP005', (SELECT id FROM departments WHERE code = 'QA'), (SELECT id FROM designations WHERE code = 'QA_ENG'), 'Vikram', 'Singh', 'Vikram Singh', 'vikram.singh@softqube.com', '+91-9876543214', '2024-02-01', 'ACTIVE', 'Asia/Kolkata', 'INR', NOW(), NOW())
ON CONFLICT (employee_code) DO NOTHING;

-- Seed Users
INSERT INTO users (id, employee_id, username, email, password_hash, status, first_name, last_name, display_name, timezone, language, theme, created_at, updated_at) VALUES
('user-001', 'emp-001', 'rahul.sharma', 'rahul.sharma@softqube.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'ACTIVE', 'Rahul', 'Sharma', 'Rahul Sharma', 'Asia/Kolkata', 'en', 'SYSTEM', NOW(), NOW()),
('user-002', 'emp-002', 'priya.patel', 'priya.patel@softqube.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'ACTIVE', 'Priya', 'Patel', 'Priya Patel', 'Asia/Kolkata', 'en', 'SYSTEM', NOW(), NOW()),
('user-003', 'emp-003', 'amit.kumar', 'amit.kumar@softqube.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'ACTIVE', 'Amit', 'Kumar', 'Amit Kumar', 'Asia/Kolkata', 'en', 'SYSTEM', NOW(), NOW()),
('user-004', 'emp-004', 'sneha.gupta', 'sneha.gupta@softqube.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'ACTIVE', 'Sneha', 'Gupta', 'Sneha Gupta', 'Asia/Kolkata', 'en', 'SYSTEM', NOW(), NOW()),
('user-005', 'emp-005', 'vikram.singh', 'vikram.singh@softqube.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'ACTIVE', 'Vikram', 'Singh', 'Vikram Singh', 'Asia/Kolkata', 'en', 'SYSTEM', NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- Assign HR role to Amit
INSERT INTO user_roles (id, user_id, role_id, assigned_at) VALUES
('ur-001', 'user-003', 'role-hr', NOW())
ON CONFLICT (user_id, role_id) DO NOTHING;

-- Seed Job Descriptions
INSERT INTO job_descriptions (id, title, department, location, employment_type, salary_min, salary_max, currency, status, openings, experience_min, experience_max, description, requirements, responsibilities, benefits, tech_stack, posted_date, closing_date, created_at, updated_at) VALUES
('job-001', 'Senior Full Stack Developer', 'Engineering', 'Ahmedabad, Gujarat (Hybrid)', 'FULL_TIME', 1500000, 2500000, 'INR', 'OPEN', 2, 4, 8, 'We are looking for a Senior Full Stack Developer to join our growing team.', ARRAY['4+ years of experience', 'Strong React and Node.js skills', 'Experience with PostgreSQL'], ARRAY['Design and develop scalable web applications', 'Lead code reviews', 'Mentor junior developers'], ARRAY['Health insurance', 'Flexible working hours', 'Learning budget'], ARRAY['React', 'Node.js', 'TypeScript', 'PostgreSQL'], NOW(), NOW() + INTERVAL '30 days', NOW(), NOW()),
('job-002', 'QA Engineer', 'Quality Assurance', 'Ahmedabad, Gujarat (On-site)', 'FULL_TIME', 600000, 1000000, 'INR', 'OPEN', 1, 2, 5, 'Join our QA team to ensure product quality.', ARRAY['2+ years of QA experience', 'Automation testing', 'Knowledge of Selenium'], ARRAY['Write and execute test cases', 'Develop automation scripts', 'Report and track bugs'], ARRAY['Health insurance', 'Flexible working hours'], ARRAY['Selenium', 'Cypress', 'Postman', 'Jest'], NOW(), NOW() + INTERVAL '45 days', NOW(), NOW()),
('job-003', 'Junior React Developer', 'Engineering', 'Remote', 'FULL_TIME', 400000, 700000, 'INR', 'OPEN', 3, 0, 2, 'Great opportunity for freshers.', ARRAY['Basic knowledge of React', 'JavaScript/TypeScript', 'Willingness to learn'], ARRAY['Build UI components', 'Fix bugs', 'Write unit tests'], ARRAY['Health insurance', 'Mentorship program'], ARRAY['React', 'JavaScript', 'TypeScript', 'CSS'], NOW(), NOW() + INTERVAL '60 days', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Seed Job Candidates
INSERT INTO job_candidates (id, job_id, first_name, last_name, email, phone, source, status, stage, rating, current_company, experience_years, expected_salary, notes, applied_at, created_at, updated_at) VALUES
('cand-001', 'job-001', 'Ankit', 'Verma', 'ankit.verma@gmail.com', '+91-9988776655', 'LINKEDIN', 'SHORTLISTED', 'TECHNICAL_INTERVIEW', 4, 'TCS', 5, 2000000, 'Strong React skills, good communication', NOW() - INTERVAL '5 days', NOW(), NOW()),
('cand-002', 'job-001', 'Neha', 'Reddy', 'neha.reddy@gmail.com', '+91-9988776656', 'REFERRAL', 'SCREENING', 'PHONE_SCREEN', 3, 'Infosys', 4, 1800000, 'Referred by Rahul, has good Node.js experience', NOW() - INTERVAL '3 days', NOW(), NOW()),
('cand-003', 'job-001', 'Karan', 'Mehta', 'karan.mehta@outlook.com', '+91-9988776657', 'CAREER_PAGE', 'APPLIED', 'APPLICATION', 0, 'Wipro', 6, 2200000, 'Applied through career page', NOW() - INTERVAL '1 day', NOW(), NOW()),
('cand-004', 'job-002', 'Swati', 'Joshi', 'swati.joshi@gmail.com', '+91-9988776658', 'JOB_PORTAL', 'SHORTLISTED', 'HR_INTERVIEW', 4, 'Accenture', 3, 800000, 'Good automation experience', NOW() - INTERVAL '7 days', NOW(), NOW()),
('cand-005', 'job-003', 'Rohit', 'Desai', 'rohit.desai@gmail.com', '+91-9988776659', 'CAREER_PAGE', 'APPLIED', 'APPLICATION', 0, NULL, 0, 500000, 'Fresh graduate, eager to learn', NOW() - INTERVAL '2 days', NOW(), NOW()),
('cand-006', 'job-003', 'Meera', 'Shah', 'meera.shah@gmail.com', '+91-9988776660', 'LINKEDIN', 'SCREENING', 'PHONE_SCREEN', 3, NULL, 1, 600000, '1 year internship experience', NOW() - INTERVAL '4 days', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

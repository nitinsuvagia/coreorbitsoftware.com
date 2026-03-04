-- Add all unique designations for employee import
-- Run against oms_tenant_softqube database
-- This script contains 68 unique professional designations organized by level

-- C-Level / Directors (Level 1)
INSERT INTO designations (id, name, code, level, description, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'Managing Director', 'MD', 1, 'Managing Director', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM designations WHERE code = 'MD');

-- Department Heads (Level 2)
INSERT INTO designations (id, name, code, level, description, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'Head of Department', 'HOD', 2, 'Head of Department', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM designations WHERE code = 'HOD');

INSERT INTO designations (id, name, code, level, description, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'Business Development Manager', 'BDM', 2, 'Business Development Manager', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM designations WHERE code = 'BDM');

-- Team Leads (Level 3)
INSERT INTO designations (id, name, code, level, description, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'Team Leader', 'TEAM_LEADER', 3, 'Team Leader', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM designations WHERE code = 'TEAM_LEADER');

INSERT INTO designations (id, name, code, level, description, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'SEO Team Leader', 'SEO_TL', 3, 'SEO Team Leader', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM designations WHERE code = 'SEO_TL');

INSERT INTO designations (id, name, code, level, description, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'Lead Biostatistician', 'LEAD_BIOSTATS', 3, 'Lead Biostatistician', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM designations WHERE code = 'LEAD_BIOSTATS');

-- Senior Positions (Level 4)
INSERT INTO designations (id, name, code, level, description, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'Sr. Software Engineer', 'SR_SW_ENG', 4, 'Senior Software Engineer', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM designations WHERE code = 'SR_SW_ENG');

INSERT INTO designations (id, name, code, level, description, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'Sr. Software Developer', 'SR_SW_DEV', 4, 'Senior Software Developer', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM designations WHERE code = 'SR_SW_DEV');

INSERT INTO designations (id, name, code, level, description, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'Sr. Developer', 'SR_DEV', 4, 'Senior Developer', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM designations WHERE code = 'SR_DEV');

INSERT INTO designations (id, name, code, level, description, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'Sr. Android Developer', 'SR_ANDROID', 4, 'Senior Android Developer', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM designations WHERE code = 'SR_ANDROID');

INSERT INTO designations (id, name, code, level, description, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'Sr. iOS Developer', 'SR_IOS', 4, 'Senior iOS Developer', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM designations WHERE code = 'SR_IOS');

INSERT INTO designations (id, name, code, level, description, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'Sr. PHP Developer', 'SR_PHP', 4, 'Senior PHP Developer', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM designations WHERE code = 'SR_PHP');

INSERT INTO designations (id, name, code, level, description, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'Sr. ASP.NET Developer', 'SR_ASPNET', 4, 'Senior ASP.NET Developer', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM designations WHERE code = 'SR_ASPNET');

INSERT INTO designations (id, name, code, level, description, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'Sr. WordPress Developer', 'SR_WORDPRESS', 4, 'Senior WordPress Developer', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM designations WHERE code = 'SR_WORDPRESS');

INSERT INTO designations (id, name, code, level, description, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'Sr. Web Designer', 'SR_WEB_DESIGN', 4, 'Senior Web Designer', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM designations WHERE code = 'SR_WEB_DESIGN');

INSERT INTO designations (id, name, code, level, description, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'Sr. QA Engineer', 'SR_QA_ENG', 4, 'Senior QA Engineer', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM designations WHERE code = 'SR_QA_ENG');

INSERT INTO designations (id, name, code, level, description, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'Sr. Quality Assurance', 'SR_QA_ALT', 4, 'Senior Quality Assurance', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM designations WHERE code = 'SR_QA_ALT');

INSERT INTO designations (id, name, code, level, description, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'Sr. SEO Executive', 'SR_SEO_EXEC', 4, 'Senior SEO Executive', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM designations WHERE code = 'SR_SEO_EXEC');

INSERT INTO designations (id, name, code, level, description, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'Sr. HR Executive', 'SR_HR_EXEC', 4, 'Senior HR Executive', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM designations WHERE code = 'SR_HR_EXEC');

INSERT INTO designations (id, name, code, level, description, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'Sr. Business Analyst', 'SR_BUS_ANALYST', 4, 'Senior Business Analyst', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM designations WHERE code = 'SR_BUS_ANALYST');

INSERT INTO designations (id, name, code, level, description, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'Sr. Associate Biostatistician', 'SR_ASSOC_BIOSTATS', 4, 'Senior Associate Biostatistician', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM designations WHERE code = 'SR_ASSOC_BIOSTATS');

-- Mid-Level Positions (Level 5)
INSERT INTO designations (id, name, code, level, description, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'Creative Designer', 'CREATIVE_DESIGN', 5, 'Creative Designer', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM designations WHERE code = 'CREATIVE_DESIGN');

INSERT INTO designations (id, name, code, level, description, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'Human Resource', 'HR', 5, 'Human Resource', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM designations WHERE code = 'HR');

INSERT INTO designations (id, name, code, level, description, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'Business Development Executive', 'BUS_DEV_EXEC', 5, 'Business Development Executive', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM designations WHERE code = 'BUS_DEV_EXEC');

INSERT INTO designations (id, name, code, level, description, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'Python Developer', 'PYTHON_DEV', 5, 'Python Developer', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM designations WHERE code = 'PYTHON_DEV');

INSERT INTO designations (id, name, code, level, description, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'WordPress and PHP Developer', 'WORDPRESS_PHP', 5, 'WordPress and PHP Developer', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM designations WHERE code = 'WORDPRESS_PHP');

INSERT INTO designations (id, name, code, level, description, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'Data Research Analyst', 'DATA_RESEARCH', 5, 'Data Research Analyst', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM designations WHERE code = 'DATA_RESEARCH');

INSERT INTO designations (id, name, code, level, description, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'Market Research Analyst', 'MARKET_RESEARCH', 5, 'Market Research Analyst', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM designations WHERE code = 'MARKET_RESEARCH');

-- Junior Positions (Level 6)
INSERT INTO designations (id, name, code, level, description, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'Jr. Software Engineer', 'JR_SW_ENG', 6, 'Junior Software Engineer', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM designations WHERE code = 'JR_SW_ENG');

INSERT INTO designations (id, name, code, level, description, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'Jr. Software Developer', 'JR_SW_DEV', 6, 'Junior Software Developer', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM designations WHERE code = 'JR_SW_DEV');

INSERT INTO designations (id, name, code, level, description, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'Jr. Android Developer', 'JR_ANDROID', 6, 'Junior Android Developer', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM designations WHERE code = 'JR_ANDROID');

INSERT INTO designations (id, name, code, level, description, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'Jr. iOS Developer', 'JR_IOS', 6, 'Junior iOS Developer', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM designations WHERE code = 'JR_IOS');

INSERT INTO designations (id, name, code, level, description, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'Jr. PHP Developer', 'JR_PHP', 6, 'Junior PHP Developer', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM designations WHERE code = 'JR_PHP');

INSERT INTO designations (id, name, code, level, description, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'Jr. ASP.NET Developer', 'JR_ASPNET', 6, 'Junior ASP.NET Developer', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM designations WHERE code = 'JR_ASPNET');

INSERT INTO designations (id, name, code, level, description, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'Jr. WordPress Developer', 'JR_WORDPRESS', 6, 'Junior WordPress Developer', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM designations WHERE code = 'JR_WORDPRESS');

INSERT INTO designations (id, name, code, level, description, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'Jr. Web Designer', 'JR_WEB_DESIGN', 6, 'Junior Web Designer', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM designations WHERE code = 'JR_WEB_DESIGN');

INSERT INTO designations (id, name, code, level, description, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'Jr. Designer', 'JR_DESIGNER', 6, 'Junior Designer', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM designations WHERE code = 'JR_DESIGNER');

INSERT INTO designations (id, name, code, level, description, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'Jr. UI/UX Designer', 'JR_UI_UX', 6, 'Junior UI/UX Designer', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM designations WHERE code = 'JR_UI_UX');

INSERT INTO designations (id, name, code, level, description, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'Jr. QA Engineer', 'JR_QA_ENG', 6, 'Junior QA Engineer', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM designations WHERE code = 'JR_QA_ENG');

INSERT INTO designations (id, name, code, level, description, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'Jr. Quality Assurance Engineer', 'JR_QA_ASSURE', 6, 'Junior Quality Assurance Engineer', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM designations WHERE code = 'JR_QA_ASSURE');

INSERT INTO designations (id, name, code, level, description, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'Jr. SEO Executive', 'JR_SEO_EXEC', 6, 'Junior SEO Executive', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM designations WHERE code = 'JR_SEO_EXEC');

INSERT INTO designations (id, name, code, level, description, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'Jr. HR Executive', 'JR_HR_EXEC', 6, 'Junior HR Executive', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM designations WHERE code = 'JR_HR_EXEC');

INSERT INTO designations (id, name, code, level, description, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'Jr. Business Analyst', 'JR_BUS_ANALYST', 6, 'Junior Business Analyst', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM designations WHERE code = 'JR_BUS_ANALYST');

INSERT INTO designations (id, name, code, level, description, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'Jr. Game Developer', 'JR_GAME_DEV', 6, 'Junior Game Developer', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM designations WHERE code = 'JR_GAME_DEV');

INSERT INTO designations (id, name, code, level, description, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'Jr. AI/ML Developer', 'JR_AI_ML', 6, 'Junior AI/ML Developer', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM designations WHERE code = 'JR_AI_ML');

INSERT INTO designations (id, name, code, level, description, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'Jr. Python Developer', 'JR_PYTHON', 6, 'Junior Python Developer', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM designations WHERE code = 'JR_PYTHON');

INSERT INTO designations (id, name, code, level, description, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'Jr. Data Analyst Developer', 'JR_DATA_ANALYST', 6, 'Junior Data Analyst Developer', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM designations WHERE code = 'JR_DATA_ANALYST');

INSERT INTO designations (id, name, code, level, description, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'Jr. Associate Biostatistician', 'JR_ASSOC_BIOSTATS', 6, 'Junior Associate Biostatistician', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM designations WHERE code = 'JR_ASSOC_BIOSTATS');

-- Trainees / Interns (Level 7)
INSERT INTO designations (id, name, code, level, description, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'Software Trainee', 'TRAINEE_SW', 7, 'Software Trainee', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM designations WHERE code = 'TRAINEE_SW');

INSERT INTO designations (id, name, code, level, description, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'Software Developer Trainee', 'TRAINEE_SW_DEV', 7, 'Software Developer Trainee', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM designations WHERE code = 'TRAINEE_SW_DEV');

INSERT INTO designations (id, name, code, level, description, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'SEO Trainee', 'TRAINEE_SEO', 7, 'SEO Trainee', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM designations WHERE code = 'TRAINEE_SEO');

INSERT INTO designations (id, name, code, level, description, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'PHP Trainee', 'TRAINEE_PHP', 7, 'PHP Trainee', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM designations WHERE code = 'TRAINEE_PHP');

INSERT INTO designations (id, name, code, level, description, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'ASP.NET Trainee', 'TRAINEE_ASPNET', 7, 'ASP.NET Trainee', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM designations WHERE code = 'TRAINEE_ASPNET');

INSERT INTO designations (id, name, code, level, description, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'Design Trainee', 'TRAINEE_DESIGN', 7, 'Design Trainee', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM designations WHERE code = 'TRAINEE_DESIGN');

INSERT INTO designations (id, name, code, level, description, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'Web Design Trainee', 'TRAINEE_WEB_DESIGN', 7, 'Web Design Trainee', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM designations WHERE code = 'TRAINEE_WEB_DESIGN');

INSERT INTO designations (id, name, code, level, description, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'Web Designer Trainee', 'TRAINEE_WEB_DESIGNER', 7, 'Web Designer Trainee', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM designations WHERE code = 'TRAINEE_WEB_DESIGNER');

INSERT INTO designations (id, name, code, level, description, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'Mobile Trainee', 'TRAINEE_MOBILE', 7, 'Mobile Trainee', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM designations WHERE code = 'TRAINEE_MOBILE');

INSERT INTO designations (id, name, code, level, description, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'Data Analyst Intern', 'INTERN_DATA', 7, 'Data Analyst Intern', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM designations WHERE code = 'INTERN_DATA');

-- Support Staff (Level 8)
INSERT INTO designations (id, name, code, level, description, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'Office Boy', 'OFFICE_BOY', 8, 'Office Boy', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM designations WHERE code = 'OFFICE_BOY');

INSERT INTO designations (id, name, code, level, description, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'House Keeping', 'HOUSEKEEPING', 8, 'House Keeping', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM designations WHERE code = 'HOUSEKEEPING');

-- Show results grouped by level
SELECT level, name, code FROM designations ORDER BY level, name;

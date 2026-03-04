-- Seed Default Document Folders for Softqube Tenant
-- Run with: psql postgresql://postgres:password@localhost:5432/oms_tenant_softqube -f scripts/seed-default-folders.sql

-- Variables
\set admin_user_id '87cfde17-c9fe-401d-8730-89c2b863f122'

-- Get Company Documents folder ID
SELECT id AS company_folder_id FROM folders WHERE name = 'Company Documents' AND parent_id IS NULL LIMIT 1 \gset

-- Create subfolders under Company Documents
INSERT INTO folders (id, name, description, color, parent_id, path, depth, created_by, created_at, updated_at)
SELECT gen_random_uuid(), 'Policies', 'Company policies and procedures', 'red', 
  :'company_folder_id', '/Company Documents/Policies', 2, :'admin_user_id', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM folders WHERE name = 'Policies' AND parent_id = :'company_folder_id');

INSERT INTO folders (id, name, description, color, parent_id, path, depth, created_by, created_at, updated_at)
SELECT gen_random_uuid(), 'Forms', 'Standard company forms and templates', 'green', 
  :'company_folder_id', '/Company Documents/Forms', 2, :'admin_user_id', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM folders WHERE name = 'Forms' AND parent_id = :'company_folder_id');

INSERT INTO folders (id, name, description, color, parent_id, path, depth, created_by, created_at, updated_at)
SELECT gen_random_uuid(), 'Templates', 'Document templates', 'purple', 
  :'company_folder_id', '/Company Documents/Templates', 2, :'admin_user_id', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM folders WHERE name = 'Templates' AND parent_id = :'company_folder_id');

INSERT INTO folders (id, name, description, color, parent_id, path, depth, created_by, created_at, updated_at)
SELECT gen_random_uuid(), 'Certifications', 'Company certifications and licenses', 'orange', 
  :'company_folder_id', '/Company Documents/Certifications', 2, :'admin_user_id', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM folders WHERE name = 'Certifications' AND parent_id = :'company_folder_id');

INSERT INTO folders (id, name, description, color, parent_id, path, depth, created_by, created_at, updated_at)
SELECT gen_random_uuid(), 'Legal Documents', 'Legal agreements and contracts', 'red', 
  :'company_folder_id', '/Company Documents/Legal Documents', 2, :'admin_user_id', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM folders WHERE name = 'Legal Documents' AND parent_id = :'company_folder_id');

INSERT INTO folders (id, name, description, color, parent_id, path, depth, created_by, created_at, updated_at)
SELECT gen_random_uuid(), 'Training Materials', 'Training resources and materials', 'blue', 
  :'company_folder_id', '/Company Documents/Training Materials', 2, :'admin_user_id', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM folders WHERE name = 'Training Materials' AND parent_id = :'company_folder_id');

INSERT INTO folders (id, name, description, color, parent_id, path, depth, created_by, created_at, updated_at)
SELECT gen_random_uuid(), 'Company Assets', 'Logos, branding, and marketing assets', 'pink', 
  :'company_folder_id', '/Company Documents/Company Assets', 2, :'admin_user_id', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM folders WHERE name = 'Company Assets' AND parent_id = :'company_folder_id');

INSERT INTO folders (id, name, description, color, parent_id, path, depth, created_by, created_at, updated_at)
SELECT gen_random_uuid(), 'HR Documents', 'HR policies, handbooks, and guidelines', 'indigo', 
  :'company_folder_id', '/Company Documents/HR Documents', 2, :'admin_user_id', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM folders WHERE name = 'HR Documents' AND parent_id = :'company_folder_id');

-- Create Employee Documents root folder
INSERT INTO folders (id, name, description, color, parent_id, path, depth, created_by, created_at, updated_at)
SELECT gen_random_uuid(), 'Employee Documents', 'Employee-specific documents organized by employee', 'green', 
  NULL, '/Employee Documents', 1, :'admin_user_id', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM folders WHERE name = 'Employee Documents' AND parent_id IS NULL);

-- Show results
SELECT id, name, path, depth, color FROM folders ORDER BY path;

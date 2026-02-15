-- Add missing columns to folders table
ALTER TABLE folders 
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS color TEXT,
  ADD COLUMN IF NOT EXISTS depth INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_starred BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS deleted_by TEXT;

-- Add missing columns to files table
ALTER TABLE files
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS tags TEXT[],
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_starred BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS share_expiry TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS deleted_by TEXT,
  ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- Create folder_permissions table if not exists
CREATE TABLE IF NOT EXISTS folder_permissions (
  id TEXT PRIMARY KEY,
  folder_id TEXT NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
  user_id TEXT,
  role_id TEXT,
  permission TEXT NOT NULL CHECK (permission IN ('VIEW', 'EDIT', 'DELETE', 'SHARE', 'ADMIN')),
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT NOT NULL REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS folder_permissions_folder_id_idx ON folder_permissions(folder_id);
CREATE INDEX IF NOT EXISTS folder_permissions_user_id_idx ON folder_permissions(user_id);

-- Create file_permissions table if not exists
CREATE TABLE IF NOT EXISTS file_permissions (
  id TEXT PRIMARY KEY,
  file_id TEXT NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  user_id TEXT,
  role_id TEXT,
  permission TEXT NOT NULL CHECK (permission IN ('VIEW', 'EDIT', 'DELETE', 'SHARE', 'ADMIN')),
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT NOT NULL REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS file_permissions_file_id_idx ON file_permissions(file_id);
CREATE INDEX IF NOT EXISTS file_permissions_user_id_idx ON file_permissions(user_id);

-- Create file_versions table if not exists  
CREATE TABLE IF NOT EXISTS file_versions (
  id TEXT PRIMARY KEY,
  file_id TEXT NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  size BIGINT NOT NULL,
  storage_key TEXT NOT NULL,
  uploaded_by TEXT NOT NULL REFERENCES users(id),
  uploaded_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  comment TEXT
);

CREATE INDEX IF NOT EXISTS file_versions_file_id_idx ON file_versions(file_id);
CREATE UNIQUE INDEX IF NOT EXISTS file_versions_file_id_version_idx ON file_versions(file_id, version);

COMMENT ON TABLE folders IS 'Document folders with permissions and soft delete';
COMMENT ON TABLE files IS 'Files with versioning, starring, sharing, and soft delete';
COMMENT ON TABLE folder_permissions IS 'Folder-level permissions for users and roles';
COMMENT ON TABLE file_permissions IS 'File-level permissions for users and roles';
COMMENT ON TABLE file_versions IS 'File version history';

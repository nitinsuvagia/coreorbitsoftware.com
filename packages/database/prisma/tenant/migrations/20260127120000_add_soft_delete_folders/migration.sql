-- Add soft delete columns to folders table if they don't exist
ALTER TABLE folders ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE folders ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP(3);

-- Create index for soft delete queries
CREATE INDEX IF NOT EXISTS folders_is_deleted_idx ON folders(is_deleted);

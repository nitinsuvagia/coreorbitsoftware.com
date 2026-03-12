-- Migration: Add task-assignment columns to user_todos
-- Allows a todo creator to assign a task to another employee.
-- The assignee sees the task in their "My Tasks"; completing it updates the shared record.

ALTER TABLE user_todos
  ADD COLUMN IF NOT EXISTS assignee_id   VARCHAR(36),
  ADD COLUMN IF NOT EXISTS assignee_name VARCHAR(200),
  ADD COLUMN IF NOT EXISTS creator_name  VARCHAR(200);

CREATE INDEX IF NOT EXISTS idx_user_todos_assignee_id ON user_todos (assignee_id);

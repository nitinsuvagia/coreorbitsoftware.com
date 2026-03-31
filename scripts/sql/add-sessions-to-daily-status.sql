-- Add sessions JSON and session_count columns to employee_daily_status table
-- This stores all attendance sessions for proper frontend display

-- Add sessions JSONB column to store all session data
ALTER TABLE employee_daily_status 
ADD COLUMN IF NOT EXISTS sessions JSONB;

-- Add session_count column
ALTER TABLE employee_daily_status 
ADD COLUMN IF NOT EXISTS session_count INTEGER DEFAULT 1;

-- Comment on columns
COMMENT ON COLUMN employee_daily_status.sessions IS 'JSON array of all attendance sessions: [{id, checkIn, checkOut, workMinutes, status, isLate, isEarlyLeave, isRemote, notes}]';
COMMENT ON COLUMN employee_daily_status.session_count IS 'Number of sessions worked on this day';

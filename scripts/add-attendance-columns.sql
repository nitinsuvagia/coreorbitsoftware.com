-- Add missing columns to attendances table
ALTER TABLE attendances 
ADD COLUMN IF NOT EXISTS date DATE,
ADD COLUMN IF NOT EXISTS check_in_time TIMESTAMP,
ADD COLUMN IF NOT EXISTS check_out_time TIMESTAMP,
ADD COLUMN IF NOT EXISTS check_in_location JSONB,
ADD COLUMN IF NOT EXISTS check_out_location JSONB,
ADD COLUMN IF NOT EXISTS check_in_device TEXT,
ADD COLUMN IF NOT EXISTS check_out_device TEXT,
ADD COLUMN IF NOT EXISTS work_minutes INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS overtime_minutes INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS break_minutes INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'present',
ADD COLUMN IF NOT EXISTS is_late BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_early_leave BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_remote BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS created_by TEXT,
ADD COLUMN IF NOT EXISTS updated_by TEXT;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_attendances_date ON attendances(date);
CREATE INDEX IF NOT EXISTS idx_attendances_status ON attendances(status);

-- Delete any existing attendance records for today (clean slate)
DELETE FROM attendances WHERE date = CURRENT_DATE;

-- Insert attendance records for today
-- Rahul - Present, on time, checked in at 9:00 AM
INSERT INTO attendances (id, employee_id, date, check_in_time, check_out_time, status, is_late, is_remote, work_minutes, notes, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    'emp-001',
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '9 hours',
    CURRENT_DATE + INTERVAL '18 hours',
    'present',
    false,
    false,
    540,
    'Regular office day',
    NOW(),
    NOW()
);

-- Priya - Present but late, checked in at 10:30 AM
INSERT INTO attendances (id, employee_id, date, check_in_time, check_out_time, status, is_late, is_remote, work_minutes, notes, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    'emp-002',
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '10 hours 30 minutes',
    CURRENT_DATE + INTERVAL '19 hours',
    'present',
    true,
    false,
    510,
    'Traffic delay',
    NOW(),
    NOW()
);

-- Amit - WFH (Work from Home), checked in at 9:15 AM
INSERT INTO attendances (id, employee_id, date, check_in_time, check_out_time, status, is_late, is_remote, work_minutes, notes, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    'emp-003',
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '9 hours 15 minutes',
    CURRENT_DATE + INTERVAL '18 hours 30 minutes',
    'present',
    false,
    true,
    555,
    'Working from home',
    NOW(),
    NOW()
);

-- Sneha - Half day, checked in at 9:00 AM, left at 1:00 PM
INSERT INTO attendances (id, employee_id, date, check_in_time, check_out_time, status, is_late, is_early_leave, is_remote, work_minutes, notes, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    'emp-004',
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '9 hours',
    CURRENT_DATE + INTERVAL '13 hours',
    'half_day',
    false,
    true,
    false,
    240,
    'Personal appointment',
    NOW(),
    NOW()
);

-- Vikram - Present, on time, checked in at 8:45 AM
INSERT INTO attendances (id, employee_id, date, check_in_time, check_out_time, status, is_late, is_remote, work_minutes, notes, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    'emp-005',
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '8 hours 45 minutes',
    CURRENT_DATE + INTERVAL '17 hours 45 minutes',
    'present',
    false,
    false,
    540,
    NULL,
    NOW(),
    NOW()
);

-- Hari - Present but late, WFH
INSERT INTO attendances (id, employee_id, date, check_in_time, check_out_time, status, is_late, is_remote, work_minutes, notes, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    '597394ed-09c4-4b1b-8086-22df154aa4bd',
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '10 hours',
    NULL,
    'present',
    true,
    true,
    0,
    'WFH - still working',
    NOW(),
    NOW()
);

-- Nitin is on leave (we'll add a leave record)
-- First check if leave_types exists and get the ID for casual leave
DO $$
DECLARE
    casual_leave_id TEXT;
BEGIN
    SELECT id INTO casual_leave_id FROM leave_types WHERE code = 'CL' LIMIT 1;
    
    IF casual_leave_id IS NOT NULL THEN
        -- Delete any existing leave for Nitin today
        DELETE FROM leaves WHERE employee_id = 'emp-admin-001' 
            AND start_date <= CURRENT_DATE AND end_date >= CURRENT_DATE;
        
        -- Insert leave record for Nitin (on leave today)
        INSERT INTO leaves (id, employee_id, leave_type_id, start_date, end_date, total_days, status, reason, created_at, updated_at)
        VALUES (
            gen_random_uuid(),
            'emp-admin-001',
            casual_leave_id,
            CURRENT_DATE,
            CURRENT_DATE,
            1,
            'APPROVED',
            'Personal work',
            NOW(),
            NOW()
        );
    END IF;
END $$;

-- Verify the data
SELECT 'Attendance Records:' as info;
SELECT id, employee_id, date, status, is_late, is_remote, work_minutes FROM attendances WHERE date = CURRENT_DATE;

SELECT 'Leave Records for today:' as info;
SELECT l.id, l.employee_id, e.first_name, l.status, l.start_date, l.end_date 
FROM leaves l 
JOIN employees e ON l.employee_id = e.id
WHERE l.start_date <= CURRENT_DATE AND l.end_date >= CURRENT_DATE AND l.status = 'APPROVED';

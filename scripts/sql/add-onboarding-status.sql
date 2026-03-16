-- Add ONBOARDING status to the employee_status enum
-- This must be run before deploying the code changes

-- Check if ONBOARDING already exists in the enum
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'ONBOARDING' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'EmployeeStatus')
    ) THEN
        -- Add ONBOARDING as the first value in the enum (before ACTIVE)
        ALTER TYPE "EmployeeStatus" ADD VALUE 'ONBOARDING' BEFORE 'ACTIVE';
    END IF;
END$$;

-- Verify the enum values
SELECT enumlabel FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'EmployeeStatus');

-- ============================================================================
-- Production Migration: Add employee_skills, badges, employee_badges tables
-- and review_type column to performance_reviews
--
-- Run on EACH tenant database:
--   PGPASSWORD=<pwd> psql -h localhost -U postgres -d oms_tenant_<slug> -f migrate_add_skills_badges_review_type.sql
-- ============================================================================

-- 1. Add review_type to performance_reviews (safe - skips if exists)
DO $$ BEGIN
    ALTER TABLE performance_reviews ADD COLUMN review_type VARCHAR(50) NOT NULL DEFAULT 'periodic';
EXCEPTION WHEN duplicate_column THEN null;
END $$;

-- Fix updated_at default (in case it was missing)
ALTER TABLE performance_reviews ALTER COLUMN updated_at SET DEFAULT NOW();

-- Add unique constraint for upsert (safe - skips if exists)
DO $$ BEGIN
    ALTER TABLE performance_reviews ADD CONSTRAINT uq_performance_review_employee_period_type
        UNIQUE (employee_id, review_period, review_type);
EXCEPTION WHEN duplicate_table THEN null;
         WHEN duplicate_object THEN null;
END $$;

-- 2. Create employee_skills table (safe - skips if exists)
CREATE TABLE IF NOT EXISTS employee_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'general',
    level VARCHAR(20) NOT NULL DEFAULT 'intermediate',
    years_experience DECIMAL(4,1),
    is_primary BOOLEAN NOT NULL DEFAULT false,
    endorsed_by TEXT[] DEFAULT '{}',
    notes VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(employee_id, name)
);

CREATE INDEX IF NOT EXISTS idx_employee_skills_employee_id ON employee_skills(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_skills_category ON employee_skills(category);
CREATE INDEX IF NOT EXISTS idx_employee_skills_level ON employee_skills(level);

-- 3. Create BadgeCategory enum (safe - skips if exists)
DO $$ BEGIN
    CREATE TYPE "BadgeCategory" AS ENUM (
        'PERFORMANCE', 'ATTENDANCE', 'TEAMWORK', 'LEADERSHIP',
        'INNOVATION', 'LEARNING', 'MILESTONE', 'SPECIAL'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 4. Create badges table (safe - skips if exists)
CREATE TABLE IF NOT EXISTS badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50) NOT NULL DEFAULT 'Award',
    color VARCHAR(50) NOT NULL DEFAULT 'bg-blue-500',
    category "BadgeCategory" NOT NULL DEFAULT 'SPECIAL',
    points INTEGER NOT NULL DEFAULT 10,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_badges_category ON badges(category);
CREATE INDEX IF NOT EXISTS idx_badges_is_active ON badges(is_active);

-- Seed default badges (safe - skips duplicates)
INSERT INTO badges (name, description, icon, color, category, points) VALUES
    ('Early Bird', 'Consistently arrives on time', 'Clock', 'bg-blue-500', 'ATTENDANCE', 10),
    ('Team Player', 'Excellent collaboration with teammates', 'Users', 'bg-green-500', 'TEAMWORK', 15),
    ('Problem Solver', 'Resolved critical issues effectively', 'Lightbulb', 'bg-purple-500', 'INNOVATION', 20),
    ('Mentor', 'Helped onboard and guide new team members', 'Heart', 'bg-pink-500', 'LEADERSHIP', 25),
    ('Star Performer', 'Outstanding performance in the quarter', 'Star', 'bg-amber-500', 'PERFORMANCE', 30),
    ('Quick Learner', 'Rapidly acquired new skills or certifications', 'GraduationCap', 'bg-cyan-500', 'LEARNING', 15),
    ('Innovation Champion', 'Introduced a creative solution or process improvement', 'Zap', 'bg-orange-500', 'INNOVATION', 25),
    ('Reliable Rock', 'Consistently delivers on commitments', 'Shield', 'bg-slate-500', 'PERFORMANCE', 20),
    ('1 Year Milestone', 'Completed 1 year with the organization', 'Trophy', 'bg-yellow-500', 'MILESTONE', 50),
    ('5 Year Milestone', 'Completed 5 years with the organization', 'Trophy', 'bg-yellow-600', 'MILESTONE', 100),
    ('Customer Hero', 'Received outstanding customer/client feedback', 'ThumbsUp', 'bg-emerald-500', 'SPECIAL', 20),
    ('Code Ninja', 'Exceptional code quality and technical skills', 'Code', 'bg-indigo-500', 'INNOVATION', 20)
ON CONFLICT DO NOTHING;

-- 5. Create employee_badges table (safe - skips if exists)
CREATE TABLE IF NOT EXISTS employee_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL,
    badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
    given_by UUID NOT NULL,
    given_by_name VARCHAR(200),
    reason TEXT,
    given_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(employee_id, badge_id, given_by, given_at)
);

CREATE INDEX IF NOT EXISTS idx_employee_badges_employee_id ON employee_badges(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_badges_badge_id ON employee_badges(badge_id);
CREATE INDEX IF NOT EXISTS idx_employee_badges_given_at ON employee_badges(given_at);

-- Done
SELECT 'Migration completed successfully' AS result;

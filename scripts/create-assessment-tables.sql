-- Create AssessmentDifficulty enum if not exists
DO $$ BEGIN
    CREATE TYPE "AssessmentDifficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD', 'EXPERT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create AssessmentTestStatus enum if not exists
DO $$ BEGIN
    CREATE TYPE "AssessmentTestStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create AssessmentQuestionType enum if not exists
DO $$ BEGIN
    CREATE TYPE "AssessmentQuestionType" AS ENUM ('MCQ', 'MULTI_SELECT', 'TRUE_FALSE', 'SHORT_TEXT', 'LONG_TEXT', 'CODE', 'FILE_UPLOAD');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create assessment_tests table
CREATE TABLE IF NOT EXISTS assessment_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    instructions TEXT,
    category VARCHAR(100),
    difficulty "AssessmentDifficulty" DEFAULT 'MEDIUM',
    duration INTEGER NOT NULL DEFAULT 60,
    passing_score INTEGER NOT NULL DEFAULT 70,
    max_attempts INTEGER NOT NULL DEFAULT 1,
    shuffle_questions BOOLEAN NOT NULL DEFAULT false,
    shuffle_options BOOLEAN NOT NULL DEFAULT false,
    show_results BOOLEAN NOT NULL DEFAULT true,
    proctoring BOOLEAN NOT NULL DEFAULT false,
    webcam_required BOOLEAN NOT NULL DEFAULT false,
    fullscreen BOOLEAN NOT NULL DEFAULT false,
    tab_switch_limit INTEGER NOT NULL DEFAULT 0,
    status "AssessmentTestStatus" NOT NULL DEFAULT 'DRAFT',
    published_at TIMESTAMP,
    created_by UUID,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create assessment_sections table
CREATE TABLE IF NOT EXISTS assessment_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id UUID NOT NULL REFERENCES assessment_tests(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    time_limit INTEGER,
    weightage DOUBLE PRECISION NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create assessment_questions table
CREATE TABLE IF NOT EXISTS assessment_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id UUID REFERENCES assessment_tests(id) ON DELETE CASCADE,
    section_id UUID REFERENCES assessment_sections(id) ON DELETE CASCADE,
    type "AssessmentQuestionType" NOT NULL,
    question TEXT NOT NULL,
    code TEXT,
    code_language VARCHAR(50),
    options JSONB,
    correct_answer TEXT,
    explanation TEXT,
    category VARCHAR(100),
    difficulty "AssessmentDifficulty",
    tags JSONB,
    points INTEGER NOT NULL DEFAULT 1,
    negative_marking DOUBLE PRECISION NOT NULL DEFAULT 0,
    "order" INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_assessment_sections_test_id ON assessment_sections(test_id);
CREATE INDEX IF NOT EXISTS idx_assessment_questions_test_id ON assessment_questions(test_id);
CREATE INDEX IF NOT EXISTS idx_assessment_questions_section_id ON assessment_questions(section_id);
CREATE INDEX IF NOT EXISTS idx_assessment_questions_category ON assessment_questions(category);

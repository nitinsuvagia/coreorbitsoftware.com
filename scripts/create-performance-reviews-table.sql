-- Create ReviewStatus enum if not exists
DO $$ BEGIN
    CREATE TYPE "ReviewStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'ACKNOWLEDGED', 'COMPLETED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create performance_reviews table
CREATE TABLE IF NOT EXISTS performance_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id VARCHAR(50) NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    reviewer_id VARCHAR(50) REFERENCES employees(id) ON DELETE SET NULL,
    review_period VARCHAR(50) NOT NULL,
    performance_score DECIMAL(3,1) CHECK (performance_score >= 1 AND performance_score <= 10),
    quality_of_work DECIMAL(3,1) CHECK (quality_of_work >= 1 AND quality_of_work <= 10),
    productivity DECIMAL(3,1) CHECK (productivity >= 1 AND productivity <= 10),
    communication DECIMAL(3,1) CHECK (communication >= 1 AND communication <= 10),
    teamwork DECIMAL(3,1) CHECK (teamwork >= 1 AND teamwork <= 10),
    initiative DECIMAL(3,1) CHECK (initiative >= 1 AND initiative <= 10),
    punctuality DECIMAL(3,1) CHECK (punctuality >= 1 AND punctuality <= 10),
    strengths TEXT,
    areas_for_improvement TEXT,
    goals TEXT,
    reviewer_comments TEXT,
    employee_comments TEXT,
    status "ReviewStatus" DEFAULT 'DRAFT',
    review_date DATE,
    acknowledged_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_performance_reviews_employee ON performance_reviews(employee_id);
CREATE INDEX IF NOT EXISTS idx_performance_reviews_status ON performance_reviews(status);

SELECT 'performance_reviews table created successfully' as result;

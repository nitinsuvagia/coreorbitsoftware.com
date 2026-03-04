-- Performance Reviews Table
-- Run this on each tenant database

CREATE TABLE IF NOT EXISTS performance_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  review_period VARCHAR(50) NOT NULL, -- e.g., 'Q1 2026', 'Annual 2025', 'Probation Review'
  review_type VARCHAR(50) NOT NULL DEFAULT 'periodic', -- 'periodic', 'probation', '360', 'self'
  
  -- Rating categories (1-5 scale)
  communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),
  technical_skills_rating INTEGER CHECK (technical_skills_rating >= 1 AND technical_skills_rating <= 5),
  teamwork_rating INTEGER CHECK (teamwork_rating >= 1 AND teamwork_rating <= 5),
  problem_solving_rating INTEGER CHECK (problem_solving_rating >= 1 AND problem_solving_rating <= 5),
  punctuality_rating INTEGER CHECK (punctuality_rating >= 1 AND punctuality_rating <= 5),
  initiative_rating INTEGER CHECK (initiative_rating >= 1 AND initiative_rating <= 5),
  
  -- Overall rating (calculated or manual, 1-10 scale)
  overall_rating DECIMAL(3,1) CHECK (overall_rating >= 1 AND overall_rating <= 10),
  
  -- Text feedback
  strengths TEXT,
  areas_for_improvement TEXT,
  goals_next_period TEXT,
  additional_comments TEXT,
  
  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'draft', -- 'draft', 'submitted', 'acknowledged'
  submitted_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES employees(id),
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_performance_reviews_employee ON performance_reviews(employee_id);
CREATE INDEX IF NOT EXISTS idx_performance_reviews_reviewer ON performance_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_performance_reviews_period ON performance_reviews(review_period);
CREATE INDEX IF NOT EXISTS idx_performance_reviews_status ON performance_reviews(status);
CREATE INDEX IF NOT EXISTS idx_performance_reviews_created ON performance_reviews(created_at DESC);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_performance_reviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_performance_reviews_updated_at ON performance_reviews;
CREATE TRIGGER trigger_performance_reviews_updated_at
  BEFORE UPDATE ON performance_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_performance_reviews_updated_at();

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Performance reviews table created successfully!';
END $$;

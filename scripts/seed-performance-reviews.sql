-- Remove any existing data first
DELETE FROM performance_reviews;

-- Seed performance review data (only using emp-001 to emp-005 which exist)
INSERT INTO performance_reviews (id, employee_id, reviewer_id, review_period, performance_score, quality_of_work, productivity, communication, teamwork, initiative, punctuality, strengths, areas_for_improvement, status, review_date, created_at, updated_at)
VALUES 
  (gen_random_uuid(), 'emp-001', 'emp-002', 'Q4 2025', 9.2, 9.5, 9.0, 8.8, 9.0, 9.5, 9.0, 'Excellent technical skills, proactive problem solver', 'Can improve documentation habits', 'COMPLETED', '2025-01-15', NOW(), NOW()),
  (gen_random_uuid(), 'emp-002', 'emp-001', 'Q4 2025', 8.8, 8.5, 9.0, 9.2, 9.0, 8.5, 8.8, 'Strong leadership, great team player', 'Time management could be better', 'COMPLETED', '2025-01-15', NOW(), NOW()),
  (gen_random_uuid(), 'emp-003', 'emp-001', 'Q4 2025', 8.5, 8.8, 8.2, 8.5, 8.8, 8.0, 9.0, 'Detail-oriented, reliable', 'Needs more initiative on projects', 'COMPLETED', '2025-01-15', NOW(), NOW()),
  (gen_random_uuid(), 'emp-004', 'emp-002', 'Q4 2025', 9.0, 9.0, 8.8, 9.2, 9.5, 9.0, 8.5, 'Great communicator, team motivator', 'Technical skills need improvement', 'COMPLETED', '2025-01-15', NOW(), NOW()),
  (gen_random_uuid(), 'emp-005', 'emp-001', 'Q4 2025', 6.5, 7.0, 6.0, 6.8, 7.0, 6.0, 7.0, 'Dedicated worker', 'Needs improvement in coding practices and productivity', 'COMPLETED', '2025-01-15', NOW(), NOW());

-- Verify insertion
SELECT COUNT(*) as total_reviews FROM performance_reviews;
SELECT employee_id, performance_score, status FROM performance_reviews ORDER BY performance_score DESC;

-- Insert 2026 Holidays for Softqube

INSERT INTO holidays (name, date, type, description, is_recurring, applies_to_all, created_at, updated_at) VALUES
  ('Uttarayan', '2026-01-14', 'PUBLIC', 'Kite Festival', false, true, NOW(), NOW()),
  ('Republic Day', '2026-01-26', 'PUBLIC', 'Indian Republic Day', true, true, NOW(), NOW()),
  ('Dhuleti', '2026-03-04', 'PUBLIC', 'Festival of Colors (Holi)', false, true, NOW(), NOW()),
  ('Raksha Bandhan', '2026-08-28', 'PUBLIC', 'Brother-Sister festival', false, true, NOW(), NOW()),
  ('Janmashtami', '2026-09-04', 'PUBLIC', 'Birth of Lord Krishna', false, true, NOW(), NOW()),
  ('Dussehra', '2026-10-20', 'PUBLIC', 'Victory of good over evil', false, true, NOW(), NOW()),
  ('Diwali Day 1', '2026-11-09', 'PUBLIC', 'Festival of Lights - Day 1', false, true, NOW(), NOW()),
  ('Diwali Day 2', '2026-11-10', 'PUBLIC', 'Festival of Lights - Day 2', false, true, NOW(), NOW()),
  ('Diwali Day 3', '2026-11-11', 'PUBLIC', 'Festival of Lights - Day 3', false, true, NOW(), NOW()),
  ('Christmas', '2026-12-25', 'PUBLIC', 'Christmas Day', true, true, NOW(), NOW()),
  ('New Year', '2027-01-01', 'PUBLIC', 'New Year Day', true, true, NOW(), NOW());

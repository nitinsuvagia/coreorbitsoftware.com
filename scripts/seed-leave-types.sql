-- Seed default leave types for tenant
INSERT INTO leave_types (id, name, code, description, default_days_per_year, carry_forward_allowed, max_carry_forward_days, requires_approval, is_paid, color, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'Casual Leave', 'CL', 'For personal work and urgent matters', 12, false, NULL, true, true, '#3B82F6', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM leave_types WHERE code = 'CL');

INSERT INTO leave_types (id, name, code, description, default_days_per_year, carry_forward_allowed, max_carry_forward_days, requires_approval, is_paid, color, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'Sick Leave', 'SL', 'For illness and medical appointments', 12, false, NULL, true, true, '#EF4444', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM leave_types WHERE code = 'SL');

INSERT INTO leave_types (id, name, code, description, default_days_per_year, carry_forward_allowed, max_carry_forward_days, requires_approval, is_paid, color, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'Earned Leave', 'EL', 'Privilege leave earned based on service', 15, true, 30, true, true, '#10B981', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM leave_types WHERE code = 'EL');

INSERT INTO leave_types (id, name, code, description, default_days_per_year, carry_forward_allowed, max_carry_forward_days, requires_approval, is_paid, color, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'Maternity Leave', 'ML', 'For childbirth and post-natal care', 182, false, NULL, true, true, '#EC4899', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM leave_types WHERE code = 'ML');

INSERT INTO leave_types (id, name, code, description, default_days_per_year, carry_forward_allowed, max_carry_forward_days, requires_approval, is_paid, color, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'Paternity Leave', 'PL', 'For fathers after childbirth', 15, false, NULL, true, true, '#8B5CF6', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM leave_types WHERE code = 'PL');

INSERT INTO leave_types (id, name, code, description, default_days_per_year, carry_forward_allowed, max_carry_forward_days, requires_approval, is_paid, color, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'Bereavement Leave', 'BL', 'For death of immediate family member', 5, false, NULL, true, true, '#6B7280', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM leave_types WHERE code = 'BL');

INSERT INTO leave_types (id, name, code, description, default_days_per_year, carry_forward_allowed, max_carry_forward_days, requires_approval, is_paid, color, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'Compensatory Off', 'COMP', 'Compensatory off for working on holidays/weekends', 0, true, 5, true, true, '#F59E0B', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM leave_types WHERE code = 'COMP');

INSERT INTO leave_types (id, name, code, description, default_days_per_year, carry_forward_allowed, max_carry_forward_days, requires_approval, is_paid, color, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'Leave Without Pay', 'LWP', 'Unpaid leave when all other leaves are exhausted', 0, false, NULL, true, false, '#9CA3AF', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM leave_types WHERE code = 'LWP');

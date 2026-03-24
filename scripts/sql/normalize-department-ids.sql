-- One-time data fix: normalize department_id in employees to lowercase
-- to match departments.id (which is always lowercase from uuid())
--
-- Run this against each TENANT database where departments show 0 employee count.
-- Safe to run multiple times (WHERE clause skips already-normalized rows).

UPDATE employees
SET department_id = LOWER(department_id)
WHERE department_id IS NOT NULL
  AND department_id != LOWER(department_id);

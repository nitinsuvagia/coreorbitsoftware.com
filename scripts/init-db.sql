-- ============================================================================
-- Initial Database Setup Script
-- ============================================================================
-- This script runs automatically when PostgreSQL container starts for the first time.
-- It only creates extensions. The actual schema is in scripts/sql/oms_master_schema.sql
--
-- For full schema setup, run:
--   docker exec oms-postgres psql -U postgres -d oms_master -f /sql/oms_master_schema.sql
--   docker exec oms-postgres psql -U postgres -d oms_master -f /sql/oms_master_seed.sql
--
-- ============================================================================

-- Create extensions (used by all databases)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Log startup
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'PostgreSQL initialized with extensions';
    RAISE NOTICE 'uuid-ossp and pgcrypto enabled';
    RAISE NOTICE '========================================';
END $$;

-- Initial Database Setup Script
-- Creates master database and tenant database template

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create tenant database function
CREATE OR REPLACE FUNCTION create_tenant_database(tenant_slug VARCHAR)
RETURNS VOID AS $$
BEGIN
    EXECUTE format('CREATE DATABASE office_tenant_%s', tenant_slug);
END;
$$ LANGUAGE plpgsql;

-- Insert initial platform admin (password: admin123)
-- This will be run after Prisma migrations

-- ============================================================================
-- OMS MASTER DATABASE SEED DATA
-- ============================================================================
-- This file contains initial seed data for the master database.
-- Run after oms_master_schema.sql
-- 
-- Usage: 
--   psql -U postgres -d oms_master -f oms_master_seed.sql
--
-- Note: The admin password is 'admin123' (bcrypt hashed)
-- CHANGE THIS PASSWORD AFTER FIRST LOGIN!
--
-- Last Updated: 2026-03-05
-- ============================================================================

-- ============================================================================
-- PLATFORM ADMIN (Super Admin)
-- ============================================================================
-- Password: admin123 (bcrypt hash with 12 rounds)

INSERT INTO "platform_admins" (
    "id", "email", "username", "password_hash", "role", "status", 
    "first_name", "last_name", "display_name", "timezone", "language",
    "created_at", "updated_at"
) VALUES (
    gen_random_uuid(),
    'admin@oms.local',
    'superadmin',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.xW9LpABADN2ZOq',
    'SUPER_ADMIN',
    'ACTIVE',
    'Super',
    'Admin',
    'Super Admin',
    'UTC',
    'en',
    NOW(),
    NOW()
) ON CONFLICT (email) DO NOTHING;

-- ============================================================================
-- SUBSCRIPTION PLANS
-- ============================================================================

INSERT INTO "subscription_plans" (
    "id", "name", "slug", "description", "tier", "is_active", "is_public",
    "monthly_price", "yearly_price", "currency", "max_users", "max_storage",
    "max_projects", "max_clients", "features", "created_at", "updated_at"
) VALUES 
(
    gen_random_uuid(),
    'Starter',
    'starter',
    'Perfect for small teams getting started',
    'STARTER',
    true,
    true,
    29.00,
    290.00,
    'USD',
    10,
    5368709120,  -- 5GB in bytes
    5,
    10,
    '{"modules": ["employee", "attendance", "task", "file"], "support": "email", "storage": "5GB"}',
    NOW(),
    NOW()
),
(
    gen_random_uuid(),
    'Professional',
    'professional',
    'For growing businesses with advanced needs',
    'PROFESSIONAL',
    true,
    true,
    79.00,
    790.00,
    'USD',
    50,
    53687091200,  -- 50GB in bytes
    25,
    50,
    '{"modules": ["employee", "attendance", "task", "file", "project", "client", "meeting", "reporting"], "support": "priority", "storage": "50GB", "api_access": true}',
    NOW(),
    NOW()
),
(
    gen_random_uuid(),
    'Enterprise',
    'enterprise',
    'Full-featured solution for large organizations',
    'ENTERPRISE',
    true,
    true,
    199.00,
    1990.00,
    'USD',
    500,
    536870912000,  -- 500GB in bytes
    NULL,  -- Unlimited
    NULL,  -- Unlimited
    '{"modules": ["employee", "attendance", "task", "file", "project", "client", "meeting", "reporting", "hr_payroll", "recruitment", "assets"], "support": "dedicated", "storage": "500GB", "api_access": true, "sso": true, "custom_domain": true}',
    NOW(),
    NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- PLATFORM SETTINGS
-- ============================================================================

INSERT INTO "platform_settings" (
    "id", "general", "email", "security", "billing", "integrations", "maintenance",
    "created_at", "updated_at"
) VALUES (
    'default',
    '{
        "platformName": "Office Management System",
        "supportEmail": "support@coreorbitsoftware.com",
        "supportPhone": "",
        "timezone": "UTC",
        "defaultLanguage": "en",
        "mainDomain": "coreorbitsoftware.com"
    }',
    '{
        "fromName": "OMS Platform",
        "fromEmail": "noreply@coreorbitsoftware.com",
        "replyTo": "support@coreorbitsoftware.com",
        "provider": "smtp"
    }',
    '{
        "mfaRequired": false,
        "sessionTimeout": 3600,
        "maxLoginAttempts": 5,
        "lockoutDuration": 900,
        "passwordMinLength": 8,
        "passwordRequireUppercase": true,
        "passwordRequireNumbers": true,
        "passwordRequireSymbols": false
    }',
    '{
        "currency": "USD",
        "taxRate": 0,
        "stripeEnabled": false,
        "trialDays": 14
    }',
    '{}',
    '{
        "enabled": false,
        "message": ""
    }',
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    "general" = EXCLUDED."general",
    "email" = EXCLUDED."email",
    "security" = EXCLUDED."security",
    "billing" = EXCLUDED."billing",
    "updated_at" = NOW();

-- ============================================================================
-- RESERVED SUBDOMAINS
-- ============================================================================
-- These subdomains should not be used by tenants

-- Note: Reserved subdomains are typically blocked at application level
-- This is just for documentation purposes

-- Reserved: www, api, portal, admin, app, dashboard, mail, smtp, ftp, ssh
-- Reserved: static, assets, cdn, media, images, files
-- Reserved: support, help, docs, blog, status
-- Reserved: staging, dev, test, demo, sandbox

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
    admin_count INTEGER;
    plan_count INTEGER;
    settings_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO admin_count FROM platform_admins;
    SELECT COUNT(*) INTO plan_count FROM subscription_plans;
    SELECT COUNT(*) INTO settings_count FROM platform_settings;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Seed Data Summary:';
    RAISE NOTICE '  Platform Admins: %', admin_count;
    RAISE NOTICE '  Subscription Plans: %', plan_count;
    RAISE NOTICE '  Platform Settings: %', settings_count;
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Default Admin Credentials:';
    RAISE NOTICE '  Email: admin@oms.local';
    RAISE NOTICE '  Password: admin123';
    RAISE NOTICE '';
    RAISE NOTICE 'IMPORTANT: Change the password after first login!';
    RAISE NOTICE '========================================';
END $$;

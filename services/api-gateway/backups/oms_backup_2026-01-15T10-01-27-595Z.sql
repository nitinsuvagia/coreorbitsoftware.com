--
-- PostgreSQL database dump
--

\restrict Oy02PxhdGXci2Fz0KwtYGYW6qvl0CotI01abCCuLff0TbDPWaWFsGLKBKNm3JSx

-- Dumped from database version 16.11
-- Dumped by pg_dump version 16.11

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: postgres
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO postgres;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: postgres
--

COMMENT ON SCHEMA public IS '';


--
-- Name: AnnouncementPriority; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."AnnouncementPriority" AS ENUM (
    'LOW',
    'NORMAL',
    'HIGH',
    'URGENT'
);


ALTER TYPE public."AnnouncementPriority" OWNER TO postgres;

--
-- Name: AnnouncementType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."AnnouncementType" AS ENUM (
    'INFO',
    'WARNING',
    'SUCCESS',
    'ERROR',
    'MAINTENANCE'
);


ALTER TYPE public."AnnouncementType" OWNER TO postgres;

--
-- Name: BillingCycle; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."BillingCycle" AS ENUM (
    'MONTHLY',
    'QUARTERLY',
    'YEARLY'
);


ALTER TYPE public."BillingCycle" OWNER TO postgres;

--
-- Name: CreatedByType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."CreatedByType" AS ENUM (
    'PLATFORM_ADMIN',
    'TENANT_USER'
);


ALTER TYPE public."CreatedByType" OWNER TO postgres;

--
-- Name: CustomDomainStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."CustomDomainStatus" AS ENUM (
    'PENDING_VERIFICATION',
    'DNS_VERIFICATION_FAILED',
    'SSL_PENDING',
    'SSL_FAILED',
    'ACTIVE',
    'SUSPENDED',
    'EXPIRED'
);


ALTER TYPE public."CustomDomainStatus" OWNER TO postgres;

--
-- Name: DeviceType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."DeviceType" AS ENUM (
    'DESKTOP',
    'MOBILE',
    'TABLET'
);


ALTER TYPE public."DeviceType" OWNER TO postgres;

--
-- Name: DnsVerificationType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."DnsVerificationType" AS ENUM (
    'CNAME',
    'TXT'
);


ALTER TYPE public."DnsVerificationType" OWNER TO postgres;

--
-- Name: InvoiceStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."InvoiceStatus" AS ENUM (
    'DRAFT',
    'SENT',
    'PAID',
    'OVERDUE',
    'CANCELED',
    'REFUNDED'
);


ALTER TYPE public."InvoiceStatus" OWNER TO postgres;

--
-- Name: MfaType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."MfaType" AS ENUM (
    'TOTP',
    'SMS',
    'EMAIL'
);


ALTER TYPE public."MfaType" OWNER TO postgres;

--
-- Name: PaymentMethodType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."PaymentMethodType" AS ENUM (
    'CARD',
    'BANK_ACCOUNT',
    'PAYPAL',
    'OTHER'
);


ALTER TYPE public."PaymentMethodType" OWNER TO postgres;

--
-- Name: PaymentStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."PaymentStatus" AS ENUM (
    'PENDING',
    'PROCESSING',
    'SUCCEEDED',
    'FAILED',
    'CANCELED',
    'REFUNDED',
    'PARTIALLY_REFUNDED'
);


ALTER TYPE public."PaymentStatus" OWNER TO postgres;

--
-- Name: PlanTier; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."PlanTier" AS ENUM (
    'STARTER',
    'PROFESSIONAL',
    'ENTERPRISE',
    'CUSTOM'
);


ALTER TYPE public."PlanTier" OWNER TO postgres;

--
-- Name: PlatformAdminRole; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."PlatformAdminRole" AS ENUM (
    'SUPER_ADMIN',
    'SUB_ADMIN',
    'ADMIN_USER',
    'BILLING_ADMIN',
    'SUPPORT_AGENT'
);


ALTER TYPE public."PlatformAdminRole" OWNER TO postgres;

--
-- Name: PlatformAdminStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."PlatformAdminStatus" AS ENUM (
    'PENDING',
    'ACTIVE',
    'INACTIVE',
    'LOCKED',
    'SUSPENDED'
);


ALTER TYPE public."PlatformAdminStatus" OWNER TO postgres;

--
-- Name: SubdomainStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."SubdomainStatus" AS ENUM (
    'PENDING',
    'ACTIVE',
    'SUSPENDED',
    'RESERVED'
);


ALTER TYPE public."SubdomainStatus" OWNER TO postgres;

--
-- Name: SubscriptionStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."SubscriptionStatus" AS ENUM (
    'TRIALING',
    'ACTIVE',
    'PAST_DUE',
    'CANCELED',
    'UNPAID',
    'PAUSED'
);


ALTER TYPE public."SubscriptionStatus" OWNER TO postgres;

--
-- Name: TargetAudience; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."TargetAudience" AS ENUM (
    'ALL',
    'TENANTS_ONLY',
    'PLATFORM_ADMINS_ONLY',
    'SPECIFIC_TENANTS'
);


ALTER TYPE public."TargetAudience" OWNER TO postgres;

--
-- Name: TenantStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."TenantStatus" AS ENUM (
    'PENDING',
    'TRIAL',
    'ACTIVE',
    'SUSPENDED',
    'INACTIVE',
    'TERMINATED'
);


ALTER TYPE public."TenantStatus" OWNER TO postgres;

--
-- Name: TicketCategory; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."TicketCategory" AS ENUM (
    'BILLING',
    'TECHNICAL',
    'FEATURE_REQUEST',
    'BUG_REPORT',
    'ACCOUNT',
    'GENERAL'
);


ALTER TYPE public."TicketCategory" OWNER TO postgres;

--
-- Name: TicketPriority; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."TicketPriority" AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH',
    'URGENT'
);


ALTER TYPE public."TicketPriority" OWNER TO postgres;

--
-- Name: TicketStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."TicketStatus" AS ENUM (
    'OPEN',
    'IN_PROGRESS',
    'WAITING_ON_CUSTOMER',
    'WAITING_ON_SUPPORT',
    'RESOLVED',
    'CLOSED'
);


ALTER TYPE public."TicketStatus" OWNER TO postgres;

--
-- Name: TimeFormat; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."TimeFormat" AS ENUM (
    'TWELVE_HOUR',
    'TWENTY_FOUR_HOUR'
);


ALTER TYPE public."TimeFormat" OWNER TO postgres;

--
-- Name: UsageMetric; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."UsageMetric" AS ENUM (
    'ACTIVE_USERS',
    'STORAGE_BYTES',
    'API_CALLS',
    'EMAILS_SENT',
    'SMS_SENT',
    'FILE_UPLOADS'
);


ALTER TYPE public."UsageMetric" OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO postgres;

--
-- Name: announcements; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.announcements (
    id text NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    type public."AnnouncementType" DEFAULT 'INFO'::public."AnnouncementType" NOT NULL,
    priority public."AnnouncementPriority" DEFAULT 'NORMAL'::public."AnnouncementPriority" NOT NULL,
    target_audience public."TargetAudience" DEFAULT 'ALL'::public."TargetAudience" NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    starts_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    ends_at timestamp(3) without time zone,
    created_by text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.announcements OWNER TO postgres;

--
-- Name: custom_domains; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.custom_domains (
    id text NOT NULL,
    tenant_id text NOT NULL,
    domain text NOT NULL,
    status public."CustomDomainStatus" DEFAULT 'PENDING_VERIFICATION'::public."CustomDomainStatus" NOT NULL,
    verification_type public."DnsVerificationType" DEFAULT 'CNAME'::public."DnsVerificationType" NOT NULL,
    verification_token text NOT NULL,
    verified_at timestamp(3) without time zone,
    ssl_certificate_id text,
    ssl_expires_at timestamp(3) without time zone,
    last_checked_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.custom_domains OWNER TO postgres;

--
-- Name: invoices; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.invoices (
    id text NOT NULL,
    tenant_id text NOT NULL,
    subscription_id text,
    invoice_number text NOT NULL,
    status public."InvoiceStatus" DEFAULT 'DRAFT'::public."InvoiceStatus" NOT NULL,
    subtotal numeric(10,2) NOT NULL,
    tax numeric(10,2) DEFAULT 0 NOT NULL,
    discount numeric(10,2) DEFAULT 0 NOT NULL,
    total numeric(10,2) NOT NULL,
    amount_paid numeric(10,2) DEFAULT 0 NOT NULL,
    amount_due numeric(10,2) NOT NULL,
    currency text DEFAULT 'USD'::text NOT NULL,
    issue_date timestamp(3) without time zone NOT NULL,
    due_date timestamp(3) without time zone NOT NULL,
    paid_at timestamp(3) without time zone,
    stripe_invoice_id text,
    stripe_payment_intent_id text,
    payment_method text,
    line_items jsonb NOT NULL,
    notes text,
    metadata jsonb,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.invoices OWNER TO postgres;

--
-- Name: password_reset_tokens; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.password_reset_tokens (
    id text NOT NULL,
    admin_id text NOT NULL,
    token text NOT NULL,
    expires_at timestamp(3) without time zone NOT NULL,
    used_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.password_reset_tokens OWNER TO postgres;

--
-- Name: payment_methods; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payment_methods (
    id text NOT NULL,
    tenant_id text NOT NULL,
    subscription_id text,
    type public."PaymentMethodType" DEFAULT 'CARD'::public."PaymentMethodType" NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    card_brand text,
    card_last4 text,
    card_exp_month integer,
    card_exp_year integer,
    bank_name text,
    bank_last4 text,
    stripe_payment_method_id text,
    billing_name text,
    billing_email text,
    billing_address jsonb,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.payment_methods OWNER TO postgres;

--
-- Name: payments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payments (
    id text NOT NULL,
    tenant_id text NOT NULL,
    invoice_id text,
    payment_method_id text,
    amount numeric(10,2) NOT NULL,
    currency text DEFAULT 'USD'::text NOT NULL,
    status public."PaymentStatus" DEFAULT 'PENDING'::public."PaymentStatus" NOT NULL,
    stripe_payment_intent_id text,
    stripe_charge_id text,
    description text,
    metadata jsonb,
    failure_reason text,
    refunded_amount numeric(10,2) DEFAULT 0 NOT NULL,
    processed_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.payments OWNER TO postgres;

--
-- Name: platform_admin_sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.platform_admin_sessions (
    id text NOT NULL,
    admin_id text NOT NULL,
    token_hash text NOT NULL,
    token_family text NOT NULL,
    ip_address text NOT NULL,
    user_agent text NOT NULL,
    device_id text,
    expires_at timestamp(3) without time zone NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    last_activity_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    revoked_at timestamp(3) without time zone
);


ALTER TABLE public.platform_admin_sessions OWNER TO postgres;

--
-- Name: platform_admins; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.platform_admins (
    id text NOT NULL,
    email text NOT NULL,
    username text NOT NULL,
    password_hash text NOT NULL,
    role public."PlatformAdminRole" NOT NULL,
    status public."PlatformAdminStatus" DEFAULT 'PENDING'::public."PlatformAdminStatus" NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    display_name text NOT NULL,
    avatar text,
    phone text,
    timezone text DEFAULT 'UTC'::text NOT NULL,
    language text DEFAULT 'en'::text NOT NULL,
    mfa_enabled boolean DEFAULT false NOT NULL,
    mfa_type public."MfaType",
    mfa_secret text,
    mfa_backup_codes text[],
    password_changed_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    password_expires_at timestamp(3) without time zone,
    login_attempts integer DEFAULT 0 NOT NULL,
    locked_until timestamp(3) without time zone,
    allowed_ip_addresses text[],
    last_login_at timestamp(3) without time zone,
    last_activity_at timestamp(3) without time zone,
    invited_by text,
    invited_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone,
    appearance_preferences jsonb
);


ALTER TABLE public.platform_admins OWNER TO postgres;

--
-- Name: platform_audit_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.platform_audit_logs (
    id text NOT NULL,
    admin_id text,
    action text NOT NULL,
    resource text NOT NULL,
    resource_id text,
    description text,
    metadata jsonb,
    ip_address text,
    user_agent text,
    "timestamp" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.platform_audit_logs OWNER TO postgres;

--
-- Name: platform_login_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.platform_login_history (
    id text NOT NULL,
    admin_id text NOT NULL,
    "timestamp" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    ip_address text NOT NULL,
    user_agent text NOT NULL,
    location text,
    success boolean NOT NULL,
    failure_reason text,
    mfa_used boolean DEFAULT false NOT NULL
);


ALTER TABLE public.platform_login_history OWNER TO postgres;

--
-- Name: platform_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.platform_settings (
    id text DEFAULT 'default'::text NOT NULL,
    general jsonb DEFAULT '{}'::jsonb NOT NULL,
    email jsonb DEFAULT '{}'::jsonb NOT NULL,
    security jsonb DEFAULT '{}'::jsonb NOT NULL,
    billing jsonb DEFAULT '{}'::jsonb NOT NULL,
    integrations jsonb DEFAULT '{}'::jsonb NOT NULL,
    maintenance jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.platform_settings OWNER TO postgres;

--
-- Name: subscription_plans; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.subscription_plans (
    id text NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    description text,
    tier public."PlanTier" NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    is_public boolean DEFAULT true NOT NULL,
    monthly_price numeric(10,2) NOT NULL,
    yearly_price numeric(10,2) NOT NULL,
    currency text DEFAULT 'USD'::text NOT NULL,
    max_users integer NOT NULL,
    max_storage bigint NOT NULL,
    max_projects integer,
    max_clients integer,
    features jsonb NOT NULL,
    stripe_price_id_monthly text,
    stripe_price_id_yearly text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.subscription_plans OWNER TO postgres;

--
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.subscriptions (
    id text NOT NULL,
    tenant_id text NOT NULL,
    plan_id text NOT NULL,
    status public."SubscriptionStatus" DEFAULT 'ACTIVE'::public."SubscriptionStatus" NOT NULL,
    billing_cycle public."BillingCycle" DEFAULT 'MONTHLY'::public."BillingCycle" NOT NULL,
    amount numeric(10,2) NOT NULL,
    currency text DEFAULT 'USD'::text NOT NULL,
    max_users integer NOT NULL,
    max_storage bigint NOT NULL,
    max_projects integer,
    max_clients integer,
    current_period_start timestamp(3) without time zone NOT NULL,
    current_period_end timestamp(3) without time zone NOT NULL,
    trial_start timestamp(3) without time zone,
    trial_end timestamp(3) without time zone,
    canceled_at timestamp(3) without time zone,
    cancel_at_period_end boolean DEFAULT false NOT NULL,
    stripe_customer_id text,
    stripe_subscription_id text,
    payment_method_id text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.subscriptions OWNER TO postgres;

--
-- Name: support_tickets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.support_tickets (
    id text NOT NULL,
    ticket_number text NOT NULL,
    tenant_id text,
    subject text NOT NULL,
    description text NOT NULL,
    status public."TicketStatus" DEFAULT 'OPEN'::public."TicketStatus" NOT NULL,
    priority public."TicketPriority" DEFAULT 'MEDIUM'::public."TicketPriority" NOT NULL,
    category public."TicketCategory" NOT NULL,
    assigned_to text,
    resolved_at timestamp(3) without time zone,
    closed_at timestamp(3) without time zone,
    created_by text NOT NULL,
    created_by_type public."CreatedByType" NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.support_tickets OWNER TO postgres;

--
-- Name: tenant_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tenant_settings (
    id text NOT NULL,
    tenant_id text NOT NULL,
    timezone text DEFAULT 'UTC'::text NOT NULL,
    date_format text DEFAULT 'YYYY-MM-DD'::text NOT NULL,
    time_format public."TimeFormat" DEFAULT 'TWENTY_FOUR_HOUR'::public."TimeFormat" NOT NULL,
    currency text DEFAULT 'USD'::text NOT NULL,
    language text DEFAULT 'en'::text NOT NULL,
    fiscal_year_start integer DEFAULT 1 NOT NULL,
    working_days integer[] DEFAULT ARRAY[1, 2, 3, 4, 5],
    work_start_time text DEFAULT '09:00'::text NOT NULL,
    work_end_time text DEFAULT '18:00'::text NOT NULL,
    break_start_time text,
    break_end_time text,
    module_employee boolean DEFAULT true NOT NULL,
    module_attendance boolean DEFAULT true NOT NULL,
    module_project boolean DEFAULT true NOT NULL,
    module_task boolean DEFAULT true NOT NULL,
    module_client boolean DEFAULT true NOT NULL,
    module_asset boolean DEFAULT false NOT NULL,
    module_hr_payroll boolean DEFAULT false NOT NULL,
    module_meeting boolean DEFAULT true NOT NULL,
    module_recruitment boolean DEFAULT false NOT NULL,
    module_resource boolean DEFAULT false NOT NULL,
    module_file boolean DEFAULT true NOT NULL,
    sso_enabled boolean DEFAULT false NOT NULL,
    mfa_required boolean DEFAULT false NOT NULL,
    ip_whitelist boolean DEFAULT false NOT NULL,
    audit_log_enabled boolean DEFAULT true NOT NULL,
    custom_fields boolean DEFAULT false NOT NULL,
    advanced_reporting boolean DEFAULT false NOT NULL,
    api_access boolean DEFAULT false NOT NULL,
    webhooks_enabled boolean DEFAULT false NOT NULL,
    primary_color text DEFAULT '#3B82F6'::text NOT NULL,
    secondary_color text DEFAULT '#1E40AF'::text NOT NULL,
    logo_url text,
    favicon_url text,
    custom_css text,
    password_min_length integer DEFAULT 8 NOT NULL,
    password_require_uppercase boolean DEFAULT true NOT NULL,
    password_require_numbers boolean DEFAULT true NOT NULL,
    password_require_symbols boolean DEFAULT false NOT NULL,
    password_expiry_days integer,
    session_timeout_minutes integer DEFAULT 60 NOT NULL,
    max_login_attempts integer DEFAULT 5 NOT NULL,
    lockout_duration_minutes integer DEFAULT 15 NOT NULL,
    allowed_ip_ranges text[],
    integrations text[] DEFAULT ARRAY[]::text[],
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.tenant_settings OWNER TO postgres;

--
-- Name: tenant_subdomains; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tenant_subdomains (
    id text NOT NULL,
    tenant_id text NOT NULL,
    subdomain text NOT NULL,
    status public."SubdomainStatus" DEFAULT 'PENDING'::public."SubdomainStatus" NOT NULL,
    is_primary boolean DEFAULT false NOT NULL,
    ssl_certificate_id text,
    verified_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.tenant_subdomains OWNER TO postgres;

--
-- Name: tenants; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tenants (
    id text NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    legal_name text,
    logo text,
    status public."TenantStatus" DEFAULT 'PENDING'::public."TenantStatus" NOT NULL,
    database_name text NOT NULL,
    database_host text,
    database_port integer,
    database_pool_size integer DEFAULT 10 NOT NULL,
    email text NOT NULL,
    phone text,
    website text,
    address_line_1 text,
    address_line_2 text,
    city text,
    state text,
    country text,
    postal_code text,
    trial_ends_at timestamp(3) without time zone,
    activated_at timestamp(3) without time zone,
    suspended_at timestamp(3) without time zone,
    terminated_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone,
    metadata jsonb,
    report_logo text
);


ALTER TABLE public.tenants OWNER TO postgres;

--
-- Name: ticket_messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ticket_messages (
    id text NOT NULL,
    ticket_id text NOT NULL,
    sender_id text NOT NULL,
    sender_type public."CreatedByType" NOT NULL,
    message text NOT NULL,
    attachments text[],
    is_internal boolean DEFAULT false NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.ticket_messages OWNER TO postgres;

--
-- Name: trusted_devices; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.trusted_devices (
    id text NOT NULL,
    admin_id text NOT NULL,
    device_name text NOT NULL,
    device_type public."DeviceType" NOT NULL,
    browser text NOT NULL,
    os text NOT NULL,
    fingerprint text NOT NULL,
    last_used_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    trusted_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expires_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.trusted_devices OWNER TO postgres;

--
-- Name: usage_records; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.usage_records (
    id text NOT NULL,
    tenant_id text NOT NULL,
    metric_id text NOT NULL,
    metric public."UsageMetric",
    quantity bigint NOT NULL,
    recorded_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    period_start timestamp(3) without time zone NOT NULL,
    period_end timestamp(3) without time zone NOT NULL,
    unit_price numeric(10,4),
    amount numeric(10,2) DEFAULT 0 NOT NULL,
    invoiced boolean DEFAULT false NOT NULL,
    metadata jsonb,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.usage_records OWNER TO postgres;

--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
23a50c5c-0830-4927-9808-b9aace9e2e78	78571a9de0eae774f33cb053f8f619d876439a9db91e02eb038447df98a7c9bc	2026-01-15 06:30:12.089337+00	20260115063011_add_platform_settings_table	\N	\N	2026-01-15 06:30:11.68409+00	1
\.


--
-- Data for Name: announcements; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.announcements (id, title, content, type, priority, target_audience, is_active, starts_at, ends_at, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: custom_domains; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.custom_domains (id, tenant_id, domain, status, verification_type, verification_token, verified_at, ssl_certificate_id, ssl_expires_at, last_checked_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: invoices; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.invoices (id, tenant_id, subscription_id, invoice_number, status, subtotal, tax, discount, total, amount_paid, amount_due, currency, issue_date, due_date, paid_at, stripe_invoice_id, stripe_payment_intent_id, payment_method, line_items, notes, metadata, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: password_reset_tokens; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.password_reset_tokens (id, admin_id, token, expires_at, used_at, created_at) FROM stdin;
\.


--
-- Data for Name: payment_methods; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payment_methods (id, tenant_id, subscription_id, type, is_default, card_brand, card_last4, card_exp_month, card_exp_year, bank_name, bank_last4, stripe_payment_method_id, billing_name, billing_email, billing_address, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payments (id, tenant_id, invoice_id, payment_method_id, amount, currency, status, stripe_payment_intent_id, stripe_charge_id, description, metadata, failure_reason, refunded_amount, processed_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: platform_admin_sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.platform_admin_sessions (id, admin_id, token_hash, token_family, ip_address, user_agent, device_id, expires_at, created_at, last_activity_at, revoked_at) FROM stdin;
a374ab21-1309-4771-8bb4-1dc7996299d8	c1fc02e3-71d2-4552-a487-13a5db4d664c	3d9f8b60e620a1398edc9ed5c80386c71df592c33daf23292129fabb3b817fc2	e5a94878-bdac-4eeb-abbc-9dcbf5c9818d	127.0.0.1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.2 Safari/605.1.15	\N	2026-01-22 06:52:42.016	2026-01-15 06:52:42.017	2026-01-15 06:52:42.017	\N
7af5e665-07b9-43d3-868b-aa0fe2860a82	c1fc02e3-71d2-4552-a487-13a5db4d664c	4b2e1c2d94d19cef736e984a565e430ec64855d8fed70e2fc9bacce5877b9b77	adac9549-1582-4063-9c77-f11f47a3d99d	127.0.0.1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.2 Safari/605.1.15	\N	2026-01-22 09:21:20.516	2026-01-15 09:21:20.518	2026-01-15 09:21:20.518	\N
\.


--
-- Data for Name: platform_admins; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.platform_admins (id, email, username, password_hash, role, status, first_name, last_name, display_name, avatar, phone, timezone, language, mfa_enabled, mfa_type, mfa_secret, mfa_backup_codes, password_changed_at, password_expires_at, login_attempts, locked_until, allowed_ip_addresses, last_login_at, last_activity_at, invited_by, invited_at, created_at, updated_at, deleted_at, appearance_preferences) FROM stdin;
c1fc02e3-71d2-4552-a487-13a5db4d664c	admin@oms.local	superadmin	$2a$12$xDSS3/ZcnMtInnWvdWp9l.DdrB9xH0go7/EE0ZRta8v8qoEpNhJgy	SUPER_ADMIN	ACTIVE	Super	Admin	Super Admin	\N	\N	UTC	en	f	\N	\N	\N	2026-01-15 06:52:02.443	\N	0	\N	\N	2026-01-15 09:21:20.536	\N	\N	\N	2026-01-15 06:52:02.443	2026-01-15 09:21:20.536	\N	\N
\.


--
-- Data for Name: platform_audit_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.platform_audit_logs (id, admin_id, action, resource, resource_id, description, metadata, ip_address, user_agent, "timestamp") FROM stdin;
\.


--
-- Data for Name: platform_login_history; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.platform_login_history (id, admin_id, "timestamp", ip_address, user_agent, location, success, failure_reason, mfa_used) FROM stdin;
ae83f20d-fed8-4fac-a835-f6e9015617c8	c1fc02e3-71d2-4552-a487-13a5db4d664c	2026-01-15 06:52:42.031	127.0.0.1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.2 Safari/605.1.15	\N	t	\N	f
745074f9-ce71-418a-a3e3-69058da22744	c1fc02e3-71d2-4552-a487-13a5db4d664c	2026-01-15 09:21:20.542	127.0.0.1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.2 Safari/605.1.15	\N	t	\N	f
\.


--
-- Data for Name: platform_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.platform_settings (id, general, email, security, billing, integrations, maintenance, created_at, updated_at) FROM stdin;
default	{"description": "Enterprise SaaS Office Management System", "platformName": "Office Management System", "supportEmail": "support@oms.local", "primaryDomain": "localhost:3000", "defaultTimezone": "UTC"}	{"fromName": "IT Support - Core Orbit Software", "smtpHost": "smtp.gmail.com", "smtpPort": 587, "fromEmail": "itsupport@coreorbitsoftware.com", "configured": true, "encryption": "tls", "smtpPassword": "cwhg sbvl nfbj jrei", "smtpUsername": "itsupport@coreorbitsoftware.com"}	{"ipAllowlist": [], "maxLoginAttempts": 5, "passwordMinLength": 8, "ipAllowlistEnabled": false, "requireMfaForAdmins": false, "sessionTimeoutMinutes": 60, "lockoutDurationMinutes": 15, "passwordRequireNumbers": true, "passwordRequireSymbols": false, "passwordRequireUppercase": true}	{"taxEnabled": false, "defaultTaxRate": 0, "defaultCurrency": "USD", "stripeConfigured": false}	{"aws": {"enabled": false}, "slack": {"enabled": false}, "sentry": {"enabled": false}, "googleAnalytics": {"enabled": false}}	{"maintenanceMode": false, "maintenanceMessage": "", "scheduledMaintenanceAt": null, "scheduledMaintenanceEndAt": null}	2026-01-15 06:47:05.467	2026-01-15 09:56:49.773
\.


--
-- Data for Name: subscription_plans; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.subscription_plans (id, name, slug, description, tier, is_active, is_public, monthly_price, yearly_price, currency, max_users, max_storage, max_projects, max_clients, features, stripe_price_id_monthly, stripe_price_id_yearly, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: subscriptions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.subscriptions (id, tenant_id, plan_id, status, billing_cycle, amount, currency, max_users, max_storage, max_projects, max_clients, current_period_start, current_period_end, trial_start, trial_end, canceled_at, cancel_at_period_end, stripe_customer_id, stripe_subscription_id, payment_method_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: support_tickets; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.support_tickets (id, ticket_number, tenant_id, subject, description, status, priority, category, assigned_to, resolved_at, closed_at, created_by, created_by_type, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: tenant_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tenant_settings (id, tenant_id, timezone, date_format, time_format, currency, language, fiscal_year_start, working_days, work_start_time, work_end_time, break_start_time, break_end_time, module_employee, module_attendance, module_project, module_task, module_client, module_asset, module_hr_payroll, module_meeting, module_recruitment, module_resource, module_file, sso_enabled, mfa_required, ip_whitelist, audit_log_enabled, custom_fields, advanced_reporting, api_access, webhooks_enabled, primary_color, secondary_color, logo_url, favicon_url, custom_css, password_min_length, password_require_uppercase, password_require_numbers, password_require_symbols, password_expiry_days, session_timeout_minutes, max_login_attempts, lockout_duration_minutes, allowed_ip_ranges, integrations, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: tenant_subdomains; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tenant_subdomains (id, tenant_id, subdomain, status, is_primary, ssl_certificate_id, verified_at, created_at, updated_at) FROM stdin;
subdomain_softqube_001	tenant_softqube_001	softqube	ACTIVE	t	\N	2026-01-15 06:56:04.802	2026-01-15 06:56:04.802	2026-01-15 06:56:04.802
subdomain_nexus_001	tenant_nexus_001	nexus-link-private-limited	ACTIVE	t	\N	2026-01-15 06:56:04.805	2026-01-15 06:56:04.805	2026-01-15 06:56:04.805
\.


--
-- Data for Name: tenants; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tenants (id, name, slug, legal_name, logo, status, database_name, database_host, database_port, database_pool_size, email, phone, website, address_line_1, address_line_2, city, state, country, postal_code, trial_ends_at, activated_at, suspended_at, terminated_at, created_at, updated_at, deleted_at, metadata, report_logo) FROM stdin;
tenant_nexus_001	Nexus Link Private Limited	nexus-link-private-limited	Nexus Link Private Limited	\N	ACTIVE	oms_tenant_nexus-link-private-limited	\N	\N	10	amit@nexusmyoms.com	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-15 06:56:04.801	2026-01-15 06:56:04.801	\N	\N	\N
tenant_softqube_001	Softqube Technologies LLC	softqube	Softqube Technologies Private Limited	data:image/png;base64,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	ACTIVE	oms_tenant_softqube	\N	\N	10	nitin@softqubes.com	9909033855	https://www.softqubes.com	B/401, SANTINIKETAN BUSINESS CENTRE, GANGOTRI CIRCLE	NIKOL	AHMEDABAD	GJ	INDIA	382350	\N	\N	\N	\N	2026-01-15 06:55:45.203	2026-01-15 09:11:17.79	\N	\N	data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAwAAAAEACAYAAAAEHhGnAAAAAXNSR0IArs4c6QAAAERlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAADAKADAAQAAAABAAABAAAAAABiPnHKAABAAElEQVR4AeydB5wU5fnH33f3Gh1E2nFlr4AiCgIKYjcaTYyJSVTsPYkaFXtN4x8TNXaxJhp7RcAYEzVW7BULeiBwZfcOjt7LcXe78/5/7+zOsru3Zeru7N0zH46Zed/nfd7n/c7s7vN2xuggAkSACBABIkAEiAARIAJEgAgQASJABIgAESACRIAIEAEiQASIABEgAkSACBABIkAEiAARIAJEgAgQASJABIgAESACRIAIEAEiQASIABEgAkSACBABIkAEiAARIAJEgAgQASJABIgAESACRIAIEAEiQASIABEgAkSACBABIkAEiAARIAJEgAgQASJABIgAESACRIAIEAEiQASIABEgAkSACBABIkAEiAARIAJEgAgQASJABIgAESACRIAIEAEiQASIABEgAkSACBABIkAEiAARIAJEgAgQASJABIgAESACRIAIEAEiQASIABEgAkSACBABIkAEiAARIAJEgAgQASJABIgAESACRIAIEAEiQASIABEgAkSACBABIkAEiAARIAJEgAgQASJABIgAESACRIAIEAEiQASIABEgAkSACBABIkAEiAARIAJEgAgQASJABIgAESACRIAIEAEiQASIABEgAkSACBABIkAEiAARIAJEgAgQASJABIgAESACRIAIEAEiQASIABEgAkSACBABIkAEiAARIAJEgAgQASJABIgAESACRIAIEAEiQASIABEgAkSACBABIkAEiAARIAJEgAgQASJABIgAESACRIAIEAEiQASIABEgAkSACBABIkAEiAARIAJEgAgQASJABIgAESACRIAIEAEiQASIABEgAkSACBABIkAEiAARIAJEgAgQASJABIgAESACRIAIEAEiQASIABEgAkSACBABIkAEiAARIAJEgAgQASJABIgAESACRIAIEAEiQASIABEgAkSACBABIkAEiAARIAJEgAgQASJABIgAESACRIAIEAEiQASIABEgAkSACBABIkAEiAARIAJEgAgQASJABIgAESACRIAIEAEiQASIABEgAkSACBABIkAEiAARIAJEgAgQASJABIgAESACRIAIEAEiQASIABEgAkSACBABIkAEiAARIAJEgAgQASJABIgAESACRIAIEAEiQASIABEgAkSACBABIkAEiAARIAJEgAgQASJABIgAESACRIAIEAEiQASIABEgAkSACBABIkAEiAARIAJEgAgQASJABIgAESACRIAIEAEiQASIABEgAkSACBABIkAEiAARIAJEgAgQASJABIgAESACRIAIEAEiQASIABEgAkSACBABIkAEiAARIAJEgAgQASJABIgAESACRIAIEAEiQASIABEgAkSACBABIkAEiAARIAJEgAgQASJABIgAESACRIAIEAEiQASIABEgAkSACBABIkAEiAARIAJEgAgQASJABIgAESACRMA9BLh7TCFLiAARIAKpCey22279gu3tv2eC/RRSY1JLMiY4e48J8XhjIPBIOrlsxdWU+85iXjaVC1Eq8xSct3KFf1Df3PQ0bpVs2UH5EAHHCcxaN5V5+YVMEePwppfjczgQebbiegWu/8M2Dv0rO493Om4HZUAEiEBaAlQBSIuHIokAEcgxAU9tpW++YGxvi3Y0lwf8NfMYC1rUoze5p6bC52ecletJwJnYvz4Q+FiPLMkQAfcRQJV7zsYGOPlVcPLD5sWdEaYGa3EQ6WwrZaf7VrivLGQREegZBKgC0DOeM5WSCOQVgYqKikGF3PsZvIZaBwx/xRsK/mbJsmXLHdDNqit8f+Sc/Z9R3XCNFjcG/LsbTUfyRCCnBP6zcRDrEOtVG6TTH+f4I1S9l+FSQv0vfArLXslOGXG7mpb+IwJEIKsEqAKQVdyUGREgApkIVFdWvYEW8SMyydkQL1iBd3hDQ8NqG3SpKuD83wzn/xrz+sQNDYHAH82np5REIMsE5m6QQ9jCvoTRCoCsEJw8gvyQLD8yyo4ISAIewkAEiAARcAMBOca/ptIXzJLzL4vMWTC0yufz2dbqbs35V036gxueBdlABHQRmLtFzsWx5sA/3Xq9rrxIiAgQAVsJUAXAVpykjAgQATMERlVWjgnuaN+MtF4z6a2k8Qq2CJWAEis6KC0R6JEERKiX5XJ7vKMs6yAFRIAIGCZAFQDDyCgBESACdhKo9fkOURhfaKdOo7pQCdhgNA3JEwEiQASIABHIVwJUAcjXJ0d2E4FuQKCqqupgDBue54KilNRWVk5wgR1kAhEgAkSACBABxwlQBcBxxJQBESACyQiUlpb29iji3WRxuQgTgj+fi3wpTyJABIgAESAC2SZAFYBsE6f8iAARkAS8vQqLtrkKBWc0FtlVD4SMIQJEgAgQAacIUAXAKbKklwgQgZQEaiorV6aMpAgiQASIABEgAkTAUQJUAXAULyknAkQgkQDG/U/GyoG7JobTPREgAkSACBABIpAdAlQByA5nyoUIEIEIAYz7/9idMPh8d9pFVhEBIkAEiAARsJcAVQDs5UnaiAARSEOgxuc7E9Hu/N5RPGelMZ2iiAARIAJEgAh0GwLu/CHuNnipIESACMQREOyxuHu33AgRbGhp+M4t5pAdRIAIEAEiQAScJEAVACfpkm4iQATyg4BSMCY/DCUriQARIAJEgAhYJ1BgXQVpIAJEgAhkJlBT6avPLJV9CcHEU43LGlxpW/ZpUI5EgAgQASLQEwhQD0BPeMpURiLgDgI1Npuxw8PZfg0BP9f+OBOTkIdfbz6Q/09jIHC6XnmSIwJEgAgQASLQHQhQD0B3eIpUBiLQwwhwzn5e7/e/lFjs+kDgS4RVyXBMOH6cCXZGoox2L4RyRENz81vaPZ2JABEgAkSACPQUAtQD0FOeNJWTCOSQANb+H29X9lwJ1SZz/hP1N/j9Z8qeAS74GZyxdZH4Zia4Gt5Izn8iMronAkSACBCBHkKAegB6yIOmYhKBXBLwhMQhDF641QPj9U9raGlpMKKnvrnpScjLPzqIABEgAkSgmxIYXVV1kMAuk1aLt7Sp6T2po6amptyjKGqPcqJOTSYxPPF+VFXVwYlh2r1eHZq83WeqANhNlPQRASLQlQAXe9nwvcwwXv/prsophAgQASJABHo6gZDC3mZM2OHXqpUIHgqdpgh2YzKu1ZW+bxoD/r2TxcWGKYp4N/Y+4dpyZSVBn6FbGgJkCBcJEwEiYI4AH2wuXWwq/mbsHV0TASJABIgAEcgFAXjuGYe11vp8x+bCNr15UgVALymSIwJEIMcElNdybABlTwSIABEgAkRAJeDz+XZPh0IINjddfK7j7OgqyXUZKH8iQAR6BoHGnlFMKiURIAJEgAiYIPA90ni7pBOikHFemxC+EfcrEsIM3XoUdjcSHJUmkasb2akCkObJURQRIAJEgAgQASJABIiA+wk0BJow16zrISfzsmCoOS6Gs+exUtz5cWEGb7Ac9ZGpktRWVB2PRStSRbsi3NW1E1cQIiOIABEgAkSACBABIkAEiEACgdra2v4JQeqt4OLWZOFuCqMKgJueBtlCBIgAESACRIAIEAEikBcERGcw1dBUX2wB0BfwTOy9G66pAuCGp0A2EAEiQASIABEgAkSACLicAL8qwcAuK9zVVlTskSAjb9uThOU0iCoAOcVPmRMBIkAEiAARIAJEgAjkA4GBu+4iJ/7GHYk73QvueS9OgLFXEu5dcUsVAFc8BjKCCBABIkAEiAARIAJEwM0E5s+f34lNLbfG2uhVxGOx97iO6xVQPPychHhX3NIqQK54DGQEEch/AtUV1cdwrsxBSYqcKQ2fW1PpM6aas/dDjB3p9/t3GEvIWG1l1X3YVXKikXR2rPlQW+n72FCegn3f0Ow/20gakiUCRIAIEAFzBARTruGM4/chfOB7P7oj8G6VlVVBLSJybmpqWoWdgxNCc39LFYDcPwOygAjkPYHaisqXBVeOcV1BBDsIi0K3YcOWEagErNRjX1lZWa9ib8H2XC3hhh+T/fTYGZXhbD9UjM7iSqi2vqWlIRpOF0SACBABImA7gcZA4H5850YrADIDLDU6tKGhYXWI8RdjM3Tj5F/NPhoCpJGgMxEgAqYIYL3jaYJz9zn/MaXxCrYClYCBMUGpLrl0/lNFujlceLz1kyZNKnSzjWQbESACRKCbEMBQoJgjGJKbkMmV/8fHhLJeffu4tneWKgCxT4quiQARMEwA6x0/ZzhRDhKgEtCcKduaCt/9mWTcHL9x7boWN9tHthEBIkAEugMBReGHJ5Rj0Gifb/eEMFZXV9eRGOaWe6oAuOVJkB1EIA8J1FRW7g+zeZ6Y3g+btgxJaytnlnaGTKs7O5HD5BCm7GRFuRABIkAEeiaBppam9xNLHhTxq/3gh/HORBk33dMcADc9DbIlSgCO5WH48EwQzNMHnWpjohGML+KC+ZUC/n1jY+PnO8Pz+6q2quoEoSg/hC9dg/IOxRl/cccGhK9hnK9gCn/fy0L/XdLcnGoDkriETt5wzq8V6PPMl0MEg1fC1muS2YvKQTE2dUkWlVdhJV7vZTD4xqwa/WhTCWsPVsfniYav88cujA9z4G7m0mK2Y9P1jCkHqjVRzjait+eh4NWTX7M1t1nrf8I84momlH2YEL1lX7/a4S9EO64/xGfzcnbSsG9szdMOZbd9eTCq6H+GrZOgri9sx2X4D7yaORPzlO2rL2AzfrrdjuxyouMfTXszHvop8/AxTBHDYAO+P1FGRX1IYZOEspp5PKvw/L5moc7X2G/3WpATW/M10/uXVLMifgB+m34AtBXgOxB8Iws+KLjFL7PAbxQTq/C+fcmU4OvdnTHersX4DO2mPVJcV2nX8lwf8F8Re++2a9hLBxHIGQGOcdkDvIL/B18a+GKxdnDo6WChM5qbmzdCU8w3vzW9NqfmcDR3FR3Bt/AluZddurmHn1jcu/e/st3diIlQbuWcEm1DwJ/0e6+6wvcnztmMlAnzJ6INZextu7n31fVlJb0uwHt7y85PFx6/fAOitUB5HwmTETJOPasX4XsunmUhfjFbu/sGNoPDczB5zPykP+so2KSm3unQqrc8Yg/On4au3c/YpOpEc+asfwJlOj2aj7wQ0uFRL8JnNT9ZXvx1KruxM8uWqPK5/O+ur2+APb+Pex6qyRE7Yav6QZDnyHVoR0EfNmMf/RWBORsnIvH8aDFl+eWflk/0LMPVGzVKvVblZKDnMXbysLPDETr+f7RpOCpbryCfCVGdUo2WrwyM3ssLGRf9LyynyWrhQvhZATuErdhjmaV3Us2sG/w3a3VftnWbXO/+nORcIzwlxyjDmLDIpRq5k3ULCyr7so17rsk2Y0zQLWfBUPwQUM7+3uD3p+3xrfX5roP5cY0psb8f4R5w/qEsbpJDQDY6ygarAD2Cz1vcex6rK0l6x4OoB8BxxJRBIoHqysrLsYTWTQgvin55JAqZuEcDxDGFzLM+slRkB1okrmxobrrHhCrbk2Ci7Amw7wEoHqy2Mqu/vPZlIxTx/I6t25hads5m8oKCq+vr612386B9JbZfE3oz0AOj/prZrzy7Gu0bAvSY/1y0+MHhF7uEf8xlQSwyEuxkxpWT2RB0DtxbJ/XdwZSt/8em77dZN6bbv3iIdfJf6bBlivfmT5QQDw5g1xy4Rbd+TXDOBs3D0UIynws9i9kzy65gp5TdkVnYIYm7vl4JzbIl3NDhLQ5u8/zloymdv9//M0MJnRZ+3H8OsrgLr14/9fXTnEr78vWxIAuwXfFO3vMtugG9v2MX73GLferzQNPj/qn4zQRjMZlt24aPPWy2+FFPKHU5K+Ar2WB85u/5tgP6r2IX7TUzQSavbhsCgY8i/kYSu3nSnuYkgjkLogpAztD3rIzl6iSYoLgapdazEosdcIrQMjUTH075BbMxxFkVloGUPQNZPTCpdAm+6EZldUlJwaajkjEdZd8uvJ69MVRqaVYLna+ZcQy9svcHLz9JPFGP4ROFS8Gif7j1z3EolzPe93I4BZ3I7w9s+ri/pQV32/yrEQ/nX+eBBm6v8G7EfhBenSnCYi9u2MrM9k8IfjubVXcvmzYW46CyfNzzzW9ZSB0GYypj4eWfIqHNTRSmTGHsiZZ18EJ3Cb+HUofj76IsOvwi5W94H/Eeik1shxjJrhoPj7ibHk+2PMUU5dQsfdY1iGj8E3ezmQvQywDG/foPZ2dX7dAi8+wsGy76J9rcEGi6LTHMbffR7gm3GUb2dA8C1dXV+2JDpU44//KHMFvOfyK8gRgTvAEOsaitrJyYGGn3Pco8AJs5rZP5Seffbv0G9PXmIWWJWm6f71gD6XqmqBDucHpyRf/xZcewJ1vgYRWvghPU5QctC2YV4vNyM5wCwWZ+8wr7+xeFXfKcJbwY/pG+gtAlkRrgKbjpY/0brP1n4yD4mph/ZOHoGBQ3dMCCJmNJFXafsQRJpGe8k7vGwSf9E9lTyzrZk8vk9+cuSazLXpBgA1gxdn2d+Q3eya8nZC9jh3OSz/fJltmoYMlx+6c6nFsm9QPY5s1t7O6vBbtjgW3DYjNlald8yfY+I7vqEnKn4GzUVrtmbSCEKgAGYGVTFGPPjoXj9l/8fS8duMjfiprKqquyaYfZvDDOvT9s3gQH9DN8w+TuxyShAPhFmS+d84Rg224xJvBblHkjPvm5/eFKKBF6zP+F59ExuqKiOiGKbjUCnGOidQ88nlp+AHtqOebbs5ddVPofsx2FHXAKPomzqeXLf8XdG7vRPxeg3bOHMdXJpJW8rXQXFPe6OVmJHA17tGkgHP8NjBfKOQWu+c2IllnwL9ldX69JWjGNCuXBxVPLHmO1ozph6XGus9ajLGB3fiWHr+XNUbemTjr7cQc6Di+NC3Dpjfs+ZC4F5aRZu5WXl4Y83hvgNMpxjuqRYojjcFQqb4Ejd4u3s2PIktbWtZq8m86Y7PIJhqBMcZNNsbZI51xWqFA//19Ds/9HsXFmrzHU5zy0Vj1oNn2W0hWGuKcBZV+ByUflyBOjIiwfr0GDLQwtW6JDAdr45dyTpAfWsFiKd2PfpJHdMVCu3FNU3KY2VKHgLj2mwOmSrZS/ZpdNeBit/8dYaVcrvOnDfTuvO6DbrB7m1DMTcpWjbB1C8bBnWhfjuY52+bsoB0btytoKOuCkPob38exsIbIln6eWleHz0xL+/Lj3A4+yDgNf+Zm/l10+8WI7yl5SUrJh+9atF8XqQmNgXex9smuszPe6wrkc4pP2wOIRPw8JUaYJNQUC/9Suo2ehPA1dsnLrmqNnd3nn8DGghX8/rFD2dzyAcWbNwLj2XhjXvsNservTYUUfH4baNNmt13F9Bd4KbOHdYjYfONTyC6Kf2fS5Syd+iUlML1rJv7a86kjhEf+zoiObaQuDnbt+v3z5umR5VlVVVXoU4U8Wl09hmGB/f32g6cK0Nj+zHD+sfGbUGZD+gNrqgAvVN5DnyJ9UFA2L3Kj3MdfRFgstXUycTKzFR/VEFETvI/KqbGJa3IfTY2I/lh3U0qhimh6cIaP9oMWsAhS1Xcbh76nO66aeLpOmPeZsPgDLSn4QzStqv5ZfmlWApGIpL0Q9O60s+0MA78ZwlVh7VVtUo8JFDtu2kxfutVWAZHmxLKhM/kDo+qm/DSdI878dqwCpSCWviI1dzjJODQyftfiIuJpQhmkyUlH0XhUO34czCMtpsmq0lI+R065VPZFwTad2Dst0sk0b+7MZh7nmNzjlk3qmdS5M/4UKIrbMcdcxDGQ55SFPcTwS7yGgisae1YCY8MT7qOIYmUiYFNXyk2d5v6W4mM3IwVwaaVI3P2gIUJYfMIbwvCFbn/Fuf2zF+Zdmw9lG6507jurKqqfy0vmX+LA8WLXPZ7jLbrfKyiq1JyEvnX9ZcD4X9tfLK7NHfUvT62bT5iBdRyrnX9rS1NQUyIFNtmdZEOz4Y1qlT6/AfBw4//l3RNYcN284/InB5lNTSiIQR6CQ9R/Qxu5acHBcqNtunmmVbjSc/zw9+u1oZ3d+MTFPrXe12VQByMLjGTt2bF84WovDzqI4ws4sofNVO/WZ0QUblqPVKNcTicyYHk2D4R93onJmaGjA4kCgCQoydg9GM3HnRQ2en2zBMrZCSkxZ0H54f8ytay/RY1apw7hXdMi4WWRNykqOHPLz7ArZTN51cq2bS0S2EQE3E1CC77Lbv8z+nIlMTGatrlU/79F+sUwJXByvYOjM7V/c7mIL89I0qgA4/NgwKXQp1meX609jfKMjhxx/nbPnCOdRbp1a6kjJsq5U7IPyrDeSLcbSDzIi71LZYpRbTgozVQloDA832e7SsqlmKYIfieFyKzPZiOd5TCYZN8fD/uFJ7Zuzroz16uWaHsOkNlIgEchbAuIadseXH7jG/Fkr92IhZalr7LHDEMEuZ7d9YWnIqh1mdCcdOXMcuxPEZGWB4/87OFXoeuO1yeLtDEPL9fV26tOjC8P9S8LlM+c06skjRzKDwFM6w3oPhRcWlOgVdrEcx/MMVlZWjjBjIxxPLJnI3zKT1tk0fCsPdpY3NTe9oTMfuXujHC6eV84yvmi2yTlBsBuD0xOO2WunsM5O03NcErTRLREgAskICOxmf/sXua8EPL/qNHwLLEhmYt6HCfZzduvni/O+HC4pQIFL7OhWZsCRkssJZnHNe3ED8vtLtiBiic9irPKTVw6SMTaiAM9wIxxBXc9Q7rhbW1U1DbvxzjKWj/ukCxhvxfMdijKtMWodNj45IlUa8JyLOIvjUK1PWk5lX2I4nn3vKkwKZqHQvl7mlRUCXQd2e7b8DnDBp+nKLCLk5coXkeFoXZM9t3I/lEH/+vddNVAIESACegkIdgC7FZWAq/Y5UG8SW+WeWyU39HrSVp3uUzaa3fL5bHb1vse7z7T8sogqADY+L+kwdIdVRNIhiTj/7l/1IF0h9MUNgNOqtQZnTFHf1PRCjc8nl1grzyjscgFU7lZj5+ai+fPnG+kJcXmpjJsXmRRsaGIw3hnjGSWkqG9ueiEhyNztnNZKFuTk/JujR6mIgDkCHJWA2754lF25z9nmFJhMNat1En5/nsJfDzjEcfzWz/8jrto3r4ds5vpB0RAgm55Abbnv2O7u/EtUcA57gvMffSvg0DVEbzJcNPj9FRlE8iYaOzdbmhicNwXtrobKHXNDBf7uWjwqFxFwNQEhzmK3fX5y1mycs6ES+21+kbX83JCRED9ht3yWcl8XN5jodhuoAmDDE6qurDxOeNi/bFDlahVwhttdbaAzxlWj3LonHnk9fG9nzMi6Vg/K7eqJvVknklcZrpWT8+kgAkQgVwQU8Qz76yfDspJ9qNOflXxclgnGZl7rMpPyyhyqAFh8XNXl5ftg453ZFtW4Pjmcwe9hpOV1uF1f0OQG/ry6olrXmM4lTU3fQMXC5GryLrQIz/3VvLO6pxs8e21rT0dA5e/xBFZg19uv1D+mTohdnQsivNCzks2Y4ayf9fwa7OvRg4+/zd+vB5feUtFpDoAFfGVlZb24x2to7XgL2eUsKTb5ehiDf3bLmQEuyJhz5X294+IxgXQsHGc7RmJ+FSn6hBwi+FFNRcWkhubm+Tm0gbLWS+CF9TcyoZhayUlvFjFyWw8a0evJ+SvaHrl07xHLfzi494Z3faxjBj4s7zSJko+2bhvw109Wlk0dXnziW8u2nol0Q2PS0iURsIvAt/h9OodtV75l00dl7qW+d9FgLJx9DJbHf8wuA9Lp4X2OXibYDGeWyn5h7ZOY9JvNfT0+ZFy5iSnepWzbltXssr03YfW38G/dnV8NZIXFA8CiEnzPRfgZ6bjYF9ejp6pZwkgVAPP4eLG3oNsPkaitqBiLjeHxYc7aEcIXx9ceLn611O//OlWuQ4YM6du/d+8/QfZUyGTF4cG4eLmfg84lP7msNP0qlf3x4bwe5T0N5f00Pjz1HYadvYyepyMh4XyvDPfIsaWyFcuOSk3qQlGMNQKzWnrht/g6J59SLy/3X7NX/5/MmDhY7eV6P2LxjTjLP+04rIrLOSTybxXWhpWVx6tlXN1q0Xfii9+/1x4Ucqic7tWVZFo6iEAMge29vfyE7Wf4XokJ03d50Zh1EHw88sfYfXVy0r1zK8oI/D7d/NnB7NrJ7+kzUKfU3GWDWYidplPapJhA74L4Ezu35uaMCi6bsBEy8i+AP1lWWekH32/3x8/Hh+q1E/9ds98nTqjtCTqpAmDyKaOFN6VzalKl6WTYhXeS6cRpEh7KWEEL93yXRsTGKD7f21n4oyWtS9bqUbpmzZqtWKfyKsjKP1br8+0nBJNDsUbKe4eO4mqf7/xGv//BTPqxJOZ5eEfSVQDasDnVsQbWp4/LsjEQ+KkMwKpM/UUw+B84fQfFCdh8g30t3msIBBzNw2aTe546T29dnx0zYCr7Fj59fVXp2eftwztnmFEQSTN2KN+Ky4nydrdnlt65eH3HpZEoOhEBPQSUvgXew7eeXj7Ptta3C8eeoGZ8b90tOKu/J3oMMSKDBp53sUGHvRVepRc+7461ybQzj5jMzqy2tp/ADMyOZIvedspOztnjjhEw8oDzVJYqACYeXHV1dQV22RtnIqkTSZbXBwJfOqG4Jbw7rBOqozrxjbitPuDvGw0weVHv98tWgDKZvKaicgvGflrWmcwUdHY+gPCMFQDIKPhufgxf+Wcl6JFLi8rWdFsOrNe/GYoOlspQ4WjFyaHeEH4gdMsfMPq+BQTXHXM2nIWhP70dsGsdO8u3q2zSO89m5YtPGXUZVF7G7v22Aa9Wtc3qSV03IzCkxPPOmhPLfyBrkI4cF429ms0Q17Jd64L4lrPXWYfBnr99+oRyzRR7hsXMWXeDY9/EXDmWnVX9b1sYD10UwhAlW1QlUbJRuWryWUnCKUgnAdscEZ35dQsxHlKa3FAQtPzPhjOpOr1224MW3z/brTNRn0fwI+1w/hP1NjQH+oENuh2dObDe/3t6NDc0+8+OlUNrxZ8NOf8zlxbjB0l3JR26S7EbbFVsnnZeo4Kx3E59pMtGAkJ51EZtqqqJQ3qdJJ1/u/V20XfRXjWHlvaZinA0ktJBBLoSOHdUnynS+e8aY3PIDK6wi/aUftFDNmtG04k43RadslVdsN/boiteyTrWu7LAFud/1iwvu38Rhg85dYgF4urJg5zS3lP06nYuegqQTOXEEJBr8eGTXxDZPuaKkOfawj6FKxcvXizHojt2jB07tu+Ordv+4FgGQgQHDtm1t5MbTaFXRG6AJHf0lTsW2ztJCsNtSktLe7e2turphZZOjadTKLs0B5rlDtHJj7u/lj8Ot+JvmNqyI1tNQmjrGoCRZnegg0dtRFH/a0axTmRXjE867tGPAzrkEp7f4zwaf3YeI9D7NbqxsXGJnUpJl0UCc9Y/bnMr2w5fKDToy6OHyjH8WTnmHVf1icBkRn7Pd6vwsjtf6chKqSgT6wT41hNKygb+c38esq7LgIaL9/wNm/nNO+iZesZAqoyinps//VK5doo6BC6jcCqBsevuCXfGphIwFf41Kvv2LTaxdk/53eGUf7mRXT1lvKlSUqI4Ak49oLhMutMNhoDclIXy7IDD91xJvz7n1dXVOViLTl4SOP9OVjAa0EJfy5rloALHjxBaxeVSlrYPjelVWCRX6NktUwmQvzelzJ1f+ZjXCz1ioCqjr6u0grHgx9hpEknEZ2zr1kPYjMMSHTU5zGg39FTAMWT2dDlHCoHeLzn3xYmhJpEc6GSCgG3P2MvZttDp5X39JoywmoRj9SDoGOK999tASBF4z+noyQQKON8SPG1kfzlDNyfH9PHPsplfY1Uhzxy78kfP9AR1WdAZM+S7bu7g/LfmEqZM9Rg7szKutzqlZKYIgd6JB78PV9bU9qpMCQzGc74QOyyPNZiKxFMQyEVLdgpT3B+M1s9jnLQSww7v4IUFJXDeesnhI7lw/jH0R06EcuTAl99/ULZaR5SnUYo8S/FdtD6NiJko863rQnB2z4J6VuBtQsZh59+MBYJPZn36trFbP38jWXLsTHwmKgk3JIuzENbLQlpKajeBuRsut1Hl9tCpZf1s1GdKVeiivSqRcK2pxJSoWxAo9LB10vnPeWGm7z0XswGOttOOgqIf/dW0vjkbLjadNmlC8QQ7o8Ie51/ud/D3xXp6xZNakjFQsAZ25SRy/jOC0i9AFQD9rBhaP182IG5AlP8RTipvDDRdgUmdaHHIzYF17jFUhjuyCgJKtADDctSVa3JRusaAfzDy7bQz75oK378M67uv7kB2bx1af3iN4bSpExyBLdEFm/lJlx9MrNzzR1nxSp3UeAx6VPzGU1EKRwgIcbs9enknO72sDybPo67sgmP6+CGYM5N6yJwLTCQTnCHAGdveeUqZe4aBXTxOboZ4q12lRfPPteZ1iTvMp01Iyfn3cP7RSGTDIRu1hp8sW/6LbdCWTMVydtU+WW88TGZIdwqjCoDOpxl2jnUK6xdbCce/AEtG2t1Kq9+CGEmsc+/IJE98oTehnDkfswcbimKKa/2Ss2MNKbn3238yRbxvKI0BYb7DswkVgRMTk0QqXnY+W9lCS0euCcxaP8AuE5aeOiLnLf+JZXnkoIpqhLmjQpJoHN07RuC7U0vdN7lz+virUWDMT7HrgMNs9JizRq7wZtew7a3stLIxRk1IKi8n/P5jSeIw1KSiJgO/ZVdMcmSxE5P2dJtkVAHQ+SjhHD+uU1Sv2CY4pPIDnd3JTSms8/l8uyNqSIpo08HYrCqIlX7kD7krDi4UW7sQ5aRYXQW7v+4DjCU9R5esBSEuxHPev33680QVeNfKE8Os3GMjMlu7xa3Y0mPTevg8O8q+R3/v9aM4z1nPY6oynD1h0MZLJ+zq+GcmVf4Unn0C+w4qPGks51mf96arpNPHyd9rWw7vTZ8Yr0zwgpttyVwqKRppfuhpohEb9pbPy97GtZ15bIbzP27nLV3ZSYAqAPpp/lK/aCZJvhYOmX0fwEzZ6Yj3CrZIh5hhkfpAE4YVWTzmrKpms1Ycwp5bM5HNWmtpo6/65uaFaHt53aJF0eQYFnZn9CbVxb1169COeUCqaLvD0WT6Irv5C7luf+whFIUfHBtg5RoVu/uspKe0NhDwsL2tapGTfhf+dPhNVvU4lf6ug8seK/Z6WpzST3rdQ6DIw1s/P3ro8+6xKMESOTxOiGkJoWZvzTS2nWE2s/h04ko2zYZVlcIt/0HodsiPFGj5n2hbL2c8A7qTBBx6cN0Srm1j2zDkZ7ibCGFM91wn7IFzYb6Lcfa6v8PZ72Cz1ggW4g1MeOYxrsxnIrSMPbcKaySt2sKebZ1uxm7s5HuUmXQp0qRuCb934URsMy+3lNklRVrHgj0s+D6TX9AxR1NLk53Dj3wxqukyTwmcXd2/xu2m/2b8kElut5Hss07gpOo+7m/pvXTCCyipPcNdZr6i36eQY+ztOk4rs2HeEOzZPEFO+I37jbHLROhpZZdTy7+NPJOqogpAUizxgaMr1LGo8YEm74RQ5ERYVwz7kUUoKyvrhdMv5LWdB76tHl3i939vWOcLa3/LZq+TLS2/wfDfNL0Hoi8m0t7Nnl0h2LOr9jeajyf8HIwm0y9/P7Y/97D5+hPYL+lprJCtM3HHwF0H29ZVe6h941HjbKQbHQTmbvg/HVLpRQRb8fB+fY0PRUiv1fbYew4esaZ3gafJdsWk0EUERMsTU/qvc5FBqU3xemxZL79g26BLU2eSEPPvjdJvsOP4uWUlciOyhxrkTve2/ZYk2FTPLptgqac/QR/dpiBAFYAUYGKDgx7PIbH3Vq4bm5ttXZHFii0ybbG3sNmqjmTpMe7/nGThacNmrwtgFRLjQ0uE8iF7ZsV/0+pOiFxq43OoraycGlV/37dj2AOLpON9WDQshxfemz+O67KObL620Q6TllX4bFsZww57epYOfoLV8h40vNDRZY2t2heb/oEjqvaNvafrtASMN7ykVed85All/fOnl+ficfbw5exM3WRDTPY8WD0EO3XkS5aUSOd/ZINs+Xfo4Ivg/I9ySDmpTSBAFYAEIMluMfLv4mThRsOwR4ZdtXijWSeVxwRWjK+zf9dNzG8w/l7NXie/VCqSGqorUBzNnln+pS5RTYizu7VLK2eM8XkWPRacPbhoK/MULIQup7pFTZjJu4ypxfKKJ5lQ1CUJSqy/BatLagqwRkCYH14Xyfj9w4cY+7xYM9hS6jPHoHUY69laUtJTEnO+Id+K+sLB/dbklc2cW5+QKwwNkbXe2i4YFqKweJQ1OrnU53p26fg9LFpIyQ0QMO6oGVDejURt6fJrbG58xU1MMIF1hd32cMF/Bp3GfqjnrP8WLf9yKJK1Q/AJ6Am4Sq8SbJRliwO7/qDTK7ABiuwS7aM371RyxV6+ekiJd/orxwwf+trx1YP/esCQCaV9Ch+A82N6lZbCmz8dH5tfvd//v9h7uu55BHYt5oZ6zNxA6IiyPje6wQ6ywV4CVX0LnrRXYxa0eZQ7spCLvVmcVmp+EQg5n+yf9U6uzrSAXbK33KuHjiwSoApAFmEjKyW72aXObVSFuquxdac7JguM+2+tb256OSYo8+XsDbJytWdmQZ0SQtyiU1ITMz0fY9M+x7KG615jGw46DUW3fHQeXr7rru0XjR+25vy97jl61Ig1PyofsP53k8u+bj1vr9+yyyeWTBrW+zEzuShC+TRJuvxqcUtSgB4b9N+tw62W/fdj+11vVUe204/o55mZ7TwpP+cJ/Kq2xOh3tvNGZcph+kR7vj9v/gK98HlwbNlnB+bcpZmTZ6UMfDO7ZHxcI5UVbZRWPwGqAOhnZUkSHuLXlhTYnFjh9u9qjHH/xifucPGhzUVj7OnlnezvX+j9skrmHKc1adPkX7KG619na4+8EHJ2+P5Yg336+KK3flmWdhLc/NPGnD1hSO9D0xqXPLLLahPcw/POAUxetB4YuiNkeU+HS3fvuyDfyD15VO3qfLOZ7M1M4Hd79Psus5QrJQJWrSoRnYMy6pi7dkxGmcwCbZlFkkhg3DL7Z6NsuLRrA7LETBay6ePyoxKUaHk3uKcKQNYeoqjPWlYZMqqp8D2XQcRwNIbnGp/ENXfzYFuG/nS1toD1GdHBHm/JWCEpDHbKIUsZD+EtZMvPmskafv8GW/vD8zPKGxE4cqDQ3fX51Rlj3h1Q5J1rRH8y2fqmpoeThRsNq6moyNr+BkZt67byPLh3ty1bxoKJLRlFSCBvCKD5xHQPrAsKaXlMfSgU2jVjORSPHZ934/Pd5Ly2R5tkxcGOVq6uxeSsEc7/2K4RFJItAlQByBJpRfC6LGWVNhvs+FuCj/OJaYUMRmLA/6f1gcCXBpNhQFTod4bTGEng5cvYky317ImVfVIl+3758pSt7kpJX7bmmMtZwx/eZI3Xvcp2jLSjISbeksG9Ch5//Yzx2+JD099tunjv49JLdI0tuOmjP3cNtR7COaeuW+sYjWkQnoOMJUiQ5rzL8rAJEq69Le1b/IVrjSPDDBPwcm7ou89wBk4m8PA5ltV7vJnnF3q4DaviKG8YslU6/4/50fLPrU8+Tp5xC7tonOv3IEluevcJdapbp/sQsqkkqEIPs0mVJTUewVI6vGYVNwb8+5lK62GXmUpnLFEN451b2RPNchLtw0zwf7Azy5MOf9hROY5tGz2VbR37AxbsPwTiqNqo05mNzWk2Yt66X+9xlhF5TXZQifebDW0hA863R/Z0/FFLb9tZcMvDUWyzpecoGmGpqEIst5Q+h4nXtXXOR/aH5dAEytpGAkGhuKZn3HCxlND3VhvHFc51tO5zfN4t/gaFuP7PvJzw+1gTVuVzpuEfvf7fsov2HGeYNyWwnQBVAGxHmlKhtR/tlGr1R9RUVv0eXyS99afILOkNBcsyS7lCQo6Dx6B95UK0bOw0CN+r2GY4fK+e8F/kdqeQ+66mlva56pWGza/rtQxLf/bXK2tEDiNEs77LsRH7uqUsZ7J2avo4YGjx+x+aTp3bhMVe76b2YN52YOQWngtzP3hIycfvudAuXSZdNmkRu8N4x7cu3XFCojTu1syNl+tv+Ns2pQO/kw6NDsGE34vGkvNv5hk6kMahh+yApfmukoucjnVTh/4wcYO9GPl3S5Yt09+yYG/mPVrbK43rDXEXQnSZCNyjAVLh85LAxCHFLXlpOBmdlICXu2dlvKQGOhzIRZb8ghIlc7OWbPl/PNCJFjBn/ELOF8D5pwm/Dr9TRtQ786CNWNBjZHltLovqFcz2FTQaAk06ui9zWWrKmwgQASJABIiA/QTQqOK1qlXwLM0N3CJKMtjK2fZ927ChpVOjQlayC/cwMGQ1g7UUbQsBqgDow2jLSgXhVnh9GdophaE/V0JfPzt1YkjJy9BnCxc77eopuvbatd9fDZZ1k0F5XeLY+I3GY+gi5R6h+i2do9xjjTFL5i3fPtpYCpJ2M4F3Vu/I21XE+J3z98gOW95qOZ9enr4pdcxAi//jATnhtzCljKUIvoRdODbnQ6AtFaGbJnaqttetcGEqzPPoPzvFaqHQ3Xc5dORgN0txq1XbE9NjN9mfJYaZuL8TabIxERi79HKw56+yM8uWJNpZU+kToT6DWMewKra9Zh+2aZ9fMFGYnREzQx9aNGP1r8fMSLQp0/23a9t+nkkmNl4w/k7svV3XgimNdukiPToJCLYA8/NMt6atalPs23hPp8l2iQ3t491z9Vaqc9rFM9d6vB5Pdd62InHvwWgxt4TQw8TnOsq/1VImMnG7Ih3wxV30SOe/umW7Y/PeOP+e/XaM/cvndSkIBZghQBUAHdQUxXMX9yiWKwAexmWrbVYrAHBu23UU0aCI+IHBBMnFg56/sALFyQrAW+z08iOSZx4OrfX5jpXf4d5tG1ivRvn3JRv8xj+iSbaMO5Kt+cmlTHiLomF2Xqxu67wKYy7/D5UT3b8kR/9r6WWv1Btr0C/xem5wYr09jxBdf1TsBES6uhLwsG/wg3161wjdISmXxdWtIUeC7Z2K6YpPjkymbNMREIqti1Kky8ruuEIPP7gzpPtrO2n2nIc+TxoRGyhXSkKXu6XD65U9LfPidWCpz+plOuof8an03/E17ILdyfnXDyzrkjQESAfyvh3bFuoQ0yUSXolHl6hlIWz49SCU2O25rmwIBN6xbJxUMG3AerSgWG/dSDRGiE6mePuy08rSOv8yGZz/ZxOTx973W/A6q77paFbzlyPYiOd/r1YUYuNtuO498O8LdS8l8cNnvy/F6j+3GM1329WTV8amqa6uzsgmVj7V9bZg8O1UcRTuEAEl9I1Dml2vdlOHUul6I3NtoBBrc22C3vxDwrF15vWaYFquU2GHmE4cSdgR9GzMqKNQfJBRJrPARXEicsLvEy0ONA5GcuH8G/bb3YfG5Uk3riNAFQAdj2TBqlU2Np7avRJP8gJMmjSpEMMEzkseaz60IeAvNZ86ScoQs391pFNHlrAzhut9Zr2SWJU0qHf9p8x35zRUCH7MBn7yQlIZM4Eb24N7F9234NtMaT9o3lb6Rus2uQpKQSbZTPE8pPwzk4ye+NbWVqwXTUdWCRQU9ciVcB5taso0kTGrj8G9mbln13k9jF5ZIYbokXOfjLC+t0/xlswVgJ8NrrOh7MPjdLTv345eBafG/G9m5+9OC4TEAXfnDVUAdD8XLjegseVwZlhOvGkb167riA+x4Y6za6DFWp9nohnTdmlGkB1fcBHN4mJ8sWFCU+ajpqbGVAsFV0Js8NsPsZobj2TD52D0jg1HR0jsye7+WhzywtIbb/xyRdwP4tjH6yYX3PVVy4EvfL8cWRn/zAp2bBITK5KEUVA+EGjfId8DS8eg2StutaQgB4nv+rhjnxxkS1k6TODMj9Y4OQzUGevv/Mpni+Krjtpmix69SmTL/1OtITQOWl7BKEWW32HYz4AUcRTsMgLGnQmXFSB75ihX2ZhXESoBcUMybNTNoHu9nfoiutoa/H7DQ0902XHcLnJSovVua87/y04dea+uPCEkQqEn9cqmkuuz5CNUBI6ah41TjkwlYyT83dZt113/3qrV7M6vhPZXt67902BImN5wLXT91H/H2jC6oqI69p6u84zAtKGWh81t7GS/ybNSs29WbX8+32wmezMTWNOuXJBZym0S4ma3WZTRnmdWPMY690ePrUPr/AvhR8v/XhntIAHXELA8lMA1JXHYEDnuHY61nbkMq4aj3hjw27qTKmy0t4U+UmIM/XF2stZxuwxhs9ctQ3YjzUHm77JTRhxjIC3HtFtbnPYOJXQqO3+PVuTN2QPf/w5fsH8xYIezokJ0qRCFuOdFWzIV7H+26CElZgjIyXumW/Gwhnn/axdsHHTzuIEbzGSeozT2Dj/MUSEo20QCYuCh76zuO+8w6xXbRM3O3fMTbdD9rg069KsQ4kz5E+XMIQJo+a9yRPeML3qzvhy/qeKy8PgDuDiYvCdLIpiYxj4PzGUvTHNwMrMjpXKFUuoBMPYYdE/W1KMWL/Ag6bDX1tZaXnNy95EjB0OX/cN+UBDOBJzaLBzHDy7D8J0LjeckDoLzf6iRdKh83WdEPp1sS0uLdP7DxwW7/5VdMEZ+NzVrQbk8h66benFC/vIzPy4hzNTt1va240wlpETWCXA+z6qSh5e25U0FbtCD31rurbPKy3j6HG3+yD37Gbc1tyk+Wh36KrcW6M994P11P9MvnVoSbuxDqWMTYzxw3l16CPYdO293nyPW3T5/EevHt8EJSTpMjDM+y7NPZdB70ycvOZJ/N1dKFQADD7ikb5+pBsR1i4rO4I4an+8x3QkSBKsrfO92FhTKITROTOppqw8EbkzI0rnb43a5nx0/GJ9rdknGTBQ2hZ08grNTSj/IKJsgAA/d2W7n346pxGh9W3oYEkzXfat4e/VNFK6t9K1ODDN7v8rWyfFmreix6W6yWvK17WJfqzqylX5DW/C0bOWV9/kI4cjvlJNcMAeq1kn9dure2NE5xw59aJx5WreeBXc+pVs2m4KCYcLvaPuH/TyKCf93fIk6Et9dT3GwoOnPvH/7RGEz3inQI08yYQJUATDwJtTV1ckW9joDSfSLCnam7A3A3ytVVVW7ZUoImXG1cPxlGiwRfHAmeZPxorzK199kWmvJjt91Jps2hKt/bEgB48Hd1b8Th3F2kvwbztmpIz4zkwmY2fYMUZF4NKUN5+/xBnZAlL0B2d+5yMNvZFeN3xZrG3aiHohv1MGxYWavoSdOt1k9lM4kgV8MfMtkyrhkRc+22tqrGafcppvKRxbasmKVIXNCwRZD8t1M2MM9WX8v+j6/Yr7bMRbes0C2RGffyZwxQ9fCFtnlJxaw80YPsD3Pv33Qj23c2GZYL0YFeYt7dVIlQD+57L/I+m1zpWR7KLhvsbfAyaUPf+xRxI/hpMryt+NvA1rDt8gbDHjrh//lyjUepmD0m3QtHTxCnO0xb9687DuviWWaxuX4vsWJwWbuqyuqD8SE3T3MpE2WJuTh1yULjwv77R5F7P6FmxAmn5/jB16Lj0NXT+kybMsr2Aq7MvdwdpVdukhP7gh0KGzCoa9v2HvekYO+zp0V6XMObO44J72EA7FydbK5NkyPkKuuTMvD8cleJesVgK1BMXHY3JV7rvrl8O8ceKKWVR6K1uV5inKHZUVhBY8Z1iPE/5DmKMPpnEgg2Gr2m9HjnVDNivqssaK3oKhkHZwW+ysmVoxyaVrqATD4YJYtWyZrptn6cixGXsPh+I9S/+S1mWUgDZZRFRfscb/f/72ZpC5O48UKoe/baJ/S1NS0KqM+Od34wrH9IWd5+UYdeb0ZumbK/olymPMgW1FtW0e93u9/IDEPus8yAUWcbkeO89Zsm2eHHid08JlfOzKvyQlbk+ps3z/zOu9JE5oMvOebS0ymjEvWefXUbP3GxeW7qi30bVyAi27mDdplmV3mYPjP2YZ1hUK2PFvD+SYm4OI99pvaYYnBttzf/c3b0CP9HvMHZ/3ZX78YYV5Bz0lJFQATzxor4kwykSyfkqxuaPaflU8G67EVvSo299yI+/TkG5W5aGwZrudE722+wOJuF4qrJ/8wUS3ml/wcvQJ2tqJmrvQkGkH39hM4btAz9ijlA4qeWV5njy77tJTcu+B1LPbhxLwm+4zMrKnLPJzMSSxICPY3C6ldkdTzdOvORRVcYRHG/Ny7QO78aJfTa65SO20IesH17XHjILb32K9GHeKI/nu+ORer+xxmh+4Cb6ctjSN22OJmHVQBMPl0hBLa12RS1ydDBceuLzrXlBXOfxuMKbLTICwNO92wvov3PJ4V7eiDdPaN6RSsg23fVsiunHx/oj21FRVj0Xv0YmK4lfuCkuJRVtJTWpsIyA3vOFtohzYMBdqjbG6rgVVJ7Mg1tY6fvtz45x0h0aUymzqFAzGCyWF71o+nWrIzpOWeb34GY621nlovrWUNihAjhs1u/dCyIpsU7P3skiuDijjeJnVyCcsTzOtSZppPazWl+Ir9qsYZ5//Or/bGsOaHrVqopccctdHaNZ1TE6AKQGo2aWMaW1q+gMCraYXyMLJk+7asjFPPJpqI82/b8BdpO1rUP8lUht3Ky0uRd9eu9PP22c4u3suLJU+tdely1okRYb9kV+9bzGYchmGP8UdNZeX+gntsdz4WL14cnpMSnx3d5YJAkP3YrmyXbVN+VTF35YN26TOrZ8JzSy94uWnLH8ymty2dh8VtoGdar2Bj2RPLfmA6vd6EgtuzFKJg6/Vm6ZTcqh3K/qNeWuFYb6leu0c9seR3X6/ZcateeR1yInFjRh1pdoocN1hOQs7BId5k59ZOdCTju74dxzyer+zUjUG3K+3U1111UQXAwpNFS/nRFpK7Lqni4YfUrVmz1XWGmTfIW1NRCSfZvrHvmikDdh18sHad6tzp8X6AuAmoBGxIKnPRXjPZ9HGoS4QwsZvr/8Li/EOsKzSQXblPEbtqUtLW/Wqf71rotL8VTSgHJi0LBeaGgJysGl4swJb8m7d1njf0hdZXbFFmQsnezyz5y1er27r0ZJlQZT1J58CzrSvRNChvaVeOnO9ZYG5YSTJjuHJysuBshy3dHPplr2eWy4a2nBxDHl44Z+nGHX+xM3Mh+DWW9QkmhyNl8RAL2bk1zvTGzfzmZOZRvrG7MMECzz/t1tkd9dEqQBafKioB0slsR2tunrPkt2NC63sWcbgmeU1F1cWMC6e6S1+bP3++rFikPMYOGdt3B9tWFREYiEqA4ELZs765uetY6+kT10Bu56SlmZ/0Z6GiIxn3eMPpxWbWR3mTnbdP2jw1Y2oqfM0Y9lOu3dt47mhobra/UmGjgT1SVdGgXVj7+m12lX11W+jHxU81r2w/rUIuOpC1w3vvt+9+vW5Hxop11gySq4/NSV53N2XD4wGBBSR3YadW2qgUlsz8bh1GFBaasilJomDrpneTBOckqC2kTGKPN6/731HlFUcNx4ZQWTr4Pd+1rmkL7fxOtilf5bop1nsTxC4nM77ewjAiI4VR3obzf7iRFLplZy54CrKnyuUNbT462VVTmmzW2S3V5bnT6opnovCiwr5yMy9XWGPCCOy69XR9oOlKE0ldl6S6ouJwzj0YmiVs+0FMLCQqfRmHXezovW15Yjo5HAcTcr9t8PvHJcbF3U/fbzPuZ8eF6bhxuNLDhNezjw4zSCTbBH7Kt7PZ6+R49QF2Zd2uYMLj4wHlwF2Lf/bBT4b/xy69KfXc8+3GkLDP/pT5GI4Qi5BkjOFkqRJ0ivXs0aYqdnaVP5WIofB7v+uE/2Tn73gbu+fodkM2OC3M2S5H/a9589T/tv7u45+U3uxkdqf/r2XKk0s2fQCX1E6mqskeLz/clolfsmI6e/0D+I27wEkW0P0JO8cB5/++ur5MUbAhpehlv++PTXe83gqHuXQb9TQEyIZHWV9f3w6nEEM5nHidbTAwvYpP4Pyfll7E3bGTklsE7gAAJ7xJREFUJk0qxHj3K9RWdu55E9Y65vxzD5+WiQY23JItp/2Tygm2l7SzprLqzbFjx9oyKRmVih9JnQ72eMiitDU2Nrp2ib6krHtSYHF7qQPF5R+s2fEye8y//ICX1tg/N2jGDE/RAwufZ/d+B3+L21Z5sZVDKPQLW/VJZZw3sUf9b2IyqPzNMHfcv/An7L46yc1WR1UIgaGDrjw8H6/tvIk9Fgge++Y62/Zx0Up66ItNA8HT/+TSzXJul61Mw3mIDcGrpryt5Wf5fPwuv7WsI5MCxXtcJhFD8X//ohCf9c8x2VfOIetlKK1OYYz9/zO7erL+4bQ69XZXMaoA2PhksXFWb6izpZJvo1npVL2GisvUdAJujautrR0Cp38mHN9tG9euw/hXfpvjtgqxtr6pKeP4S2y41ZjZFnH4jq3b2msrfevQcv+bzPLxElVVVZNR9ndUx184Pxm9pG+fgfEW0J2rCPy0dDvsed4hm0o/XL9tc+Hj/u+u/HSjNqzNdFYz3hEFxQ8ufIANOSHUERIZK9SmM7IjoVx6UcjJ9nYf4nBUrBT2SOM9hjQ/UDcNmwq2o/LgSK+Mcv1Up4ZNGipmamHhfallSx16UTYPf67lotRy+mLGPN1wNH9g4Yp5rdvlsKxKfamMSykDC4YZT5UhBff4MkhYi/aEluP93Mge8f/AkqL76oaz+xZ+yDp7yXkqTvYiNwWv3+9PlmztYYnNt0D0MFBGiqs6ZUYS5EAWzcX3NwaaLsxB1oayHF1VdRCWhfsB1gM/GAkPxZ98Z3Py3kZ6eZB96qPW57sMtt6RWiJjjKxALuWcPYvzvIj0oTktv2CXYF8IS44BPhNzURaLranil1h69cUIE1ee7Pjs63nPUhZ+9jpsEY6GYfknOyTVs7yU95Gzeqndq4Gq6M40Wlhsei0MZw7Fipj/ysEDDj961GA5XE3f8cD3dyGP6cgMGpLkL+1VbZbqZN4x56h8TLgarQpBVobjW02G4eARefUc0ROJezV43dSjw1I6/5+95nystoUhFziiduBjGtGrntXwsA1RORkfGy6vo+nVxGEdYRkE8MVMCV3Lfj3qJVWH/O+RpUNYSFzCQsp1SBtusIvTo+WRzJ5InCovlWl5RuxAuMpEnuUf5+9jE0H5Pav/mLNxIhLPjyZQ84rJR0bIMJm3GqzFJQnX4rucEaDqiKTR4nErdeJlaj90WNFj7/ykDM8p83HOvJUXP7Jow18g2T9qU1Q/QrVr1WY1Mxmo/oueNZl0Z8RJvviwnMuu3u8RXNp/zFr7BnI4ImpXrM0ap5Tn2DLJa1VQVRX5L3zSwplQ0Lz5K/brmkczFuTBRVPx3r4BAH266FWzkf/hT7uOPWv5ybMWLjOMvcd13Gcd98q1+2lBGc0jgTABAubQm4AhHmihET9xSL0ltVjt52BM+H3fkhIHEmPlmgvQheeOFUASyocfmf3rA4GPE4K73NrhAHZRmssA9Ho0NAeGWDWBKgD6CVqqAMxqGIDRNBvDP7ryB1T9BY0/x/2oSruknDyp/4Wv1TAZLsNkXOS/uHNMmJTjYh3k2tAJupIpvAqJBuIeE9kR10WPqqirXlU2Rq92H00vdUXi1ZOmR4YnOAWIt6UCIPORFSt5RO1I5nCHbYjKyRSqfCRcXkfTy0gZL/+ShUO/PGLlk15rMsnsicSp+lVl8r+d+SFcdQDkGX/KNVM8qAVEDAuLZvzfBRUAFaLGUTVY8oyUM/yyhO+j1zJeCkiZyH+x99q1jIy71mRlOi19mjNkwLVeXDNllEzp2DFrDZaAFt6kZVHLIHOWZUk8x4bJa1Vgp1xEPBqu6dDk1PtYHZr+BD2avBocI6/pSzxH5WNlZRFi7nGtOa/quzt0aC/Mq8nbeZiSXC4OGgLkEPWGQNMxHiZsH6to0dwODOUodqPzjwrTF+51/tmjOp1/d02es/iyyOR2OP82mKGqwNe/9p1vl8rup2dazSb8np6dk4IJPhj5lqGBX3bzy2s4/93k8HomdJOSpCrGXww7/6k0UbhGQGBn9tHajXPnd/J+8zcrbLjCzybn3xxBqgCY46Yr1dJAYFGkNe8jXQmcFPLwM2FLcV1dnX3rRdtkLybNHoXq/SSb1NmrRrCl9QH/OZmUYujPLMgUZZLLp/j2UFA6cXTkG4Fpuz4Gk13Xw5dvGOPs/cWgr1H/XBMX1n1ughg+kfuN17oPz3BJrp5svEfFDINp00IYOjbZTNJukObt0HWTH+sG5chJEagCkAXscLwP2LqjrS/aL5dmIbuELPjtshLS0NT0REKEa24xafY11xiTYAjGvmdswYHzfwh6JLO0LnOCgQ7dYs+CscuWLVvvkHpS6zSBaUMORhYNTmfTo/Qrg8q6Y3lFiMlVy+iwk4DiyW7v/0kjPscQmbxezc8E/vXoYTncRDpKEiFAFYAsvQqrVq3ahvXfR0d6BN5xNlsuxwReqTr+Ll/fv7aycqKzLExr74g8q7QKysrKdoHzPy+tUJ5FYq7hD7Fh2cI8M5vMTSQwbWgtgrYmBtO9SQLTeAfz8v1NpnZlMgyru5ldPwUbidFhGwHOp7JrJi2yTZ9eRScNe5p52DV6xfNcbjOcf+qhtvgQqQJgEaCZ5HAsfyCdSzlHAEt2GN7wKUWeHRj7e3dBSXF/zD8oxGopt6eQc1UwlsK+2FUGqcbwIJ5PxnGVw4YN61PsLehWP56Y7HxuY3Pjm+57JmSRKQInDuuHdHKJQzrsIPDLwR9jMZT/2qHKBTr8WDP9OhfY0X1M8PAfsysmyb0EcnOcMOwWDFX7U24yz1qu2/HeunPfkKwhsCcjBza8sMewnqBFzhFAObWhI56KiooBhR7Pz7DU1rkYLnRQWgaCvSS4+EdhScn7ixcv3pJW1s2RHjZWLgLgoqMNFajeeuzpW9Irf7knKSBWh9q9qcm/OEkUBeUzgROH7cKeWyl3pi7N52K4xvZpQ49hs9ZgeJwY5BqbzBhy9eQqM8koTQoCRYVj2MXjvk8Rm73gk4b9mT23Ar4Fl/PSutvRyq7ad2R3K1SuykMVgFyR75qv0tzcLFvqHo/8dZWgEEcJYHXyNxr9/iP1ZIJlLf2Q6y6r0givUGobmpob9ZSdZPKQwEnDR7LnV36EynZebvznOuLThuzCnl8tGwD6us62zAa1syv36cWuyixIEjoJBNv6o+XfPQ1CJ414gT27EvsDsO7Tm8vFa+zKfX+s84mQmA4CNARIByQScZCAYO4YQsPZyXqdf0kDQ4R88P7vdJBM1lSjLIVLmsn5zxrwXGV04vD9UQFw/eZ/ucJjON9pQ/ojjXucPn0FEGzrpN605Kc+WDqkOlkfpYhdc6D73oOTh7/FlF676ChDHojw49kV5Pzb/aCoAmA3UdJnkAD/0GACu8U75XwMTNB+zqhiLA96OVdCcqJlnh7iTVl2GB/K0wKQ2UYJnDLifnbKCPnMIztNGVVA8lECctOsE4fJ3WRXRMPcfbEJrdQeNoPTs7flOYm32eUTi9h5+3Taos4JJacO3BD5vOfrimAK4+292RUT5ziBp6frpApAT38Dclz+EBe35coE2YIPB9jS2v31LS0N0CE/Rx/nqhym8g0FR2Gi+A9NpaVE+U/glFIvBrDluvJtkKOYazBBdsRPHlYKljdnJzPTubwB53+g6dROJuTiJVSi3OtEJyu74HuyyybmzxKUp5TKhqrjkhXFxWHPwfH3ssv3b3OxjXltGs0ByOvHl//G+/3+HRhPn+2CiIjTble+Up+6PCDK4q4pzYklFOwf2NvgvMRguu+BBE4uPZD9c00/VtKx2eWl72CbNvaBjSWs/4BfutLWk4bL1XSuY8+0uu/zHwrthYmT37mSm2qUdwM7dVgRe3b5/uiXcnul9GV26d4/cy/LNJadWior0Jw91boKE9iHppHMfdRlE2QvJR0OE6AeAIcBk/rMBDjP2sTElQVKaKTNzn9cAaEb4wLcuCFLeLgPOf9xj4tuzh2yhZ06Ej+24iz3weCbGS8cC4ermM04DHub5MFxSilW0mUzXWLpPCYdKVc7/zGkTh75Ufhd5NfHhLrjkrOv2SXjObskT53/WIqnlQ5jPCTnBrhv6JoQh6nvbKy9dO0YAaoAOIaWFOslUO/3y3WT0Srh2BEQXs9AOOcjFre0tDqWS0RxYyDwtFoRUDz7Op2XDv3PwZYCGu6jg1RPFjmt7HF2ehmc1+ChLsDQxnjxSHbJuAFs+tj825Du1NJLmBxixcSrOWLZxnYEB6LidFiO8reW7WmlN7HT8C4qhS4Yosg/Y8UdfdjF4ydYK5TLUp9auYGdXl7K2rYPgWVrc26dYLujcsXh/M/LuS09yAAaAtSDHrabiwondTiGz+yAjcU22elHz8L5qFz8zyZ9htU0tjR+gUS8tLS0d6/CYtghDjSsxFyCVeiFOAcVkVfMJadUPZbAGVXvouycPdpUwjweeT05Syw6meD3sOl7XZGl/JzNhqsTbY9WM3myRS64+Wf8lTibKXuVTR8fztPhjLKi/sxhcglL9E7heFw2EvEp6rXT/3GxiSme37Ppe97rdFY513/ebtL5l5UAxh4L3I3fKLlKGCqvWTgEe41NH0fLemYBdaosqAKQigyFZ50AKgElqAS8g4wPNZe5uMfD+SNL/f6vzaV3JlVra+t2aFY3dqspq6llBaErMEzgfFtzE2ypYMoFjc3Nb9mql5T1TAJnV8nKeNjheri+lnm90jG41FYYnK3H5+ACVrjjRVevpGK10KeX3woVt7K/f1HIeg05iSniQdzr2mwwY9aCPcpY4S3s4t1yvwFVRmMtCJzp209N/dSyMhYMXQxH9Sq8O+HKgQW1O5OKRiyNehm7cOy/d4b1sKuzKi9BiS9RK/9Y3wrXD+Cvl40U5ETvP7CQeIxdupeTPf42mty9Vdn4AereoKh02SVQW+G7CV/vv8F3fBHGJXRgZp388pAT7Bbh/wWMi1kY1vJRdq1yJreaqqrfYPIbWgmFbImRX7ipVibqQCsY/kQbGMzpzZTrvw1vHueMYTZqrfH5ZsHmYy2p5OxELNf6L0s6HE5sxyRwOXzMYTOtq3+4/gA4TOdC0dF4rr2YELLnDnaLIlzLT6p8T7WzvF6Jd/xudsHuD5leg37GO30xCXiLVKvqVk/qDW5lXjs9Qi7vcajniHwE6qvB66a6p5VcVgoKdkFjgJgGa8cwRQn3gAoFjXNyOpEil+gNodLQAbqYICseYeePeVktnBv+m7thPMx4WzUlwll9FjIgeh+5Ue8jK5BGnk9E9ll28oiLVB1m/nvYP4Hx4GXoQfoRkuP7U76DrAC6McRZzVRq7cA9WPIdYIo1+1EJO3/MTWay65Fp7g8MYkWd14Pf6WCHz7vszcLWmUIUxjxn/EYLBWHytxqNXnw2C7Lb2MW7N/VIZnlQaPf/0OQBRDKRCBABIkAEHCbQHSsADiMj9USACBCBVARoEnAqMhROBIgAESACRIAIEAEiQAS6IQGqAHTDh0pFIgJEgAgQASKgh0BNTc3Q2oqKPfTI9mQZyamqqmo3MKC5kz35RehGZacXuRs9TCoKESACRIAIEAG9BKqrq/fCpNoFgqttgTQkOB24YGiVpFRbWzu0vr5+TTrRfI/DXKaFKMOYcDnE4ZhvF57nke8FI/vjCFAPQBwOuiECRIAIEAEiECXgqS0vr6n2+U6OhtAFEej+BCLOvywop5XluunzpgpAN32wVCwiQASIABGwRgBDPsqFx1uP9Xhus6aJUhOBvCLQqFmL/XSmatd07l4EaAhQ93qeVBoiQASIABGwiQAP8qHME11K0iatpIYIuJsAliKucbeFZJ0dBKgHwA6KpIMIEAEiQAS6HQGPV9ml2xWKCkQEiAARAAGqANBrQASIABEgAkQgCQEh+LgkwRREBIgAEch7AlQByPtHSAUgAkSACBABRwhwMcERvaSUCBABIpBjAjQHIMcPgLInAkSACBAB9xCIXfEHk3/3i8wA6BUbrlkrOK9rampaoN2nOtdUVP1GcHEO1tn0YVUVL2NiM2SXCK9nemNj49JU6fSE1/h8Z0HuHCbYSOjuD90wWQQQ9i8s3/hXPToSZSoqKqoLuech6EMPiOiL81bGxQouxHP1gcCNifLp7iU3LvjYhkDT72Plaip85zHOzoTuUeFwsQ73C9qDwTOXLVvWFitr9Lq6svIUzvivoW8kE3xQRP8a3H9XEApdurilpdWoTqvytT7fdXgyPwXPcgy+KJH6BBPLOROf9dmx47IFq1ZtM5vH6OrqfUNB5QaUrwo8tWFrK6XuIGdX+P3+jbG6ayt8n7Kigh9iOVP5HiY9aisrUfn1TKoPND2cVCBNYFlZWa8Sb8G9eBEPgD2Dw6LKSrwH/61v9l+bJmnaKJ/PNwWt1jfgc1kNvQPCwmIVnvX3QS6uRDn9aRVQZBwBfB/RQQSIABEgAkTA5QRmvNOX9R+wBV4TDvU/nGLOuNZ+0OCoqoVRzxH5SNyrweumHp2upFgDPaI0nZQWx/+a6NhqMfJcU1n1AYyEE5T+CMFxM+i8cOh+X49umTMmdWpo4gyR+wDwkKJWYKSM3BAMewLUxQklveE3oty/SxqVEKjxjNgAu31fQGRigliX24G7Di6aP39+Z5eINAG1lb6v8PD2TiMSjULlazIqX59HAzJcaOXghQW69wEYO3Zs0Y6t27ZCdWEG9Wq04uHDUaFcpUdWytRUVu4PR/hDXfIF3mHY86EZssVS3iM8P13a3PifZGmrqqrGeRTxjYxL9e4kSzds2LA+fUt6yfKmPfAybqsP+PtBSNdnDZWn/fCR/jit0kgkKj2zUUk9QY9sT5ehHoCe/gZQ+YkAESACRCBKAMseXq/dwOmYjuvh+NuM8Ju1cO2MsJTOFxxGtOiK3posHLXbORdveDjfHlSUcs75iXB/fibjvYI1oaX8gka//8Gd8qmvoFtJ8J3aIf0i7FGdeUWIPdAqegrCdA/zRU/CXSjvJVqugrM3kPgdeS+EwLrw/HQtDiHXw4YJcA7TVqZ2yqtX0vmH3eFDOoFoAX8GHJoQOACtuocgZj8tfuPadR2ooAyEk75JC0t3hu5ItU+TEk+ih+bVAs6XyZBgSEwEH/k80XqM0oSUz9AL8feGZv/58t7uw+fzlcD5j+vJQJnvRI/EOx4v24gy9xIKmwKWkrnaSg6neyWc74NRCUDlLv0xqrJyjBLn/Ivb8G7NLtq2rW5bnz4FqHH4FMFPg/4rVE3YyCyicSMqV0ONVq7SW4PKSFlNLfOGlsbIoSLJH/R6mFqRCIVQMePiD4gfAq+/D55XqM+Otn6Zej7wXp6HBxvzucC+BEI86fXyRpmXoih7oeqPnhX2I3mPZ14kz3RkJpC0VSBzMpIgAkSACBABIpBFAlnqAYgtERzEBehW2AthrXB2R8bGpbuGc7MW8ZGhD2l3UpVOcQtkVd16WlshH4B8RST/DUgzBNehyH3iicOhPA4O5ezECHkf2wOgxadrhcYuuMWiM7hDk20PBQdjuM567T7ZGfZqrbzyLH2OFbAZw2CS21xbWfUrVAweiugKQTZjQyXyQGWLqZUtDxPHLw0E5kTSJzt5IC8dc9VR9IaCZUuWLVueTDA2TCuH3h4ATV7qAFMfnoF8bkmPRK463wONa8ZWetiyEhkPk5nr0Y13xnAPQGx5y6t8hfPmzQsmKyx6RfqiYrQlEqfAHm8yOS0sRu9GyO6C8Gi5NRntLDmyUOhn9U1NL2hhdE5NQHfrQGoVFEMEiAARIAJEgAhIAuXl5aU4qc4/WpwPxTj8t9OQEXBqyhCvtnLHODtJk8BhH40Izfl/O+IQpXL+pQ6RyvlPkoGsTHDIay3FXUQwZry9pG8fdQiJjCz2FrzXRSh1AEeL9DTkIfmktFkdcy74eRE1XjijquOaSq10VhEX7mlBugzOv1Qjnc5oGULeArWHIJV+M+FotX5cSxepUKV0/qWc5CqdZi0N3oPF2nWyM3oXBmrhcqiUdp3qjPIO1+LksCTt2q5zNYZeabrkO5TK+ZcydXV1W6VMRB47bVepvWBa+tgzejlkL5Z6IM0gXKR0/qWQ5EjOv4pL139UAdCFiYSIABEgAkSACGQmUOTxRp3ier//3cwpGGvr7JBOsXqorZjaTcIZw1aiQ0PgEB2eEG3pFvoiPRbp1cCB64DEsxGpseml42K/bGrW1zLb0Nz0Dy2lJyT+T7tOdsawmS8j4UpsumSycWFyTHzkwKRV2bJs3yHYGRFlX6arUMVmKJ1mDGW5IxImK3opW8Y9CrtUS2t0KE/bli2TtbR2neHNh+dd7Ky4ZVbN2UwpJDzipVTCqDCGh90J1pJKhsLNE6AKgHl2lJIIEAEiQASIQCKBGhmAoSinJkakum9tbd2O0TFy2BBjHcGw05NceGgk+NXk0ZZC07auxmpG2W6Ivdd5vVmnXLwYZ1pvQHz4zruIoyyO3xmU+aqhoWG1JlXsKXhGu7Z6rqysHKHpKMBwJO1az7kx0HSFJlddUT1Vu048o2dJ9nrgiLwz4Rtd/3s8HiPzNjLqrK6oOFATMlIBK/f5omXV0nc580jPTpcICrCDAFUA7KBIOogAESACRKDHE0DrvRyPrx4YivK8dq3njIm2D0s5TL6VExrTHhj2cWxaAYcjUbZFWhZjhwzpq13bfJ6XSR+GRA3QZDDU6kXtWu8ZNZ4mVZazffSmySSHScdHajKLA4Gwfi1A31mRYpwr12UWF3JYjKEDE8S/M5QggzD3eKaHRbBUrIEjdpgQVvk5NFlSfBZuU8M5k3NG6LCZAFUAbAZK6ogAESACRKBnEgi1h3aPKXnKce4xMtFLj4dpQyHUHoRoROSipqLiAC3M6LAPLV13O3uDyllWygQH6LVIel3Dn3TltXMlpU5d8l2FNEc6ZUs99/DnIskivR9dlaQK6bV9+79TxZkKF+yESLqVRtNj6JBakUTl9wfJ0mJVrGhvGOZFBCFjuLzJ9FJYmABVAOhNIAJEgAgQASJgAwGPVyR13vWo3t7RsSCdHFpao0Mt0sn1pDiFM0s9IWhh/tQBXhPCOkW7Od1CzrFIe2Ci6yxNYLTPF1vp1ILjzhimc4QWULdmDYab2X8IpnxiXKtoUNNwrk1s76IClZ2jIoFeWQnAylyf1Y4cWdZFkAIME8i4vJZhjZSACBABIkAEiEBPJCA4HJPwUPpMK/oYxaMo7ACM/aYjnoCllnuheJZjqE28RtvuuLkeAIGNvfRVbOTk54khwRZhJaQpmGz8WTLTEVeJ5ZfeUOMEW4qzIwXGvhOn4Z0/LZkNqcLCnxTEChYdypUoi8rO67uPHLlrZ0FheI4MZ/uKgsIW5CVFF2Ep2klWd45OzLOn3FMFoKc8aSonESACRIAIZI8AV52t7OXXI3MSGMVgvlbEeUhOvnaEHLRG/VsnMsCqTZPgBH8D3XLN/k9Vh1iIIMoTnp8R3r8C7n7UjE5seiZXF3Lq2AKUhocBSWPA6ut0Rn2/fPk6KSbnCmBTsOdwPSwiPwZL0W6XZcfE9GMwN+W/6fRQXDwBqgDE86A7IkAEiAARIAKWCTT4HXW2LNtHCvKegBzCHd3PQC0N59KnkxvXxR+cnY/38e/xgfbeYfO2lxr9gdPt1RqvDcvqzkOI3NMAm7lVYvgXn6tJYFfk/6AisBwVIxoepEHJcKYKQAZAFE0EiAARIAJEQBcBjhVWog2uulLoFsIk4Q/R+plxhSDdCruFoGeTpYZ2zsudel54DaIbexlBjXQeHX0Scgfp8CRz7GcQu6SpkbzslOWCT7FTXwZd2MxNXfVJRQUWeA9Yf/yNxHU9KgG1GdJTNAjQJGB6DYgAESACRIAI2EBAhDzLbFCTVAVWSvk8aUQPDoSz7LdSfHiP0Q3YrOhJkdZUAyvmeeyfQl80uKay6uXwjXjIBc5/eNgPTz2OP2q4Qxdw+AegIqdNjK7ZLbwbt0O5dR+1VAHoPs+SSkIEiAARIAK5JFC4c9y/3U4IWjzfzmXR3Ji3hynvWLELFQjbW625ELMjNpWYtK1XpnScaatN8YyVhUy6rMaD4SsRHdomdVZVmkqP+Q0nIqE6wTno9RqajGwqw26QiCoA3eAhUhGIABEgAkQg9wQaGxvlUAT1CHo8Z2vXdp+rfb5L7NaZj/rqA4F/WrJbsF/K9HBimyzpiUmMpUXvj9zqGMkTk3DnZW/1krOZO4MSr7hWGRyLIS8CPQJX1vh8PxpdUVGdKOn0PSbfPhyTR67X6Vf3UMBwJCcnO8cUN78vqQKQ38+PrCcCRIAIEAF3EWgNm8P/7JRZXLAbnNKdr3rhCL9qwnZ1nD542rY5Fi8snK/ZAaf859q1njOWu4wua8oVJeWk3fpA04Xx+sStqMW8GuKehnCFQFYK1L8gbGiurqx6Kl7evjtUwj7RtGGN/iu06xydzVa6cmRubrOlCkBu+VPuRIAIEAEi4H4C4VZZXXYKbWdUT3V59T66kugUwvjwGRHRflVVVeN0JuvuYhsiBfyRkYJiSckZmjyGj1yqXVs919fXb8bqNFiOE4dgzxvR11lQ9D9Nvr65eaF2neyMce+xcwxWQSY8KThe2AsbyjFk6NSdFYPKw+JFLN+hA4UFVC2c/c2yNmsK+srkIQ/7hzU1PSM1VQB6xnOmUhIBIkAEiIBBAlhlfk4kyUC9STFW/yNNlnuUz2tqamq1+0zn0tLStBUNLIMYbfnH2u9yDfgef/DCgt00CGjt/ky7TneWLe1YUelPEZm2dLJm4tCjcE4kXRGWq7xFj47RVVWTUWOYFJF9LlMaOPRqJQP7mP0clYHhskKAP679KR7uE8LzQ+i8gQmhDo0J6+Rvo6V+eib9RuI7hTJBk4ddhnZATreTMSpph+y22279NN3pzrWVleciXu0BqGxq+jKdLMWFCVAFgN4EIkAEiAARIAJJCAjOH9SCqyt9kaE9WkjqM5zSnTubBkNL4RTNr62tjV+zfWdyj8/n20+20PYqLNq2MzjplcI9/AwtRqaB03uSdp94lr0EUiYxvDvdo8V9Dfy+8AZQgu0ryztp0qSUS3CC9VHRXWUBoqRvH92VO73c6pubnoTTHe4FYPyq2grfp0ibyt/iGKJzXwibeWn64cSfrF0nO2MOyOtqOGf/rm/xv5RMBjsDBxqbG99EhfSPDc2BfrJiEK0IcHZ3sjRmw5qbm2UvzLOR9Kj0+ERtRZVcsjZpmeVnoRbDkqQcdjKODiHqkr9gdwd3tG+G3Eo8t5Iu8ZGAUZWVpwjGI3MR+FvzGIuwT5WCwiWB2C4kIkIEiAARIAJEgAhECMCJWgXnYwFux6FpcYR0WNQoIdYyznctYqJ0USCwIhGYHAaCCZk1ckx2JG6i6AzuQPpE0fC9ARe9vqnpSTiANWhlDrdgC/Ys9KrOF2d8KzZkkr/rYWcpsgusbElF78G7yTPP/9CGQNMxYPAhSqKuirNx7boOlbXAqkycN8sSwvvdD5j7YEhM9FBCfHxdXV1HNMDGCzjd0hGW78YwTAyejGttiM5XsGY94wKvj2ovJs6GjcLzC5YFmnppL00qc/Ds0bLPWLnPdxw2+Eol1iVcVgRgh5pZRUXFoIjj3kXOTAAqGKegt2MdynaRTC+4+Lf6DJIow2chNnRnZTk2VL3meKZiPC6HeQVri9G3CGGd+Nsdf0Xq0j+4wNGOd+GI8CX9n4lA0tpZpkQUTwSIABEgAkSgJxCAYzMeY+8fjSsrnH953y68NXHhMTdLmpsb1VZXJh6KCU55Ccf93LB8SpFoRKPfP6OgpFhufBR3QIccAx3XUoqhILt3Z+dfAwB2B3iFEv88OBsFB/Jw+Qevt48mC3/7c8h7m5Y1ycqdU4dAHsPBf0pCBhguA5sEOwjhcP7DB96xmzC5t3CegdbrefPmxXnSmi495xJFSTvcTI+ORBn0Nlwc6f2SPQKZjnYeLChP987Lyc7toWBvVL6/TlA2BvdyDkzRznBxG3TFvfs74+gqGQF1vFSyCAojAkSACBABIuAaAjO+6M36eyNjeyNtfpEWbgxtgE+ltvKq5qKFFEc4LNzKpQZATLwfum7qr3NVJswHKPeEQgdGrNvOCgpeQ2+BoTHTyWwfiTHtvQsLj1SEqPZw3siDwfeWLFu2PJlsTwmrrq4e4FWUo/HMB3HONyiK0tzQ3IwW5dwdteXlNdzrnawIvqdH7hrN2KKlfn+ic5vRQK0VP53znEqJlrbPjra+C1atyjTkLJUa3eF4DnvhOewpE+A5LFzS1PSN7sRJBGP1hTye77D07rdJxChIBwGqAOiARCJEgAgQASJABIgAEXADAc2Jx9CiC9AbFJ2nksk2DNH5Adzwt6ScmcpDJv0Un18EaAhQfj0vspYIEAEiQASIABHowQTQcvuILD56uh6oHVlbpgfF6LKykZrzD/l/6UlDMt2bAPUAdO/nS6UjAkSACBABIkAEuhkB9ALI5Uu1Me9y8u3NrMDzr4aGhnpZVKy0M8SjKOOVkPgF5ob8CkHR8fLU+i8J0UEVAHoHiAARIAJEgAgQASKQZwSwnv9nWN5oXwNm/387d2wDIAwDAVBITMJGiJ6pmIM5GAFRpWMMeMEElFjXu/lLEyt21lz+pw/1SgsLaAAKH65oBAgQIECAQG2BzPaPeQGY0wwM2X1/fqh6E3dn1t+3vruWo7W9toJ0BAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQ+LPADd41zsyu0N4aAAAAAElFTkSuQmCC
\.


--
-- Data for Name: ticket_messages; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ticket_messages (id, ticket_id, sender_id, sender_type, message, attachments, is_internal, created_at) FROM stdin;
\.


--
-- Data for Name: trusted_devices; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.trusted_devices (id, admin_id, device_name, device_type, browser, os, fingerprint, last_used_at, trusted_at, expires_at) FROM stdin;
\.


--
-- Data for Name: usage_records; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.usage_records (id, tenant_id, metric_id, metric, quantity, recorded_at, period_start, period_end, unit_price, amount, invoiced, metadata, created_at, updated_at) FROM stdin;
\.


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: announcements announcements_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_pkey PRIMARY KEY (id);


--
-- Name: custom_domains custom_domains_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.custom_domains
    ADD CONSTRAINT custom_domains_pkey PRIMARY KEY (id);


--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id);


--
-- Name: payment_methods payment_methods_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_methods
    ADD CONSTRAINT payment_methods_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: platform_admin_sessions platform_admin_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.platform_admin_sessions
    ADD CONSTRAINT platform_admin_sessions_pkey PRIMARY KEY (id);


--
-- Name: platform_admins platform_admins_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.platform_admins
    ADD CONSTRAINT platform_admins_pkey PRIMARY KEY (id);


--
-- Name: platform_audit_logs platform_audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.platform_audit_logs
    ADD CONSTRAINT platform_audit_logs_pkey PRIMARY KEY (id);


--
-- Name: platform_login_history platform_login_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.platform_login_history
    ADD CONSTRAINT platform_login_history_pkey PRIMARY KEY (id);


--
-- Name: platform_settings platform_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.platform_settings
    ADD CONSTRAINT platform_settings_pkey PRIMARY KEY (id);


--
-- Name: subscription_plans subscription_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscription_plans
    ADD CONSTRAINT subscription_plans_pkey PRIMARY KEY (id);


--
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);


--
-- Name: support_tickets support_tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_pkey PRIMARY KEY (id);


--
-- Name: tenant_settings tenant_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tenant_settings
    ADD CONSTRAINT tenant_settings_pkey PRIMARY KEY (id);


--
-- Name: tenant_subdomains tenant_subdomains_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tenant_subdomains
    ADD CONSTRAINT tenant_subdomains_pkey PRIMARY KEY (id);


--
-- Name: tenants tenants_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_pkey PRIMARY KEY (id);


--
-- Name: ticket_messages ticket_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ticket_messages
    ADD CONSTRAINT ticket_messages_pkey PRIMARY KEY (id);


--
-- Name: trusted_devices trusted_devices_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trusted_devices
    ADD CONSTRAINT trusted_devices_pkey PRIMARY KEY (id);


--
-- Name: usage_records usage_records_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usage_records
    ADD CONSTRAINT usage_records_pkey PRIMARY KEY (id);


--
-- Name: announcements_is_active_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX announcements_is_active_idx ON public.announcements USING btree (is_active);


--
-- Name: announcements_starts_at_ends_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX announcements_starts_at_ends_at_idx ON public.announcements USING btree (starts_at, ends_at);


--
-- Name: custom_domains_domain_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX custom_domains_domain_idx ON public.custom_domains USING btree (domain);


--
-- Name: custom_domains_domain_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX custom_domains_domain_key ON public.custom_domains USING btree (domain);


--
-- Name: custom_domains_tenant_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX custom_domains_tenant_id_idx ON public.custom_domains USING btree (tenant_id);


--
-- Name: invoices_invoice_number_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX invoices_invoice_number_idx ON public.invoices USING btree (invoice_number);


--
-- Name: invoices_invoice_number_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX invoices_invoice_number_key ON public.invoices USING btree (invoice_number);


--
-- Name: invoices_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX invoices_status_idx ON public.invoices USING btree (status);


--
-- Name: invoices_subscription_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX invoices_subscription_id_idx ON public.invoices USING btree (subscription_id);


--
-- Name: invoices_tenant_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX invoices_tenant_id_idx ON public.invoices USING btree (tenant_id);


--
-- Name: password_reset_tokens_admin_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX password_reset_tokens_admin_id_idx ON public.password_reset_tokens USING btree (admin_id);


--
-- Name: password_reset_tokens_token_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX password_reset_tokens_token_idx ON public.password_reset_tokens USING btree (token);


--
-- Name: password_reset_tokens_token_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX password_reset_tokens_token_key ON public.password_reset_tokens USING btree (token);


--
-- Name: payment_methods_is_default_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX payment_methods_is_default_idx ON public.payment_methods USING btree (is_default);


--
-- Name: payment_methods_stripe_payment_method_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX payment_methods_stripe_payment_method_id_key ON public.payment_methods USING btree (stripe_payment_method_id);


--
-- Name: payment_methods_subscription_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX payment_methods_subscription_id_idx ON public.payment_methods USING btree (subscription_id);


--
-- Name: payment_methods_tenant_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX payment_methods_tenant_id_idx ON public.payment_methods USING btree (tenant_id);


--
-- Name: payments_invoice_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX payments_invoice_id_idx ON public.payments USING btree (invoice_id);


--
-- Name: payments_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX payments_status_idx ON public.payments USING btree (status);


--
-- Name: payments_stripe_payment_intent_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX payments_stripe_payment_intent_id_key ON public.payments USING btree (stripe_payment_intent_id);


--
-- Name: payments_tenant_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX payments_tenant_id_idx ON public.payments USING btree (tenant_id);


--
-- Name: platform_admin_sessions_admin_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX platform_admin_sessions_admin_id_idx ON public.platform_admin_sessions USING btree (admin_id);


--
-- Name: platform_admin_sessions_expires_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX platform_admin_sessions_expires_at_idx ON public.platform_admin_sessions USING btree (expires_at);


--
-- Name: platform_admin_sessions_token_hash_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX platform_admin_sessions_token_hash_idx ON public.platform_admin_sessions USING btree (token_hash);


--
-- Name: platform_admin_sessions_token_hash_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX platform_admin_sessions_token_hash_key ON public.platform_admin_sessions USING btree (token_hash);


--
-- Name: platform_admins_email_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX platform_admins_email_idx ON public.platform_admins USING btree (email);


--
-- Name: platform_admins_email_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX platform_admins_email_key ON public.platform_admins USING btree (email);


--
-- Name: platform_admins_role_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX platform_admins_role_idx ON public.platform_admins USING btree (role);


--
-- Name: platform_admins_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX platform_admins_status_idx ON public.platform_admins USING btree (status);


--
-- Name: platform_admins_username_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX platform_admins_username_key ON public.platform_admins USING btree (username);


--
-- Name: platform_audit_logs_action_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX platform_audit_logs_action_idx ON public.platform_audit_logs USING btree (action);


--
-- Name: platform_audit_logs_admin_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX platform_audit_logs_admin_id_idx ON public.platform_audit_logs USING btree (admin_id);


--
-- Name: platform_audit_logs_resource_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX platform_audit_logs_resource_idx ON public.platform_audit_logs USING btree (resource);


--
-- Name: platform_audit_logs_timestamp_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX platform_audit_logs_timestamp_idx ON public.platform_audit_logs USING btree ("timestamp");


--
-- Name: platform_login_history_admin_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX platform_login_history_admin_id_idx ON public.platform_login_history USING btree (admin_id);


--
-- Name: platform_login_history_timestamp_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX platform_login_history_timestamp_idx ON public.platform_login_history USING btree ("timestamp");


--
-- Name: subscription_plans_slug_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX subscription_plans_slug_idx ON public.subscription_plans USING btree (slug);


--
-- Name: subscription_plans_slug_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX subscription_plans_slug_key ON public.subscription_plans USING btree (slug);


--
-- Name: subscription_plans_tier_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX subscription_plans_tier_idx ON public.subscription_plans USING btree (tier);


--
-- Name: subscriptions_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX subscriptions_status_idx ON public.subscriptions USING btree (status);


--
-- Name: subscriptions_tenant_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX subscriptions_tenant_id_idx ON public.subscriptions USING btree (tenant_id);


--
-- Name: subscriptions_tenant_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX subscriptions_tenant_id_key ON public.subscriptions USING btree (tenant_id);


--
-- Name: support_tickets_assigned_to_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX support_tickets_assigned_to_idx ON public.support_tickets USING btree (assigned_to);


--
-- Name: support_tickets_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX support_tickets_status_idx ON public.support_tickets USING btree (status);


--
-- Name: support_tickets_tenant_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX support_tickets_tenant_id_idx ON public.support_tickets USING btree (tenant_id);


--
-- Name: support_tickets_ticket_number_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX support_tickets_ticket_number_idx ON public.support_tickets USING btree (ticket_number);


--
-- Name: support_tickets_ticket_number_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX support_tickets_ticket_number_key ON public.support_tickets USING btree (ticket_number);


--
-- Name: tenant_settings_tenant_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX tenant_settings_tenant_id_key ON public.tenant_settings USING btree (tenant_id);


--
-- Name: tenant_subdomains_subdomain_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX tenant_subdomains_subdomain_idx ON public.tenant_subdomains USING btree (subdomain);


--
-- Name: tenant_subdomains_subdomain_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX tenant_subdomains_subdomain_key ON public.tenant_subdomains USING btree (subdomain);


--
-- Name: tenant_subdomains_tenant_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX tenant_subdomains_tenant_id_idx ON public.tenant_subdomains USING btree (tenant_id);


--
-- Name: tenants_database_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX tenants_database_name_key ON public.tenants USING btree (database_name);


--
-- Name: tenants_email_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX tenants_email_idx ON public.tenants USING btree (email);


--
-- Name: tenants_slug_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX tenants_slug_idx ON public.tenants USING btree (slug);


--
-- Name: tenants_slug_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX tenants_slug_key ON public.tenants USING btree (slug);


--
-- Name: tenants_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX tenants_status_idx ON public.tenants USING btree (status);


--
-- Name: ticket_messages_ticket_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ticket_messages_ticket_id_idx ON public.ticket_messages USING btree (ticket_id);


--
-- Name: trusted_devices_admin_id_fingerprint_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX trusted_devices_admin_id_fingerprint_key ON public.trusted_devices USING btree (admin_id, fingerprint);


--
-- Name: trusted_devices_admin_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX trusted_devices_admin_id_idx ON public.trusted_devices USING btree (admin_id);


--
-- Name: usage_records_metric_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX usage_records_metric_id_idx ON public.usage_records USING btree (metric_id);


--
-- Name: usage_records_metric_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX usage_records_metric_idx ON public.usage_records USING btree (metric);


--
-- Name: usage_records_recorded_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX usage_records_recorded_at_idx ON public.usage_records USING btree (recorded_at);


--
-- Name: usage_records_tenant_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX usage_records_tenant_id_idx ON public.usage_records USING btree (tenant_id);


--
-- Name: usage_records_tenant_id_metric_id_period_start_period_end_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX usage_records_tenant_id_metric_id_period_start_period_end_key ON public.usage_records USING btree (tenant_id, metric_id, period_start, period_end);


--
-- Name: custom_domains custom_domains_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.custom_domains
    ADD CONSTRAINT custom_domains_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: invoices invoices_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: password_reset_tokens password_reset_tokens_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.platform_admins(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: payment_methods payment_methods_subscription_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_methods
    ADD CONSTRAINT payment_methods_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES public.subscriptions(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: payment_methods payment_methods_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_methods
    ADD CONSTRAINT payment_methods_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: payments payments_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: payments payments_payment_method_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_payment_method_id_fkey FOREIGN KEY (payment_method_id) REFERENCES public.payment_methods(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: payments payments_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: platform_admin_sessions platform_admin_sessions_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.platform_admin_sessions
    ADD CONSTRAINT platform_admin_sessions_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.platform_admins(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: platform_admins platform_admins_invited_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.platform_admins
    ADD CONSTRAINT platform_admins_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.platform_admins(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: platform_audit_logs platform_audit_logs_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.platform_audit_logs
    ADD CONSTRAINT platform_audit_logs_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.platform_admins(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: platform_login_history platform_login_history_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.platform_login_history
    ADD CONSTRAINT platform_login_history_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.platform_admins(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: subscriptions subscriptions_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.subscription_plans(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: subscriptions subscriptions_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: tenant_settings tenant_settings_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tenant_settings
    ADD CONSTRAINT tenant_settings_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: tenant_subdomains tenant_subdomains_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tenant_subdomains
    ADD CONSTRAINT tenant_subdomains_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ticket_messages ticket_messages_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ticket_messages
    ADD CONSTRAINT ticket_messages_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.support_tickets(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: trusted_devices trusted_devices_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trusted_devices
    ADD CONSTRAINT trusted_devices_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.platform_admins(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: usage_records usage_records_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usage_records
    ADD CONSTRAINT usage_records_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: postgres
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- PostgreSQL database dump complete
--

\unrestrict Oy02PxhdGXci2Fz0KwtYGYW6qvl0CotI01abCCuLff0TbDPWaWFsGLKBKNm3JSx


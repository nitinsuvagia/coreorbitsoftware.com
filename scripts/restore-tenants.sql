-- Restore tenant records in master database

-- Restore Softqube tenant
INSERT INTO tenants (id, name, slug, legal_name, status, database_name, database_pool_size, email, created_at, updated_at)
VALUES (
  'tenant_softqube_001',
  'Softqube',
  'softqube',
  'Softqube Technologies',
  'ACTIVE',
  'oms_tenant_softqube',
  10,
  'nitin@softqubes.com',
  NOW(),
  NOW()
);

-- Restore Nexus Link tenant
INSERT INTO tenants (id, name, slug, legal_name, status, database_name, database_pool_size, email, created_at, updated_at)
VALUES (
  'tenant_nexus_001',
  'Nexus Link Private Limited',
  'nexus-link-private-limited',
  'Nexus Link Private Limited',
  'ACTIVE',
  'oms_tenant_nexus-link-private-limited',
  10,
  'amit@nexusmyoms.com',
  NOW(),
  NOW()
);

-- Create subdomains for tenants
INSERT INTO tenant_subdomains (id, tenant_id, subdomain, status, is_primary, verified_at, created_at, updated_at)
VALUES (
  'subdomain_softqube_001',
  'tenant_softqube_001',
  'softqube',
  'ACTIVE',
  true,
  NOW(),
  NOW(),
  NOW()
);

INSERT INTO tenant_subdomains (id, tenant_id, subdomain, status, is_primary, verified_at, created_at, updated_at)
VALUES (
  'subdomain_nexus_001',
  'tenant_nexus_001',
  'nexus-link-private-limited',
  'ACTIVE',
  true,
  NOW(),
  NOW(),
  NOW()
);

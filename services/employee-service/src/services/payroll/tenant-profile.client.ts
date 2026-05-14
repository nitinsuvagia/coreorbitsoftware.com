/**
 * Tenant Profile Client
 *
 * Fetches the company profile (name, logo, address, currency) from the
 * API Gateway's internal endpoint. Tenant-scoped services don't talk to the
 * master DB directly; the gateway proxies that data via a shared secret.
 */

import axios from 'axios';
import { logger } from '../../utils/logger';

export interface TenantProfile {
  id: string;
  slug: string;
  name: string;
  legalName: string | null;
  logo: string | null;
  reportLogo: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postalCode: string | null;
  currency: string;
  timezone: string;
  dateFormat: string;
  primaryColor: string;
  logoUrl: string | null;
}

const GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://localhost:4000';
const INTERNAL_SECRET = process.env.INTERNAL_SECRET || 'internal-api-secret';

// Tiny in-memory cache (per-process) – tenant branding rarely changes mid-run.
const cache = new Map<string, { profile: TenantProfile; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function getTenantProfile(tenantSlug: string): Promise<TenantProfile> {
  const cached = cache.get(tenantSlug);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.profile;
  }

  try {
    const response = await axios.get(`${GATEWAY_URL}/internal/tenant-profile`, {
      headers: {
        'x-internal-secret': INTERNAL_SECRET,
        'x-tenant-slug': tenantSlug,
      },
      timeout: 5000,
    });

    if (!response.data?.success || !response.data?.data) {
      throw new Error(response.data?.error?.message || 'Tenant profile lookup failed');
    }

    const profile = response.data.data as TenantProfile;
    cache.set(tenantSlug, { profile, expiresAt: Date.now() + CACHE_TTL_MS });
    return profile;
  } catch (error: any) {
    logger.error({ error: error.message, tenantSlug }, 'Failed to fetch tenant profile');
    throw new Error(`Tenant profile lookup failed: ${error.message}`);
  }
}

export function invalidateTenantProfileCache(tenantSlug: string): void {
  cache.delete(tenantSlug);
}

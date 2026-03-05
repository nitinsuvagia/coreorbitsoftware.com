const APP_URL = process.env.NEXT_PUBLIC_APP_URL || '';
const CONFIGURED_MAIN_DOMAIN = process.env.NEXT_PUBLIC_MAIN_DOMAIN || '';
const CONFIGURED_PLATFORM_ADMIN_SUBDOMAIN = process.env.NEXT_PUBLIC_PLATFORM_ADMIN_SUBDOMAIN || 'portal';

function normalizeHost(hostname: string): string {
  return hostname.split(':')[0].toLowerCase();
}

function getHostFromUrl(url: string): string {
  if (!url) return '';

  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return '';
  }
}

export function getConfiguredMainDomain(): string {
  if (CONFIGURED_MAIN_DOMAIN) {
    return CONFIGURED_MAIN_DOMAIN.toLowerCase();
  }

  const appHost = getHostFromUrl(APP_URL);
  if (!appHost) {
    return '';
  }

  const parts = appHost.split('.');
  if (parts.length >= 2) {
    return parts.slice(-2).join('.');
  }

  return appHost;
}

export function getConfiguredPlatformHost(): string {
  return getHostFromUrl(APP_URL);
}

export function getConfiguredPlatformAdminSubdomain(): string {
  if (CONFIGURED_PLATFORM_ADMIN_SUBDOMAIN) {
    return CONFIGURED_PLATFORM_ADMIN_SUBDOMAIN.toLowerCase();
  }

  const platformHost = getConfiguredPlatformHost();
  const mainDomain = getConfiguredMainDomain();

  if (!platformHost || !mainDomain) {
    return '';
  }

  if (!platformHost.endsWith(`.${mainDomain}`)) {
    return '';
  }

  const subdomain = platformHost.slice(0, -(mainDomain.length + 1));
  return subdomain.includes('.') ? '' : subdomain;
}

export function getTenantSlugFromHostname(hostname: string): string | null {
  const host = normalizeHost(hostname);
  const mainDomain = getConfiguredMainDomain();
  const platformHost = getConfiguredPlatformHost();
  const platformSubdomain = getConfiguredPlatformAdminSubdomain();

  if (host === 'localhost' || host === '127.0.0.1') {
    return null;
  }

  if (platformHost && host === platformHost) {
    return null;
  }

  const localhostMatch = host.match(/^([a-z0-9-]+)\.localhost$/);
  if (localhostMatch) {
    const subdomain = localhostMatch[1];
    if (platformSubdomain && subdomain === platformSubdomain) {
      return null;
    }
    return subdomain;
  }

  if (mainDomain) {
    if (host === mainDomain || host === `www.${mainDomain}`) {
      return null;
    }

    if (host.endsWith(`.${mainDomain}`)) {
      const subdomain = host.slice(0, -(mainDomain.length + 1));

      if (!subdomain || subdomain.includes('.')) {
        return null;
      }

      if (platformSubdomain && subdomain === platformSubdomain) {
        return null;
      }

      return subdomain;
    }

    return null;
  }

  const parts = host.split('.');
  if (parts.length >= 3) {
    const subdomain = parts[0];
    if (platformSubdomain && subdomain === platformSubdomain) {
      return null;
    }
    return subdomain;
  }

  return null;
}

const MAIN_DOMAIN = process.env.NEXT_PUBLIC_MAIN_DOMAIN || 'coreorbitsoftware.com';
const PORTAL_URL = process.env.NEXT_PUBLIC_PORTAL_URL || `https://portal.${MAIN_DOMAIN}`;

export const siteConfig = {
  mainDomain: MAIN_DOMAIN,
  portalUrl: PORTAL_URL,
  signupUrl: `${PORTAL_URL}/signup`,
  loginUrl: `${PORTAL_URL}/login`,
  apiUrl: process.env.NEXT_PUBLIC_API_URL || `https://api.${MAIN_DOMAIN}`,
};

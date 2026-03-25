import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-super-secret-jwt-key-min-32-characters-long'
);

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// Paths that don't require authentication (excluding auth pages which are handled separately)
const publicPaths = [
  '/verify-email',
  '/resend-verification',
  '/assessment',
  '/offer',  // Public offer response page
  '/onboarding',  // Candidate onboarding portal (public with token)
  '/reactivate-tenant',  // Tenant reactivation page
  '/reactivate-account', // User account reactivation page
  '/resend-reactivation', // Resend reactivation link page
  '/schedule-demo',  // Public demo request form
  '/contact',  // Public contact form
  '/about',  // Public about page
  '/careers',  // Public careers page
  '/privacy-policy',  // Public privacy policy
  '/terms-of-service',  // Public terms of service
  '/cookie-policy',  // Public cookie policy
  '/solutions',  // Public solutions pages
  '/_next',
  '/api',
  '/favicon.ico',
  '/images',
  '/fonts',
  '/logo-',
];

// Paths that require platform admin access
const adminPaths = ['/admin'];

// Paths that require tenant user access
const tenantPaths = ['/dashboard', '/admin-360', '/employees', '/attendance', '/projects', '/tasks', '/documents', '/reports', '/billing', '/settings', '/profile', '/hr', '/organization', '/notifications', '/clients', '/backoffice', '/inventory', '/calendar'];

// Auth pages that should redirect if already logged in
const authPages = ['/login', '/signup', '/forgot-password', '/reset-password'];

// ─── Route → Permission mapping ────────────────────────────────────────────
// Maps route prefixes to the permissions required (OR logic — any match grants access).
// tenant_admin bypasses all.
// If a route is not listed here, any authenticated tenant user can access it.
const routePermissions: Record<string, string[]> = {
  '/admin-360':              ['admin_360:view'],
  '/employees':              ['employees:read'],
  '/hr/dashboard':           ['hr_dashboard:view'],
  '/hr/jobs':                ['hr_jobs:read'],
  '/hr/candidates':          ['hr_candidates:read'],
  '/hr/interviews':          ['hr_interviews:read'],
  '/hr/assessments':         ['hr_assessments:read'],
  '/hr/tests':               ['hr_assessments:read'],
  '/hr/holidays':            ['holidays:read'],
  '/hr/leave-management':    ['leave:read', 'leave:self'],
  '/hr/performance-reviews': ['performance:read', 'performance:self'],
  '/attendance':             ['attendance:read', 'attendance:self', 'leave:read', 'leave:self'],
  '/documents':              ['documents:read', 'documents:self'],
  '/projects':               ['projects:read'],
  '/tasks':                  ['tasks:read'],
  '/clients':                ['projects:read'],
  '/reports':                ['reports:view'],
  '/billing':                ['billing:view'],
  '/backoffice':             ['billing:view'],
  '/inventory':              ['organization:view'],
  '/organization':           ['organization:view'],
};

/**
 * Check if a JWT payload has access to a given pathname.
 *
 * Permission enforcement is done at the API gateway level.
 * The middleware only does coarse-grained checks to avoid blocking
 * users whose JWT was issued before permissions were populated
 * (backward compatibility with older tokens that have permissions=[]).
 */
function hasRouteAccess(pathname: string, payload: any): boolean {
  const roles: string[] = (payload.roles as string[]) || [];
  const permissions: string[] = (payload.permissions as string[]) || [];

  // Tenant admin has full access
  if (roles.includes('tenant_admin')) return true;

  // If the token has no permissions embedded (legacy token / pre-RBAC),
  // allow navigation — the API gateway will enforce real permissions.
  if (permissions.length === 0) return true;

  // Find the most specific matching route prefix
  // Sort by length desc so /hr/leave-management matches before /hr
  const sortedRoutes = Object.keys(routePermissions).sort((a, b) => b.length - a.length);
  for (const route of sortedRoutes) {
    if (pathname === route || pathname.startsWith(route + '/')) {
      const requiredPerms = routePermissions[route];
      // OR logic: user needs ANY of the listed permissions
      return requiredPerms.some((perm) => permissions.includes(perm));
    }
  }

  // Routes without explicit permission mapping are accessible to all auth users
  return true;
}

/**
 * Attempt to refresh the access token using the refresh token.
 * Returns the new access token and refresh token if successful, null otherwise.
 */
async function tryRefreshToken(
  refreshToken: string
): Promise<{ accessToken: string; refreshToken?: string } | null> {
  try {
    const res = await fetch(`${API_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) return null;

    const data = await res.json();
    const accessToken =
      data?.tokens?.accessToken || data?.data?.accessToken || data?.accessToken;
    const newRefreshToken =
      data?.tokens?.refreshToken || data?.data?.refreshToken || data?.refreshToken;

    if (!accessToken) return null;
    return { accessToken, refreshToken: newRefreshToken };
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Get token from cookie
  const token = request.cookies.get('accessToken')?.value;
  const refreshTokenCookie = request.cookies.get('refreshToken')?.value;

  // Check if user is on auth pages while logged in - redirect to dashboard
  if (authPages.some(path => pathname.startsWith(path))) {
    if (token) {
      try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        const isPlatformAdmin = payload.type === 'platform_admin';
        const redirectUrl = isPlatformAdmin ? '/admin/dashboard' : '/dashboard';
        return NextResponse.redirect(new URL(redirectUrl, request.url));
      } catch (error) {
        // Invalid token, allow access to login page and clear only the access token
        const response = NextResponse.next();
        response.cookies.delete('accessToken');
        return response;
      }
    }
    return NextResponse.next();
  }

  // Allow landing page (exact match)
  if (pathname === '/') {
    return NextResponse.next();
  }

  // Allow other public paths
  if (publicPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  if (!token) {
    // No access token — try refreshing if we have a refresh token
    if (refreshTokenCookie) {
      const tokens = await tryRefreshToken(refreshTokenCookie);
      if (tokens) {
        const response = NextResponse.redirect(request.url);
        response.cookies.set('accessToken', tokens.accessToken, {
          path: '/',
          maxAge: 86400,
          sameSite: 'lax',
        });
        if (tokens.refreshToken) {
          response.cookies.set('refreshToken', tokens.refreshToken, {
            path: '/',
            maxAge: 2592000,
            sameSite: 'lax',
          });
        }
        return response;
      }
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const isPlatformAdmin = payload.type === 'platform_admin';

    // Check admin paths - require platform admin
    // Use exact match or path with trailing slash to avoid matching /admin-360
    if (adminPaths.some(path => pathname === path || pathname.startsWith(path + '/'))) {
      if (!isPlatformAdmin) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }

    // Check tenant paths - require tenant user
    if (tenantPaths.some(path => pathname.startsWith(path))) {
      if (isPlatformAdmin) {
        return NextResponse.redirect(new URL('/admin/dashboard', request.url));
      }

      // ─── RBAC: check route-level permissions ───────────────────────
      if (!hasRouteAccess(pathname, payload)) {
        // User lacks the required permission → redirect to dashboard
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }

    return NextResponse.next();
  } catch (error) {
    // Token verification failed (expired, malformed, etc.)
    // Try refreshing the token before giving up
    if (refreshTokenCookie) {
      const tokens = await tryRefreshToken(refreshTokenCookie);
      if (tokens) {
        // Refresh succeeded — set new cookies and redirect to same page
        // (redirect so the next middleware run uses the fresh token)
        const response = NextResponse.redirect(request.url);
        response.cookies.set('accessToken', tokens.accessToken, {
          path: '/',
          maxAge: 86400,
          sameSite: 'lax',
        });
        if (tokens.refreshToken) {
          response.cookies.set('refreshToken', tokens.refreshToken, {
            path: '/',
            maxAge: 2592000,
            sameSite: 'lax',
          });
        }
        return response;
      }
    }

    // Refresh failed or no refresh token — redirect to login
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('accessToken');
    response.cookies.delete('refreshToken');
    return response;
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};

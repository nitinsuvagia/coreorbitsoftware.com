import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-super-secret-jwt-key-min-32-characters-long'
);

// Paths that don't require authentication (excluding auth pages which are handled separately)
const publicPaths = [
  '/verify-email',
  '/resend-verification',
  '/_next',
  '/api',
  '/favicon.ico',
  '/images',
  '/fonts',
];

// Paths that require platform admin access
const adminPaths = ['/admin'];

// Paths that require tenant user access
const tenantPaths = ['/dashboard', '/admin-360', '/employees', '/attendance', '/projects', '/tasks', '/documents', '/reports', '/billing', '/settings', '/profile'];

// Auth pages that should redirect if already logged in
const authPages = ['/login', '/signup', '/forgot-password', '/reset-password'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  console.log('[Middleware] Processing path:', pathname);

  // Get token from cookie
  const token = request.cookies.get('accessToken')?.value;
  console.log('[Middleware] Token exists:', !!token);

  // Check if user is on auth pages while logged in - redirect to dashboard
  if (authPages.some(path => pathname.startsWith(path))) {
    if (token) {
      try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        const isPlatformAdmin = payload.type === 'platform_admin';
        const redirectUrl = isPlatformAdmin ? '/admin/dashboard' : '/dashboard';
        console.log('[Middleware] Authenticated user on auth page, redirecting to:', redirectUrl);
        return NextResponse.redirect(new URL(redirectUrl, request.url));
      } catch (error) {
        // Invalid token, allow access to login page and clear bad cookies
        console.log('[Middleware] Invalid token on auth page, allowing access');
        const response = NextResponse.next();
        response.cookies.delete('accessToken');
        response.cookies.delete('refreshToken');
        return response;
      }
    }
    console.log('[Middleware] Auth page, no token, allowing');
    return NextResponse.next();
  }

  // Allow other public paths
  if (publicPaths.some(path => pathname.startsWith(path))) {
    console.log('[Middleware] Public path, allowing');
    return NextResponse.next();
  }

  if (!token) {
    console.log('[Middleware] No token, redirecting to login');
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    console.log('[Middleware] JWT verified, type:', payload.type);

    const isPlatformAdmin = payload.type === 'platform_admin';

    // Check admin paths - require platform admin
    // Use exact match or path with trailing slash to avoid matching /admin-360
    if (adminPaths.some(path => pathname === path || pathname.startsWith(path + '/'))) {
      if (!isPlatformAdmin) {
        console.log('[Middleware] Non-admin accessing admin path, redirecting to dashboard');
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }

    // Check tenant paths - require tenant user
    if (tenantPaths.some(path => pathname.startsWith(path))) {
      if (isPlatformAdmin) {
        console.log('[Middleware] Platform admin accessing tenant path, redirecting to admin dashboard');
        return NextResponse.redirect(new URL('/admin/dashboard', request.url));
      }
    }

    console.log('[Middleware] Access granted');
    return NextResponse.next();
  } catch (error) {
    console.log('[Middleware] JWT verification failed:', error);
    // Clear invalid token and redirect to login
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

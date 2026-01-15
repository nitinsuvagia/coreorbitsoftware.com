import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-super-secret-jwt-key-min-32-characters-long'
);

export interface Session {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  tenantId?: string;
  tenantSlug?: string;
  isPlatformAdmin: boolean;
}

export async function getSession(): Promise<Session | null> {
  const cookieStore = cookies();
  const token = cookieStore.get('accessToken')?.value;

  console.log('[Session] Checking session, token exists:', !!token);
  
  if (!token) {
    console.log('[Session] No token found, returning null');
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    
    console.log('[Session] JWT verified, payload type:', payload.type);
    
    // Handle platform admin tokens (type: 'platform_admin')
    const isPlatformAdmin = payload.type === 'platform_admin';
    
    const session = {
      userId: payload.sub as string,
      email: payload.email as string,
      firstName: (payload.firstName as string) || '',
      lastName: (payload.lastName as string) || '',
      role: (payload.platformRole as string) || (payload.role as string) || '',
      tenantId: payload.tenantId as string | undefined,
      tenantSlug: payload.tenantSlug as string | undefined,
      isPlatformAdmin,
    };
    
    console.log('[Session] Session created:', { email: session.email, isPlatformAdmin: session.isPlatformAdmin });
    
    return session;
  } catch (err) {
    console.log('[Session] JWT verification failed:', err);
    return null;
  }
}

export async function requireAuth(): Promise<Session> {
  const session = await getSession();
  
  if (!session) {
    throw new Error('Unauthorized');
  }
  
  return session;
}

export async function requirePlatformAdmin(): Promise<Session> {
  const session = await requireAuth();
  
  if (!session.isPlatformAdmin) {
    throw new Error('Forbidden');
  }
  
  return session;
}

export async function requireTenantAccess(): Promise<Session> {
  const session = await requireAuth();
  
  if (session.isPlatformAdmin) {
    throw new Error('Platform admins should access main domain');
  }
  
  if (!session.tenantId) {
    throw new Error('No tenant access');
  }
  
  return session;
}

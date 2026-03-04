import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';

export default async function HomePage() {
  const session = await getSession();

  // Redirect to login for non-authenticated users
  if (!session) {
    redirect('/login');
  }

  // Redirect to appropriate dashboard based on context
  if (session.isPlatformAdmin) {
    redirect('/admin/dashboard');
  } else {
    redirect('/dashboard');
  }
}

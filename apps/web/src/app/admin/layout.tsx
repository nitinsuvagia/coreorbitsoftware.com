import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { AdminSidebar } from '@/components/layout/admin-sidebar';
import { Header } from '@/components/layout/header';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  // Only platform admins can access admin routes
  if (!session.isPlatformAdmin) {
    redirect('/dashboard');
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <AdminSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto bg-muted/30 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

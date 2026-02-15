import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  // Platform admins should use /admin routes
  if (session.isPlatformAdmin) {
    redirect('/admin/dashboard');
  }

  return (
    <div className="flex h-screen overflow-hidden print:block print:h-auto print:overflow-visible">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden print:block print:overflow-visible">
        <Header />
        <main className="flex-1 overflow-y-auto bg-muted/30 p-6 print:p-0 print:bg-white print:overflow-visible">
          {children}
        </main>
      </div>
    </div>
  );
}

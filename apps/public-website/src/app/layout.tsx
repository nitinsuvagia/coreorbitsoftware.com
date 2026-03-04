import type { Metadata, Viewport } from 'next';
import dynamic from 'next/dynamic';
import './globals.css';
import { Providers } from './providers';
import { Toaster } from '@/components/ui/sonner';

const CookieConsent = dynamic(
  () => import('@/components/cookie-consent').then(mod => mod.CookieConsent),
  { ssr: false }
);

export const metadata: Metadata = {
  title: 'CoreOrbit - Smart Office Management System',
  description: 'AI-powered office management platform that streamlines HR, projects, attendance, and team collaboration with intelligent automation.',
  openGraph: {
    type: 'website',
    siteName: 'CoreOrbit',
    title: 'CoreOrbit - Smart Office Management',
    description: 'Transform your workplace with AI-powered office management. Streamline HR, projects, and team collaboration.',
  },
  keywords: ['office management', 'AI', 'HR software', 'employee management', 'project tracking', 'attendance system', 'team collaboration'],
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Google Fonts for appearance preferences */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link 
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Lato:wght@300;400;700&family=Montserrat:wght@300;400;500;600;700&family=Nunito:wght@300;400;500;600;700&family=Open+Sans:wght@300;400;500;600;700&family=Poppins:wght@300;400;500;600;700&family=Raleway:wght@300;400;500;600;700&family=Roboto:wght@300;400;500;700&family=Source+Sans+3:wght@300;400;500;600;700&family=Work+Sans:wght@300;400;500;600;700&display=swap" 
          rel="stylesheet" 
        />
      </head>
      <body className="font-sans antialiased">
        <Providers>
          {children}
          <Toaster />
          <CookieConsent />
        </Providers>
      </body>
    </html>
  );
}

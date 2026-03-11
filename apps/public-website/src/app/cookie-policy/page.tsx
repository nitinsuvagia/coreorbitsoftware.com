'use client';

import Link from 'next/link';
import { LandingNavbar } from '@/components/landing/navbar';
import { Footer } from '@/components/landing/footer';
import { Cookie, Settings, BarChart3, Shield, Globe, ToggleLeft } from 'lucide-react';

export default function CookiePolicyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <LandingNavbar />
      
      <section className="relative pt-24 pb-16 md:pt-32 md:pb-24 overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-orange-400/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute top-40 right-10 w-96 h-96 bg-red-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute bottom-20 left-1/3 w-80 h-80 bg-yellow-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:48px_48px]" />
        </div>
        <div className="container mx-auto px-4 relative">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-sm font-medium mb-6">
              <Cookie className="w-4 h-4" />
              Legal
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-4">
              Cookie{' '}
              <span className="bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                Policy
              </span>
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              Last updated: February 24, 2026
            </p>
          </div>

          {/* Content */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 md:p-12 shadow-xl border border-slate-200 dark:border-slate-700">
            <div className="prose prose-slate dark:prose-invert max-w-none">
              
              {/* What Are Cookies */}
              <section className="mb-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                    <Cookie className="w-5 h-5 text-orange-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white m-0">What Are Cookies?</h2>
                </div>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  Cookies are small text files that are stored on your device (computer, tablet, or mobile) when you 
                  visit websites. They are widely used to make websites work more efficiently and to provide information 
                  to website owners.
                </p>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  CoreOrbit uses cookies and similar technologies to enhance your experience, analyze site usage, 
                  and assist in our marketing efforts. This Cookie Policy explains what cookies we use, why we use 
                  them, and how you can control them.
                </p>
              </section>

              {/* Types of Cookies */}
              <section className="mb-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <Settings className="w-5 h-5 text-blue-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white m-0">Types of Cookies We Use</h2>
                </div>

                {/* Essential Cookies */}
                <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-6 mb-4">
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">🔒 Essential Cookies</h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-2">
                    These cookies are necessary for the website to function and cannot be switched off. They are usually 
                    set in response to actions made by you such as logging in or filling in forms.
                  </p>
                  <ul className="list-disc pl-5 text-slate-600 dark:text-slate-400 text-sm space-y-1">
                    <li>Authentication and security</li>
                    <li>Session management</li>
                    <li>Load balancing</li>
                    <li>User preferences</li>
                  </ul>
                </div>

                {/* Performance Cookies */}
                <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-6 mb-4">
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">📊 Performance Cookies</h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-2">
                    These cookies help us understand how visitors interact with our website by collecting and reporting 
                    information anonymously.
                  </p>
                  <ul className="list-disc pl-5 text-slate-600 dark:text-slate-400 text-sm space-y-1">
                    <li>Page load times</li>
                    <li>Most visited pages</li>
                    <li>Error messages encountered</li>
                    <li>User navigation patterns</li>
                  </ul>
                </div>

                {/* Functional Cookies */}
                <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-6 mb-4">
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">⚙️ Functional Cookies</h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-2">
                    These cookies enable enhanced functionality and personalization, such as remembering your preferences.
                  </p>
                  <ul className="list-disc pl-5 text-slate-600 dark:text-slate-400 text-sm space-y-1">
                    <li>Language preferences</li>
                    <li>Theme settings (dark/light mode)</li>
                    <li>Previously entered information</li>
                    <li>Dashboard customizations</li>
                  </ul>
                </div>

                {/* Marketing Cookies */}
                <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">📢 Marketing Cookies</h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-2">
                    These cookies may be set through our site by our advertising partners to build a profile of your 
                    interests and show you relevant ads.
                  </p>
                  <ul className="list-disc pl-5 text-slate-600 dark:text-slate-400 text-sm space-y-1">
                    <li>Ad targeting and measurement</li>
                    <li>Social media sharing features</li>
                    <li>Cross-site tracking</li>
                    <li>Remarketing campaigns</li>
                  </ul>
                </div>
              </section>

              {/* Third-Party Cookies */}
              <section className="mb-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                    <Globe className="w-5 h-5 text-purple-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white m-0">Third-Party Cookies</h2>
                </div>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  We use services from third parties that may set cookies on your device:
                </p>
                <ul className="list-disc pl-6 text-slate-600 dark:text-slate-400 space-y-2 mt-4">
                  <li><strong>Google Analytics</strong> - Website usage analysis</li>
                  <li><strong>Intercom</strong> - Customer support chat</li>
                  <li><strong>Stripe</strong> - Payment processing</li>
                  <li><strong>HubSpot</strong> - Marketing automation</li>
                </ul>
              </section>

              {/* Cookie Duration */}
              <section className="mb-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-green-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white m-0">Cookie Duration</h2>
                </div>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">Cookies can be classified by how long they persist:</p>
                <ul className="list-disc pl-6 text-slate-600 dark:text-slate-400 space-y-2 mt-4">
                  <li><strong>Session Cookies</strong> - Temporary cookies deleted when you close your browser</li>
                  <li><strong>Persistent Cookies</strong> - Remain on your device for a set period or until manually deleted</li>
                </ul>
              </section>

              {/* Managing Cookies */}
              <section className="mb-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                    <ToggleLeft className="w-5 h-5 text-indigo-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white m-0">Managing Your Cookie Preferences</h2>
                </div>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  You can control and manage cookies in several ways:
                </p>
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mt-6 mb-3">Browser Settings</h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  Most browsers allow you to refuse or delete cookies. The methods vary by browser:
                </p>
                <ul className="list-disc pl-6 text-slate-600 dark:text-slate-400 space-y-2 mt-2">
                  <li><strong>Chrome:</strong> Settings → Privacy and Security → Cookies</li>
                  <li><strong>Firefox:</strong> Options → Privacy & Security → Cookies</li>
                  <li><strong>Safari:</strong> Preferences → Privacy → Cookies</li>
                  <li><strong>Edge:</strong> Settings → Privacy & Security → Cookies</li>
                </ul>
                
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mt-6 mb-3">Opt-Out Links</h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  You can opt out of certain third-party cookies:
                </p>
                <ul className="list-disc pl-6 text-slate-600 dark:text-slate-400 space-y-2 mt-2">
                  <li>Google Analytics: <a href="https://tools.google.com/dlpage/gaoptout" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">tools.google.com/dlpage/gaoptout</a></li>
                  <li>Network Advertising Initiative: <a href="https://optout.networkadvertising.org" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">optout.networkadvertising.org</a></li>
                </ul>
              </section>

              {/* Impact of Blocking */}
              <section className="mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-red-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white m-0">Impact of Blocking Cookies</h2>
                </div>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  Please note that blocking or deleting cookies may impact your experience on our platform. 
                  Some features may not function properly, including:
                </p>
                <ul className="list-disc pl-6 text-slate-600 dark:text-slate-400 space-y-2 mt-4">
                  <li>Staying logged in to your account</li>
                  <li>Remembering your preferences and settings</li>
                  <li>Personalized dashboard layouts</li>
                  <li>Some security features</li>
                </ul>
              </section>

            </div>
          </div>

          {/* Related Links */}
          <div className="mt-8 flex flex-wrap gap-4 justify-center">
            <Link href="/privacy-policy" className="text-orange-600 dark:text-orange-400 hover:underline text-sm">
              Privacy Policy →
            </Link>
            <Link href="/terms-of-service" className="text-orange-600 dark:text-orange-400 hover:underline text-sm">
              Terms of Service →
            </Link>
          </div>
        </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

'use client';

import Link from 'next/link';
import { LandingNavbar } from '@/components/landing/navbar';
import { Footer } from '@/components/landing/footer';
import { Shield, Lock, Eye, UserCheck, Server, Bell, FileText, Mail } from 'lucide-react';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <LandingNavbar />
      
      <section className="relative pt-24 pb-16 md:pt-32 md:pb-24 overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-blue-400/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute top-40 right-10 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute bottom-20 left-1/3 w-80 h-80 bg-pink-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:48px_48px]" />
        </div>
        <div className="container mx-auto px-4 relative">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium mb-6">
              <Shield className="w-4 h-4" />
              Legal
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-4">
              Privacy{' '}
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
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
              
              {/* Introduction */}
              <section className="mb-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-blue-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white m-0">Introduction</h2>
                </div>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  CoreOrbit Software Inc. (&quot;CoreOrbit,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) is committed to protecting your privacy. 
                  This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our 
                  AI-powered HR management platform and related services.
                </p>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  By accessing or using CoreOrbit, you agree to the terms of this Privacy Policy. If you do not agree with our 
                  policies and practices, please do not use our services.
                </p>
              </section>

              {/* Information We Collect */}
              <section className="mb-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                    <Eye className="w-5 h-5 text-purple-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white m-0">Information We Collect</h2>
                </div>
                
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mt-6 mb-3">Personal Information</h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">We may collect personal information that you voluntarily provide, including:</p>
                <ul className="list-disc pl-6 text-slate-600 dark:text-slate-400 space-y-2">
                  <li>Name, email address, phone number, and job title</li>
                  <li>Company name and business contact information</li>
                  <li>Account credentials and profile information</li>
                  <li>Employee data you input into our platform</li>
                  <li>Payment and billing information</li>
                </ul>

                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mt-6 mb-3">Automatically Collected Information</h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">When you use our services, we automatically collect:</p>
                <ul className="list-disc pl-6 text-slate-600 dark:text-slate-400 space-y-2">
                  <li>Device information (browser type, operating system, device identifiers)</li>
                  <li>Usage data (pages visited, features used, time spent)</li>
                  <li>IP addresses and location data</li>
                  <li>Cookies and similar tracking technologies</li>
                </ul>
              </section>

              {/* How We Use Your Information */}
              <section className="mb-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <UserCheck className="w-5 h-5 text-green-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white m-0">How We Use Your Information</h2>
                </div>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">We use collected information to:</p>
                <ul className="list-disc pl-6 text-slate-600 dark:text-slate-400 space-y-2">
                  <li>Provide, maintain, and improve our HR management services</li>
                  <li>Process transactions and send related information</li>
                  <li>Send administrative notifications and updates</li>
                  <li>Respond to inquiries and provide customer support</li>
                  <li>Personalize your experience and provide AI-powered recommendations</li>
                  <li>Analyze usage patterns to improve our platform</li>
                  <li>Detect, prevent, and address technical issues and security threats</li>
                  <li>Comply with legal obligations</li>
                </ul>
              </section>

              {/* Data Security */}
              <section className="mb-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                    <Lock className="w-5 h-5 text-red-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white m-0">Data Security</h2>
                </div>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  We implement industry-standard security measures to protect your data, including:
                </p>
                <ul className="list-disc pl-6 text-slate-600 dark:text-slate-400 space-y-2">
                  <li>256-bit SSL/TLS encryption for data in transit</li>
                  <li>AES-256 encryption for data at rest</li>
                  <li>Multi-factor authentication options</li>
                  <li>Regular security audits and penetration testing</li>
                  <li>Built following SOC 2 Type II security standards</li>
                  <li>Designed with GDPR and CCPA best practices in mind</li>
                </ul>
              </section>

              {/* Data Retention */}
              <section className="mb-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                    <Server className="w-5 h-5 text-orange-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white m-0">Data Retention</h2>
                </div>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  We retain your personal information for as long as necessary to fulfill the purposes outlined in this 
                  Privacy Policy, unless a longer retention period is required by law. When you close your account, 
                  we will delete or anonymize your data within 90 days, except where retention is necessary for legal compliance.
                </p>
              </section>

              {/* Your Rights */}
              <section className="mb-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                    <Bell className="w-5 h-5 text-indigo-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white m-0">Your Rights</h2>
                </div>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">Depending on your location, you may have the right to:</p>
                <ul className="list-disc pl-6 text-slate-600 dark:text-slate-400 space-y-2">
                  <li>Access the personal information we hold about you</li>
                  <li>Correct inaccurate or incomplete data</li>
                  <li>Request deletion of your personal information</li>
                  <li>Object to or restrict processing of your data</li>
                  <li>Data portability (receive your data in a structured format)</li>
                  <li>Withdraw consent at any time</li>
                  <li>Lodge a complaint with a supervisory authority</li>
                </ul>
              </section>

              {/* Contact Us */}
              <section className="mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center">
                    <Mail className="w-5 h-5 text-pink-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white m-0">Contact Us</h2>
                </div>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  If you have questions about this Privacy Policy or wish to exercise your rights, please contact us at:
                </p>
                <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-6 mt-4">
                  <p className="text-slate-700 dark:text-slate-300 font-medium">CoreOrbit Software Inc.</p>
                  <p className="text-slate-600 dark:text-slate-400 mt-2">
                    Email: <a href="mailto:privacy@coreorbitsoftware.com" className="text-blue-600 hover:underline">privacy@coreorbitsoftware.com</a>
                  </p>
                </div>
              </section>

            </div>
          </div>

          {/* Related Links */}
          <div className="mt-8 flex flex-wrap gap-4 justify-center">
            <Link href="/terms-of-service" className="text-blue-600 dark:text-blue-400 hover:underline text-sm">
              Terms of Service →
            </Link>
            <Link href="/cookie-policy" className="text-blue-600 dark:text-blue-400 hover:underline text-sm">
              Cookie Policy →
            </Link>
          </div>
        </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

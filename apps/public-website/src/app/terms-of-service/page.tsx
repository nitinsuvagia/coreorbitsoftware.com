'use client';

import Link from 'next/link';
import { LandingNavbar } from '@/components/landing/navbar';
import { Footer } from '@/components/landing/footer';
import { Scale, FileText, AlertCircle, Shield, CreditCard, Ban, RefreshCw, Gavel } from 'lucide-react';

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <LandingNavbar />
      
      <section className="relative pt-24 pb-16 md:pt-32 md:pb-24 overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-purple-400/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute top-40 right-10 w-96 h-96 bg-pink-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute bottom-20 left-1/3 w-80 h-80 bg-blue-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:48px_48px]" />
        </div>
        <div className="container mx-auto px-4 relative">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-sm font-medium mb-6">
              <Scale className="w-4 h-4" />
              Legal
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-4">
              Terms of{' '}
              <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Service
              </span>
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              Last updated: February 24, 2026
            </p>
          </div>

          {/* Content */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 md:p-12 shadow-xl border border-slate-200 dark:border-slate-700">
            <div className="prose prose-slate dark:prose-invert max-w-none">
              
              {/* Agreement */}
              <section className="mb-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-purple-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white m-0">Agreement to Terms</h2>
                </div>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  These Terms of Service (&quot;Terms&quot;) constitute a legally binding agreement between you and CoreOrbit Software Inc. 
                  (&quot;CoreOrbit,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) governing your access to and use of our AI-powered HR management platform, 
                  including our website, applications, and related services (collectively, the &quot;Services&quot;).
                </p>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  By accessing or using our Services, you acknowledge that you have read, understood, and agree to be bound by 
                  these Terms. If you do not agree to these Terms, you may not access or use our Services.
                </p>
              </section>

              {/* Eligibility */}
              <section className="mb-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-blue-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white m-0">Eligibility</h2>
                </div>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">To use our Services, you must:</p>
                <ul className="list-disc pl-6 text-slate-600 dark:text-slate-400 space-y-2">
                  <li>Be at least 18 years of age</li>
                  <li>Have the legal authority to enter into binding contracts</li>
                  <li>Not be prohibited from using the Services under applicable law</li>
                  <li>If using on behalf of an organization, have authority to bind that organization to these Terms</li>
                </ul>
              </section>

              {/* Account Registration */}
              <section className="mb-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white m-0">Account Registration & Security</h2>
                </div>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">When you create an account, you agree to:</p>
                <ul className="list-disc pl-6 text-slate-600 dark:text-slate-400 space-y-2">
                  <li>Provide accurate, current, and complete information</li>
                  <li>Maintain and promptly update your account information</li>
                  <li>Keep your password secure and confidential</li>
                  <li>Accept responsibility for all activities under your account</li>
                  <li>Notify us immediately of any unauthorized access</li>
                </ul>
              </section>

              {/* Subscription & Payment */}
              <section className="mb-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-orange-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white m-0">Subscription & Payment</h2>
                </div>
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mt-6 mb-3">Billing</h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  Paid subscriptions are billed in advance on a monthly or annual basis. You authorize us to charge 
                  your payment method for all fees incurred. All fees are non-refundable except as expressly stated.
                </p>
                
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mt-6 mb-3">Free Trial</h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  We may offer a free trial period. At the end of the trial, your account will automatically convert 
                  to a paid subscription unless you cancel before the trial ends.
                </p>

                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mt-6 mb-3">Price Changes</h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  We reserve the right to modify our pricing. We will provide at least 30 days&apos; notice before 
                  any price increase takes effect.
                </p>
              </section>

              {/* Prohibited Uses */}
              <section className="mb-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                    <Ban className="w-5 h-5 text-red-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white m-0">Prohibited Uses</h2>
                </div>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">You agree not to:</p>
                <ul className="list-disc pl-6 text-slate-600 dark:text-slate-400 space-y-2">
                  <li>Use the Services for any illegal or unauthorized purpose</li>
                  <li>Violate any applicable laws, regulations, or third-party rights</li>
                  <li>Attempt to gain unauthorized access to our systems</li>
                  <li>Interfere with or disrupt the Services or servers</li>
                  <li>Reverse engineer, decompile, or disassemble any part of the Services</li>
                  <li>Use automated systems to access the Services without permission</li>
                  <li>Transmit viruses, malware, or other harmful code</li>
                  <li>Collect user information without consent</li>
                </ul>
              </section>

              {/* Termination */}
              <section className="mb-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                    <RefreshCw className="w-5 h-5 text-indigo-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white m-0">Termination</h2>
                </div>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  You may terminate your account at any time by contacting us or using the account settings.
                  We may suspend or terminate your access if you violate these Terms or for any other reason 
                  with or without notice.
                </p>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed mt-4">
                  Upon termination, your right to use the Services will immediately cease. We may retain 
                  certain information as required by law or for legitimate business purposes.
                </p>
              </section>

              {/* Limitation of Liability */}
              <section className="mb-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center">
                    <Gavel className="w-5 h-5 text-pink-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white m-0">Limitation of Liability</h2>
                </div>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  TO THE MAXIMUM EXTENT PERMITTED BY LAW, COREORBIT SHALL NOT BE LIABLE FOR ANY INDIRECT, 
                  INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO 
                  LOSS OF PROFITS, DATA, OR GOODWILL.
                </p>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed mt-4">
                  Our total liability for any claims arising from these Terms or your use of the Services 
                  shall not exceed the amount you paid us in the twelve (12) months preceding the claim.
                </p>
              </section>

              {/* Governing Law */}
              <section className="mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                    <Scale className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white m-0">Governing Law</h2>
                </div>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  These Terms shall be governed by and construed in accordance with the laws of the State of 
                  Texas, without regard to its conflict of law provisions. Any disputes shall be resolved 
                  in the state or federal courts located in Dallas County, Texas.
                </p>
              </section>

            </div>
          </div>

          {/* Related Links */}
          <div className="mt-8 flex flex-wrap gap-4 justify-center">
            <Link href="/privacy-policy" className="text-purple-600 dark:text-purple-400 hover:underline text-sm">
              Privacy Policy →
            </Link>
            <Link href="/cookie-policy" className="text-purple-600 dark:text-purple-400 hover:underline text-sm">
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

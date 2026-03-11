'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { LandingNavbar } from '@/components/landing/navbar';
import { Footer } from '@/components/landing/footer';
import { siteConfig } from '@/lib/site-config';
import { 
  Rocket, 
  FileText, 
  CheckSquare, 
  Users, 
  Sparkles, 
  ArrowRight,
  Clock,
  Shield,
  Smartphone,
  PenTool,
  FolderOpen,
  Send
} from 'lucide-react';

const features = [
  {
    icon: FileText,
    title: 'Digital Document Collection',
    description: 'Collect all required documents digitally. New hires can upload IDs, tax forms, and certifications from any device.'
  },
  {
    icon: PenTool,
    title: 'E-Signature Integration',
    description: 'Get offer letters, contracts, and policies signed electronically. Legally binding and fully compliant.'
  },
  {
    icon: CheckSquare,
    title: 'Automated Task Checklists',
    description: 'Create customized onboarding checklists that guide new hires and managers through every step.'
  },
  {
    icon: Users,
    title: 'Welcome Portal',
    description: 'Branded welcome experience with company info, team introductions, and first-day instructions.'
  },
  {
    icon: FolderOpen,
    title: 'Training Management',
    description: 'Assign required training modules and track completion. Integrate with your LMS or use our built-in system.'
  },
  {
    icon: Send,
    title: 'Automated Workflows',
    description: 'Trigger emails, tasks, and approvals automatically based on start dates and milestones.'
  }
];

const stats = [
  { metric: '50%', label: 'Less paperwork' },
  { metric: '2x', label: 'Faster time to productivity' },
  { metric: '95%', label: 'New hire satisfaction' },
  { metric: '80%', label: 'HR time savings' }
];

export default function DigitalOnboardingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <LandingNavbar />
      
      {/* Hero Section */}
      <section className="relative pt-24 pb-16 md:pt-32 md:pb-24 overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-green-400/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute top-40 right-10 w-96 h-96 bg-teal-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute bottom-20 left-1/3 w-80 h-80 bg-blue-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:48px_48px]" />
        </div>
        <div className="container mx-auto px-4 relative">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-sm font-medium mb-6">
              <Rocket className="w-4 h-4" />
              Streamlined Onboarding
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 dark:text-white mb-6">
              Digital{' '}
              <span className="bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent">
                Onboarding
              </span>{' '}
              Made Simple
            </h1>
            <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 mb-8 max-w-2xl mx-auto">
              Transform new hire experiences with paperless onboarding. Automate tasks, collect documents, 
              and get employees productive from day one.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/schedule-demo">
                <Button size="lg" className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white shadow-lg">
                  Schedule a Demo
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link href={siteConfig.signupUrl}>
                <Button size="lg" variant="outline">
                  Start Trail
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-white/50 dark:bg-slate-800/50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent mb-2">
                  {stat.metric}
                </div>
                <div className="text-slate-600 dark:text-slate-400 text-sm">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">
              Complete Onboarding Solution
            </h2>
            <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              Everything you need to create a seamless, memorable onboarding experience for every new hire.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-slate-200 dark:border-slate-700 hover:shadow-xl transition-shadow"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-teal-500 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">{feature.title}</h3>
                <p className="text-slate-600 dark:text-slate-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline Section */}
      <section className="py-16 md:py-24 bg-slate-900 text-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">The Onboarding Journey</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              A structured approach to getting new hires up to speed quickly and effectively.
            </p>
          </div>
          <div className="max-w-4xl mx-auto">
            <div className="space-y-8">
              {[
                { phase: 'Pre-boarding', time: 'Before Day 1', items: ['Send welcome email', 'Collect documents', 'Complete paperwork', 'Set up accounts'] },
                { phase: 'First Day', time: 'Day 1', items: ['Welcome orientation', 'Team introductions', 'Equipment setup', 'First assignments'] },
                { phase: 'First Week', time: 'Days 2-7', items: ['Role training', 'System access', 'Policy review', 'Mentor pairing'] },
                { phase: 'First Month', time: 'Days 8-30', items: ['Goals setting', 'Check-in meetings', 'Feedback collection', 'Performance baseline'] }
              ].map((stage, index) => (
                <div key={index} className="flex gap-6">
                  <div className="w-32 shrink-0">
                    <div className="text-green-400 font-semibold">{stage.phase}</div>
                    <div className="text-slate-500 text-sm">{stage.time}</div>
                  </div>
                  <div className="flex-1 bg-slate-800 rounded-xl p-4">
                    <div className="grid grid-cols-2 gap-2">
                      {stage.items.map((item, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm text-slate-300">
                          <CheckSquare className="w-4 h-4 text-green-400" />
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="bg-gradient-to-br from-green-600 to-teal-600 rounded-3xl p-8 md:p-12 text-center text-white">
            <Sparkles className="w-12 h-12 mx-auto mb-6 text-yellow-300" />
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Start Onboarding Smarter Today</h2>
            <p className="text-white/80 max-w-2xl mx-auto mb-8">
              Create memorable first impressions and get new hires productive faster with digital onboarding.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/schedule-demo">
                <Button size="lg" className="bg-white text-green-600 hover:bg-white/90">
                  Schedule a Demo
                </Button>
              </Link>
              <Link href="/contact">
                <Button size="lg" variant="outline" className="bg-transparent border-white text-white hover:bg-white/10">
                  Contact Sales
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

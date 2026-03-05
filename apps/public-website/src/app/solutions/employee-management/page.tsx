'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { LandingNavbar } from '@/components/landing/navbar';
import { Footer } from '@/components/landing/footer';
import { 
  Users, 
  UserCircle, 
  Building2, 
  Sparkles, 
  ArrowRight,
  FileText,
  Award,
  TrendingUp,
  Settings,
  Network,
  History
} from 'lucide-react';

const features = [
  {
    icon: UserCircle,
    title: 'Employee Profiles',
    description: 'Comprehensive digital profiles with contact info, job history, skills, certifications, and emergency contacts all in one place.'
  },
  {
    icon: Building2,
    title: 'Org Chart Visualization',
    description: 'Interactive organizational charts that update automatically as your team grows and changes.'
  },
  {
    icon: FileText,
    title: 'Document Management',
    description: 'Store and organize employee documents securely. Set retention policies and access permissions.'
  },
  {
    icon: Award,
    title: 'Performance Reviews',
    description: 'Conduct 360° reviews, set goals, and track performance with customizable review cycles.'
  },
  {
    icon: TrendingUp,
    title: 'Career Development',
    description: 'Track skills, certifications, and career paths. Identify growth opportunities and training needs.'
  },
  {
    icon: History,
    title: 'Employment History',
    description: 'Complete audit trail of promotions, transfers, compensation changes, and role transitions.'
  }
];

const stats = [
  { metric: '100%', label: 'Data centralization' },
  { metric: '40%', label: 'Admin time saved' },
  { metric: '99.9%', label: 'Data accuracy' },
  { metric: '24/7', label: 'Self-service access' }
];

export default function EmployeeManagementPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <LandingNavbar />
      
      {/* Hero Section */}
      <section className="pt-24 pb-16 md:pt-32 md:pb-24">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium mb-6">
              <Users className="w-4 h-4" />
              Core HR
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 dark:text-white mb-6">
              Complete{' '}
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Employee Management
              </span>
            </h1>
            <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 mb-8 max-w-2xl mx-auto">
              Centralize all employee data, streamline HR processes, and empower your workforce with 
              self-service tools and comprehensive people management.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/schedule-demo">
                <Button size="lg" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg">
                  Schedule a Demo
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link href="http://portal.coreorbitsoftware.com/signup">
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
                <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
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
              Everything You Need to Manage Your Team
            </h2>
            <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              A modern employee management system that grows with your organization.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-slate-200 dark:border-slate-700 hover:shadow-xl transition-shadow"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">{feature.title}</h3>
                <p className="text-slate-600 dark:text-slate-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Self-Service Section */}
      <section className="py-16 md:py-24 bg-slate-900 text-white">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">Employee Self-Service Portal</h2>
              <p className="text-slate-400 mb-6">
                Empower employees to manage their own information, reducing HR workload and improving data accuracy.
              </p>
              <ul className="space-y-4">
                {[
                  'Update personal information and emergency contacts',
                  'View and download pay stubs and tax documents',
                  'Request time off and view leave balances',
                  'Access company policies and handbooks',
                  'View org chart and team directory',
                  'Submit expense reports and reimbursements'
                ].map((item, index) => (
                  <li key={index} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                      <Settings className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-slate-300">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-slate-800 rounded-2xl p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
                  <UserCircle className="w-8 h-8 text-white" />
                </div>
                <div>
                  <div className="font-semibold text-lg">Employee Dashboard</div>
                  <div className="text-slate-400 text-sm">Everything in one place</div>
                </div>
              </div>
              <div className="space-y-3">
                {['Profile', 'Documents', 'Time Off', 'Benefits', 'Payroll'].map((item, index) => (
                  <div key={index} className="flex items-center justify-between bg-slate-700/50 rounded-lg px-4 py-3">
                    <span>{item}</span>
                    <ArrowRight className="w-4 h-4 text-slate-400" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-3xl p-8 md:p-12 text-center text-white">
            <Sparkles className="w-12 h-12 mx-auto mb-6 text-yellow-300" />
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Simplify Your Employee Management</h2>
            <p className="text-white/80 max-w-2xl mx-auto mb-8">
              Join thousands of companies using CoreOrbit to manage their workforce efficiently.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/schedule-demo">
                <Button size="lg" className="bg-white text-blue-600 hover:bg-white/90">
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

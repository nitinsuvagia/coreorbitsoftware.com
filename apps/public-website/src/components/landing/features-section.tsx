'use client';

import { 
  Users, 
  Calendar, 
  FolderOpen, 
  ClipboardList, 
  Briefcase, 
  BarChart3,
  Clock,
  UserPlus,
  Building,
  Shield,
  Zap,
  Globe,
  Brain,
  Video,
  FileCheck,
  Star,
  UserCircle,
  PieChart
} from 'lucide-react';
import { DashboardIllustration, TeamCollaborationIllustration, SecurityIllustration } from './illustrations';

const features = [
  {
    icon: Brain,
    title: 'AI Powered Job Creating',
    description: 'Create compelling job descriptions instantly with AI. Generate requirements, responsibilities, and qualifications automatically.',
    color: 'from-purple-500 to-violet-500',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
  },
  {
    icon: Video,
    title: 'Fully Interview Process',
    description: 'End-to-end interview management with scheduling, video interviews, scorecards, and collaborative feedback.',
    color: 'from-blue-500 to-cyan-500',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
  },
  {
    icon: FileCheck,
    title: 'Online Test & Result',
    description: 'Create custom assessments, conduct online tests, and get instant AI-powered result analysis and candidate ranking.',
    color: 'from-green-500 to-emerald-500',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
  },
  {
    icon: UserPlus,
    title: 'Digital Onboarding Process',
    description: 'Streamlined paperless onboarding with document collection, task checklists, and automated workflows.',
    color: 'from-pink-500 to-rose-500',
    bgColor: 'bg-pink-50 dark:bg-pink-900/20',
  },
  {
    icon: Users,
    title: 'Employee Management',
    description: 'Complete employee lifecycle management with profiles, departments, reporting structures, and role management.',
    color: 'from-indigo-500 to-blue-500',
    bgColor: 'bg-indigo-50 dark:bg-indigo-900/20',
  },
  {
    icon: Clock,
    title: 'Attendance & Leaves',
    description: 'Smart check-in/out, leave requests and approvals, overtime tracking, and team availability calendar.',
    color: 'from-teal-500 to-cyan-500',
    bgColor: 'bg-teal-50 dark:bg-teal-900/20',
  },
  {
    icon: FolderOpen,
    title: 'Digital Document Library',
    description: 'Secure centralized document storage with version control, folder organization, and access permissions.',
    color: 'from-orange-500 to-amber-500',
    bgColor: 'bg-orange-50 dark:bg-orange-900/20',
  },
  {
    icon: Calendar,
    title: 'Holidays Management',
    description: 'Configure company holidays, regional calendars, and automatic leave adjustments for your organization.',
    color: 'from-red-500 to-orange-500',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
  },
  {
    icon: Star,
    title: 'Employee Review System',
    description: 'Comprehensive performance reviews with 360° feedback, goal tracking, and development plans.',
    color: 'from-yellow-500 to-orange-500',
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
  },
  {
    icon: Building,
    title: 'Organization 360° Dashboard',
    description: 'Bird\'s eye view of your entire organization with real-time metrics, trends, and actionable insights.',
    color: 'from-slate-500 to-gray-600',
    bgColor: 'bg-slate-100 dark:bg-slate-800/50',
  },
  {
    icon: PieChart,
    title: 'HR 360° Dashboard',
    description: 'Dedicated HR analytics with recruitment pipeline, headcount trends, attrition rates, and workforce planning.',
    color: 'from-fuchsia-500 to-pink-500',
    bgColor: 'bg-fuchsia-50 dark:bg-fuchsia-900/20',
  },
  {
    icon: UserCircle,
    title: 'Employee 360° Overview',
    description: 'Complete employee profile view with attendance, leaves, documents, reviews, and career progression.',
    color: 'from-cyan-500 to-blue-500',
    bgColor: 'bg-cyan-50 dark:bg-cyan-900/20',
  },
];

const highlights = [
  {
    icon: Shield,
    title: 'Enterprise Security',
    description: 'Bank-level encryption, SSO, role-based access control, and audit logs.',
  },
  {
    icon: Zap,
    title: 'Lightning Fast',
    description: 'Optimized performance with instant page loads and real-time updates.',
  },
  {
    icon: Globe,
    title: 'Multi-tenant',
    description: 'Perfect for agencies managing multiple client organizations.',
  },
  {
    icon: Building,
    title: 'Scalable',
    description: 'From startups to enterprises, scales with your growing team.',
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-20 md:py-32 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-white via-slate-50 to-white dark:from-slate-900 dark:via-slate-800/50 dark:to-slate-900" />
      
      <div className="container mx-auto px-4 relative">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-block px-4 py-2 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium mb-4">
            Powerful Features
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white mb-6">
            Everything you need to{' '}
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              manage your office
            </span>
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            A complete suite of tools designed to streamline operations, boost productivity, 
            and create a better workplace experience for everyone.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-20">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="group relative p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className={`w-14 h-14 rounded-xl ${feature.bgColor} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <feature.icon className={`w-7 h-7 bg-gradient-to-r ${feature.color} bg-clip-text`} style={{ color: feature.color.includes('blue') ? '#3B82F6' : feature.color.includes('green') ? '#10B981' : feature.color.includes('purple') ? '#8B5CF6' : feature.color.includes('orange') ? '#F59E0B' : feature.color.includes('pink') ? '#EC4899' : feature.color.includes('teal') ? '#14B8A6' : feature.color.includes('indigo') ? '#6366F1' : '#EF4444' }} />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* Showcase Section */}
        <div className="grid lg:grid-cols-2 gap-12 items-center mb-20">
          <div>
            <span className="inline-block px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-sm font-medium mb-4">
              Dashboard
            </span>
            <h3 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-4">
              360° Organization Dashboard
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              Get a complete view of your organization with real-time dashboards. 
              Track HR metrics, employee performance, recruitment pipeline, and make data-driven decisions.
            </p>
            <ul className="space-y-3">
              {['Real-time workforce analytics', 'Recruitment pipeline tracking', 'Attendance & leave insights', 'Performance trend analysis'].map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-slate-700 dark:text-slate-300">{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="relative">
            <DashboardIllustration />
          </div>
        </div>

        {/* Team Collaboration */}
        <div className="grid lg:grid-cols-2 gap-12 items-center mb-20">
          <div className="order-2 lg:order-1">
            <TeamCollaborationIllustration />
          </div>
          <div className="order-1 lg:order-2">
            <span className="inline-block px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-sm font-medium mb-4">
              Recruitment
            </span>
            <h3 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-4">
              AI-Powered Hiring Process
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              From job creation to onboarding, streamline your entire recruitment process 
              with AI-powered tools that save time and find the best candidates.
            </p>
            <ul className="space-y-3">
              {['AI job description generator', 'Automated candidate screening', 'Online assessments & tests', 'Digital onboarding workflows'].map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-slate-700 dark:text-slate-300">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Highlights Strip */}
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-3xl p-8 md:p-12">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {highlights.map((highlight, index) => (
              <div key={highlight.title} className="text-center">
                <div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-4">
                  <highlight.icon className="w-7 h-7 text-white" />
                </div>
                <h4 className="text-lg font-semibold text-white mb-2">{highlight.title}</h4>
                <p className="text-sm text-white/80">{highlight.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

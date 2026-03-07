'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { LandingNavbar } from '@/components/landing/navbar';
import { Footer } from '@/components/landing/footer';
import { siteConfig } from '@/lib/site-config';
import { 
  LayoutDashboard, 
  Building2, 
  UserCircle, 
  Users,
  Sparkles, 
  ArrowRight,
  BarChart3,
  PieChart,
  TrendingUp,
  Target,
  Eye,
  Layers
} from 'lucide-react';

const dashboards = [
  {
    icon: Building2,
    title: 'Organization Dashboard',
    description: 'Bird\'s eye view of your entire organization with real-time metrics on headcount, hiring, attrition, and company health.',
    color: 'from-blue-500 to-indigo-500',
    metrics: ['Total Headcount', 'Hiring Velocity', 'Attrition Rate', 'Dept. Distribution']
  },
  {
    icon: UserCircle,
    title: 'HR Dashboard',
    description: 'Comprehensive HR analytics including recruitment funnels, onboarding status, compliance tracking, and workforce planning.',
    color: 'from-purple-500 to-pink-500',
    metrics: ['Open Positions', 'Time to Hire', 'Onboarding Status', 'Compliance Score']
  },
  {
    icon: Users,
    title: 'Employee 360° Dashboard',
    description: 'Individual employee insights showing performance, attendance, growth trajectory, and engagement scores.',
    color: 'from-green-500 to-teal-500',
    metrics: ['Performance Score', 'Attendance Rate', 'Training Progress', 'Goals Achieved']
  }
];

const features = [
  {
    icon: BarChart3,
    title: 'Real-Time Analytics',
    description: 'Live data updates ensure you always have the most current information for decision-making.'
  },
  {
    icon: PieChart,
    title: 'Customizable Widgets',
    description: 'Drag-and-drop widgets to create personalized dashboard views for different stakeholders.'
  },
  {
    icon: TrendingUp,
    title: 'Trend Analysis',
    description: 'Historical data visualization to identify patterns and forecast future workforce needs.'
  },
  {
    icon: Target,
    title: 'KPI Tracking',
    description: 'Set and monitor key performance indicators with automated alerts and goal tracking.'
  },
  {
    icon: Eye,
    title: 'Role-Based Views',
    description: 'Show relevant data based on user roles - executive, manager, or individual contributor.'
  },
  {
    icon: Layers,
    title: 'Drill-Down Reports',
    description: 'Click into any metric to explore underlying data with multi-level drill-down capabilities.'
  }
];

const stats = [
  { metric: '50+', label: 'Custom metrics' },
  { metric: '3', label: 'Dashboard types' },
  { metric: 'Real-time', label: 'Data updates' },
  { metric: '100%', label: 'Customizable' }
];

export default function DashboardsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <LandingNavbar />
      
      {/* Hero Section */}
      <section className="pt-24 pb-16 md:pt-32 md:pb-24">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-sm font-medium mb-6">
              <LayoutDashboard className="w-4 h-4" />
              Analytics & Insights
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 dark:text-white mb-6">
              360°{' '}
              <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                Dashboards
              </span>{' '}
              for Complete Visibility
            </h1>
            <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 mb-8 max-w-2xl mx-auto">
              Get actionable insights at every level - organization, HR, and individual employees. 
              Make data-driven decisions with real-time analytics and customizable dashboards.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/schedule-demo">
                <Button size="lg" className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-lg">
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
                <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent mb-2">
                  {stat.metric}
                </div>
                <div className="text-slate-600 dark:text-slate-400 text-sm">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Three Dashboards Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">
              Three Powerful Dashboard Views
            </h2>
            <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              Purpose-built dashboards for different levels of your organization.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {dashboards.map((dashboard, index) => (
              <div 
                key={index}
                className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-lg border border-slate-200 dark:border-slate-700 hover:shadow-xl transition-shadow"
              >
                <div className={`h-2 bg-gradient-to-r ${dashboard.color}`} />
                <div className="p-6">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${dashboard.color} flex items-center justify-center mb-4`}>
                    <dashboard.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">{dashboard.title}</h3>
                  <p className="text-slate-600 dark:text-slate-400 mb-4">{dashboard.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {dashboard.metrics.map((metric, i) => (
                      <span key={i} className="text-xs bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-full text-slate-600 dark:text-slate-300">
                        {metric}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 md:py-24 bg-slate-900 text-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Dashboard Capabilities</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Powerful features that make CoreOrbit dashboards the most comprehensive in the industry.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div key={index} className="bg-slate-800 rounded-xl p-6 hover:bg-slate-700/50 transition-colors">
                <feature.icon className="w-8 h-8 text-indigo-400 mb-4" />
                <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-slate-400 text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sample Metrics */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">
                Metrics That Matter
              </h2>
              <p className="text-slate-600 dark:text-slate-400">
                Track the KPIs that drive your organization forward.
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                'Headcount Trends', 'Turnover Rate', 'Cost per Hire', 'Time to Fill',
                'Offer Acceptance', 'Training Hours', 'Engagement Score', 'Diversity Metrics',
                'Overtime Hours', 'Absenteeism', 'Performance Ratings', 'Promotion Rate'
              ].map((metric, index) => (
                <div key={index} className="bg-white dark:bg-slate-800 rounded-lg p-4 text-center border border-slate-200 dark:border-slate-700">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{metric}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="bg-gradient-to-br from-indigo-600 to-violet-600 rounded-3xl p-8 md:p-12 text-center text-white">
            <Sparkles className="w-12 h-12 mx-auto mb-6 text-yellow-300" />
            <h2 className="text-3xl md:text-4xl font-bold mb-4">See Your Data Come to Life</h2>
            <p className="text-white/80 max-w-2xl mx-auto mb-8">
              Transform raw HR data into actionable insights with CoreOrbit dashboards.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/schedule-demo">
                <Button size="lg" className="bg-white text-indigo-600 hover:bg-white/90">
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

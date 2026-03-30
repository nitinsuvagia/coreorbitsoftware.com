'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Check, Sparkles, Zap, Loader2, Users, HardDrive, FolderKanban, Building2 } from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.coreorbitsoftware.com';

import { siteConfig } from '@/lib/site-config';

const SIGNUP_URL = siteConfig.signupUrl;

interface PlanFeatures {
  customDomain: boolean;
  ssoEnabled: boolean;
  advancedReports: boolean;
  apiAccess: boolean;
  prioritySupport: boolean;
  whiteLabel: boolean;
}

interface SubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  tier: 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE' | 'CUSTOM';
  description?: string;
  monthlyPrice: number;
  yearlyPrice: number;
  currency: string;
  maxUsers: number;
  maxStorageGB: number;
  maxProjects?: number;
  maxClients?: number;
  features: PlanFeatures;
}

// Fallback static plans if API fails
const fallbackPlans: SubscriptionPlan[] = [
  {
    id: 'starter',
    name: 'Starter',
    slug: 'starter',
    tier: 'STARTER',
    description: 'Essential HR tools for small teams',
    monthlyPrice: 0,
    yearlyPrice: 0,
    currency: 'USD',
    maxUsers: 10,
    maxStorageGB: 1,
    maxProjects: 5,
    features: {
      customDomain: false,
      ssoEnabled: false,
      advancedReports: false,
      apiAccess: false,
      prioritySupport: false,
      whiteLabel: false,
    },
  },
  {
    id: 'professional',
    name: 'Professional',
    slug: 'professional',
    tier: 'PROFESSIONAL',
    description: 'AI recruitment & complete HR management',
    monthlyPrice: 29,
    yearlyPrice: 290,
    currency: 'USD',
    maxUsers: -1,
    maxStorageGB: 50,
    maxProjects: -1,
    features: {
      customDomain: true,
      ssoEnabled: false,
      advancedReports: true,
      apiAccess: true,
      prioritySupport: true,
      whiteLabel: false,
    },
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    slug: 'enterprise',
    tier: 'ENTERPRISE',
    description: 'Full platform with 360° dashboards & assessments',
    monthlyPrice: 99,
    yearlyPrice: 990,
    currency: 'USD',
    maxUsers: -1,
    maxStorageGB: -1,
    maxProjects: -1,
    features: {
      customDomain: true,
      ssoEnabled: true,
      advancedReports: true,
      apiAccess: true,
      prioritySupport: true,
      whiteLabel: true,
    },
  },
];

// Helper to format unlimited values
const formatLimit = (value: number | undefined, unit: string = '') => {
  if (value === undefined || value === null) return 'N/A';
  if (value === -1) return 'Unlimited';
  return `${value}${unit ? ' ' + unit : ''}`;
};

// Helper to format price
const formatPrice = (price: number, currency: string) => {
  if (price === 0) return 'Free';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
};

// Convert plan features to display list
const getFeaturesList = (plan: SubscriptionPlan): string[] => {
  const features: string[] = [];
  
  // Add limits as features
  features.push(plan.maxUsers === -1 ? 'Unlimited employees' : `Up to ${plan.maxUsers} employees`);
  features.push(plan.maxStorageGB === -1 ? 'Unlimited storage' : `${plan.maxStorageGB} GB storage`);
  if (plan.maxProjects !== undefined) {
    features.push(plan.maxProjects === -1 ? 'Unlimited projects' : `${plan.maxProjects} projects`);
  }
  
  // Add boolean features
  if (plan.features.customDomain) features.push('Custom domain');
  if (plan.features.ssoEnabled) features.push('SSO / SAML integration');
  if (plan.features.advancedReports) features.push('Advanced analytics & reports');
  if (plan.features.apiAccess) features.push('API access');
  if (plan.features.prioritySupport) features.push('Priority support');
  if (plan.features.whiteLabel) features.push('White-label branding');
  
  // Add tier-specific default features
  if (plan.tier === 'STARTER') {
    features.push('Employee management');
    features.push('Attendance & leaves');
    features.push('Holidays management');
    features.push('Email support');
  } else if (plan.tier === 'PROFESSIONAL') {
    features.push('AI-powered job creation');
    features.push('Full recruitment pipeline');
    features.push('Digital onboarding');
    features.push('Employee 360° dashboard');
    features.push('AI Assistant (100 queries/mo)');
  } else if (plan.tier === 'ENTERPRISE' || plan.tier === 'CUSTOM') {
    features.push('Unlimited AI job creation');
    features.push('Online tests & assessments');
    features.push('Performance review system');
    features.push('Organization & HR 360° dashboards');
    features.push('Dedicated account manager');
  }
  
  return features;
};

export function PricingSection() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  useEffect(() => {
    const extractPlans = (payload: any): SubscriptionPlan[] => {
      if (Array.isArray(payload)) return payload;
      if (payload?.success && Array.isArray(payload?.data)) return payload.data;
      if (Array.isArray(payload?.data)) return payload.data;
      if (Array.isArray(payload?.plans)) return payload.plans;
      if (Array.isArray(payload?.data?.plans)) return payload.data.plans;
      return [];
    };

    const fetchPlans = async () => {
      const endpoints = [
        `${API_BASE_URL}/api/v1/public/pricing-plans`,
        'http://api.coreorbitsoftware.com/api/v1/public/pricing-plans',
        'https://api.coreorbitsoftware.com/api/v1/public/pricing-plans',
      ];

      try {
        for (const endpoint of endpoints) {
          try {
            const response = await fetch(endpoint, {
              method: 'GET',
              headers: { Accept: 'application/json' },
              cache: 'no-store',
            });

            if (!response.ok) continue;

            const data = await response.json();
            const livePlans = extractPlans(data);

            if (livePlans.length > 0) {
              setPlans(livePlans as SubscriptionPlan[]);
              setError(false);
              return;
            }
          } catch {
            continue;
          }
        }
        // All endpoints failed
        setError(true);
      } catch (error) {
        console.error('Failed to fetch pricing plans:', error);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, []);

  // Determine which plan is "popular" (usually Professional tier)
  const getPopularPlan = () => {
    const professional = plans.find(p => p.tier === 'PROFESSIONAL');
    return professional?.id || plans[Math.floor(plans.length / 2)]?.id;
  };

  const popularPlanId = getPopularPlan();

  return (
    <section id="pricing" className="py-20 md:py-32 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-white via-slate-50 to-white dark:from-slate-900 dark:via-slate-800/50 dark:to-slate-900" />

      <div className="container mx-auto px-4 relative">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="inline-block px-4 py-2 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-sm font-medium mb-4">
            Simple Pricing
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white mb-6">
            Choose the plan that{' '}
            <span className="bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent">
              fits your team
            </span>
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            Start free and scale as you grow. All plans include a 14-day free trial with full access.
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-4 mb-12">
          <span className={`text-sm font-medium transition-colors ${billingCycle === 'monthly' ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>
            Monthly
          </span>
          <button
            onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
            className={`relative w-16 h-8 rounded-full transition-colors duration-300 ${
              billingCycle === 'yearly' ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-600'
            }`}
          >
            <span 
              className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-300 ${
                billingCycle === 'yearly' ? 'translate-x-8' : 'translate-x-0'
              }`} 
            />
          </button>
          <span className={`text-sm font-medium transition-colors ${billingCycle === 'yearly' ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>
            Yearly
            <span className="ml-1.5 text-xs text-green-600 font-semibold">Save 20%</span>
          </span>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : error || plans.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="bg-slate-100 dark:bg-slate-800 rounded-full p-4 mb-4">
              <Loader2 className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Pricing Unavailable</h3>
            <p className="text-slate-600 dark:text-slate-400 max-w-md mb-4">
              We're unable to load pricing information at the moment. Please try again later or contact us for details.
            </p>
            <a href="/contact" className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors">
              Contact Us
            </a>
          </div>
        ) : (
          /* Pricing Cards */
          <div className={`grid gap-8 max-w-6xl mx-auto ${
            plans.length === 1 ? 'md:grid-cols-1 max-w-md' :
            plans.length === 2 ? 'md:grid-cols-2 max-w-3xl' :
            plans.length === 4 ? 'md:grid-cols-2 lg:grid-cols-4' :
            'md:grid-cols-2 lg:grid-cols-3'
          }`}>
            {plans.map((plan) => {
              const isPopular = plan.id === popularPlanId;
              const price = billingCycle === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice;
              const features = getFeaturesList(plan);
              const isCustom = plan.tier === 'CUSTOM' || (plan.tier === 'ENTERPRISE' && price === 0);

              return (
                <div
                  key={plan.id}
                  className={`relative p-8 rounded-2xl ${
                    isPopular 
                      ? 'bg-gradient-to-b from-blue-600 to-purple-600 text-white shadow-2xl scale-105 z-10' 
                      : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg'
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-yellow-400 to-orange-400 text-black text-xs font-bold px-4 py-1 rounded-full shadow-lg flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      MOST POPULAR
                    </div>
                  )}

                  <div className="text-center mb-6">
                    <h3 className={`text-xl font-bold mb-2 ${isPopular ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                      {plan.name}
                    </h3>
                    <p className={`text-sm ${isPopular ? 'text-white/80' : 'text-slate-600 dark:text-slate-400'}`}>
                      {plan.description || `${plan.tier.charAt(0) + plan.tier.slice(1).toLowerCase()} tier plan`}
                    </p>
                  </div>

                  <div className="text-center mb-6">
                    {isCustom ? (
                      <>
                        <span className={`text-4xl font-bold ${isPopular ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                          Custom
                        </span>
                        <p className={`text-sm mt-1 ${isPopular ? 'text-white/80' : 'text-slate-500 dark:text-slate-400'}`}>
                          contact us
                        </p>
                      </>
                    ) : (
                      <>
                        <span className={`text-4xl font-bold ${isPopular ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                          {formatPrice(price, plan.currency)}
                        </span>
                        {price > 0 && (
                          <span className={`text-sm ${isPopular ? 'text-white/80' : 'text-slate-600 dark:text-slate-400'}`}>
                            /{billingCycle === 'monthly' ? 'month' : 'year'}
                          </span>
                        )}
                        {price === 0 && (
                          <p className={`text-sm mt-1 ${isPopular ? 'text-white/80' : 'text-slate-500 dark:text-slate-400'}`}>
                            forever
                          </p>
                        )}
                      </>
                    )}
                  </div>

                  {/* Limits summary */}
                  <div className={`grid grid-cols-2 gap-3 mb-6 p-4 rounded-xl ${
                    isPopular ? 'bg-white/10' : 'bg-slate-50 dark:bg-slate-700/50'
                  }`}>
                    <div className="flex items-center gap-2">
                      <Users className={`w-4 h-4 ${isPopular ? 'text-white/70' : 'text-slate-500'}`} />
                      <span className={`text-xs ${isPopular ? 'text-white/90' : 'text-slate-600 dark:text-slate-400'}`}>
                        {formatLimit(plan.maxUsers)} users
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <HardDrive className={`w-4 h-4 ${isPopular ? 'text-white/70' : 'text-slate-500'}`} />
                      <span className={`text-xs ${isPopular ? 'text-white/90' : 'text-slate-600 dark:text-slate-400'}`}>
                        {formatLimit(plan.maxStorageGB, 'GB')}
                      </span>
                    </div>
                    {plan.maxProjects !== undefined && plan.maxProjects !== null && (
                      <div className="flex items-center gap-2">
                        <FolderKanban className={`w-4 h-4 ${isPopular ? 'text-white/70' : 'text-slate-500'}`} />
                        <span className={`text-xs ${isPopular ? 'text-white/90' : 'text-slate-600 dark:text-slate-400'}`}>
                          {formatLimit(plan.maxProjects)} projects
                        </span>
                      </div>
                    )}
                    {plan.maxClients !== undefined && plan.maxClients !== null && (
                      <div className="flex items-center gap-2">
                        <Building2 className={`w-4 h-4 ${isPopular ? 'text-white/70' : 'text-slate-500'}`} />
                        <span className={`text-xs ${isPopular ? 'text-white/90' : 'text-slate-600 dark:text-slate-400'}`}>
                          {formatLimit(plan.maxClients)} clients
                        </span>
                      </div>
                    )}
                  </div>

                  <ul className="space-y-3 mb-8">
                    {features.slice(0, 8).map((feature) => (
                      <li key={feature} className="flex items-start gap-3">
                        <Check className={`w-5 h-5 flex-shrink-0 ${isPopular ? 'text-green-300' : 'text-green-500'}`} />
                        <span className={`text-sm ${isPopular ? 'text-white/90' : 'text-slate-600 dark:text-slate-400'}`}>
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <a href={plan.tier === 'ENTERPRISE' || plan.tier === 'CUSTOM' ? '/contact' : SIGNUP_URL} className="block">
                    <Button 
                      className={`w-full ${
                        isPopular 
                          ? 'bg-white text-blue-600 hover:bg-white/90' 
                          : plan.tier === 'ENTERPRISE' || plan.tier === 'CUSTOM'
                            ? 'bg-purple-600 text-white hover:bg-purple-700'
                            : 'bg-slate-900 dark:bg-slate-700 text-white hover:bg-slate-800'
                      }`}
                      size="lg"
                    >
                      {isPopular && <Sparkles className="mr-2 w-4 h-4" />}
                      {plan.tier === 'STARTER' ? 'Start Free' : 
                       plan.tier === 'ENTERPRISE' || plan.tier === 'CUSTOM' ? 'Contact Sales' : 
                       'Start Trail'}
                    </Button>
                  </a>
                </div>
              );
            })}
          </div>
        )}

        {/* FAQ Link */}
        <div className="text-center mt-12">
          <p className="text-slate-600 dark:text-slate-400">
            Have questions?{' '}
            <a href="#faq" className="text-blue-600 hover:underline font-medium">
              Check our FAQ
            </a>{' '}
            or{' '}
            <a href="/contact" className="text-blue-600 hover:underline font-medium">
              contact us
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}

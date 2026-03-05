'use client';

import { Button } from '@/components/ui/button';
import { AIFeatureIllustration } from './illustrations';
import { 
  Brain, 
  Sparkles, 
  MessageSquare, 
  TrendingUp, 
  Search, 
  FileText,
  Lightbulb,
  Wand2,
  Bot,
  ArrowRight
} from 'lucide-react';

const SIGNUP_URL = 'http://portal.coreorbitsoftware.com/signup';

const aiFeatures = [
  {
    icon: MessageSquare,
    title: 'AI Job Description Generator',
    description: 'Create professional job descriptions instantly. AI generates requirements, responsibilities, and qualifications based on role.',
    example: '"Create a job post for Senior React Developer with 5+ years experience"',
    color: 'purple',
  },
  {
    icon: FileText,
    title: 'Smart Resume Screening',
    description: 'AI automatically screens resumes, extracts key skills, and ranks candidates based on job requirements.',
    example: 'Upload 100 resumes and get ranked shortlist with skill match scores.',
    color: 'blue',
  },
  {
    icon: TrendingUp,
    title: 'Interview Question Generator',
    description: 'Generate role-specific interview questions with AI. Get technical, behavioral, and situational questions instantly.',
    example: '"Generate interview questions for Product Manager role"',
    color: 'green',
  },
  {
    icon: Wand2,
    title: 'Performance Review Assistant',
    description: 'AI helps write meaningful performance reviews with balanced feedback and growth suggestions.',
    example: '"Help me write a review for an employee who exceeded targets but needs communication improvement"',
    color: 'orange',
  },
  {
    icon: Search,
    title: 'Smart Employee Search',
    description: 'Find employees by skills, experience, or availability using natural language queries.',
    example: '"Find all Python developers who are available next week"',
    color: 'pink',
  },
  {
    icon: Lightbulb,
    title: 'HR Insights & Analytics',
    description: 'AI analyzes workforce data to provide actionable insights on retention, productivity, and team dynamics.',
    example: 'Get alerts about potential attrition risks and team performance trends.',
    color: 'cyan',
  },
];

const conversationDemo = [
  {
    type: 'user',
    message: 'Create a job description for Full Stack Developer',
  },
  {
    type: 'ai',
    message: 'I\'ve created a job post for Full Stack Developer:\n\n• 5+ years experience required\n• React, Node.js, PostgreSQL\n• 12 key responsibilities added\n\nWant me to add specific requirements?',
  },
  {
    type: 'user',
    message: 'Show pending leave requests for this week',
  },
  {
    type: 'ai',
    message: 'Found 4 pending leave requests:\n\n• John Smith - Feb 25-26 (Personal)\n• Sarah Johnson - Feb 27 (Medical)\n• Mike Chen - Feb 28-Mar 1\n\nShould I approve any of these?',
  },
];

export function AIFeaturesSection() {
  return (
    <section id="ai-features" className="py-20 md:py-32 relative overflow-hidden bg-gradient-to-b from-slate-50 via-white to-slate-50 dark:from-slate-800/50 dark:via-slate-900 dark:to-slate-800/50">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-0 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 mb-4">
            <Sparkles className="w-4 h-4 text-purple-600" />
            <span className="text-purple-700 dark:text-purple-300 text-sm font-medium">
              Powered by Advanced AI
            </span>
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white mb-6">
            Your AI-Powered{' '}
            <span className="bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 bg-clip-text text-transparent">
              Office Assistant
            </span>
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            Harness the power of artificial intelligence to automate mundane tasks, 
            gain deeper insights, and make smarter decisions for your organization.
          </p>
        </div>

        {/* AI Chat Demo */}
        <div className="grid lg:grid-cols-2 gap-12 items-center mb-20">
          {/* Chat Interface */}
          <div className="relative">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              {/* Chat Header */}
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">CoreOrbit AI</h4>
                    <p className="text-xs text-white/80">Always ready to help</p>
                  </div>
                  <div className="ml-auto flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    <span className="text-xs text-white/80">Online</span>
                  </div>
                </div>
              </div>

              {/* Chat Messages */}
              <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
                {conversationDemo.map((msg, index) => (
                  <div 
                    key={index} 
                    className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div 
                      className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                        msg.type === 'user' 
                          ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-br-md' 
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-bl-md'
                      }`}
                    >
                      {msg.type === 'ai' && (
                        <div className="flex items-center gap-2 mb-2">
                          <Brain className="w-4 h-4 text-purple-500" />
                          <span className="text-xs font-medium text-purple-500">AI Response</span>
                        </div>
                      )}
                      <p className="text-sm whitespace-pre-line">{msg.message}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Chat Input */}
              <div className="p-4 border-t border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <input 
                    type="text" 
                    placeholder="Ask anything about your office..." 
                    className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <button className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center text-white hover:shadow-lg transition-shadow">
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Floating badges */}
            <div className="absolute -top-4 -right-4 bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1 rounded-full shadow-lg">
              GPT Powered
            </div>
          </div>

          {/* Description */}
          <div>
            <h3 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-4">
              Chat with your data
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              No more complex queries or navigating through endless menus. 
              Just ask in plain English and get instant, accurate answers. 
              Our AI understands context and provides actionable insights.
            </p>
            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800">
                <Brain className="w-6 h-6 text-purple-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-1">
                    Natural Language Processing
                  </h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Understands complex queries and provides human-like responses
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
                <Search className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-1">
                    Context-Aware
                  </h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Remembers conversation history and your preferences
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* AI Features Grid */}
        <div className="mb-16">
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white text-center mb-10">
            AI Capabilities
          </h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {aiFeatures.map((feature, index) => (
              <div
                key={feature.title}
                className="group p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-xl transition-all duration-300"
              >
                <div className={`w-12 h-12 rounded-xl bg-${feature.color}-100 dark:bg-${feature.color}-900/30 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <feature.icon className={`w-6 h-6 text-${feature.color}-600`} style={{ color: feature.color === 'blue' ? '#3B82F6' : feature.color === 'purple' ? '#8B5CF6' : feature.color === 'green' ? '#10B981' : feature.color === 'orange' ? '#F59E0B' : feature.color === 'pink' ? '#EC4899' : '#06B6D4' }} />
                </div>
                <h4 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                  {feature.title}
                </h4>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                  {feature.description}
                </p>
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                  <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                    {feature.example}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <a href={SIGNUP_URL}>
            <Button 
              size="lg" 
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-xl hover:shadow-2xl transition-all group"
            >
              <Sparkles className="mr-2 w-5 h-5" />
              Signup
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </a>
        </div>
      </div>
    </section>
  );
}

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize2, Minimize2, RotateCcw, ArrowRight } from 'lucide-react';
import { 
  Users, BarChart3, Calendar, MessageSquare,
  CheckCircle2, Bell, FileText, Sparkles,
  Clock, TrendingUp, FolderOpen, Settings,
  UserPlus, ClipboardList, Brain, Bot,
  RefreshCw, Filter, Download, Zap,
  Briefcase, CalendarDays, PartyPopper, UserCheck,
  AlertCircle, Timer, Building2, Layers, Award, Cake,
  Activity, Hourglass, TrendingDown, UserMinus,
  GraduationCap, XCircle
} from 'lucide-react';

// Demo screens data
const demoScreens = [
  {
    id: 'dashboard',
    title: 'HR 360 Dashboard',
    duration: 12000, // Longer for scroll animation
  },
  {
    id: 'job-create',
    title: 'Create Job Description',
    duration: 10000,
  },
  {
    id: 'attendance',
    title: 'Attendance & Leaves',
    duration: 3500,
  },
  {
    id: 'ai-assistant',
    title: 'AI Job Creator',
    duration: 4000,
  },
  {
    id: 'projects',
    title: 'Recruitment Pipeline',
    duration: 3500,
  },
];

// Dashboard Screen Component with full HR 360 content and auto-scroll
function DashboardScreen({ isActive, onScrollComplete }: { isActive: boolean; onScrollComplete?: () => void }) {
  const [animationStep, setAnimationStep] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasCompletedRef = useRef(false);

  useEffect(() => {
    if (isActive) {
      setAnimationStep(0);
      hasCompletedRef.current = false;
      const timers = [
        setTimeout(() => setAnimationStep(1), 200),
        setTimeout(() => setAnimationStep(2), 400),
        setTimeout(() => setAnimationStep(3), 600),
        setTimeout(() => setAnimationStep(4), 800),
        setTimeout(() => setAnimationStep(5), 1000),
        setTimeout(() => setAnimationStep(6), 1200),
        setTimeout(() => setAnimationStep(7), 1400),
        setTimeout(() => setAnimationStep(8), 1600),
      ];
      return () => timers.forEach(clearTimeout);
    }
  }, [isActive]);

  // Auto-scroll effect
  useEffect(() => {
    if (!isActive || animationStep < 8 || !scrollRef.current) return;
    
    const container = scrollRef.current;
    const scrollHeight = container.scrollHeight - container.clientHeight;
    
    if (scrollHeight <= 0) {
      // No scroll needed, trigger complete after delay
      const timer = setTimeout(() => {
        if (!hasCompletedRef.current) {
          hasCompletedRef.current = true;
          onScrollComplete?.();
        }
      }, 2500);
      return () => clearTimeout(timer);
    }

    // Start scrolling after a brief pause
    const startDelay = setTimeout(() => {
      const scrollDuration = 5000; // 5 seconds to scroll
      const startTime = Date.now();
      
      const animateScroll = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / scrollDuration, 1);
        // Easing function for smooth scroll
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        
        container.scrollTop = easeProgress * scrollHeight;
        
        if (progress < 1) {
          requestAnimationFrame(animateScroll);
        } else {
          // Scroll complete, wait 2.5 seconds then navigate
          setTimeout(() => {
            if (!hasCompletedRef.current) {
              hasCompletedRef.current = true;
              onScrollComplete?.();
            }
          }, 2500);
        }
      };
      
      requestAnimationFrame(animateScroll);
    }, 800);

    return () => clearTimeout(startDelay);
  }, [isActive, animationStep, onScrollComplete]);

  return (
    <div ref={scrollRef} className="h-full bg-slate-50 p-3 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300">
      {/* Header */}
      <div className={`flex items-start justify-between mb-2.5 transition-all duration-500 ${animationStep >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}>
        <div className="flex items-start gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">HR 360°</h3>
            <p className="text-[9px] text-slate-500">Comprehensive HR operations view</p>
          </div>
        </div>
        <div className="flex items-center gap-1 text-[8px]">
          {[{ icon: RefreshCw, label: 'Refresh' }, { icon: Filter, label: 'Filter' }, { icon: Download, label: 'Export' }].map((action) => (
            <span key={action.label} className="px-1.5 py-1 rounded-md border bg-white text-slate-600 flex items-center gap-1">
              <action.icon className="w-2.5 h-2.5" />
              {action.label}
            </span>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className={`bg-white rounded-lg p-2 shadow-sm border mb-2.5 transition-all duration-500 ${animationStep >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <div className="flex items-center gap-1 mb-2">
          <Zap className="w-3 h-3 text-amber-500" />
          <span className="text-[9px] font-semibold text-slate-700">Quick Actions</span>
        </div>
        <div className="grid grid-cols-6 gap-1.5">
          {[
            { icon: UserPlus, label: 'Add', color: 'bg-blue-500' },
            { icon: Briefcase, label: 'Post', color: 'bg-green-500' },
            { icon: Calendar, label: 'Leaves', color: 'bg-orange-500' },
            { icon: CalendarDays, label: 'Interview', color: 'bg-purple-500' },
            { icon: ClipboardList, label: 'Review', color: 'bg-indigo-500' },
            { icon: Bell, label: 'Alerts', color: 'bg-pink-500' },
          ].map((item) => (
            <div key={item.label} className="rounded-md border bg-slate-50 p-1.5 text-center">
              <div className={`w-5 h-5 rounded-md ${item.color} mx-auto mb-1 flex items-center justify-center`}>
                <item.icon className="w-2.5 h-2.5 text-white" />
              </div>
              <p className="text-[7px] text-slate-600 truncate">{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Check In/Out Card */}
      <div className={`bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border p-2 mb-2.5 transition-all duration-500 ${animationStep >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[8px] text-slate-500">Today • 05 Mar 2026</p>
            <p className="text-[10px] font-semibold text-slate-800 flex items-center gap-1">
              <Clock className="w-3 h-3 text-green-600" />
              Checked in at 09:05 AM
            </p>
            <p className="text-[9px] text-blue-600 font-mono">03:24:18 total today</p>
          </div>
          <div className="flex gap-1">
            <span className="text-[8px] px-2 py-1 rounded-md bg-blue-600 text-white">Check In</span>
            <span className="text-[8px] px-2 py-1 rounded-md border bg-white text-slate-600">Check Out</span>
          </div>
        </div>
      </div>

      {/* Today's Overview Row */}
      <div className={`grid grid-cols-3 gap-2 mb-2.5 transition-all duration-500 ${animationStep >= 4 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        {/* Attendance */}
        <div className="bg-white rounded-lg border p-2 shadow-sm">
          <div className="flex items-center gap-1 mb-1.5">
            <CalendarDays className="w-3 h-3 text-blue-500" />
            <span className="text-[9px] font-semibold text-slate-700">Today's Attendance</span>
          </div>
          <div className="grid grid-cols-2 gap-1 text-[8px]">
            <span className="rounded bg-green-50 text-green-700 px-1 py-0.5 flex items-center gap-1">
              <UserCheck className="w-2 h-2" /> 42
            </span>
            <span className="rounded bg-orange-50 text-orange-700 px-1 py-0.5">Leave 4</span>
            <span className="rounded bg-blue-50 text-blue-700 px-1 py-0.5">WFH 6</span>
            <span className="rounded bg-red-50 text-red-700 px-1 py-0.5">Late 3</span>
          </div>
          <div className="mt-1.5">
            <div className="flex justify-between text-[7px] mb-0.5">
              <span className="text-slate-500">Attendance Rate</span>
              <span className="font-semibold">92%</span>
            </div>
            <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 rounded-full" style={{ width: '92%' }} />
            </div>
          </div>
        </div>

        {/* Interviews */}
        <div className="bg-white rounded-lg border p-2 shadow-sm">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1">
              <Briefcase className="w-3 h-3 text-purple-500" />
              <span className="text-[9px] font-semibold text-slate-700">Interviews</span>
            </div>
            <span className="text-[8px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-600">5</span>
          </div>
          <div className="space-y-1 text-[8px]">
            {[
              { name: 'A. Patel', time: '10:30', status: 'Scheduled' },
              { name: 'J. Davis', time: '12:00', status: 'Confirmed' },
              { name: 'M. Roy', time: '03:30', status: 'Scheduled' },
            ].map((i) => (
              <div key={i.name} className="flex items-center justify-between">
                <span className="text-slate-700">{i.name}</span>
                <div className="flex items-center gap-1">
                  <span className="text-slate-500">{i.time}</span>
                  <span className="px-1 py-0.5 rounded bg-slate-100 text-slate-500 text-[7px]">{i.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Celebrations */}
        <div className="bg-white rounded-lg border p-2 shadow-sm">
          <div className="flex items-center gap-1 mb-1.5">
            <PartyPopper className="w-3 h-3 text-pink-500" />
            <span className="text-[9px] font-semibold text-slate-700">Celebrations Today</span>
          </div>
          <div className="space-y-1 text-[8px]">
            <div className="flex items-center gap-1.5 p-1 rounded bg-pink-50">
              <Cake className="w-2.5 h-2.5 text-pink-500" />
              <span className="text-slate-700">Riya Sharma</span>
              <span className="ml-auto">🎂</span>
            </div>
            <div className="flex items-center gap-1.5 p-1 rounded bg-amber-50">
              <Award className="w-2.5 h-2.5 text-amber-500" />
              <span className="text-slate-700">Mark Chen • 2y</span>
              <span className="ml-auto">🏆</span>
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics Row */}
      <div className={`grid grid-cols-4 gap-2 mb-2.5 transition-all duration-500 ${animationStep >= 5 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        {[
          { label: 'Active Employees', value: '52', icon: Users, color: 'bg-blue-500', change: '+3.2%', desc: '58 total' },
          { label: 'Open Positions', value: '8', icon: Briefcase, color: 'bg-purple-500', change: '+1.1%', desc: '23 candidates' },
          { label: 'New Hires (MTD)', value: '6', icon: UserPlus, color: 'bg-green-500', change: '+2.4%', desc: '4 onboarding' },
          { label: 'Turnover Rate', value: '4.2%', icon: TrendingDown, color: 'bg-red-500', change: '-0.5%', desc: '95.8% retention' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-lg p-2 shadow-sm border">
            <div className="flex items-center justify-between mb-1">
              <div className={`w-5 h-5 ${stat.color} rounded-md flex items-center justify-center`}>
                <stat.icon className="w-3 h-3 text-white" />
              </div>
              <span className={`text-[8px] ${stat.change.startsWith('+') ? 'text-emerald-500' : 'text-red-500'}`}>{stat.change}</span>
            </div>
            <p className="text-[11px] font-bold text-slate-800">{stat.value}</p>
            <p className="text-[7px] text-slate-500 truncate">{stat.label}</p>
            <p className="text-[7px] text-slate-400">{stat.desc}</p>
          </div>
        ))}
      </div>

      {/* Employee Lifecycle Pipeline */}
      <div className={`bg-white rounded-lg p-2 shadow-sm border mb-2.5 transition-all duration-500 ${animationStep >= 6 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <div className="flex items-center gap-1 mb-2">
          <Layers className="w-3 h-3 text-indigo-500" />
          <span className="text-[9px] font-semibold text-slate-700">Employee Lifecycle Pipeline</span>
        </div>
        <div className="flex items-center justify-between">
          {[
            { label: 'Candidates', value: 23, color: 'bg-blue-500', icon: Users },
            { label: 'Offer Accepted', value: 5, color: 'bg-purple-500', icon: CheckCircle2 },
            { label: 'Onboarding', value: 4, color: 'bg-green-500', icon: UserPlus },
            { label: 'Active', value: 52, color: 'bg-emerald-500', icon: UserCheck },
            { label: 'Offboarding', value: 2, color: 'bg-orange-500', icon: UserMinus },
            { label: 'Alumni', value: 6, color: 'bg-gray-500', icon: Users },
          ].map((stage, index) => (
            <div key={stage.label} className="flex items-center">
              <div className="text-center">
                <div className={`mx-auto w-8 h-8 rounded-full ${stage.color} flex items-center justify-center text-white mb-1`}>
                  <stage.icon className="w-3.5 h-3.5" />
                </div>
                <p className="text-[10px] font-bold text-slate-800">{stage.value}</p>
                <p className="text-[7px] text-slate-500">{stage.label}</p>
              </div>
              {index < 5 && <ArrowRight className="w-3 h-3 text-slate-300 mx-1" />}
            </div>
          ))}
        </div>
      </div>

      {/* Alerts & Probation Row */}
      <div className={`grid grid-cols-2 gap-2 mb-2.5 transition-all duration-500 ${animationStep >= 7 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        {/* Alerts */}
        <div className="bg-white rounded-lg border p-2 shadow-sm">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1">
              <AlertCircle className="w-3 h-3 text-red-500" />
              <span className="text-[9px] font-semibold text-slate-700">Alerts & Notifications</span>
            </div>
            <span className="text-[8px] px-1.5 py-0.5 rounded bg-red-100 text-red-600">3</span>
          </div>
          <div className="space-y-1 text-[8px]">
            <div className="p-1.5 rounded border-l-2 border-red-500 bg-red-50">
              <p className="font-medium text-slate-700">3 contracts expiring</p>
              <p className="text-slate-500 text-[7px]">Action needed within 7 days</p>
            </div>
            <div className="p-1.5 rounded border-l-2 border-yellow-500 bg-yellow-50">
              <p className="font-medium text-slate-700">5 pending leave requests</p>
              <p className="text-slate-500 text-[7px]">Review needed</p>
            </div>
            <div className="p-1.5 rounded border-l-2 border-blue-500 bg-blue-50">
              <p className="font-medium text-slate-700">2 new candidates</p>
              <p className="text-slate-500 text-[7px]">For Senior Developer role</p>
            </div>
          </div>
        </div>

        {/* Probation Status */}
        <div className="bg-white rounded-lg border p-2 shadow-sm">
          <div className="flex items-center gap-1 mb-1.5">
            <Hourglass className="w-3 h-3 text-orange-500" />
            <span className="text-[9px] font-semibold text-slate-700">Probation & Contracts</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5 mb-2">
            <div className="p-1.5 rounded bg-orange-50 text-center">
              <Timer className="w-3 h-3 text-orange-500 mx-auto mb-0.5" />
              <p className="text-[10px] font-bold text-slate-800">8</p>
              <p className="text-[7px] text-slate-500">On Probation</p>
            </div>
            <div className="p-1.5 rounded bg-red-50 text-center">
              <FileText className="w-3 h-3 text-red-500 mx-auto mb-0.5" />
              <p className="text-[10px] font-bold text-slate-800">3</p>
              <p className="text-[7px] text-slate-500">Expiring Soon</p>
            </div>
          </div>
          <div className="space-y-1 text-[8px]">
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Sarah Miller</span>
              <span className="px-1 py-0.5 rounded bg-red-100 text-red-600 text-[7px]">5 days</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600">John Davis</span>
              <span className="px-1 py-0.5 rounded bg-orange-100 text-orange-600 text-[7px]">12 days</span>
            </div>
          </div>
        </div>
      </div>

      {/* Department Overview */}
      <div className={`bg-white rounded-lg p-2 shadow-sm border mb-2.5 transition-all duration-500 ${animationStep >= 8 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1">
            <Building2 className="w-3 h-3 text-indigo-500" />
            <span className="text-[9px] font-semibold text-slate-700">Department Overview</span>
          </div>
          <span className="text-[8px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">8 departments</span>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {[
            { name: 'Engineering', count: 18, icon: '💻', color: 'bg-blue-50', leave: 2 },
            { name: 'Product', count: 8, icon: '📦', color: 'bg-purple-50', leave: 1 },
            { name: 'Design', count: 6, icon: '🎨', color: 'bg-pink-50', leave: 0 },
            { name: 'Marketing', count: 5, icon: '📢', color: 'bg-green-50', leave: 1 },
            { name: 'Sales', count: 7, icon: '💼', color: 'bg-amber-50', leave: 0 },
            { name: 'HR', count: 4, icon: '👥', color: 'bg-cyan-50', leave: 0 },
            { name: 'Finance', count: 3, icon: '💰', color: 'bg-emerald-50', leave: 0 },
            { name: 'Support', count: 5, icon: '🎧', color: 'bg-orange-50', leave: 0 },
          ].map((dept) => (
            <div key={dept.name} className={`p-1.5 rounded-lg ${dept.color} border`}>
              <div className="flex items-center gap-1 mb-0.5">
                <span className="text-[9px]">{dept.icon}</span>
                <span className="text-[8px] font-medium text-slate-700 truncate">{dept.name}</span>
              </div>
              <p className="text-[11px] font-bold text-slate-800">{dept.count}</p>
              {dept.leave > 0 && (
                <p className="text-[7px] text-orange-600">{dept.leave} on leave</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Tabs Preview (Overview/Recruitment/Performance etc) */}
      <div className={`bg-white rounded-lg p-2 shadow-sm border mb-2.5 transition-all duration-500 ${animationStep >= 8 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <div className="flex gap-1 mb-2 overflow-x-auto">
          {['Overview', 'Recruitment', 'Performance', 'Onboarding', 'Attrition', 'Diversity', 'Skills'].map((tab, i) => (
            <span key={tab} className={`text-[8px] px-2 py-1 rounded-md whitespace-nowrap ${i === 0 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
              {tab}
            </span>
          ))}
        </div>
        
        {/* Overview Tab Content Preview */}
        <div className="grid grid-cols-3 gap-2">
          {/* Leave Requests */}
          <div className="p-1.5 rounded border">
            <div className="flex items-center gap-1 mb-1">
              <Calendar className="w-2.5 h-2.5 text-orange-500" />
              <span className="text-[8px] font-semibold text-slate-700">Leave Requests</span>
            </div>
            <div className="grid grid-cols-3 gap-1 text-center">
              <div className="p-1 rounded bg-amber-50">
                <p className="text-[9px] font-bold text-slate-800">5</p>
                <p className="text-[6px] text-slate-500">Pending</p>
              </div>
              <div className="p-1 rounded bg-green-50">
                <p className="text-[9px] font-bold text-slate-800">12</p>
                <p className="text-[6px] text-slate-500">Approved</p>
              </div>
              <div className="p-1 rounded bg-red-50">
                <p className="text-[9px] font-bold text-slate-800">2</p>
                <p className="text-[6px] text-slate-500">Rejected</p>
              </div>
            </div>
          </div>

          {/* Upcoming Events */}
          <div className="p-1.5 rounded border">
            <div className="flex items-center gap-1 mb-1">
              <CalendarDays className="w-2.5 h-2.5 text-pink-500" />
              <span className="text-[8px] font-semibold text-slate-700">Upcoming Events</span>
            </div>
            <div className="space-y-0.5 text-[7px]">
              <div className="flex items-center gap-1">
                <Cake className="w-2 h-2 text-pink-400" />
                <span className="text-slate-600">3 birthdays this week</span>
              </div>
              <div className="flex items-center gap-1">
                <Award className="w-2 h-2 text-amber-400" />
                <span className="text-slate-600">2 work anniversaries</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="w-2 h-2 text-blue-400" />
                <span className="text-slate-600">1 holiday coming</span>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="p-1.5 rounded border">
            <div className="flex items-center gap-1 mb-1">
              <Activity className="w-2.5 h-2.5 text-indigo-500" />
              <span className="text-[8px] font-semibold text-slate-700">Recent Activity</span>
            </div>
            <div className="space-y-0.5 text-[7px]">
              <div className="flex items-center gap-1">
                <UserPlus className="w-2 h-2 text-green-500" />
                <span className="text-slate-600 truncate">New hire: Amy Lee</span>
              </div>
              <div className="flex items-center gap-1">
                <TrendingUp className="w-2 h-2 text-purple-500" />
                <span className="text-slate-600 truncate">Promoted: John S.</span>
              </div>
              <div className="flex items-center gap-1">
                <GraduationCap className="w-2 h-2 text-blue-500" />
                <span className="text-slate-600 truncate">Training: 5 enrolled</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Extra padding at bottom for scroll */}
      <div className="h-4" />
    </div>
  );
}

// Job Create Screen with form and auto-scroll
function JobCreateScreen({ isActive, onScrollComplete }: { isActive: boolean; onScrollComplete?: () => void }) {
  const [animationStep, setAnimationStep] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasCompletedRef = useRef(false);

  useEffect(() => {
    if (!isActive) {
      setAnimationStep(0);
      hasCompletedRef.current = false;
      return;
    }

    // Sequential animations
    const timers = [
      setTimeout(() => setAnimationStep(1), 200),
      setTimeout(() => setAnimationStep(2), 500),
      setTimeout(() => setAnimationStep(3), 800),
      setTimeout(() => setAnimationStep(4), 1100),
      setTimeout(() => setAnimationStep(5), 1400),
      setTimeout(() => setAnimationStep(6), 1700),
      setTimeout(() => setAnimationStep(7), 2000),
    ];

    return () => timers.forEach(clearTimeout);
  }, [isActive]);

  // Auto-scroll effect
  useEffect(() => {
    if (!isActive || animationStep < 7 || !scrollRef.current) return;

    const container = scrollRef.current;
    const startTime = Date.now();
    const scrollDuration = 5000;
    const startPosition = 0;
    const endPosition = container.scrollHeight - container.clientHeight;

    const animateScroll = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / scrollDuration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      container.scrollTop = startPosition + (endPosition - startPosition) * eased;

      if (progress < 1) {
        requestAnimationFrame(animateScroll);
      } else if (!hasCompletedRef.current) {
        hasCompletedRef.current = true;
        setTimeout(() => {
          onScrollComplete?.();
        }, 2500);
      }
    };

    const scrollTimer = setTimeout(() => {
      requestAnimationFrame(animateScroll);
    }, 500);

    return () => clearTimeout(scrollTimer);
  }, [isActive, animationStep, onScrollComplete]);

  const requirements = ['3+ years React experience', 'TypeScript proficiency', 'REST API knowledge', 'Agile methodology'];
  const responsibilities = ['Develop features', 'Code reviews', 'Mentor juniors', 'Technical docs'];
  const benefits = ['Health Insurance', 'Remote Work', '401k Match', 'PTO'];

  return (
    <div ref={scrollRef} className="h-full bg-slate-100 overflow-y-auto scrollbar-hide">
      <div className="p-3 space-y-3">
        {/* Header */}
        <div 
          className="flex items-center justify-between transition-all duration-500"
          style={{ opacity: animationStep >= 1 ? 1 : 0, transform: animationStep >= 1 ? 'translateY(0)' : 'translateY(-10px)' }}
        >
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-800">Create New Job Opening</h3>
              <span className="px-1.5 py-0.5 bg-gradient-to-r from-purple-500 to-blue-500 text-white text-[7px] rounded-full flex items-center gap-0.5">
                <Sparkles className="w-2 h-2" />
                AI Enabled
              </span>
            </div>
            <p className="text-[10px] text-slate-500">Fill in details to create a job posting</p>
          </div>
          <button className="px-2 py-1 bg-blue-500 text-white text-[10px] rounded-md flex items-center gap-1">
            <FileText className="w-3 h-3" />
            Save Draft
          </button>
        </div>

        {/* Basic Information Section */}
        <div 
          className="bg-white rounded-lg shadow-sm p-3 transition-all duration-500"
          style={{ opacity: animationStep >= 2 ? 1 : 0, transform: animationStep >= 2 ? 'translateY(0)' : 'translateY(10px)' }}
        >
          <h4 className="text-[11px] font-semibold text-slate-700 mb-2 flex items-center gap-1">
            <Briefcase className="w-3 h-3 text-blue-500" />
            Basic Information
          </h4>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[8px] text-slate-500 block mb-1">Job Title *</label>
              <div className="bg-slate-50 border rounded px-2 py-1.5 text-[10px] text-slate-700">
                Senior Frontend Developer
              </div>
            </div>
            <div>
              <label className="text-[8px] text-slate-500 block mb-1">Department *</label>
              <div className="bg-slate-50 border rounded px-2 py-1.5 text-[10px] text-slate-700 flex justify-between items-center">
                Engineering
                <span className="text-slate-400">▾</span>
              </div>
            </div>
            <div>
              <label className="text-[8px] text-slate-500 block mb-1">Location</label>
              <div className="bg-slate-50 border rounded px-2 py-1.5 text-[10px] text-slate-700">
                Dallas, TX (Remote)
              </div>
            </div>
            <div>
              <label className="text-[8px] text-slate-500 block mb-1">Employment Type</label>
              <div className="bg-slate-50 border rounded px-2 py-1.5 text-[10px] text-slate-700 flex justify-between items-center">
                Full-time
                <span className="text-slate-400">▾</span>
              </div>
            </div>
          </div>
        </div>

        {/* Compensation Section */}
        <div 
          className="bg-white rounded-lg shadow-sm p-3 transition-all duration-500"
          style={{ opacity: animationStep >= 3 ? 1 : 0, transform: animationStep >= 3 ? 'translateY(0)' : 'translateY(10px)' }}
        >
          <h4 className="text-[11px] font-semibold text-slate-700 mb-2 flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-green-500" />
            Compensation
          </h4>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[8px] text-slate-500 block mb-1">Min Salary</label>
              <div className="bg-slate-50 border rounded px-2 py-1.5 text-[10px] text-slate-700">
                $120,000
              </div>
            </div>
            <div>
              <label className="text-[8px] text-slate-500 block mb-1">Max Salary</label>
              <div className="bg-slate-50 border rounded px-2 py-1.5 text-[10px] text-slate-700">
                $160,000
              </div>
            </div>
            <div>
              <label className="text-[8px] text-slate-500 block mb-1">Currency</label>
              <div className="bg-slate-50 border rounded px-2 py-1.5 text-[10px] text-slate-700 flex justify-between items-center">
                USD
                <span className="text-slate-400">▾</span>
              </div>
            </div>
          </div>
        </div>

        {/* Position Details Section */}
        <div 
          className="bg-white rounded-lg shadow-sm p-3 transition-all duration-500"
          style={{ opacity: animationStep >= 4 ? 1 : 0, transform: animationStep >= 4 ? 'translateY(0)' : 'translateY(10px)' }}
        >
          <h4 className="text-[11px] font-semibold text-slate-700 mb-2 flex items-center gap-1">
            <ClipboardList className="w-3 h-3 text-purple-500" />
            Position Details
          </h4>
          <div className="grid grid-cols-4 gap-2">
            <div>
              <label className="text-[8px] text-slate-500 block mb-1">Openings</label>
              <div className="bg-slate-50 border rounded px-2 py-1.5 text-[10px] text-slate-700">3</div>
            </div>
            <div>
              <label className="text-[8px] text-slate-500 block mb-1">Status</label>
              <div className="bg-green-50 border border-green-200 rounded px-2 py-1.5 text-[10px] text-green-700">Open</div>
            </div>
            <div>
              <label className="text-[8px] text-slate-500 block mb-1">Closing Date</label>
              <div className="bg-slate-50 border rounded px-2 py-1.5 text-[10px] text-slate-700 flex items-center gap-1">
                <Calendar className="w-2.5 h-2.5" />
                Mar 30, 2026
              </div>
            </div>
            <div>
              <label className="text-[8px] text-slate-500 block mb-1">Experience</label>
              <div className="bg-slate-50 border rounded px-2 py-1.5 text-[10px] text-slate-700">3-5 years</div>
            </div>
          </div>
        </div>

        {/* AI Generation Button */}
        <div 
          className="transition-all duration-500"
          style={{ opacity: animationStep >= 5 ? 1 : 0, transform: animationStep >= 5 ? 'scale(1)' : 'scale(0.95)' }}
        >
          <button className="w-full py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white text-[11px] rounded-lg flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-shadow">
            <Sparkles className="w-3.5 h-3.5" />
            Generate with AI
            <span className="px-1.5 py-0.5 bg-white/20 rounded text-[8px]">Auto-fill description</span>
          </button>
        </div>

        {/* Job Description */}
        <div 
          className="bg-white rounded-lg shadow-sm p-3 transition-all duration-500"
          style={{ opacity: animationStep >= 6 ? 1 : 0, transform: animationStep >= 6 ? 'translateY(0)' : 'translateY(10px)' }}
        >
          <h4 className="text-[11px] font-semibold text-slate-700 mb-2 flex items-center gap-1">
            <FileText className="w-3 h-3 text-blue-500" />
            Job Description
          </h4>
          <div className="bg-slate-50 border rounded p-2 text-[9px] text-slate-600 min-h-[60px]">
            We are looking for a talented Senior Frontend Developer to join our engineering team. You will be responsible for building and maintaining our web applications using modern technologies like React, TypeScript, and Next.js. The ideal candidate has a passion for creating exceptional user experiences...
          </div>
        </div>

        {/* Requirements */}
        <div 
          className="bg-white rounded-lg shadow-sm p-3 transition-all duration-500"
          style={{ opacity: animationStep >= 7 ? 1 : 0, transform: animationStep >= 7 ? 'translateY(0)' : 'translateY(10px)' }}
        >
          <h4 className="text-[11px] font-semibold text-slate-700 mb-2 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-green-500" />
            Requirements
          </h4>
          <div className="flex flex-wrap gap-1">
            {requirements.map((req, i) => (
              <span 
                key={i} 
                className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[8px] rounded-full border border-blue-200"
                style={{ 
                  opacity: animationStep >= 7 ? 1 : 0,
                  transitionDelay: `${i * 100}ms`
                }}
              >
                {req}
              </span>
            ))}
          </div>
        </div>

        {/* Responsibilities */}
        <div 
          className="bg-white rounded-lg shadow-sm p-3 transition-all duration-500"
          style={{ opacity: animationStep >= 7 ? 1 : 0, transform: animationStep >= 7 ? 'translateY(0)' : 'translateY(10px)', transitionDelay: '200ms' }}
        >
          <h4 className="text-[11px] font-semibold text-slate-700 mb-2 flex items-center gap-1">
            <ClipboardList className="w-3 h-3 text-orange-500" />
            Responsibilities
          </h4>
          <div className="flex flex-wrap gap-1">
            {responsibilities.map((resp, i) => (
              <span 
                key={i} 
                className="px-2 py-0.5 bg-orange-50 text-orange-700 text-[8px] rounded-full border border-orange-200"
              >
                {resp}
              </span>
            ))}
          </div>
        </div>

        {/* Benefits */}
        <div 
          className="bg-white rounded-lg shadow-sm p-3 transition-all duration-500"
          style={{ opacity: animationStep >= 7 ? 1 : 0, transform: animationStep >= 7 ? 'translateY(0)' : 'translateY(10px)', transitionDelay: '400ms' }}
        >
          <h4 className="text-[11px] font-semibold text-slate-700 mb-2 flex items-center gap-1">
            <Award className="w-3 h-3 text-purple-500" />
            Benefits & Perks
          </h4>
          <div className="flex flex-wrap gap-1">
            {benefits.map((benefit, i) => (
              <span 
                key={i} 
                className="px-2 py-0.5 bg-purple-50 text-purple-700 text-[8px] rounded-full border border-purple-200"
              >
                {benefit}
              </span>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div 
          className="flex gap-2 pt-2 transition-all duration-500"
          style={{ opacity: animationStep >= 7 ? 1 : 0 }}
        >
          <button className="flex-1 py-2 bg-slate-100 text-slate-600 text-[10px] rounded-lg border">
            Cancel
          </button>
          <button className="flex-1 py-2 bg-blue-500 text-white text-[10px] rounded-lg flex items-center justify-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Publish Job
          </button>
        </div>

        {/* Extra padding for scroll */}
        <div className="h-4" />
      </div>
    </div>
  );
}

// Attendance Screen
function AttendanceScreen({ isActive }: { isActive: boolean }) {
  const [checkingIn, setCheckingIn] = useState(false);

  useEffect(() => {
    if (isActive) {
      const timer = setTimeout(() => setCheckingIn(true), 1500);
      return () => clearTimeout(timer);
    } else {
      setCheckingIn(false);
    }
  }, [isActive]);

  return (
    <div className="h-full bg-slate-100 p-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-800">Attendance</h3>
          <p className="text-[10px] text-slate-500">Monday, Feb 24, 2026</p>
        </div>
        <div className="flex gap-1">
          <button className="px-2 py-1 bg-white text-[10px] rounded-md border">Today</button>
          <button className="px-2 py-1 bg-white text-[10px] rounded-md border">This Week</button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {/* Time Card */}
        <div className="bg-white rounded-lg p-3 shadow-sm">
          <div className="text-center mb-3">
            <Clock className="w-8 h-8 mx-auto text-blue-500 mb-1" />
            <p className="text-2xl font-bold text-slate-800">09:15 AM</p>
            <p className="text-[10px] text-slate-500">Current Time</p>
          </div>
          
          <button 
            className={`w-full py-2 rounded-md text-[11px] font-semibold transition-all duration-500 ${
              checkingIn 
                ? 'bg-green-500 text-white' 
                : 'bg-blue-500 text-white'
            }`}
          >
            {checkingIn ? '✓ Checked In at 9:00 AM' : 'Check In'}
          </button>

          <div className="mt-3 pt-3 border-t">
            <div className="flex justify-between text-[9px]">
              <span className="text-slate-500">Today's Hours</span>
              <span className="font-semibold text-slate-700">0h 15m</span>
            </div>
            <div className="flex justify-between text-[9px] mt-1">
              <span className="text-slate-500">This Week</span>
              <span className="font-semibold text-slate-700">8h 45m</span>
            </div>
          </div>
        </div>

        {/* Attendance Overview */}
        <div className="bg-white rounded-lg p-3 shadow-sm">
          <span className="text-[10px] font-semibold text-slate-700 block mb-2">Team Status</span>
          <div className="space-y-2">
            {[
              { status: 'Present', count: 47, color: 'bg-green-500', width: '85%' },
              { status: 'Remote', count: 8, color: 'bg-blue-500', width: '15%' },
              { status: 'On Leave', count: 5, color: 'bg-orange-500', width: '9%' },
              { status: 'Late', count: 2, color: 'bg-red-500', width: '4%' },
            ].map((item, i) => (
              <div key={item.status}>
                <div className="flex justify-between mb-0.5">
                  <span className="text-[9px] text-slate-600">{item.status}</span>
                  <span className="text-[9px] font-semibold text-slate-700">{item.count}</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${item.color} rounded-full transition-all duration-700`}
                    style={{ 
                      width: isActive ? item.width : '0%',
                      transitionDelay: `${i * 150 + 300}ms`
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Check-ins */}
      <div className="bg-white rounded-lg p-2 shadow-sm mt-2">
        <span className="text-[10px] font-semibold text-slate-700 block mb-2">Recent Check-ins</span>
        <div className="space-y-1.5">
          {[
            { name: 'David Kim', time: '9:02 AM', status: 'On Time' },
            { name: 'Sarah Johnson', time: '8:58 AM', status: 'On Time' },
            { name: 'Michael Chen', time: '9:15 AM', status: 'Late' },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between" style={{
              opacity: isActive ? 1 : 0,
              transitionDelay: `${i * 200 + 500}ms`,
              transition: 'opacity 0.3s'
            }}>
              <span className="text-[9px] text-slate-600">{item.name}</span>
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-slate-500">{item.time}</span>
                <span className={`text-[8px] px-1.5 py-0.5 rounded-full ${
                  item.status === 'On Time' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {item.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// AI Assistant Screen
function AIAssistantScreen({ isActive }: { isActive: boolean }) {
  const [messages, setMessages] = useState<number[]>([]);
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    if (isActive) {
      setMessages([]);
      setTyping(false);
      
      const timers = [
        setTimeout(() => setMessages([0]), 500),
        setTimeout(() => setTyping(true), 1200),
        setTimeout(() => { setTyping(false); setMessages([0, 1]); }, 2200),
        setTimeout(() => setMessages([0, 1, 2]), 2800),
        setTimeout(() => setTyping(true), 3200),
        setTimeout(() => { setTyping(false); setMessages([0, 1, 2, 3]); }, 3800),
      ];
      return () => timers.forEach(clearTimeout);
    }
  }, [isActive]);

  const conversation = [
    { type: 'user', text: 'Create a job post for Senior React Developer' },
    { type: 'ai', text: 'I\'ll create that job post! Here\'s what I\'ve generated:\n\n📋 Title: Senior React Developer\n💼 5+ years experience\n🛠️ Skills: React, TypeScript, Node.js\n\nShould I add more requirements?' },
    { type: 'user', text: 'Yes, add remote work option and salary range' },
    { type: 'ai', text: 'Updated! Added:\n\n🏠 Remote: Hybrid (3 days office)\n💰 Salary: $120k - $150k/year\n\nJob post is ready to publish. Want me to post it now?' },
  ];

  return (
    <div className="h-full bg-slate-100 flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-3 flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
          <Bot className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white">CoreOrbit AI</h3>
          <p className="text-[10px] text-white/80">Always ready to help</p>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span className="text-[10px] text-white/80">Online</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 p-3 space-y-2 overflow-hidden">
        {conversation.map((msg, i) => (
          messages.includes(i) && (
            <div 
              key={i}
              className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
              style={{
                animation: 'fadeIn 0.3s ease-out'
              }}
            >
              <div className={`max-w-[80%] px-2 py-1.5 rounded-lg text-[9px] ${
                msg.type === 'user' 
                  ? 'bg-blue-500 text-white rounded-br-none' 
                  : 'bg-white shadow-sm rounded-bl-none text-slate-700'
              }`}>
                <p className="whitespace-pre-line">{msg.text}</p>
              </div>
            </div>
          )
        ))}
        
        {typing && (
          <div className="flex justify-start">
            <div className="bg-white shadow-sm rounded-lg rounded-bl-none px-3 py-2">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-2 bg-white border-t">
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-slate-100 rounded-full px-3 py-1.5 text-[10px] text-slate-400">
            Ask me anything...
          </div>
          <button className="w-7 h-7 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// Project Management Screen
function ProjectsScreen({ isActive }: { isActive: boolean }) {
  return (
    <div className="h-full bg-slate-100 p-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-800">Recruitment Pipeline</h3>
          <p className="text-[10px] text-slate-500">4 active job openings • 23 candidates</p>
        </div>
        <button className="px-2 py-1 bg-purple-500 text-white text-[10px] rounded-md">+ New Job</button>
      </div>

      {/* Pipeline Stages */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        {[
          { stage: 'Applied', count: 12, color: 'bg-blue-500' },
          { stage: 'Screening', count: 6, color: 'bg-yellow-500' },
          { stage: 'Interview', count: 4, color: 'bg-purple-500' },
          { stage: 'Offer', count: 1, color: 'bg-green-500' },
        ].map((item, i) => (
          <div 
            key={item.stage}
            className="bg-white rounded-lg p-2 shadow-sm text-center transition-all duration-500"
            style={{
              opacity: isActive ? 1 : 0,
              transform: isActive ? 'translateY(0)' : 'translateY(10px)',
              transitionDelay: `${i * 100}ms`
            }}
          >
            <div className={`w-6 h-6 ${item.color} rounded-full flex items-center justify-center mx-auto mb-1`}>
              <span className="text-[10px] text-white font-bold">{item.count}</span>
            </div>
            <span className="text-[8px] text-slate-600">{item.stage}</span>
          </div>
        ))}
      </div>

      {/* Candidates */}
      <div className="bg-white rounded-lg p-2 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-semibold text-slate-700">Recent Candidates</span>
          <span className="text-[9px] text-purple-500">View All →</span>
        </div>
        <div className="space-y-2">
          {[
            { name: 'Sarah Miller', role: 'Senior React Dev', stage: 'Interview', score: 92, avatar: 'SM' },
            { name: 'John Davis', role: 'Full Stack Dev', stage: 'Screening', score: 85, avatar: 'JD' },
            { name: 'Emma Wilson', role: 'UI Designer', stage: 'Applied', score: 78, avatar: 'EW' },
          ].map((candidate, i) => (
            <div 
              key={i} 
              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-50"
              style={{
                opacity: isActive ? 1 : 0,
                transform: isActive ? 'translateX(0)' : 'translateX(-10px)',
                transitionDelay: `${i * 150 + 400}ms`,
                transition: 'all 0.3s'
              }}
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-[8px] text-white font-bold">
                {candidate.avatar}
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-medium text-slate-800">{candidate.name}</p>
                <p className="text-[8px] text-slate-500">{candidate.role}</p>
              </div>
              <span className={`text-[8px] px-1.5 py-0.5 rounded-full ${
                candidate.stage === 'Interview' ? 'bg-purple-100 text-purple-700' :
                candidate.stage === 'Screening' ? 'bg-yellow-100 text-yellow-700' :
                'bg-blue-100 text-blue-700'
              }`}>
                {candidate.stage}
              </span>
              <div className="text-right">
                <span className="text-[10px] font-bold text-green-600">{candidate.score}%</span>
                <p className="text-[7px] text-slate-400">Match</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Job Openings */}
      <div className="bg-white rounded-lg p-2 shadow-sm mt-2">
        <span className="text-[10px] font-semibold text-slate-700 block mb-2">Active Jobs</span>
        <div className="space-y-1.5">
          {[
            { title: 'Senior React Developer', applicants: 8, days: 5 },
            { title: 'Product Manager', applicants: 12, days: 3 },
          ].map((job, i) => (
            <div key={i} className="flex items-center justify-between" style={{
              opacity: isActive ? 1 : 0,
              transitionDelay: `${i * 150 + 800}ms`,
              transition: 'opacity 0.3s'
            }}>
              <span className="text-[9px] text-slate-700">{job.title}</span>
              <div className="flex items-center gap-2">
                <span className="text-[8px] text-slate-500">{job.applicants} applicants</span>
                <span className="text-[7px] px-1.5 py-0.5 rounded bg-green-100 text-green-600">{job.days}d ago</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Screen renderer
function DemoScreen({ screenId, isActive, onScrollComplete }: { screenId: string; isActive: boolean; onScrollComplete?: () => void }) {
  switch (screenId) {
    case 'dashboard':
      return <DashboardScreen isActive={isActive} onScrollComplete={onScrollComplete} />;
    case 'job-create':
      return <JobCreateScreen isActive={isActive} onScrollComplete={onScrollComplete} />;
    case 'attendance':
      return <AttendanceScreen isActive={isActive} />;
    case 'ai-assistant':
      return <AIAssistantScreen isActive={isActive} />;
    case 'projects':
      return <ProjectsScreen isActive={isActive} />;
    default:
      return <DashboardScreen isActive={isActive} onScrollComplete={onScrollComplete} />;
  }
}

// Main Product Demo Component
export function ProductDemo() {
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentScreen, setCurrentScreen] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [dashboardScrolling, setDashboardScrolling] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const safeScreenIndex = Math.max(0, Math.min(currentScreen, demoScreens.length - 1));
  const activeScreen = demoScreens[safeScreenIndex];

  const totalDuration = demoScreens.reduce((sum, s) => sum + s.duration, 0);

  const resetDemo = useCallback(() => {
    setCurrentScreen(0);
    setProgress(0);
    setIsPlaying(true);
    setDashboardScrolling(false);
  }, []);

  // Callback when dashboard scroll completes - navigate to next screen
  const handleDashboardScrollComplete = useCallback(() => {
    if (safeScreenIndex === 0 && isPlaying) {
      setCurrentScreen(1);
      setDashboardScrolling(false);
    }
  }, [safeScreenIndex, isPlaying]);

  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;
    
    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.error('Fullscreen error:', err);
    }
  }, []);

  // Listen for fullscreen changes (e.g., user presses Escape)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Mark dashboard as scrolling when on first screen
  useEffect(() => {
    if (safeScreenIndex === 0 && isPlaying) {
      setDashboardScrolling(true);
    }
  }, [safeScreenIndex, isPlaying]);

  // Progress and screen timer - skips dashboard (handled by scroll callback)
  useEffect(() => {
    if (!isPlaying || !activeScreen) return;
    
    // Dashboard screen (index 0) is controlled by scroll callback, not timer
    if (safeScreenIndex === 0) {
      // Just update progress smoothly for dashboard
      let elapsed = 0;
      const timer = setInterval(() => {
        elapsed += 50;
        const maxProgress = (demoScreens[0].duration / totalDuration) * 100;
        const currentProgress = Math.min((elapsed / demoScreens[0].duration) * maxProgress, maxProgress);
        setProgress(currentProgress);
      }, 50);
      return () => clearInterval(timer);
    }

    const screenDuration = activeScreen.duration;
    let elapsed = 0;
    const interval = 50; // Update every 50ms

    const timer = setInterval(() => {
      elapsed += interval;
      
      // Calculate overall progress
      const previousDuration = demoScreens.slice(0, safeScreenIndex).reduce((sum, s) => sum + s.duration, 0);
      const currentProgress = ((previousDuration + elapsed) / totalDuration) * 100;
      setProgress(currentProgress);

      // Move to next screen
      if (elapsed >= screenDuration) {
        if (safeScreenIndex < demoScreens.length - 1) {
          setCurrentScreen(prev => prev + 1);
        } else {
          // Loop back to start
          setCurrentScreen(0);
          setProgress(0);
        }
      }
    }, interval);

    return () => clearInterval(timer);
  }, [isPlaying, safeScreenIndex, totalDuration, activeScreen]);

  return (
    <div ref={containerRef} className={`relative w-full mx-auto ${isFullscreen ? 'max-w-none h-screen flex flex-col' : 'max-w-[800px]'}`}>
      {/* Browser Frame */}
      <div className={`rounded-xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-700 bg-slate-900 ${isFullscreen ? 'flex-1 flex flex-col rounded-none border-0' : ''}`}>
        {/* Browser Header */}
        <div className="bg-slate-800 px-3 py-2 flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <div className="w-3 h-3 rounded-full bg-green-500" />
          </div>
          <div className="flex-1 mx-4">
            <div className="bg-slate-700 rounded-md px-3 py-1 text-xs text-slate-400 flex items-center gap-2">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              app.coreorbit.com
            </div>
          </div>
        </div>

        {/* App Header */}
        <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-3 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">CoreOrbit</span>
          </div>
          <div className="flex items-center gap-4 text-[10px] text-slate-500">
            {['HR 360', 'Jobs', 'Attendance', 'Chat', 'Recruitment'].map((item, i) => (
              <span 
                key={item} 
                className={`cursor-pointer transition-colors ${
                  i === currentScreen ? 'text-blue-600 font-semibold' : 'hover:text-slate-700'
                }`}
              >
                {item}
              </span>
            ))}
          </div>
        </div>

        {/* Demo Content */}
        <div className={`bg-slate-100 relative overflow-hidden ${isFullscreen ? 'flex-1' : 'aspect-[4/3]'}`}>
          {demoScreens.map((screen, index) => (
            <div
              key={screen.id}
              className={`absolute inset-0 transition-all duration-500 ${
                index === currentScreen 
                  ? 'opacity-100 translate-x-0' 
                  : index < currentScreen 
                    ? 'opacity-0 -translate-x-full' 
                    : 'opacity-0 translate-x-full'
              }`}
            >
              <DemoScreen 
                screenId={screen.id} 
                isActive={index === currentScreen && isPlaying}
                onScrollComplete={index === 0 ? handleDashboardScrollComplete : undefined}
              />
            </div>
          ))}
        </div>

        {/* Video Controls */}
        <div className="bg-slate-900 px-3 py-2">
          {/* Progress Bar */}
          <div className="h-1 bg-slate-700 rounded-full mb-2 cursor-pointer overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsPlaying(!isPlaying)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4 text-white" />
                ) : (
                  <Play className="w-4 h-4 text-white ml-0.5" />
                )}
              </button>
              <button 
                onClick={resetDemo}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                <RotateCcw className="w-4 h-4 text-white" />
              </button>
              <button 
                onClick={() => setIsMuted(!isMuted)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                {isMuted ? (
                  <VolumeX className="w-4 h-4 text-white" />
                ) : (
                  <Volume2 className="w-4 h-4 text-white" />
                )}
              </button>
            </div>

            {/* Screen indicator */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400">
                {activeScreen?.title || 'Loading...'}
              </span>
              <div className="flex gap-1">
                {demoScreens.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => { setCurrentScreen(i); setProgress((i / demoScreens.length) * 100); }}
                    className={`w-1.5 h-1.5 rounded-full transition-all ${
                      i === currentScreen ? 'bg-white w-4' : 'bg-white/30 hover:bg-white/50'
                    }`}
                  />
                ))}
              </div>
            </div>

            <button 
              onClick={toggleFullscreen}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4 text-white" />
              ) : (
                <Maximize2 className="w-4 h-4 text-white" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Glow effect - hidden in fullscreen */}
      {!isFullscreen && (
        <div className="absolute -inset-4 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 rounded-2xl blur-2xl -z-10" />
      )}
    </div>
  );
}

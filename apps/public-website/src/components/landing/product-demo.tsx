'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize2, Minimize2, RotateCcw } from 'lucide-react';
import { 
  Users, BarChart3, Calendar, MessageSquare, 
  CheckCircle2, Bell, FileText, Sparkles, 
  Clock, TrendingUp, FolderOpen, Settings,
  UserPlus, ClipboardList, Brain, Bot
} from 'lucide-react';

// Demo screens data
const demoScreens = [
  {
    id: 'dashboard',
    title: 'Organization Dashboard',
    duration: 4000,
  },
  {
    id: 'employees',
    title: 'Employee Management',
    duration: 3500,
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

// Dashboard Screen Component
function DashboardScreen({ isActive }: { isActive: boolean }) {
  const [animationStep, setAnimationStep] = useState(0);

  useEffect(() => {
    if (isActive) {
      setAnimationStep(0);
      const timers = [
        setTimeout(() => setAnimationStep(1), 300),
        setTimeout(() => setAnimationStep(2), 600),
        setTimeout(() => setAnimationStep(3), 900),
        setTimeout(() => setAnimationStep(4), 1200),
      ];
      return () => timers.forEach(clearTimeout);
    }
  }, [isActive]);

  return (
    <div className="h-full bg-slate-100 p-3">
      {/* Header */}
      <div className={`flex items-center justify-between mb-3 transition-all duration-500 ${animationStep >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}>
        <div>
          <h3 className="text-sm font-bold text-slate-800">Good Morning, Sarah! 👋</h3>
          <p className="text-[10px] text-slate-500">Here's what's happening today</p>
        </div>
        <div className="flex gap-1">
          <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center">
            <Bell className="w-3 h-3 text-purple-600" />
          </div>
          <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-[8px] text-white font-bold">SJ</div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className={`grid grid-cols-4 gap-2 mb-3 transition-all duration-500 ${animationStep >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        {[
          { label: 'Employees', value: '52', icon: Users, color: 'bg-blue-500', change: '+3' },
          { label: 'Open Jobs', value: '4', icon: FolderOpen, color: 'bg-purple-500', change: '+1' },
          { label: 'Candidates', value: '23', icon: UserPlus, color: 'bg-green-500', change: '+8' },
          { label: 'Interviews', value: '6', icon: Calendar, color: 'bg-orange-500', change: '+2' },
        ].map((stat, i) => (
          <div key={stat.label} className="bg-white rounded-lg p-2 shadow-sm" style={{ transitionDelay: `${i * 100}ms` }}>
            <div className={`w-5 h-5 ${stat.color} rounded-md flex items-center justify-center mb-1`}>
              <stat.icon className="w-3 h-3 text-white" />
            </div>
            <p className="text-xs font-bold text-slate-800">{stat.value}</p>
            <p className="text-[8px] text-slate-500">{stat.label}</p>
            <span className="text-[8px] text-green-500">{stat.change}</span>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className={`grid grid-cols-2 gap-2 mb-3 transition-all duration-500 ${animationStep >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        {/* Attendance Chart */}
        <div className="bg-white rounded-lg p-2 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-semibold text-slate-700">Weekly Attendance</span>
            <TrendingUp className="w-3 h-3 text-green-500" />
          </div>
          <div className="flex items-end gap-1 h-12">
            {[65, 80, 75, 90, 85, 70, 45].map((h, i) => (
              <div 
                key={i} 
                className="flex-1 bg-gradient-to-t from-blue-500 to-blue-400 rounded-t transition-all duration-500"
                style={{ 
                  height: isActive ? `${h}%` : '10%',
                  transitionDelay: `${i * 100 + 500}ms`
                }}
              />
            ))}
          </div>
          <div className="flex justify-between mt-1">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
              <span key={i} className="text-[8px] text-slate-400 flex-1 text-center">{d}</span>
            ))}
          </div>
        </div>

        {/* Task Progress */}
        <div className="bg-white rounded-lg p-2 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-semibold text-slate-700">Hiring Pipeline</span>
            <BarChart3 className="w-3 h-3 text-purple-500" />
          </div>
          <div className="space-y-2">
            {[
              { label: 'Applied', value: 52, color: 'bg-blue-500' },
              { label: 'Interviewed', value: 35, color: 'bg-purple-500' },
              { label: 'Hired', value: 12, color: 'bg-green-500' },
            ].map((item, i) => (
              <div key={item.label}>
                <div className="flex justify-between mb-0.5">
                  <span className="text-[8px] text-slate-600">{item.label}</span>
                  <span className="text-[8px] font-semibold text-slate-700">{item.value}%</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${item.color} rounded-full transition-all duration-1000`}
                    style={{ 
                      width: isActive ? `${item.value}%` : '0%',
                      transitionDelay: `${i * 200 + 800}ms`
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className={`bg-white rounded-lg p-2 shadow-sm transition-all duration-500 ${animationStep >= 4 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <span className="text-[10px] font-semibold text-slate-700 block mb-2">Recent Activity</span>
        <div className="space-y-1.5">
          {[
            { icon: UserPlus, text: 'Sarah Miller completed onboarding', time: '2m ago', color: 'text-green-500' },
            { icon: CheckCircle2, text: 'New job posted: Senior React Developer', time: '15m ago', color: 'text-purple-500' },
            { icon: Clock, text: 'Interview scheduled with John Davis', time: '1h ago', color: 'text-blue-500' },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <item.icon className={`w-3 h-3 ${item.color}`} />
              <span className="text-[9px] text-slate-600 flex-1">{item.text}</span>
              <span className="text-[8px] text-slate-400">{item.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Employee Management Screen
function EmployeesScreen({ isActive }: { isActive: boolean }) {
  const [selected, setSelected] = useState<number | null>(null);

  useEffect(() => {
    if (isActive) {
      const timer = setTimeout(() => setSelected(1), 800);
      return () => clearTimeout(timer);
    } else {
      setSelected(null);
    }
  }, [isActive]);

  const employees = [
    { name: 'Sarah Johnson', role: 'HR Director', dept: 'Human Resources', status: 'Active', avatar: 'SJ' },
    { name: 'Michael Chen', role: 'Senior Developer', dept: 'Engineering', status: 'Active', avatar: 'MC' },
    { name: 'Emily Rodriguez', role: 'Marketing Lead', dept: 'Marketing', status: 'On Leave', avatar: 'ER' },
    { name: 'David Kim', role: 'Product Manager', dept: 'Product', status: 'Active', avatar: 'DK' },
  ];

  return (
    <div className="h-full bg-slate-100 p-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-800">Employee Directory</h3>
          <p className="text-[10px] text-slate-500">52 employees • 8 departments</p>
        </div>
        <button className="px-2 py-1 bg-blue-500 text-white text-[10px] rounded-md flex items-center gap-1">
          <UserPlus className="w-3 h-3" />
          Add Employee
        </button>
      </div>

      {/* Search & Filters */}
      <div className="flex gap-2 mb-3">
        <div className="flex-1 bg-white rounded-md px-2 py-1.5 text-[10px] text-slate-400 border">
          🔍 Search employees...
        </div>
        <div className="bg-white rounded-md px-2 py-1.5 text-[10px] text-slate-600 border">
          All Departments ▾
        </div>
      </div>

      {/* Employee List */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="grid grid-cols-5 gap-2 px-2 py-1.5 bg-slate-50 text-[8px] font-semibold text-slate-500 uppercase">
          <span className="col-span-2">Employee</span>
          <span>Department</span>
          <span>Role</span>
          <span>Status</span>
        </div>
        {employees.map((emp, i) => (
          <div 
            key={i}
            className={`grid grid-cols-5 gap-2 px-2 py-2 border-t items-center transition-all duration-300 ${
              selected === i ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''
            }`}
            style={{ 
              opacity: isActive ? 1 : 0,
              transform: isActive ? 'translateX(0)' : 'translateX(-10px)',
              transitionDelay: `${i * 150}ms`
            }}
          >
            <div className="col-span-2 flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-[8px] text-white font-bold">
                {emp.avatar}
              </div>
              <span className="text-[10px] font-medium text-slate-700">{emp.name}</span>
            </div>
            <span className="text-[9px] text-slate-600">{emp.dept}</span>
            <span className="text-[9px] text-slate-600">{emp.role}</span>
            <span className={`text-[8px] px-1.5 py-0.5 rounded-full ${
              emp.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
            }`}>
              {emp.status}
            </span>
          </div>
        ))}
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
function DemoScreen({ screenId, isActive }: { screenId: string; isActive: boolean }) {
  switch (screenId) {
    case 'dashboard':
      return <DashboardScreen isActive={isActive} />;
    case 'employees':
      return <EmployeesScreen isActive={isActive} />;
    case 'attendance':
      return <AttendanceScreen isActive={isActive} />;
    case 'ai-assistant':
      return <AIAssistantScreen isActive={isActive} />;
    case 'projects':
      return <ProjectsScreen isActive={isActive} />;
    default:
      return <DashboardScreen isActive={isActive} />;
  }
}

// Main Product Demo Component
export function ProductDemo() {
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentScreen, setCurrentScreen] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const totalDuration = demoScreens.reduce((sum, s) => sum + s.duration, 0);

  const resetDemo = useCallback(() => {
    setCurrentScreen(0);
    setProgress(0);
    setIsPlaying(true);
  }, []);

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

  useEffect(() => {
    if (!isPlaying) return;

    const screenDuration = demoScreens[currentScreen].duration;
    let elapsed = 0;
    const interval = 50; // Update every 50ms

    const timer = setInterval(() => {
      elapsed += interval;
      
      // Calculate overall progress
      const previousDuration = demoScreens.slice(0, currentScreen).reduce((sum, s) => sum + s.duration, 0);
      const currentProgress = ((previousDuration + elapsed) / totalDuration) * 100;
      setProgress(currentProgress);

      // Move to next screen
      if (elapsed >= screenDuration) {
        if (currentScreen < demoScreens.length - 1) {
          setCurrentScreen(prev => prev + 1);
        } else {
          // Loop back to start
          setCurrentScreen(0);
          setProgress(0);
        }
      }
    }, interval);

    return () => clearInterval(timer);
  }, [isPlaying, currentScreen, totalDuration]);

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
            {['Dashboard', 'Employees', 'Attendance', 'Recruitment', 'AI Jobs'].map((item, i) => (
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
              <DemoScreen screenId={screen.id} isActive={index === currentScreen && isPlaying} />
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
                {demoScreens[currentScreen].title}
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

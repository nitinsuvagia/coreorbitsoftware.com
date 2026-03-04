'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  CheckCircle2,
  Circle,
  ChevronUp,
  ChevronDown,
  Rocket,
  Building2,
  Users,
  Settings,
  Mail,
  Shield,
  Calendar,
  Sparkles,
  X,
  Minimize2,
  Maximize2,
  PartyPopper,
  BadgeCheck,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter, usePathname } from 'next/navigation';
import { apiClient } from '@/lib/api/client';

interface OnboardingTask {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  route: string;
  category: 'organization' | 'settings';
  checkKey: string;
}

interface OnboardingStatus {
  [key: string]: boolean | string;
}

const ONBOARDING_TASKS: OnboardingTask[] = [
  // Organization Setup
  {
    id: 'org-profile',
    title: 'Company Profile',
    description: 'Add your company name, logo, and basic info',
    icon: <Building2 className="h-4 w-4" />,
    route: '/organization',
    category: 'organization',
    checkKey: 'companyProfileCompleted',
  },
  {
    id: 'departments',
    title: 'Setup Departments',
    description: 'Create departments for your organization',
    icon: <Users className="h-4 w-4" />,
    route: '/organization/departments',
    category: 'organization',
    checkKey: 'departmentsCreated',
  },
  {
    id: 'designations',
    title: 'Setup Designations',
    description: 'Define job titles and designations',
    icon: <BadgeCheck className="h-4 w-4" />,
    route: '/organization/designations',
    category: 'organization',
    checkKey: 'designationsCreated',
  },
  {
    id: 'roles',
    title: 'Configure Roles',
    description: 'Setup roles and permissions',
    icon: <Shield className="h-4 w-4" />,
    route: '/organization/roles',
    category: 'organization',
    checkKey: 'rolesConfigured',
  },
  {
    id: 'employee-code',
    title: 'Employee Code Setup',
    description: 'Configure employee ID format and prefix',
    icon: <BadgeCheck className="h-4 w-4" />,
    route: '/organization/settings',
    category: 'organization',
    checkKey: 'employeeCodeConfigured',
  },
  // Settings
  {
    id: 'regional-settings',
    title: 'Regional Settings',
    description: 'Set timezone, date format, and currency',
    icon: <Settings className="h-4 w-4" />,
    route: '/organization/settings',
    category: 'settings',
    checkKey: 'regionalSettingsConfigured',
  },
  {
    id: 'working-hours',
    title: 'Working Hours',
    description: 'Configure working days and hours',
    icon: <Calendar className="h-4 w-4" />,
    route: '/organization/settings',
    category: 'settings',
    checkKey: 'workingHoursConfigured',
  },
  {
    id: 'leave-types',
    title: 'Leave Types',
    description: 'Setup leave policies and types',
    icon: <Calendar className="h-4 w-4" />,
    route: '/organization/settings',
    category: 'settings',
    checkKey: 'leaveTypesConfigured',
  },
  {
    id: 'email-config',
    title: 'Email Configuration',
    description: 'Setup email notifications',
    icon: <Mail className="h-4 w-4" />,
    route: '/organization/email',
    category: 'settings',
    checkKey: 'emailConfigured',
  },
  {
    id: 'ai-integration',
    title: 'AI Integration',
    description: 'Enable AI-powered features',
    icon: <Sparkles className="h-4 w-4" />,
    route: '/organization/integrations',
    category: 'settings',
    checkKey: 'aiIntegrationEnabled',
  },
];

export function OnboardingChecklist() {
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [status, setStatus] = useState<OnboardingStatus>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>('organization');
  const lastFetchRef = useRef<number>(0);
  const prevPathRef = useRef<string>(pathname);

  // Calculate completion percentage
  const completedTasks = ONBOARDING_TASKS.filter(task => status[task.checkKey] === true).length;
  const totalTasks = ONBOARDING_TASKS.length;
  const completionPercentage = Math.round((completedTasks / totalTasks) * 100);
  const isComplete = completionPercentage === 100;

  // Check localStorage for dismissed state on mount (for faster initial render)
  useEffect(() => {
    const dismissedFromStorage = localStorage.getItem('onboarding-checklist-dismissed');
    if (dismissedFromStorage === 'true') {
      setDismissed(true);
      // Don't set loading false yet - let the API call confirm
    }
  }, []);

  // Fetch onboarding status
  const fetchStatus = useCallback(async (showRefreshing = false) => {
    // Debounce: don't fetch if last fetch was < 2 seconds ago
    const now = Date.now();
    if (now - lastFetchRef.current < 2000 && !showRefreshing) {
      return;
    }
    lastFetchRef.current = now;

    if (showRefreshing) setRefreshing(true);
    try {
      const response = await apiClient.get<OnboardingStatus>('/api/v1/setup-status');
      if (response.success && response.data) {
        setStatus(response.data);
        
        // Use backend dismissed state as source of truth
        if (response.data.dismissed) {
          setDismissed(true);
          localStorage.setItem('onboarding-checklist-dismissed', 'true');
        } else {
          // Backend says not dismissed - clear localStorage if it was set incorrectly
          localStorage.removeItem('onboarding-checklist-dismissed');
          setDismissed(false);
        }
      }
    } catch (error) {
      console.error('Failed to fetch setup status:', error);
      // Don't show onboarding if API fails
      setDismissed(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Refetch when returning to the checklist from a task route
  useEffect(() => {
    // If we just changed routes, refresh status
    if (prevPathRef.current !== pathname) {
      // Small delay to let backend process any changes
      setTimeout(() => fetchStatus(), 500);
    }
    
    prevPathRef.current = pathname;
  }, [pathname, fetchStatus]);

  // Refetch when user returns to the tab (visibility change)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchStatus();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [fetchStatus]);

  // Periodic refresh every 30 seconds to catch any updates
  useEffect(() => {
    const interval = setInterval(() => {
      fetchStatus();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  // Manual refresh handler
  const handleRefresh = () => {
    fetchStatus(true);
  };

  // Handle task click - navigate to route
  const handleTaskClick = (task: OnboardingTask) => {
    router.push(task.route);
    setIsMinimized(true);
  };

  // Handle dismiss
  const handleDismiss = async () => {
    try {
      // Call backend to persist the dismissed state
      const response = await apiClient.post('/api/v1/setup-status/dismiss');
      if (response.success) {
        // Update localStorage as cache
        localStorage.setItem('onboarding-checklist-dismissed', 'true');
        setDismissed(true);
        setIsOpen(false);
      }
    } catch (error) {
      console.error('Failed to dismiss setup checklist:', error);
    }
  };

  // Group tasks by category
  const organizationTasks = ONBOARDING_TASKS.filter(t => t.category === 'organization');
  const settingsTasks = ONBOARDING_TASKS.filter(t => t.category === 'settings');

  // Don't render if dismissed or loading
  if (dismissed || loading) {
    return null;
  }

  return (
    <>
      {/* Floating Button - Always visible when panel is closed */}
      {!isOpen && (
        <div 
          className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300"
        >
          <Button
            onClick={() => setIsOpen(true)}
            className="h-auto py-3 px-4 rounded-full shadow-lg hover:scale-105 transition-all duration-200 gap-3 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-700 hover:via-indigo-700 hover:to-blue-700 border-0"
          >
            {/* Circular Progress with Rocket */}
            <div className="relative h-10 w-10 flex items-center justify-center">
              <svg className="absolute inset-0 -rotate-90" viewBox="0 0 40 40">
                <circle
                  cx="20"
                  cy="20"
                  r="18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  className="opacity-20"
                />
                <circle
                  cx="20"
                  cy="20"
                  r="18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={`${completionPercentage * 1.13} 113`}
                  className="text-primary-foreground transition-all duration-500"
                />
              </svg>
              <Rocket className="h-5 w-5 relative z-10" />
            </div>
            
            {/* Text Content */}
            <div className="flex flex-col items-start text-primary-foreground">
              <span className="text-xs font-medium opacity-90">Setup Progress</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg font-bold leading-none">{completionPercentage}%</span>
                <span className="text-xs opacity-75">({completedTasks}/{totalTasks})</span>
              </div>
            </div>
          </Button>
        </div>
      )}

      {/* Checklist Panel */}
      {isOpen && (
        <div
          className="fixed bottom-6 right-6 z-50 w-[380px] animate-in fade-in slide-in-from-bottom-4 duration-300"
        >
          <Card className="shadow-2xl border-2">
            <CardHeader className="pb-3 bg-gradient-to-r from-primary/10 to-primary/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-primary rounded-lg">
                    <Rocket className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Setup Checklist</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Complete your organization setup
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleRefresh}
                    disabled={refreshing}
                    title="Refresh status"
                  >
                    <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setIsMinimized(!isMinimized)}
                  >
                    {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setIsOpen(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{completedTasks} of {totalTasks} tasks completed</span>
                  <Badge variant={isComplete ? 'default' : 'secondary'} className={cn(
                    isComplete && 'bg-green-500 hover:bg-green-600'
                  )}>
                    {completionPercentage}%
                  </Badge>
                </div>
                <Progress value={completionPercentage} className="h-2" />
              </div>
            </CardHeader>

            {!isMinimized && (
              <CardContent className="p-0">
                <ScrollArea className="h-[400px]">
                  <div className="p-4 space-y-4">
                    {/* Completion Message */}
                    {isComplete && (
                      <div className="p-4 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                        <div className="flex items-center gap-3">
                          <PartyPopper className="h-8 w-8 text-green-500" />
                          <div>
                            <h4 className="font-semibold text-green-700 dark:text-green-400">
                              Congratulations!
                            </h4>
                            <p className="text-sm text-green-600 dark:text-green-500">
                              Your organization setup is complete!
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-3 w-full border-green-500 text-green-600 hover:bg-green-100"
                          onClick={handleDismiss}
                        >
                          Dismiss Checklist
                        </Button>
                      </div>
                    )}

                    {/* Organization Setup Section */}
                    <div className="space-y-2">
                      <button
                        onClick={() => setExpandedCategory(expandedCategory === 'organization' ? null : 'organization')}
                        className="flex items-center justify-between w-full p-2 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-primary" />
                          <span className="font-semibold text-sm">Organization Setup</span>
                          <Badge variant="outline" className="text-xs">
                            {organizationTasks.filter(t => status[t.checkKey] === true).length}/{organizationTasks.length}
                          </Badge>
                        </div>
                        {expandedCategory === 'organization' ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </button>
                      
                      {expandedCategory === 'organization' && (
                        <div className="space-y-1">
                          {organizationTasks.map((task) => (
                            <TaskItem
                              key={task.id}
                              task={task}
                              completed={status[task.checkKey] === true}
                              onClick={() => handleTaskClick(task)}
                            />
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Settings Section */}
                    <div className="space-y-2">
                      <button
                        onClick={() => setExpandedCategory(expandedCategory === 'settings' ? null : 'settings')}
                        className="flex items-center justify-between w-full p-2 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Settings className="h-4 w-4 text-primary" />
                          <span className="font-semibold text-sm">Settings & AI Integration</span>
                          <Badge variant="outline" className="text-xs">
                            {settingsTasks.filter(t => status[t.checkKey] === true).length}/{settingsTasks.length}
                          </Badge>
                        </div>
                        {expandedCategory === 'settings' ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </button>
                      
                      {expandedCategory === 'settings' && (
                        <div className="space-y-1">
                          {settingsTasks.map((task) => (
                            <TaskItem
                              key={task.id}
                              task={task}
                              completed={status[task.checkKey] === true}
                              onClick={() => handleTaskClick(task)}
                            />
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Dismiss option for non-admin users or skip */}
                    {!isComplete && (
                      <div className="pt-2 border-t">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full text-muted-foreground hover:text-foreground"
                          onClick={handleDismiss}
                        >
                          Skip for now
                        </Button>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            )}
          </Card>
        </div>
      )}
    </>
  );
}

// Task Item Component
function TaskItem({
  task,
  completed,
  onClick,
}: {
  task: OnboardingTask;
  completed: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left',
        completed
          ? 'bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800'
          : 'hover:bg-muted/50 border border-transparent hover:border-muted'
      )}
    >
      {completed ? (
        <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
      ) : (
        <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <p className={cn(
          'text-sm font-medium truncate',
          completed && 'text-green-700 dark:text-green-400 line-through'
        )}>
          {task.title}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {task.description}
        </p>
      </div>
      <div className={cn(
        'p-1.5 rounded-md',
        completed ? 'bg-green-100 dark:bg-green-900' : 'bg-muted'
      )}>
        {task.icon}
      </div>
    </button>
  );
}

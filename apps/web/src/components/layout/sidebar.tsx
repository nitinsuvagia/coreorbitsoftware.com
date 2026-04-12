'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  BarChart3,
  Settings,
  Bell,
  CreditCard,
  Building2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Briefcase,
  UserCheck,
  Video,
  ClipboardCheck,
  CalendarDays,
  Clock,
  File,
  Sparkles,
  Award,
  ClipboardList,
  Landmark,
  Wallet,
  Receipt,
  Monitor,
  Armchair,
  Cpu,
  User,
  CalendarClock,
  MonitorCheck,
  UserMinus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useMemo } from 'react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { usePermissions } from '@/hooks/use-permissions';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Permission(s) required. String = exact match, Array = any matches (OR). Omit = always visible. */
  permission?: string | string[];
  /** If true, hidden for tenant_admin (owner) who is not an employee */
  employeeOnly?: boolean;
  /** If true, only visible for tenant_admin */
  adminOnly?: boolean;
}

interface NavCategory {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NavItem[];
}

// Standalone items (no category)
const standaloneItems: NavItem[] = [
  { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, permission: 'dashboard:view' },
  { title: 'My 360°', href: '/my-360', icon: User, employeeOnly: true },
  { title: 'Attendance', href: '/attendance', icon: Clock, employeeOnly: true },
  { title: 'Attendance Monitor', href: '/attendance/monitor', icon: MonitorCheck, permission: 'attendance_monitor:view' },
  { title: 'Admin 360°', href: '/admin-360', icon: Sparkles, permission: 'admin_360:view', adminOnly: true },
];

// Categorized navigation
const categories: NavCategory[] = [
  {
    title: 'HR',
    icon: Users,
    items: [
      { title: 'HR Dashboard', href: '/hr/dashboard', icon: LayoutDashboard, permission: 'hr_dashboard:view' },
      { title: 'Job Descriptions', href: '/hr/jobs', icon: Briefcase, permission: 'hr_jobs:read' },
      { title: 'Candidates', href: '/hr/candidates', icon: UserCheck, permission: 'hr_candidates:read' },
      { title: 'Interviews', href: '/hr/interviews', icon: Video, permission: 'hr_interviews:read' },
      { title: 'Assessments', href: '/hr/assessments', icon: ClipboardCheck, permission: 'hr_assessments:read' },
      { title: 'Employees', href: '/employees', icon: Users, permission: 'employees:read' },
      { title: 'Holidays', href: '/hr/holidays', icon: CalendarDays, permission: 'holidays:read' },
      { title: 'Leave Management', href: '/hr/leave-management', icon: CalendarClock, permission: ['leave:read', 'leave:self'] },
      { title: 'Performance', href: '/hr/performance-reviews', icon: ClipboardList, permission: ['performance:read', 'performance:self'] },
      { title: 'Resignations', href: '/hr/resignations', icon: UserMinus },
      { title: 'Documents', href: '/documents', icon: File, permission: ['documents:read', 'documents:self'] },
    ],
  },
  {
    title: 'Backoffice',
    icon: Landmark,
    items: [
      { title: 'Banks', href: '/backoffice/banks', icon: Landmark, permission: 'billing:view' },
      { title: 'Accounts', href: '/backoffice/accounts', icon: Wallet, permission: 'billing:view' },
      { title: 'Expenses', href: '/backoffice/expenses', icon: Receipt, permission: 'billing:view' },
    ],
  },
  {
    title: 'Inventory',
    icon: Monitor,
    items: [
      { title: 'Hardware', href: '/inventory/hardware', icon: Monitor, permission: 'organization:view' },
      { title: 'Furniture', href: '/inventory/furniture', icon: Armchair, permission: 'organization:view' },
      { title: 'Electronics', href: '/inventory/electronics', icon: Cpu, permission: 'organization:view' },
    ],
  },
];

// Items after categories
const afterCategoryItems: NavItem[] = [
  { title: 'Reports', href: '/reports', icon: BarChart3, permission: 'reports:view' },
];

// Secondary navigation (below divider)
const secondaryNavItems: NavItem[] = [
  { title: 'Notifications', href: '/notifications', icon: Bell, permission: 'notifications:read' },
  { title: 'Billing', href: '/billing', icon: CreditCard, permission: 'billing:view' },
  { title: 'Organization', href: '/organization', icon: Building2, permission: 'organization:view' },
  { title: 'Settings', href: '/settings', icon: Settings, permission: 'settings:view' },
];

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [openCategories, setOpenCategories] = useState<string[]>(['HR']);
  const { can, canAny, isAdmin } = usePermissions();

  // Filter nav items based on permissions (supports string or string[] for OR logic)
  const filterItems = (items: NavItem[]) =>
    items.filter((item) => {
      // Hide employee-only items for tenant owner (not an employee)
      if (item.employeeOnly && isAdmin) return false;
      // Hide admin-only items for non-admin users
      if (item.adminOnly && !isAdmin) return false;
      if (!item.permission) return true;
      if (Array.isArray(item.permission)) return canAny(...item.permission);
      return can(item.permission);
    });

  const filteredStandalone = useMemo(() => filterItems(standaloneItems), [can, canAny, isAdmin]);
  const filteredCategories = useMemo(() =>
    categories
      .map((cat) => ({ ...cat, items: filterItems(cat.items) }))
      .filter((cat) => cat.items.length > 0),
    [can, canAny, isAdmin]
  );
  const filteredAfterCategory = useMemo(() => filterItems(afterCategoryItems), [can, canAny]);
  const filteredSecondary = useMemo(() => filterItems(secondaryNavItems), [can, canAny]);

  const toggleCategory = (category: string) => {
    setOpenCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  // Check if item is active - exact match only for standalone items
  const isItemActive = (href: string, exactOnly = false) => {
    if (exactOnly || standaloneItems.some(item => item.href === href)) {
      return pathname === href;
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const isCategoryActive = (category: NavCategory) => {
    return category.items.some((item) => isItemActive(item.href));
  };

  return (
    <aside
      className={cn(
        'relative flex flex-col h-screen border-r bg-background transition-all duration-300 print:hidden',
        collapsed ? 'w-16' : 'w-64',
        className
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center border-b px-4">
        <Link href="/dashboard" className="flex items-center">
          {collapsed ? (
            <img
              src="/logo-thumbnail.svg"
              alt="CoreOrbit"
              className="h-10 w-10"
            />
          ) : (
            <img
              src="/logo-horizontal.svg"
              alt="CoreOrbit Software"
              className="h-12 w-auto"
            />
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-2">
        {/* Standalone Items */}
        <div className="space-y-1">
          {filteredStandalone.map((item) => {
            const isActive = isItemActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span>{item.title}</span>}
              </Link>
            );
          })}
        </div>

        {/* Categorized Items */}
        {filteredCategories.map((category) => {
          const isOpen = openCategories.includes(category.title);
          const categoryActive = isCategoryActive(category);

          if (collapsed) {
            // Show only first item icon when collapsed
            return (
              <div key={category.title} className="space-y-1">
                <Link
                  href={category.items[0].href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    categoryActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                  title={category.title}
                >
                  <category.icon className="h-5 w-5 shrink-0" />
                </Link>
              </div>
            );
          }

          return (
            <Collapsible
              key={category.title}
              open={isOpen}
              onOpenChange={() => toggleCategory(category.title)}
            >
              <CollapsibleTrigger asChild>
                <button
                  className={cn(
                    'flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    categoryActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <category.icon className="h-5 w-5 shrink-0" />
                    <span>{category.title}</span>
                  </div>
                  <ChevronDown
                    className={cn(
                      'h-4 w-4 transition-transform',
                      isOpen && 'rotate-180'
                    )}
                  />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pl-4 space-y-1 mt-1">
                {category.items.map((item) => {
                  const isActive = isItemActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                      )}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span>{item.title}</span>
                    </Link>
                  );
                })}
              </CollapsibleContent>
            </Collapsible>
          );
        })}

        {/* After Category Items */}
        {filteredAfterCategory.length > 0 && <div className="space-y-1 pt-2">
          {filteredAfterCategory.map((item) => {
            const isActive = isItemActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span>{item.title}</span>}
              </Link>
            );
          })}
        </div>}

        {filteredSecondary.length > 0 && <div className="my-4 border-t" />}

        {/* Secondary Navigation */}
        <div className="space-y-1">
          {filteredSecondary.map((item) => {
            const isActive = isItemActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span>{item.title}</span>}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Collapse Button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute -right-3 top-20 h-6 w-6 rounded-full border bg-background"
        onClick={() => setCollapsed(!collapsed)}
      >
        {collapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </Button>
    </aside>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  FileText,
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavCategory {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NavItem[];
}

// Standalone items (no category)
const standaloneItems: NavItem[] = [
  { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { title: 'Admin 360°', href: '/admin-360', icon: Sparkles },
];

// Categorized navigation
const categories: NavCategory[] = [
  {
    title: 'HR',
    icon: Users,
    items: [
      { title: 'HR 360°', href: '/hr/dashboard', icon: LayoutDashboard },
      { title: 'Job Descriptions', href: '/hr/jobs', icon: Briefcase },
      { title: 'Candidates', href: '/hr/candidates', icon: UserCheck },
      { title: 'Interviews', href: '/hr/interviews', icon: Video },
      { title: 'Assessment Tool', href: '/hr/assessments', icon: ClipboardCheck },
      { title: 'Employees', href: '/employees', icon: Users },
      { title: 'Holidays', href: '/hr/holidays', icon: CalendarDays },
      { title: 'Leave Management', href: '/hr/leave-management', icon: Clock },
      { title: 'Documents', href: '/documents', icon: File },
    ],
  },
];

// Items after categories
const afterCategoryItems: NavItem[] = [
  { title: 'Reports', href: '/reports', icon: BarChart3 },
];

// Secondary navigation (below divider)
const secondaryNavItems: NavItem[] = [
  { title: 'Notifications', href: '/notifications', icon: Bell },
  { title: 'Billing', href: '/billing', icon: CreditCard },
  { title: 'Organization', href: '/organization', icon: Building2 },
  { title: 'Settings', href: '/settings', icon: Settings },
];

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [openCategories, setOpenCategories] = useState<string[]>(['HR']);

  const toggleCategory = (category: string) => {
    setOpenCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const isItemActive = (href: string) => {
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
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
            O
          </div>
          {!collapsed && (
            <span className="font-semibold">Office Manager</span>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-2">
        {/* Standalone Items */}
        <div className="space-y-1">
          {standaloneItems.map((item) => {
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
        {categories.map((category) => {
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
        <div className="space-y-1 pt-2">
          {afterCategoryItems.map((item) => {
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

        <div className="my-4 border-t" />

        {/* Secondary Navigation */}
        <div className="space-y-1">
          {secondaryNavItems.map((item) => {
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

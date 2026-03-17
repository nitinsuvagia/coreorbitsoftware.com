'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { 
  Save, 
  Loader2, 
  LayoutDashboard,
  Users,
  Calendar,
  FileText,
  FolderOpen,
  ClipboardList,
  BarChart3,
  Settings,
  CreditCard,
  UserPlus,
  Shield,
  Briefcase,
  Building2,
  Star,
  CheckCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  getRoles, 
  getAllPermissions, 
  getRolePermissions, 
  updateRolePermissions,
  type Role as ApiRole,
} from '@/lib/api/roles';

// Page definitions with their required permissions
// NOTE: permission format must match resource:action exactly as stored in the DB
const PAGE_DEFINITIONS = [
  { 
    id: 'dashboard', 
    name: 'Dashboard', 
    icon: LayoutDashboard, 
    permission: 'dashboard:view',
    description: 'Main dashboard with overview stats'
  },
  { 
    id: 'admin_360', 
    name: 'Admin 360', 
    icon: Shield, 
    permission: 'admin_360:view',
    description: 'Admin analytics and insights'
  },
  { 
    id: 'hr_dashboard', 
    name: 'HR Dashboard', 
    icon: Users, 
    permission: 'employees:read',
    description: 'HR module main page'
  },
  { 
    id: 'employees_view', 
    name: 'Employees (View)', 
    icon: Users, 
    permission: 'employees:read',
    description: 'View employee list and profiles'
  },
  { 
    id: 'employees_edit', 
    name: 'Employees (Edit/Add)', 
    icon: UserPlus, 
    permission: 'employees:write',
    description: 'Add, edit, import employees'
  },
  { 
    id: 'attendance', 
    name: 'Attendance', 
    icon: Calendar, 
    permission: 'attendance:read',
    description: 'View attendance records'
  },
  { 
    id: 'attendance_manage', 
    name: 'Attendance (Manage)', 
    icon: Calendar, 
    permission: 'attendance:write',
    description: 'Approve, edit attendance'
  },
  { 
    id: 'attendance_monitor', 
    name: 'Attendance Monitor', 
    icon: Calendar, 
    permission: 'attendance_monitor:view',
    description: 'Real-time attendance monitoring for all employees'
  },
  { 
    id: 'leave_view', 
    name: 'Leave Requests (View)', 
    icon: Calendar, 
    permission: 'leave:read',
    description: 'View leave requests'
  },
  { 
    id: 'leave_manage', 
    name: 'Leave Requests (Manage)', 
    icon: Calendar, 
    permission: 'leave:write',
    description: 'Approve/reject leaves'
  },
  { 
    id: 'holidays_view', 
    name: 'Holidays (View)', 
    icon: Calendar, 
    permission: 'holidays:read',
    description: 'View holidays calendar'
  },
  { 
    id: 'holidays_manage', 
    name: 'Holidays (Manage)', 
    icon: Calendar, 
    permission: 'holidays:write',
    description: 'Add/edit holidays'
  },
  { 
    id: 'projects', 
    name: 'Projects', 
    icon: Briefcase, 
    permission: 'projects:read',
    description: 'View and manage projects'
  },
  { 
    id: 'tasks', 
    name: 'Tasks', 
    icon: ClipboardList, 
    permission: 'tasks:read',
    description: 'View and manage tasks'
  },
  { 
    id: 'documents', 
    name: 'Documents', 
    icon: FolderOpen, 
    permission: 'documents:read',
    description: 'Access document management'
  },
  { 
    id: 'reports', 
    name: 'Reports', 
    icon: BarChart3, 
    permission: 'reports:view',
    description: 'View reports and analytics'
  },
  { 
    id: 'hr_candidates', 
    name: 'HR: Candidates', 
    icon: UserPlus, 
    permission: 'hr_candidates:read',
    description: 'Recruitment candidates'
  },
  { 
    id: 'hr_jobs', 
    name: 'HR: Job Listings', 
    icon: FileText, 
    permission: 'hr_jobs:read',
    description: 'Job descriptions'
  },
  { 
    id: 'hr_interviews', 
    name: 'HR: Interviews', 
    icon: Users, 
    permission: 'hr_interviews:read',
    description: 'Interview scheduling'
  },
  { 
    id: 'organization', 
    name: 'Organization Settings', 
    icon: Building2, 
    permission: 'organization:view',
    description: 'Org settings (view only)'
  },
  { 
    id: 'organization_manage', 
    name: 'Organization (Manage)', 
    icon: Settings, 
    permission: 'organization:manage',
    description: 'Manage org settings'
  },
  { 
    id: 'performance', 
    name: 'Performance Reviews', 
    icon: Star, 
    permission: 'performance:read',
    description: 'View performance reviews'
  },
];

interface Permission {
  id: string;
  resource: string;
  action: string;
  name: string;
}

interface RolePermissionsMap {
  [roleId: string]: Set<string>;
}

interface InitialRolePermissionsMap {
  [roleId: string]: string[];
}

export function PageAccessMatrix() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [roles, setRoles] = useState<ApiRole[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermissionsMap>({});
  const [initialRolePermissions, setInitialRolePermissions] = useState<InitialRolePermissionsMap>({});
  const [hasChanges, setHasChanges] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch roles using API function
      const rolesData = await getRoles();
      const sortedRoles = rolesData.sort((a, b) => {
        // Sort: Tenant Admin first, then by name
        if (a.slug === 'tenant_admin') return -1;
        if (b.slug === 'tenant_admin') return 1;
        if (a.slug === 'admin') return -1;
        if (b.slug === 'admin') return 1;
        return a.name.localeCompare(b.name);
      });
      setRoles(sortedRoles);

      // Fetch all permissions using API function
      const permsData = await getAllPermissions();
      // Convert grouped permissions to flat array with id, resource, action
      const flatPermissions: Permission[] = [];
      if (permsData.grouped) {
        for (const [resource, actions] of Object.entries(permsData.grouped)) {
          for (const perm of actions) {
            flatPermissions.push({
              id: perm.id,
              resource,
              action: perm.action,
              name: `${resource}:${perm.action}`,
            });
          }
        }
      }
      setPermissions(flatPermissions);

      // Fetch permissions for each role
      const rolePermsMap: RolePermissionsMap = {};
      for (const role of sortedRoles) {
        const rolePermsData = await getRolePermissions(role.id);
        rolePermsMap[role.id] = new Set(rolePermsData?.permissionIds || []);
      }
      setRolePermissions(rolePermsMap);
      setInitialRolePermissions(JSON.parse(JSON.stringify(Object.fromEntries(
        Object.entries(rolePermsMap).map(([k, v]) => [k, Array.from(v)])
      ))));
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load roles and permissions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Check for changes
  useEffect(() => {
    if (Object.keys(initialRolePermissions).length === 0) return;
    
    let changed = false;
    for (const roleId of Object.keys(rolePermissions)) {
      const current = rolePermissions[roleId];
      const initial = new Set(initialRolePermissions[roleId] || []);
      
      if (current.size !== initial.size) {
        changed = true;
        break;
      }
      for (const perm of current) {
        if (!initial.has(perm)) {
          changed = true;
          break;
        }
      }
      if (changed) break;
    }
    setHasChanges(changed);
  }, [rolePermissions, initialRolePermissions]);

  const getPermissionIdByName = (permName: string): string | null => {
    const [resource, action] = permName.split(':');
    const perm = permissions.find(p => p.resource === resource && p.action === action);
    return perm?.id || null;
  };

  const hasPageAccess = (roleId: string, pagePermission: string): boolean => {
    const permId = getPermissionIdByName(pagePermission);
    if (!permId) return false;
    return rolePermissions[roleId]?.has(permId) || false;
  };

  const handleToggle = (roleId: string, pagePermission: string) => {
    const permId = getPermissionIdByName(pagePermission);
    if (!permId) return;

    setRolePermissions(prev => {
      const newMap = { ...prev };
      const rolePerms = new Set(prev[roleId] || []);
      
      if (rolePerms.has(permId)) {
        rolePerms.delete(permId);
      } else {
        rolePerms.add(permId);
      }
      
      newMap[roleId] = rolePerms;
      return newMap;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Find which roles have changes and update them
      for (const roleId of Object.keys(rolePermissions)) {
        const current = Array.from(rolePermissions[roleId]);
        const initial = initialRolePermissions[roleId] || [];
        
        // Check if this role has changes
        if (current.length !== initial.length || !current.every(p => initial.includes(p))) {
          await updateRolePermissions(roleId, current);
        }
      }
      
      toast.success('Page access permissions saved successfully');
      // Update initial state
      setInitialRolePermissions(JSON.parse(JSON.stringify(Object.fromEntries(
        Object.entries(rolePermissions).map(([k, v]) => [k, Array.from(v)])
      ))));
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to save permissions:', error);
      toast.error('Failed to save permissions');
    } finally {
      setSaving(false);
    }
  };

  const handleSelectAllForPage = (pagePermission: string) => {
    const permId = getPermissionIdByName(pagePermission);
    if (!permId) return;

    // Check if all roles have this permission
    const allHave = roles.every(role => rolePermissions[role.id]?.has(permId));

    setRolePermissions(prev => {
      const newMap = { ...prev };
      for (const role of roles) {
        const rolePerms = new Set(prev[role.id] || []);
        if (allHave) {
          rolePerms.delete(permId);
        } else {
          rolePerms.add(permId);
        }
        newMap[role.id] = rolePerms;
      }
      return newMap;
    });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-96" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="text-xl flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Page Access Matrix
          </CardTitle>
          <CardDescription>
            Configure which roles can access each page/feature. Check the box to grant access.
          </CardDescription>
        </div>
        <Button onClick={handleSave} disabled={saving || !hasChanges}>
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          {hasChanges ? 'Save Changes' : 'No Changes'}
        </Button>
      </CardHeader>
      <CardContent>
        <ScrollArea className="w-full">
          <div className="min-w-[800px]">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium sticky left-0 bg-muted/50 z-10 min-w-[250px]">
                    Page / Feature
                  </th>
                  {roles.map(role => (
                    <th key={role.id} className="text-center p-3 font-medium min-w-[100px]">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-xs">{role.name}</span>
                        {role.isSystem && (
                          <Badge variant="secondary" className="text-[10px] px-1 py-0">
                            System
                          </Badge>
                        )}
                      </div>
                    </th>
                  ))}
                  <th className="text-center p-3 font-medium min-w-[80px]">
                    <span className="text-xs text-muted-foreground">All</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {PAGE_DEFINITIONS.map((page, idx) => {
                  const Icon = page.icon;
                  const allChecked = roles.every(role => hasPageAccess(role.id, page.permission));
                  const someChecked = roles.some(role => hasPageAccess(role.id, page.permission));
                  
                  return (
                    <tr 
                      key={page.id} 
                      className={`border-b hover:bg-muted/30 transition-colors ${idx % 2 === 0 ? 'bg-white dark:bg-gray-950' : 'bg-muted/10'}`}
                    >
                      <td className="p-3 sticky left-0 bg-inherit z-10">
                        <div className="flex items-center gap-3">
                          <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <div>
                            <div className="font-medium text-sm">{page.name}</div>
                            <div className="text-xs text-muted-foreground">{page.description}</div>
                          </div>
                        </div>
                      </td>
                      {roles.map(role => (
                        <td key={role.id} className="text-center p-3">
                          <Checkbox
                            checked={hasPageAccess(role.id, page.permission)}
                            onCheckedChange={() => handleToggle(role.id, page.permission)}
                            className="mx-auto"
                          />
                        </td>
                      ))}
                      <td className="text-center p-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => handleSelectAllForPage(page.permission)}
                          title={allChecked ? 'Revoke from all' : 'Grant to all'}
                        >
                          <CheckCheck className={`h-4 w-4 ${allChecked ? 'text-green-600' : someChecked ? 'text-amber-500' : 'text-muted-foreground'}`} />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        {hasChanges && (
          <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
            <p className="text-sm text-amber-800 dark:text-amber-200 flex items-center gap-2">
              <Badge variant="outline" className="bg-amber-100">Unsaved</Badge>
              You have unsaved changes. Click "Save Changes" to apply them.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default PageAccessMatrix;

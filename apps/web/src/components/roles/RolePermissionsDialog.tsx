'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { 
  Loader2, 
  Shield,
  Users,
  Building2,
  Calendar,
  FileText,
  FolderOpen,
  ClipboardList,
  BarChart3,
  Settings,
  CreditCard,
  UserPlus,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  getAllPermissions, 
  getRolePermissions, 
  updateRolePermissions,
  type GroupedPermissions,
} from '@/lib/api/roles';

// Resource icons mapping
const resourceIcons: Record<string, typeof Shield> = {
  employees: Users,
  departments: Building2,
  designations: Users,
  roles: Shield,
  users: Users,
  attendance: Calendar,
  leaves: Calendar,
  leave_types: Calendar,
  holidays: Calendar,
  projects: ClipboardList,
  tasks: ClipboardList,
  documents: FileText,
  folders: FolderOpen,
  reports: BarChart3,
  candidates: UserPlus,
  job_descriptions: FileText,
  interviews: UserPlus,
  settings: Settings,
  tenant: Building2,
  billing: CreditCard,
  subscriptions: CreditCard,
  invoices: CreditCard,
  payments: CreditCard,
};

// Resource display names
const resourceNames: Record<string, string> = {
  employees: 'Employees',
  departments: 'Departments',
  designations: 'Designations',
  roles: 'Roles',
  users: 'Users',
  attendance: 'Attendance',
  leaves: 'Leave Requests',
  leave_types: 'Leave Types',
  holidays: 'Holidays',
  projects: 'Projects',
  tasks: 'Tasks',
  documents: 'Documents',
  folders: 'Folders',
  reports: 'Reports',
  candidates: 'Candidates',
  job_descriptions: 'Job Descriptions',
  interviews: 'Interviews',
  settings: 'Settings',
  tenant: 'Organization',
  billing: 'Billing',
  subscriptions: 'Subscriptions',
  invoices: 'Invoices',
  payments: 'Payments',
};

// Action display names
const actionNames: Record<string, string> = {
  view: 'View',
  create: 'Create',
  update: 'Update / Edit',
  delete: 'Delete',
  export: 'Export',
  import: 'Import',
  approve: 'Approve / Reject',
  assign: 'Assign',
  manage: 'Manage',
};

interface RolePermissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roleId: string | null;
  roleName: string;
  isSystem: boolean;
}

export function RolePermissionsDialog({
  open,
  onOpenChange,
  roleId,
  roleName,
  isSystem,
}: RolePermissionsDialogProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [allPermissions, setAllPermissions] = useState<GroupedPermissions | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
  const [initialPermissions, setInitialPermissions] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async () => {
    if (!roleId) return;
    
    setLoading(true);
    try {
      // Fetch all permissions and role's current permissions in parallel
      const [perms, rolePerms] = await Promise.all([
        getAllPermissions(),
        getRolePermissions(roleId),
      ]);
      
      setAllPermissions(perms);
      
      if (rolePerms) {
        const permSet = new Set(rolePerms.permissionIds);
        setSelectedPermissions(permSet);
        setInitialPermissions(new Set(permSet));
      }
    } catch (error) {
      toast.error('Failed to load permissions');
    } finally {
      setLoading(false);
    }
  }, [roleId]);

  useEffect(() => {
    if (open && roleId) {
      fetchData();
    }
  }, [open, roleId, fetchData]);

  const handlePermissionToggle = (permissionId: string) => {
    if (isSystem) return;
    
    setSelectedPermissions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(permissionId)) {
        newSet.delete(permissionId);
      } else {
        newSet.add(permissionId);
      }
      return newSet;
    });
  };

  const handleSelectAllInResource = (resource: string, permissions: { id: string }[]) => {
    if (isSystem) return;
    
    const permIds = permissions.map(p => p.id);
    const allSelected = permIds.every(id => selectedPermissions.has(id));
    
    setSelectedPermissions(prev => {
      const newSet = new Set(prev);
      if (allSelected) {
        // Deselect all
        permIds.forEach(id => newSet.delete(id));
      } else {
        // Select all
        permIds.forEach(id => newSet.add(id));
      }
      return newSet;
    });
  };

  const handleSave = async () => {
    if (!roleId || isSystem) return;
    
    try {
      setSaving(true);
      await updateRolePermissions(roleId, Array.from(selectedPermissions));
      toast.success('Permissions updated successfully');
      setInitialPermissions(new Set(selectedPermissions));
      onOpenChange(false);
    } catch (error: any) {
      const message = error?.response?.data?.error?.message || 'Failed to update permissions';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = () => {
    if (selectedPermissions.size !== initialPermissions.size) return true;
    for (const perm of selectedPermissions) {
      if (!initialPermissions.has(perm)) return true;
    }
    return false;
  };

  const getResourceStats = (resource: string) => {
    const permissions = allPermissions?.grouped[resource] || [];
    const selected = permissions.filter(p => selectedPermissions.has(p.id)).length;
    return { selected, total: permissions.length };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Manage Permissions - {roleName}
          </DialogTitle>
          <DialogDescription>
            {isSystem 
              ? 'System role permissions are locked and cannot be modified. Create a custom role to set custom permissions.'
              : 'Enable or disable specific permissions for this role. Changes affect all users with this role.'}
          </DialogDescription>
        </DialogHeader>

        {isSystem && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
            <Shield className="h-4 w-4 flex-shrink-0" />
            <span>This is a system role. Permissions cannot be modified.</span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto pr-2 -mr-2">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : allPermissions && Object.keys(allPermissions.grouped).length > 0 ? (
            <Accordion type="multiple" className="w-full" defaultValue={['employees', 'attendance', 'projects']}>
              {Object.entries(allPermissions.grouped)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([resource, permissions]) => {
                  const IconComponent = resourceIcons[resource] || Shield;
                  const stats = getResourceStats(resource);
                  const allSelected = stats.selected === stats.total;
                  const someSelected = stats.selected > 0 && !allSelected;
                  
                  return (
                    <AccordionItem key={resource} value={resource}>
                      <AccordionTrigger className="hover:no-underline py-3">
                        <div className="flex items-center justify-between w-full pr-4">
                          <div className="flex items-center gap-3">
                            <IconComponent className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {resourceNames[resource] || resource}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={allSelected ? 'default' : someSelected ? 'secondary' : 'outline'} className="text-xs">
                              {stats.selected}/{stats.total}
                            </Badge>
                            {!isSystem && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelectAllInResource(resource, permissions);
                                }}
                              >
                                {allSelected ? 'Deselect All' : 'Select All'}
                              </Button>
                            )}
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="grid grid-cols-2 gap-2 pb-2">
                          {permissions.map((permission) => (
                            <label
                              key={permission.id}
                              className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                                isSystem 
                                  ? 'cursor-not-allowed opacity-60' 
                                  : 'cursor-pointer hover:bg-muted/50'
                              } ${
                                selectedPermissions.has(permission.id) 
                                  ? 'border-primary/50 bg-primary/5' 
                                  : 'border-border'
                              }`}
                            >
                              <Checkbox
                                checked={selectedPermissions.has(permission.id)}
                                onCheckedChange={() => handlePermissionToggle(permission.id)}
                                disabled={isSystem}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-sm">
                                    {actionNames[permission.action] || permission.action}
                                  </span>
                                  {selectedPermissions.has(permission.id) ? (
                                    <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                                  ) : (
                                    <XCircle className="h-3.5 w-3.5 text-muted-foreground/50" />
                                  )}
                                </div>
                                {permission.description && (
                                  <p className="text-xs text-muted-foreground truncate">
                                    {permission.description}
                                  </p>
                                )}
                              </div>
                            </label>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
            </Accordion>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No permissions found in the system.</p>
              <p className="text-sm">Permissions are created during tenant initialization.</p>
            </div>
          )}
        </div>

        <DialogFooter className="pt-4 border-t">
          <div className="flex items-center justify-between w-full">
            <div className="text-sm text-muted-foreground">
              {selectedPermissions.size} permission{selectedPermissions.size !== 1 ? 's' : ''} selected
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                Cancel
              </Button>
              {!isSystem && (
                <Button onClick={handleSave} disabled={saving || !hasChanges()}>
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Save Changes
                </Button>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default RolePermissionsDialog;

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Plus, 
  MoreVertical, 
  Pencil, 
  Trash2, 
  Shield, 
  Users, 
  Loader2,
  RefreshCw,
  Sparkles,
  Lock,
  Star,
  Key,
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  getRoles, 
  createRole, 
  updateRole, 
  deleteRole, 
  seedRoles,
  type Role, 
  type RoleFormData 
} from '@/lib/api/roles';
import { RolePermissionsDialog } from '@/components/roles/RolePermissionsDialog';
import { PageAccessMatrix } from '@/components/roles/PageAccessMatrix';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [deletingRole, setDeletingRole] = useState<Role | null>(null);
  const [managingPermissionsRole, setManagingPermissionsRole] = useState<Role | null>(null);
  const [seeding, setSeeding] = useState(false);

  const [formData, setFormData] = useState<RoleFormData>({
    name: '',
    description: '',
    isDefault: false,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const fetchRoles = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getRoles();
      setRoles(data);
    } catch (error) {
      toast.error('Failed to load roles');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const handleOpenAddDialog = () => {
    setEditingRole(null);
    setFormData({ name: '', description: '', isDefault: false });
    setFormErrors({});
    setDialogOpen(true);
  };

  const handleOpenEditDialog = (role: Role) => {
    if (role.isSystem) {
      toast.error('System roles cannot be edited');
      return;
    }
    setEditingRole(role);
    setFormData({
      name: role.name,
      description: role.description || '',
      isDefault: role.isDefault,
    });
    setFormErrors({});
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingRole(null);
    setFormData({ name: '', description: '', isDefault: false });
    setFormErrors({});
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      errors.name = 'Role name is required';
    } else if (formData.name.length < 2) {
      errors.name = 'Role name must be at least 2 characters';
    } else if (formData.name.length > 100) {
      errors.name = 'Role name must be less than 100 characters';
    }

    if (formData.description && formData.description.length > 500) {
      errors.description = 'Description must be less than 500 characters';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      setSaving(true);
      if (editingRole) {
        await updateRole(editingRole.id, formData);
        toast.success('Role updated successfully');
      } else {
        await createRole(formData);
        toast.success('Role created successfully');
      }
      handleCloseDialog();
      fetchRoles();
    } catch (error: any) {
      console.error('Role save error:', error);
      const message = error?.response?.data?.error?.message 
        || error?.message 
        || 'Failed to save role';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleOpenDeleteDialog = (role: Role) => {
    if (role.isSystem) {
      toast.error('System roles cannot be deleted');
      return;
    }
    if (role.usersCount > 0) {
      toast.error(`Cannot delete role. ${role.usersCount} user(s) are assigned to this role.`);
      return;
    }
    setDeletingRole(role);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingRole) return;

    try {
      setSaving(true);
      await deleteRole(deletingRole.id);
      toast.success('Role deleted successfully');
      setDeleteDialogOpen(false);
      setDeletingRole(null);
      fetchRoles();
    } catch (error: any) {
      const message = error?.response?.data?.error?.message || 'Failed to delete role';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleSeedRoles = async () => {
    try {
      setSeeding(true);
      const result = await seedRoles();
      if (result.created && result.created > 0) {
        toast.success(`${result.created} default roles created`);
        fetchRoles();
      } else if (result.existingCount && result.existingCount > 0) {
        toast.info(`Default roles already exist (${result.existingCount} roles)`);
      } else {
        toast.info('Default roles already exist');
      }
    } catch (error: any) {
      toast.error('Failed to seed default roles');
    } finally {
      setSeeding(false);
    }
  };

  const handleOpenPermissionsDialog = (role: Role) => {
    setManagingPermissionsRole(role);
    setPermissionsDialogOpen(true);
  };

  const handleClosePermissionsDialog = () => {
    setPermissionsDialogOpen(false);
    setManagingPermissionsRole(null);
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="roles" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="roles" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Role Management
          </TabsTrigger>
          <TabsTrigger value="page-access" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            Page Access
          </TabsTrigger>
        </TabsList>

        <TabsContent value="roles" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle className="text-xl flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Role Management
                </CardTitle>
                <CardDescription>
                  Manage organization roles and their permissions. System roles cannot be modified.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={fetchRoles} disabled={loading}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                {roles.length === 0 && !loading && (
                  <Button variant="outline" size="sm" onClick={handleSeedRoles} disabled={seeding}>
                    <Sparkles className={`h-4 w-4 mr-2 ${seeding ? 'animate-pulse' : ''}`} />
                    {seeding ? 'Seeding...' : 'Seed Defaults'}
                  </Button>
            )}
            <Button onClick={handleOpenAddDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Add Role
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : roles.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No roles found</h3>
              <p className="text-muted-foreground mb-4">
                Create your first role or seed default roles to get started.
              </p>
              <div className="flex justify-center gap-2">
                <Button variant="outline" onClick={handleSeedRoles} disabled={seeding}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Seed Default Roles
                </Button>
                <Button onClick={handleOpenAddDialog}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Role
                </Button>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-center">Users</TableHead>
                  <TableHead className="text-center">Type</TableHead>
                  <TableHead className="w-[70px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{role.name}</span>
                        {role.isDefault && (
                          <Badge variant="secondary" className="text-xs">
                            <Star className="h-3 w-3 mr-1" />
                            Default
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {role.slug}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground line-clamp-2">
                        {role.description || '—'}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="font-mono">
                        <Users className="h-3 w-3 mr-1" />
                        {role.usersCount}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {role.isSystem ? (
                        <Badge variant="secondary">
                          <Lock className="h-3 w-3 mr-1" />
                          System
                        </Badge>
                      ) : (
                        <Badge variant="outline">Custom</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenPermissionsDialog(role)}>
                            <Key className="h-4 w-4 mr-2" />
                            Manage Permissions
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleOpenEditDialog(role)}
                            disabled={role.isSystem}
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleOpenDeleteDialog(role)}
                            disabled={role.isSystem || role.usersCount > 0}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="page-access" className="mt-6">
          <PageAccessMatrix />
        </TabsContent>
      </Tabs>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {editingRole ? 'Edit Role' : 'Create New Role'}
            </DialogTitle>
            <DialogDescription>
              {editingRole 
                ? 'Update the role details below.'
                : 'Enter the details for the new role.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Project Manager"
                className={formErrors.name ? 'border-destructive' : ''}
              />
              {formErrors.name && (
                <p className="text-sm text-destructive">{formErrors.name}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of this role..."
                rows={3}
                className={formErrors.description ? 'border-destructive' : ''}
              />
              {formErrors.description && (
                <p className="text-sm text-destructive">{formErrors.description}</p>
              )}
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="isDefault">Default Role</Label>
                <p className="text-xs text-muted-foreground">
                  New users will be assigned this role automatically
                </p>
              </div>
              <Switch
                id="isDefault"
                checked={formData.isDefault}
                onCheckedChange={(checked) => setFormData({ ...formData, isDefault: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingRole ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Role</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the role &quot;{deletingRole?.name}&quot;? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={saving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Permissions Management Dialog */}
      <RolePermissionsDialog
        open={permissionsDialogOpen}
        onOpenChange={(open) => {
          if (!open) handleClosePermissionsDialog();
        }}
        roleId={managingPermissionsRole?.id || null}
        roleName={managingPermissionsRole?.name || ''}
        isSystem={managingPermissionsRole?.isSystem || false}
      />
    </div>
  );
}

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FolderTree, Plus, MoreHorizontal, Edit, Trash2, RefreshCw, AlertTriangle } from 'lucide-react';
import type { Department, DepartmentFormData, DeptFormErrors } from '../types';

interface DepartmentsTabProps {
  departments: Department[];
  loading: boolean;
  saving: boolean;
  dialogOpen: boolean;
  editingDept: Department | null;
  deleteId: string | null;
  formData: DepartmentFormData;
  errors: DeptFormErrors;
  onOpenAddDialog: () => void;
  onOpenEditDialog: (dept: Department) => void;
  onCloseDialog: () => void;
  onSave: () => void;
  onDelete: () => void;
  onPermanentDelete: (id: string) => Promise<boolean>;
  onSetDeleteId: (id: string | null) => void;
  onUpdateFormField: (field: keyof DepartmentFormData, value: string) => void;
}

export function DepartmentsTab({
  departments,
  loading,
  saving,
  dialogOpen,
  editingDept,
  deleteId,
  formData,
  errors,
  onOpenAddDialog,
  onOpenEditDialog,
  onCloseDialog,
  onSave,
  onDelete,
  onPermanentDelete,
  onSetDeleteId,
  onUpdateFormField,
}: DepartmentsTabProps) {
  const [permanentDeleteId, setPermanentDeleteId] = useState<string | null>(null);
  const [isPermanentDeleting, setIsPermanentDeleting] = useState(false);

  const handlePermanentDelete = async () => {
    if (!permanentDeleteId) return;
    setIsPermanentDeleting(true);
    try {
      await onPermanentDelete(permanentDeleteId);
    } finally {
      setIsPermanentDeleting(false);
      setPermanentDeleteId(null);
    }
  };

  const deptToDelete = departments.find(d => d.id === permanentDeleteId);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Departments</CardTitle>
              <CardDescription>Manage your organization's departments</CardDescription>
            </div>
            <Button onClick={onOpenAddDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Add Department
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : departments.length === 0 ? (
            <div className="text-center py-12">
              <FolderTree className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">No departments yet</h3>
              <p className="text-muted-foreground mb-4">Create your first department to organize your employees</p>
              <Button onClick={onOpenAddDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Add Department
              </Button>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-medium">Department</th>
                  <th className="text-left p-3 font-medium">Code</th>
                  <th className="text-left p-3 font-medium">Employees</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {departments.map((dept) => (
                  <tr key={dept.id} className="border-b hover:bg-muted/50">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                          <FolderTree className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <span className="font-medium">{dept.name}</span>
                          {dept.description && (
                            <p className="text-sm text-muted-foreground truncate max-w-xs">{dept.description}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <code className="text-sm bg-muted px-2 py-1 rounded">{dept.code}</code>
                    </td>
                    <td className="p-3">
                      <Badge variant="secondary">{dept._count?.employees || 0}</Badge>
                    </td>
                    <td className="p-3">
                      <Badge variant={dept.isActive ? 'default' : 'outline'}>
                        {dept.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onOpenEditDialog(dept)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-red-600"
                            onClick={() => onSetDeleteId(dept.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete (Deactivate)
                          </DropdownMenuItem>
                          {(dept._count?.employees || 0) === 0 && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="text-red-600 font-medium"
                                onClick={() => setPermanentDeleteId(dept.id)}
                              >
                                <AlertTriangle className="mr-2 h-4 w-4" />
                                Permanently Delete
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Department Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && onCloseDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingDept ? 'Edit Department' : 'Add Department'}</DialogTitle>
            <DialogDescription>
              {editingDept ? 'Update department details' : 'Create a new department for your organization'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="deptName">Name <span className="text-red-500">*</span></Label>
              <Input
                id="deptName"
                value={formData.name}
                onChange={(e) => onUpdateFormField('name', e.target.value)}
                placeholder="e.g., Engineering"
                maxLength={100}
                className={errors.name ? 'border-red-500 focus:ring-red-500' : ''}
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name}</p>
              )}
              <p className="text-xs text-muted-foreground">{formData.name.length}/100 characters</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="deptCode">Code <span className="text-red-500">*</span></Label>
              <Input
                id="deptCode"
                value={formData.code}
                onChange={(e) => {
                  const value = e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '');
                  onUpdateFormField('code', value);
                }}
                placeholder="e.g., ENG"
                maxLength={20}
                className={errors.code ? 'border-red-500 focus:ring-red-500' : ''}
              />
              {errors.code && (
                <p className="text-sm text-red-500">{errors.code}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {formData.code.length}/20 characters (min 2). Only uppercase letters, numbers, hyphens, and underscores.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="deptDesc">Description</Label>
              <Textarea
                id="deptDesc"
                value={formData.description}
                onChange={(e) => onUpdateFormField('description', e.target.value)}
                placeholder="Brief description of this department"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onCloseDialog}>Cancel</Button>
            <Button 
              onClick={onSave} 
              disabled={saving || !formData.name.trim() || formData.code.trim().length < 2}
            >
              {saving && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
              {editingDept ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => onSetDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Department?</AlertDialogTitle>
            <AlertDialogDescription>
              This will deactivate the department. You can reactivate it later if needed.
              Employees in this department will need to be reassigned.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Permanent Delete Confirmation */}
      <AlertDialog open={!!permanentDeleteId} onOpenChange={() => setPermanentDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Permanently Delete Department?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                You are about to <strong>permanently delete</strong> the department{' '}
                <strong>"{deptToDelete?.name}"</strong>.
              </p>
              <p className="text-red-600 font-medium">
                This action cannot be undone. The department will be completely removed from the database.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPermanentDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handlePermanentDelete} 
              className="bg-red-600 hover:bg-red-700"
              disabled={isPermanentDeleting}
            >
              {isPermanentDeleting && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
              Permanently Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

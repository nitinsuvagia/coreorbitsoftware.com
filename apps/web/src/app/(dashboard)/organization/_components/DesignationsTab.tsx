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
import { Briefcase, Plus, MoreHorizontal, Edit, Trash2, RefreshCw, AlertTriangle } from 'lucide-react';
import type { Designation, DesignationFormData, DesigFormErrors } from '../types';

interface DesignationsTabProps {
  designations: Designation[];
  loading: boolean;
  saving: boolean;
  dialogOpen: boolean;
  editingDesig: Designation | null;
  deleteId: string | null;
  formData: DesignationFormData;
  errors: DesigFormErrors;
  onOpenAddDialog: () => void;
  onOpenEditDialog: (desig: Designation) => void;
  onCloseDialog: () => void;
  onSave: () => void;
  onDelete: () => void;
  onPermanentDelete: (id: string) => Promise<boolean>;
  onSetDeleteId: (id: string | null) => void;
  onUpdateFormField: (field: keyof DesignationFormData, value: string | number) => void;
}

export function DesignationsTab({
  designations,
  loading,
  saving,
  dialogOpen,
  editingDesig,
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
}: DesignationsTabProps) {
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

  const desigToDelete = designations.find(d => d.id === permanentDeleteId);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Designations</CardTitle>
              <CardDescription>Manage job titles and roles</CardDescription>
            </div>
            <Button onClick={onOpenAddDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Add Designation
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
          ) : designations.length === 0 ? (
            <div className="text-center py-12">
              <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">No designations yet</h3>
              <p className="text-muted-foreground mb-4">Create job titles and designations for your employees</p>
              <Button onClick={onOpenAddDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Add Designation
              </Button>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-medium">Designation</th>
                  <th className="text-left p-3 font-medium">Code</th>
                  <th className="text-left p-3 font-medium">Level</th>
                  <th className="text-left p-3 font-medium">Employees</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {designations.map((desig) => (
                  <tr key={desig.id} className="border-b hover:bg-muted/50">
                    <td className="p-3">
                      <div>
                        <span className="font-medium">{desig.name}</span>
                        {desig.description && (
                          <p className="text-sm text-muted-foreground truncate max-w-xs">{desig.description}</p>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <code className="text-sm bg-muted px-2 py-1 rounded">{desig.code}</code>
                    </td>
                    <td className="p-3">
                      <Badge variant={desig.level >= 5 ? 'default' : desig.level >= 3 ? 'secondary' : 'outline'}>
                        Level {desig.level}
                      </Badge>
                    </td>
                    <td className="p-3">{desig._count?.employees || 0}</td>
                    <td className="p-3">
                      <Badge variant={desig.isActive ? 'default' : 'outline'}>
                        {desig.isActive ? 'Active' : 'Inactive'}
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
                          <DropdownMenuItem onClick={() => onOpenEditDialog(desig)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-red-600"
                            onClick={() => onSetDeleteId(desig.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete (Deactivate)
                          </DropdownMenuItem>
                          {(desig._count?.employees || 0) === 0 && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="text-red-600 font-medium"
                                onClick={() => setPermanentDeleteId(desig.id)}
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

      {/* Designation Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && onCloseDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingDesig ? 'Edit Designation' : 'Add Designation'}</DialogTitle>
            <DialogDescription>
              {editingDesig ? 'Update designation details' : 'Create a new job title/designation'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="desigName">Name <span className="text-red-500">*</span></Label>
              <Input
                id="desigName"
                value={formData.name}
                onChange={(e) => onUpdateFormField('name', e.target.value)}
                placeholder="e.g., Software Engineer"
                maxLength={100}
                className={errors.name ? 'border-red-500 focus:ring-red-500' : ''}
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name}</p>
              )}
              <p className="text-xs text-muted-foreground">{formData.name.length}/100 characters</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="desigCode">Code <span className="text-red-500">*</span></Label>
              <Input
                id="desigCode"
                value={formData.code}
                onChange={(e) => {
                  const value = e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '');
                  onUpdateFormField('code', value);
                }}
                placeholder="e.g., SWE"
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
              <Label htmlFor="desigLevel">Level <span className="text-red-500">*</span></Label>
              <Input
                id="desigLevel"
                type="number"
                min={1}
                max={20}
                value={formData.level}
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 1;
                  onUpdateFormField('level', Math.min(20, Math.max(1, value)));
                }}
                className={errors.level ? 'border-red-500 focus:ring-red-500' : ''}
              />
              {errors.level && (
                <p className="text-sm text-red-500">{errors.level}</p>
              )}
              <p className="text-xs text-muted-foreground">Level 1-20 (1 = Entry Level, 20 = Executive)</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="desigDesc">Description</Label>
              <Textarea
                id="desigDesc"
                value={formData.description}
                onChange={(e) => onUpdateFormField('description', e.target.value)}
                placeholder="Brief description of this role"
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
              {editingDesig ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => onSetDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Designation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will deactivate the designation. You can reactivate it later if needed.
              Employees with this designation will need to be reassigned.
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
              Permanently Delete Designation?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                You are about to <strong>permanently delete</strong> the designation{' '}
                <strong>"{desigToDelete?.name}"</strong>.
              </p>
              <p className="text-red-600 font-medium">
                This action cannot be undone. The designation will be completely removed from the database.
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

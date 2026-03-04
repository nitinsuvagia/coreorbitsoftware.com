'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Trash2, Save, Edit2, X } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { toast } from 'sonner';

interface CustomField {
  id?: string;
  key: string;
  value: string | null;
  type: 'text' | 'number' | 'date' | 'boolean';
  source?: string;
  isNew?: boolean;
  isEditing?: boolean;
}

interface OtherInformationTabProps {
  employeeId?: string; // undefined for new employees
  initialFields?: CustomField[];
  onFieldsChange?: (fields: CustomField[]) => void;
  readOnly?: boolean;
}

export function OtherInformationTab({
  employeeId,
  initialFields = [],
  onFieldsChange,
  readOnly = false,
}: OtherInformationTabProps) {
  const [fields, setFields] = useState<CustomField[]>(initialFields);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newField, setNewField] = useState<CustomField>({
    key: '',
    value: '',
    type: 'text',
    isNew: true,
  });

  // Fetch existing fields for employee
  useEffect(() => {
    if (employeeId) {
      fetchCustomFields();
    }
  }, [employeeId]);

  const fetchCustomFields = async () => {
    if (!employeeId) return;
    
    setLoading(true);
    try {
      const response = await apiClient.get<Array<{
        id: string;
        key: string;
        value: string;
        type: string;
        source: string;
      }>>(`/api/v1/employees/${employeeId}/custom-fields`);
      if (response.success && response.data) {
        setFields(response.data.map((f) => ({
          id: f.id,
          key: f.key,
          value: f.value,
          type: f.type as 'text' | 'number' | 'date' | 'boolean',
          source: f.source,
        })));
      }
    } catch (error) {
      console.error('Failed to fetch custom fields:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddField = () => {
    if (!newField.key.trim()) {
      toast.error('Field name is required');
      return;
    }

    // Check for duplicate key
    if (fields.some(f => f.key.toLowerCase() === newField.key.toLowerCase())) {
      toast.error('A field with this name already exists');
      return;
    }

    const fieldToAdd = {
      ...newField,
      isNew: true,
      isEditing: false,
    };

    if (employeeId) {
      // Save immediately for existing employees
      saveField(fieldToAdd);
    } else {
      // For new employees, just add to local state
      const updatedFields = [...fields, fieldToAdd];
      setFields(updatedFields);
      onFieldsChange?.(updatedFields);
    }

    // Reset new field form
    setNewField({ key: '', value: '', type: 'text', isNew: true });
  };

  const saveField = async (field: CustomField) => {
    if (!employeeId) return;

    setSaving(true);
    try {
      const response = await apiClient.post(`/api/v1/employees/${employeeId}/custom-fields`, {
        fieldKey: field.key,
        fieldValue: field.value,
        fieldType: field.type,
      });

      if (response.success) {
        toast.success('Field added successfully');
        fetchCustomFields();
      } else {
        toast.error(response.error?.message || 'Failed to add field');
      }
    } catch (error) {
      toast.error('Failed to add field');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateField = async (field: CustomField) => {
    if (!employeeId || !field.id) return;

    setSaving(true);
    try {
      const response = await apiClient.put(`/api/v1/employees/${employeeId}/custom-fields/${field.id}`, {
        fieldValue: field.value,
        fieldType: field.type,
      });

      if (response.success) {
        toast.success('Field updated');
        setFields(fields.map(f => f.id === field.id ? { ...f, isEditing: false } : f));
      } else {
        toast.error(response.error?.message || 'Failed to update field');
      }
    } catch (error) {
      toast.error('Failed to update field');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteField = async (field: CustomField) => {
    if (field.id && employeeId) {
      // Delete from server
      setSaving(true);
      try {
        const response = await apiClient.delete(`/api/v1/employees/${employeeId}/custom-fields/${field.id}`);
        if (response.success) {
          toast.success('Field deleted');
          setFields(fields.filter(f => f.id !== field.id));
        } else {
          toast.error(response.error?.message || 'Failed to delete field');
        }
      } catch (error) {
        toast.error('Failed to delete field');
      } finally {
        setSaving(false);
      }
    } else {
      // Just remove from local state
      const updatedFields = fields.filter(f => f.key !== field.key || f.id !== field.id);
      setFields(updatedFields);
      onFieldsChange?.(updatedFields);
    }
  };

  const toggleEdit = (field: CustomField) => {
    setFields(fields.map(f => 
      f.id === field.id ? { ...f, isEditing: !f.isEditing } : f
    ));
  };

  const updateFieldValue = (field: CustomField, value: string | null) => {
    const updatedFields = fields.map(f => 
      (f.id === field.id || (!f.id && f.key === field.key)) 
        ? { ...f, value } 
        : f
    );
    setFields(updatedFields);
    if (!employeeId) {
      onFieldsChange?.(updatedFields);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Other Information</CardTitle>
        <CardDescription>
          Store additional custom fields for this employee. These fields can also be populated from Excel imports.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add New Field Form */}
        {!readOnly && (
          <div className="border rounded-lg p-4 bg-muted/30">
            <h4 className="text-sm font-medium mb-3">Add New Field</h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Field Name</Label>
                <Input
                  placeholder="e.g., PAN Number"
                  value={newField.key}
                  onChange={(e) => setNewField({ ...newField, key: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Field Type</Label>
                <Select
                  value={newField.type}
                  onValueChange={(v) => setNewField({ ...newField, type: v as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="number">Number</SelectItem>
                    <SelectItem value="date">Date</SelectItem>
                    <SelectItem value="boolean">Yes/No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Value</Label>
                <Input
                  placeholder="Enter value"
                  value={newField.value || ''}
                  onChange={(e) => setNewField({ ...newField, value: e.target.value })}
                />
              </div>
              <div className="flex items-end">
                <Button 
                  onClick={handleAddField} 
                  disabled={!newField.key.trim() || saving}
                  className="w-full"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  Add Field
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Fields Table */}
        {fields.length > 0 ? (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Field Name</TableHead>
                  <TableHead className="w-[100px]">Type</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead className="w-[100px]">Source</TableHead>
                  {!readOnly && <TableHead className="w-[100px] text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {fields.map((field, index) => (
                  <TableRow key={field.id || `new-${index}`}>
                    <TableCell className="font-medium">{field.key}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {field.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {field.isEditing ? (
                        <Input
                          value={field.value || ''}
                          onChange={(e) => updateFieldValue(field, e.target.value)}
                          className="h-8"
                        />
                      ) : (
                        <span className={!field.value ? 'text-muted-foreground italic' : ''}>
                          {field.value || 'No value'}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={field.source === 'import' ? 'secondary' : 'outline'} className="text-xs">
                        {field.source || 'manual'}
                      </Badge>
                    </TableCell>
                    {!readOnly && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {field.isEditing ? (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => handleUpdateField(field)}
                                disabled={saving}
                              >
                                <Save className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => toggleEdit(field)}
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => toggleEdit(field)}
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={() => handleDeleteField(field)}
                                disabled={saving}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>No custom fields added yet.</p>
            <p className="text-sm mt-1">
              Add fields above or they will be automatically created when importing from Excel.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

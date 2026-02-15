'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api/client';
import type { Designation, DesignationFormData, DesigFormErrors } from '../types';

const initialFormData: DesignationFormData = {
  name: '',
  code: '',
  level: 1,
  description: '',
};

export function useDesignations() {
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDesig, setEditingDesig] = useState<Designation | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState<DesignationFormData>(initialFormData);
  const [errors, setErrors] = useState<DesigFormErrors>({});

  const fetchDesignations = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch all designations with a high pageSize to get all records
      const response = await apiClient.get<Designation[]>('/api/v1/designations?pageSize=1000');
      if (response.success) {
        setDesignations(response.data || []);
      }
    } catch (error: any) {
      console.error('Failed to fetch designations:', error);
      toast.error('Failed to load designations');
    } finally {
      setLoading(false);
    }
  }, []);

  const validateForm = useCallback((): boolean => {
    const newErrors: DesigFormErrors = {};
    
    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.trim().length < 1) {
      newErrors.name = 'Name must be at least 1 character';
    } else if (formData.name.trim().length > 100) {
      newErrors.name = 'Name must be at most 100 characters';
    }
    
    // Code validation
    if (!formData.code.trim()) {
      newErrors.code = 'Code is required';
    } else if (formData.code.trim().length < 2) {
      newErrors.code = 'Code must be at least 2 characters';
    } else if (formData.code.trim().length > 20) {
      newErrors.code = 'Code must be at most 20 characters';
    } else if (!/^[A-Z0-9_-]+$/.test(formData.code.trim())) {
      newErrors.code = 'Code must contain only uppercase letters, numbers, hyphens, and underscores';
    }
    
    // Level validation
    if (formData.level < 1) {
      newErrors.level = 'Level must be at least 1';
    } else if (formData.level > 20) {
      newErrors.level = 'Level must be at most 20';
    } else if (!Number.isInteger(formData.level)) {
      newErrors.level = 'Level must be a whole number';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const openAddDialog = useCallback(() => {
    setEditingDesig(null);
    setFormData(initialFormData);
    setErrors({});
    setDialogOpen(true);
  }, []);

  const openEditDialog = useCallback((desig: Designation) => {
    setEditingDesig(desig);
    setFormData({
      name: desig.name,
      code: desig.code,
      level: desig.level,
      description: desig.description || '',
    });
    setErrors({});
    setDialogOpen(true);
  }, []);

  const closeDialog = useCallback(() => {
    setDialogOpen(false);
    setEditingDesig(null);
    setFormData(initialFormData);
    setErrors({});
  }, []);

  const saveDesignation = useCallback(async () => {
    if (!validateForm()) return false;
    
    try {
      setSaving(true);
      if (editingDesig) {
        const response = await apiClient.patch<Designation>(
          `/api/v1/designations/${editingDesig.id}`,
          formData
        );
        if (response.success) {
          toast.success('Designation updated');
          fetchDesignations();
          closeDialog();
          return true;
        } else {
          toast.error(response.error?.message || 'Failed to update designation');
          return false;
        }
      } else {
        const response = await apiClient.post<Designation>('/api/v1/designations', formData);
        if (response.success) {
          toast.success('Designation created');
          fetchDesignations();
          closeDialog();
          return true;
        } else {
          toast.error(response.error?.message || 'Failed to create designation');
          return false;
        }
      }
    } catch (error: any) {
      const apiError = error.response?.data?.error;
      if (apiError?.details) {
        const newErrors: DesigFormErrors = {};
        apiError.details.forEach((detail: any) => {
          if (detail.path?.includes('name')) newErrors.name = detail.message;
          if (detail.path?.includes('code')) newErrors.code = detail.message;
          if (detail.path?.includes('level')) newErrors.level = detail.message;
        });
        setErrors(newErrors);
      } else {
        toast.error(apiError?.message || 'Failed to save designation');
      }
      return false;
    } finally {
      setSaving(false);
    }
  }, [editingDesig, formData, validateForm, fetchDesignations, closeDialog]);

  const deleteDesignation = useCallback(async () => {
    if (!deleteId) return false;
    try {
      const response = await apiClient.delete(`/api/v1/designations/${deleteId}`);
      if (response.success) {
        toast.success('Designation deleted');
        fetchDesignations();
        return true;
      } else {
        toast.error(response.error?.message || 'Failed to delete designation');
        return false;
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to delete designation');
      return false;
    } finally {
      setDeleteId(null);
    }
  }, [deleteId, fetchDesignations]);

  const permanentlyDeleteDesignation = useCallback(async (id: string) => {
    try {
      const response = await apiClient.delete(`/api/v1/designations/${id}/permanent`);
      if (response.success) {
        toast.success('Designation permanently deleted');
        fetchDesignations();
        return true;
      } else {
        toast.error(response.error?.message || 'Failed to permanently delete designation');
        return false;
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to permanently delete designation');
      return false;
    }
  }, [fetchDesignations]);

  const updateFormField = useCallback((field: keyof DesignationFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (field in errors) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  }, [errors]);

  return {
    designations,
    loading,
    saving,
    dialogOpen,
    editingDesig,
    deleteId,
    formData,
    errors,
    fetchDesignations,
    openAddDialog,
    openEditDialog,
    closeDialog,
    saveDesignation,
    deleteDesignation,
    permanentlyDeleteDesignation,
    setDeleteId,
    updateFormField,
  };
}

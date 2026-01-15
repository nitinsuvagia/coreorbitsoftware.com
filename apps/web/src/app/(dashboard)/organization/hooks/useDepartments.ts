'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api/client';
import type { Department, DepartmentFormData, DeptFormErrors } from '../types';

const initialFormData: DepartmentFormData = {
  name: '',
  code: '',
  description: '',
};

export function useDepartments() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState<DepartmentFormData>(initialFormData);
  const [errors, setErrors] = useState<DeptFormErrors>({});

  const fetchDepartments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<Department[]>('/api/v1/departments');
      if (response.success) {
        setDepartments(response.data || []);
      }
    } catch (error: any) {
      console.error('Failed to fetch departments:', error);
      toast.error('Failed to load departments');
    } finally {
      setLoading(false);
    }
  }, []);

  const validateForm = useCallback((): boolean => {
    const newErrors: DeptFormErrors = {};
    
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
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const openAddDialog = useCallback(() => {
    setEditingDept(null);
    setFormData(initialFormData);
    setErrors({});
    setDialogOpen(true);
  }, []);

  const openEditDialog = useCallback((dept: Department) => {
    setEditingDept(dept);
    setFormData({
      name: dept.name,
      code: dept.code,
      description: dept.description || '',
    });
    setErrors({});
    setDialogOpen(true);
  }, []);

  const closeDialog = useCallback(() => {
    setDialogOpen(false);
    setEditingDept(null);
    setFormData(initialFormData);
    setErrors({});
  }, []);

  const saveDepartment = useCallback(async () => {
    if (!validateForm()) return false;
    
    try {
      setSaving(true);
      if (editingDept) {
        const response = await apiClient.patch<Department>(
          `/api/v1/departments/${editingDept.id}`,
          formData
        );
        if (response.success) {
          toast.success('Department updated');
          fetchDepartments();
          closeDialog();
          return true;
        } else {
          toast.error(response.error?.message || 'Failed to update department');
          return false;
        }
      } else {
        const response = await apiClient.post<Department>('/api/v1/departments', formData);
        if (response.success) {
          toast.success('Department created');
          fetchDepartments();
          closeDialog();
          return true;
        } else {
          toast.error(response.error?.message || 'Failed to create department');
          return false;
        }
      }
    } catch (error: any) {
      const apiError = error.response?.data?.error;
      if (apiError?.details) {
        const newErrors: DeptFormErrors = {};
        apiError.details.forEach((detail: any) => {
          if (detail.path?.includes('name')) newErrors.name = detail.message;
          if (detail.path?.includes('code')) newErrors.code = detail.message;
        });
        setErrors(newErrors);
      } else {
        toast.error(apiError?.message || 'Failed to save department');
      }
      return false;
    } finally {
      setSaving(false);
    }
  }, [editingDept, formData, validateForm, fetchDepartments, closeDialog]);

  const deleteDepartment = useCallback(async () => {
    if (!deleteId) return false;
    try {
      const response = await apiClient.delete(`/api/v1/departments/${deleteId}`);
      if (response.success) {
        toast.success('Department deleted');
        fetchDepartments();
        return true;
      } else {
        toast.error(response.error?.message || 'Failed to delete department');
        return false;
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to delete department');
      return false;
    } finally {
      setDeleteId(null);
    }
  }, [deleteId, fetchDepartments]);

  const permanentlyDeleteDepartment = useCallback(async (id: string) => {
    try {
      const response = await apiClient.delete(`/api/v1/departments/${id}/permanent`);
      if (response.success) {
        toast.success('Department permanently deleted');
        fetchDepartments();
        return true;
      } else {
        toast.error(response.error?.message || 'Failed to permanently delete department');
        return false;
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to permanently delete department');
      return false;
    }
  }, [fetchDepartments]);

  const updateFormField = useCallback((field: keyof DepartmentFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (field in errors) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  }, [errors]);

  return {
    departments,
    loading,
    saving,
    dialogOpen,
    editingDept,
    deleteId,
    formData,
    errors,
    fetchDepartments,
    openAddDialog,
    openEditDialog,
    closeDialog,
    saveDepartment,
    deleteDepartment,
    permanentlyDeleteDepartment,
    setDeleteId,
    updateFormField,
  };
}

'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api/client';
import type { Organization, OrgFormErrors } from '../types';

export function useOrganization() {
  const [org, setOrg] = useState<Organization | null>(null);
  const [orgForm, setOrgForm] = useState<Partial<Organization>>({});
  const [orgErrors, setOrgErrors] = useState<OrgFormErrors>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchOrganization = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<Organization>('/api/v1/organization');
      if (response.success && response.data) {
        setOrg(response.data);
        setOrgForm(response.data);
      }
    } catch (error: any) {
      console.error('Failed to fetch organization:', error);
      toast.error('Failed to load organization details');
    } finally {
      setLoading(false);
    }
  }, []);

  const validateForm = useCallback((): boolean => {
    const errors: OrgFormErrors = {};
    
    // Name validation (required, 2-100 chars)
    if (!orgForm.name?.trim()) {
      errors.name = 'Organization name is required';
    } else if (orgForm.name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters';
    } else if (orgForm.name.trim().length > 100) {
      errors.name = 'Name must be at most 100 characters';
    }
    
    // Email validation
    if (orgForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(orgForm.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    // Website validation
    if (orgForm.website && orgForm.website.trim() !== '') {
      try {
        new URL(orgForm.website.startsWith('http') ? orgForm.website : `https://${orgForm.website}`);
      } catch {
        errors.website = 'Please enter a valid URL';
      }
    }
    
    setOrgErrors(errors);
    return Object.keys(errors).length === 0;
  }, [orgForm]);

  const saveOrganization = useCallback(async () => {
    if (!validateForm()) return false;
    
    try {
      setSaving(true);
      const response = await apiClient.put<Organization>('/api/v1/organization', {
        name: orgForm.name,
        legalName: orgForm.legalName,
        email: orgForm.email,
        phone: orgForm.phone,
        website: orgForm.website,
        logo: orgForm.logo,
        reportLogo: orgForm.reportLogo,
        addressLine1: orgForm.address?.line1,
        addressLine2: orgForm.address?.line2,
        city: orgForm.address?.city,
        state: orgForm.address?.state,
        country: orgForm.address?.country,
        postalCode: orgForm.address?.postalCode,
      });
      if (response.success && response.data) {
        setOrg(response.data);
        toast.success('Organization settings saved');
        return true;
      } else {
        const apiError = response.error;
        toast.error(apiError?.message || 'Failed to save organization');
        return false;
      }
    } catch (error: any) {
      const apiError = error.response?.data?.error;
      if (apiError?.details) {
        const newErrors: OrgFormErrors = {};
        apiError.details.forEach((detail: any) => {
          if (detail.path?.includes('name')) newErrors.name = detail.message;
          if (detail.path?.includes('email')) newErrors.email = detail.message;
          if (detail.path?.includes('website')) newErrors.website = detail.message;
        });
        setOrgErrors(newErrors);
      } else {
        toast.error(apiError?.message || 'Failed to save organization');
      }
      return false;
    } finally {
      setSaving(false);
    }
  }, [orgForm, validateForm]);

  const updateFormField = useCallback((field: keyof Organization, value: any) => {
    setOrgForm(prev => ({ ...prev, [field]: value }));
    // Clear error when field is updated
    if (field in orgErrors) {
      setOrgErrors(prev => ({ ...prev, [field]: undefined }));
    }
  }, [orgErrors]);

  const updateAddressField = useCallback((field: string, value: string) => {
    setOrgForm(prev => ({
      ...prev,
      address: { ...prev.address, [field]: value }
    }));
  }, []);

  return {
    org,
    orgForm,
    orgErrors,
    loading,
    saving,
    fetchOrganization,
    saveOrganization,
    updateFormField,
    updateAddressField,
    setOrgErrors,
  };
}

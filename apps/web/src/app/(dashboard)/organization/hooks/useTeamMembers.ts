'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api/client';
import type { TeamMember, InviteFormData } from '../types';

const mockTeamMembers: TeamMember[] = [
  { id: '1', firstName: 'John', lastName: 'Doe', email: 'john@example.com', role: 'OWNER', status: 'ACTIVE', department: 'Engineering', joinedAt: '2024-01-01' },
  { id: '2', firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com', role: 'ADMIN', status: 'ACTIVE', department: 'HR', joinedAt: '2024-01-15' },
  { id: '3', firstName: 'Bob', lastName: 'Wilson', email: 'bob@example.com', role: 'MANAGER', status: 'ACTIVE', department: 'Sales', joinedAt: '2024-02-01' },
  { id: '4', firstName: 'Alice', lastName: 'Brown', email: 'alice@example.com', role: 'MEMBER', status: 'PENDING', department: 'Marketing', joinedAt: '2024-03-01' },
];

const initialInviteForm: InviteFormData = {
  email: '',
  role: 'MEMBER',
};

export function useTeamMembers() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingInvite, setSendingInvite] = useState(false);
  
  // Dialog state
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [removeId, setRemoveId] = useState<string | null>(null);
  
  // Form state
  const [inviteForm, setInviteForm] = useState<InviteFormData>(initialInviteForm);

  const fetchTeamMembers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<TeamMember[]>('/api/v1/organization/members');
      if (response.success) {
        setTeamMembers(response.data || []);
      }
    } catch (error: any) {
      console.error('Failed to fetch team members:', error);
      // Use mock data for demo
      setTeamMembers(mockTeamMembers);
    } finally {
      setLoading(false);
    }
  }, []);

  const openInviteDialog = useCallback(() => {
    setInviteForm(initialInviteForm);
    setInviteDialogOpen(true);
  }, []);

  const closeInviteDialog = useCallback(() => {
    setInviteDialogOpen(false);
    setInviteForm(initialInviteForm);
  }, []);

  const sendInvite = useCallback(async () => {
    try {
      setSendingInvite(true);
      const response = await apiClient.post<{ message: string }>(
        '/api/v1/organization/invite',
        inviteForm
      );
      if (response.success) {
        toast.success('Invitation sent successfully');
        closeInviteDialog();
        fetchTeamMembers();
        return true;
      } else {
        toast.error(response.error?.message || 'Failed to send invitation');
        return false;
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to send invitation');
      return false;
    } finally {
      setSendingInvite(false);
    }
  }, [inviteForm, closeInviteDialog, fetchTeamMembers]);

  const updateMemberRole = useCallback(async (memberId: string, newRole: TeamMember['role']) => {
    try {
      const response = await apiClient.put<TeamMember>(
        `/api/v1/organization/members/${memberId}/role`,
        { role: newRole }
      );
      if (response.success) {
        toast.success('Role updated successfully');
        fetchTeamMembers();
        return true;
      } else {
        toast.error(response.error?.message || 'Failed to update role');
        return false;
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to update role');
      return false;
    } finally {
      setEditingMember(null);
    }
  }, [fetchTeamMembers]);

  const removeMember = useCallback(async () => {
    if (!removeId) return false;
    try {
      const response = await apiClient.delete(`/api/v1/organization/members/${removeId}`);
      if (response.success) {
        toast.success('Member removed');
        fetchTeamMembers();
        return true;
      } else {
        toast.error(response.error?.message || 'Failed to remove member');
        return false;
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to remove member');
      return false;
    } finally {
      setRemoveId(null);
    }
  }, [removeId, fetchTeamMembers]);

  const resendInvite = useCallback(async (memberId: string) => {
    try {
      const response = await apiClient.post(`/api/v1/organization/members/${memberId}/resend-invite`);
      if (response.success) {
        toast.success('Invitation resent');
        return true;
      } else {
        toast.error(response.error?.message || 'Failed to resend invitation');
        return false;
      }
    } catch (error: any) {
      toast.error('Failed to resend invitation');
      return false;
    }
  }, []);

  const updateInviteForm = useCallback((field: keyof InviteFormData, value: string) => {
    setInviteForm(prev => ({ ...prev, [field]: value }));
  }, []);

  return {
    teamMembers,
    loading,
    sendingInvite,
    inviteDialogOpen,
    editingMember,
    removeId,
    inviteForm,
    fetchTeamMembers,
    openInviteDialog,
    closeInviteDialog,
    sendInvite,
    updateMemberRole,
    removeMember,
    resendInvite,
    setEditingMember,
    setRemoveId,
    updateInviteForm,
  };
}

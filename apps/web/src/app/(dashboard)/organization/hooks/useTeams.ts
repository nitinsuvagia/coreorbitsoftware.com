'use client';

import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api/client';
import type { Team, TeamGroupMember, TeamFormData } from '../types';

// Team colors for UI
export const TEAM_COLORS = [
  { value: 'blue', label: 'Blue', class: 'bg-blue-500' },
  { value: 'green', label: 'Green', class: 'bg-green-500' },
  { value: 'purple', label: 'Purple', class: 'bg-purple-500' },
  { value: 'orange', label: 'Orange', class: 'bg-orange-500' },
  { value: 'pink', label: 'Pink', class: 'bg-pink-500' },
  { value: 'teal', label: 'Teal', class: 'bg-teal-500' },
  { value: 'indigo', label: 'Indigo', class: 'bg-indigo-500' },
  { value: 'yellow', label: 'Yellow', class: 'bg-yellow-500' },
];

const initialFormData: TeamFormData = {
  name: '',
  description: '',
  color: 'blue',
  leaderId: '',
};

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar?: string;
  designation?: { name: string };
  department?: { name: string };
}

export function useTeams() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamGroupMember[]>([]);
  const [availableEmployees, setAvailableEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Dialog states
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);
  const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false);
  const [deleteTeamId, setDeleteTeamId] = useState<string | null>(null);
  const [removeMemberId, setRemoveMemberId] = useState<string | null>(null);
  
  // Form state
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [formData, setFormData] = useState<TeamFormData>(initialFormData);
  const [errors, setErrors] = useState<{ name?: string }>({});
  
  // Add member form
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [memberRole, setMemberRole] = useState<'LEAD' | 'MEMBER' | 'VIEWER'>('MEMBER');

  // Fetch all teams
  const fetchTeams = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<Team[]>('/api/v1/organization/teams');
      if (response.success && response.data) {
        setTeams(response.data);
        // Auto-select default team if none selected
        if (!selectedTeam && response.data.length > 0) {
          const defaultTeam = response.data.find(t => t.isDefault) || response.data[0];
          setSelectedTeam(defaultTeam);
        }
      }
    } catch (error: any) {
      console.error('Failed to fetch teams:', error);
      // Create mock default team for demo
      const mockTeams: Team[] = [
        {
          id: 'default-team',
          name: 'Softqube',
          description: 'Default organization team - all employees are automatically added',
          isDefault: true,
          color: 'blue',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          _count: { members: 0 },
        },
      ];
      setTeams(mockTeams);
      setSelectedTeam(mockTeams[0]);
    } finally {
      setLoading(false);
    }
  }, [selectedTeam]);

  // Fetch members of selected team
  const fetchTeamMembers = useCallback(async (teamId: string) => {
    try {
      setLoadingMembers(true);
      const response = await apiClient.get<TeamGroupMember[]>(`/api/v1/organization/teams/${teamId}/members`);
      if (response.success && response.data) {
        setTeamMembers(response.data);
      }
    } catch (error: any) {
      console.error('Failed to fetch team members:', error);
      setTeamMembers([]);
    } finally {
      setLoadingMembers(false);
    }
  }, []);

  // Fetch available employees (not in current team)
  const fetchAvailableEmployees = useCallback(async (teamId: string) => {
    try {
      const response = await apiClient.get<Employee[]>(`/api/v1/organization/teams/${teamId}/available-employees`);
      if (response.success && response.data) {
        setAvailableEmployees(response.data);
      }
    } catch (error: any) {
      console.error('Failed to fetch available employees:', error);
      // Use fallback - fetch all employees
      try {
        const empResponse = await apiClient.get<{ employees: Employee[] }>('/api/v1/employees?pageSize=1000');
        if (empResponse.success && empResponse.data?.employees) {
          // Filter out employees already in team
          const memberIds = teamMembers.map(m => m.employeeId);
          const available = empResponse.data.employees.filter(e => !memberIds.includes(e.id));
          setAvailableEmployees(available);
        }
      } catch {
        setAvailableEmployees([]);
      }
    }
  }, [teamMembers]);

  // Load team members when selected team changes
  useEffect(() => {
    if (selectedTeam) {
      fetchTeamMembers(selectedTeam.id);
    }
  }, [selectedTeam, fetchTeamMembers]);

  // Initial fetch
  useEffect(() => {
    fetchTeams();
  }, []);

  // Open dialogs
  const openCreateTeamDialog = useCallback(() => {
    setEditingTeam(null);
    setFormData(initialFormData);
    setErrors({});
    setTeamDialogOpen(true);
  }, []);

  const openEditTeamDialog = useCallback((team: Team) => {
    setEditingTeam(team);
    setFormData({
      name: team.name,
      description: team.description || '',
      color: team.color || 'blue',
      leaderId: team.leaderId || '',
    });
    setErrors({});
    setTeamDialogOpen(true);
  }, []);

  const closeTeamDialog = useCallback(() => {
    setTeamDialogOpen(false);
    setEditingTeam(null);
    setFormData(initialFormData);
    setErrors({});
  }, []);

  const openAddMemberDialog = useCallback(() => {
    if (selectedTeam) {
      fetchAvailableEmployees(selectedTeam.id);
    }
    setSelectedEmployeeIds([]);
    setMemberRole('MEMBER');
    setAddMemberDialogOpen(true);
  }, [selectedTeam, fetchAvailableEmployees]);

  const closeAddMemberDialog = useCallback(() => {
    setAddMemberDialogOpen(false);
    setSelectedEmployeeIds([]);
    setMemberRole('MEMBER');
  }, []);

  // Update form field
  const updateFormField = useCallback((field: keyof TeamFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  }, [errors]);

  // Validate form
  const validateForm = useCallback((): boolean => {
    const newErrors: { name?: string } = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Team name is required';
    } else if (formData.name.length < 2) {
      newErrors.name = 'Team name must be at least 2 characters';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // Save team (create or update)
  const saveTeam = useCallback(async () => {
    if (!validateForm()) return false;
    
    try {
      setSaving(true);
      if (editingTeam) {
        // Update existing team
        const response = await apiClient.put<Team>(
          `/api/v1/organization/teams/${editingTeam.id}`,
          formData
        );
        if (response.success) {
          toast.success('Team updated successfully');
          fetchTeams();
          closeTeamDialog();
          return true;
        } else {
          toast.error(response.error?.message || 'Failed to update team');
          return false;
        }
      } else {
        // Create new team
        const response = await apiClient.post<Team>(
          '/api/v1/organization/teams',
          formData
        );
        if (response.success) {
          toast.success('Team created successfully');
          fetchTeams();
          closeTeamDialog();
          return true;
        } else {
          toast.error(response.error?.message || 'Failed to create team');
          return false;
        }
      }
    } catch (error: any) {
      console.error('Save team error:', error);
      toast.error(error.response?.data?.error?.message || error.message || 'Failed to save team');
      return false;
    } finally {
      setSaving(false);
    }
  }, [formData, editingTeam, validateForm, fetchTeams, closeTeamDialog]);

  // Delete team
  const deleteTeam = useCallback(async () => {
    if (!deleteTeamId) return false;
    
    try {
      setSaving(true);
      const response = await apiClient.delete(`/api/v1/organization/teams/${deleteTeamId}`);
      if (response.success) {
        toast.success('Team deleted successfully');
        setDeleteTeamId(null);
        // If deleted team was selected, clear selection
        if (selectedTeam?.id === deleteTeamId) {
          setSelectedTeam(null);
        }
        fetchTeams();
        return true;
      }
      return false;
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to delete team');
      return false;
    } finally {
      setSaving(false);
    }
  }, [deleteTeamId, selectedTeam, fetchTeams]);

  // Add members to team
  const addMembers = useCallback(async () => {
    if (!selectedTeam || selectedEmployeeIds.length === 0) return false;
    
    try {
      setSaving(true);
      const response = await apiClient.post(
        `/api/v1/organization/teams/${selectedTeam.id}/members`,
        {
          employeeIds: selectedEmployeeIds,
          teamRole: memberRole,
        }
      );
      if (response.success) {
        toast.success(`${selectedEmployeeIds.length} member(s) added to team`);
        fetchTeamMembers(selectedTeam.id);
        fetchTeams(); // Update count
        closeAddMemberDialog();
        return true;
      }
      return false;
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to add members');
      return false;
    } finally {
      setSaving(false);
    }
  }, [selectedTeam, selectedEmployeeIds, memberRole, fetchTeamMembers, fetchTeams, closeAddMemberDialog]);

  // Remove member from team
  const removeMember = useCallback(async () => {
    if (!selectedTeam || !removeMemberId) return false;
    
    try {
      setSaving(true);
      const response = await apiClient.delete(
        `/api/v1/organization/teams/${selectedTeam.id}/members/${removeMemberId}`
      );
      if (response.success) {
        toast.success('Member removed from team');
        setRemoveMemberId(null);
        fetchTeamMembers(selectedTeam.id);
        fetchTeams(); // Update count
        return true;
      }
      return false;
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to remove member');
      return false;
    } finally {
      setSaving(false);
    }
  }, [selectedTeam, removeMemberId, fetchTeamMembers, fetchTeams]);

  // Update member role in team
  const updateMemberRole = useCallback(async (memberId: string, newRole: 'LEAD' | 'MEMBER' | 'VIEWER') => {
    if (!selectedTeam) return false;
    
    try {
      const response = await apiClient.put(
        `/api/v1/organization/teams/${selectedTeam.id}/members/${memberId}`,
        { teamRole: newRole }
      );
      if (response.success) {
        toast.success('Member role updated');
        fetchTeamMembers(selectedTeam.id);
        return true;
      }
      return false;
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to update role');
      return false;
    }
  }, [selectedTeam, fetchTeamMembers]);

  // Toggle employee selection for adding
  const toggleEmployeeSelection = useCallback((employeeId: string) => {
    setSelectedEmployeeIds(prev => 
      prev.includes(employeeId)
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  }, []);

  return {
    // Data
    teams,
    selectedTeam,
    teamMembers,
    availableEmployees,
    loading,
    loadingMembers,
    saving,
    
    // Dialog states
    teamDialogOpen,
    addMemberDialogOpen,
    deleteTeamId,
    removeMemberId,
    editingTeam,
    
    // Form
    formData,
    errors,
    selectedEmployeeIds,
    memberRole,
    
    // Actions
    fetchTeams,
    fetchTeamMembers,
    setSelectedTeam,
    openCreateTeamDialog,
    openEditTeamDialog,
    closeTeamDialog,
    openAddMemberDialog,
    closeAddMemberDialog,
    updateFormField,
    saveTeam,
    deleteTeam,
    setDeleteTeamId,
    addMembers,
    removeMember,
    setRemoveMemberId,
    updateMemberRole,
    toggleEmployeeSelection,
    setMemberRole,
  };
}

'use client';

import { createContext, useContext } from 'react';

// Import hooks
import {
  useOrganization,
  useDepartments,
  useDesignations,
  useTeamMembers,
  useOrganizationSettings,
  useIntegrations,
} from './hooks';
import type { OpenAISettings } from './types';

// Context types using hook return types
type OrganizationHookReturn = ReturnType<typeof useOrganization>;
type DepartmentsHookReturn = ReturnType<typeof useDepartments>;
type DesignationsHookReturn = ReturnType<typeof useDesignations>;
type TeamMembersHookReturn = ReturnType<typeof useTeamMembers>;
type OrganizationSettingsHookReturn = ReturnType<typeof useOrganizationSettings>;
type IntegrationsHookReturn = ReturnType<typeof useIntegrations>;

export interface OrganizationContextType {
  // Organization
  org: OrganizationHookReturn['org'];
  orgForm: OrganizationHookReturn['orgForm'];
  orgErrors: OrganizationHookReturn['orgErrors'];
  loadingOrg: boolean;
  savingOrg: boolean;
  fetchOrganization: OrganizationHookReturn['fetchOrganization'];
  saveOrganization: OrganizationHookReturn['saveOrganization'];
  updateFormField: OrganizationHookReturn['updateFormField'];
  updateAddressField: OrganizationHookReturn['updateAddressField'];
  setOrgErrors: OrganizationHookReturn['setOrgErrors'];

  // Departments
  departments: DepartmentsHookReturn['departments'];
  loadingDepts: boolean;
  savingDept: boolean;
  deptDialogOpen: boolean;
  editingDept: DepartmentsHookReturn['editingDept'];
  deleteDeptId: string | null;
  deptForm: DepartmentsHookReturn['formData'];
  deptErrors: DepartmentsHookReturn['errors'];
  fetchDepartments: DepartmentsHookReturn['fetchDepartments'];
  openAddDept: DepartmentsHookReturn['openAddDialog'];
  openEditDept: DepartmentsHookReturn['openEditDialog'];
  closeDeptDialog: DepartmentsHookReturn['closeDialog'];
  handleSaveDept: DepartmentsHookReturn['saveDepartment'];
  handleDeleteDept: DepartmentsHookReturn['deleteDepartment'];
  handlePermanentDeleteDept: DepartmentsHookReturn['permanentlyDeleteDepartment'];
  setDeleteDeptId: DepartmentsHookReturn['setDeleteId'];
  updateDeptFormField: DepartmentsHookReturn['updateFormField'];

  // Designations
  designations: DesignationsHookReturn['designations'];
  loadingDesigs: boolean;
  savingDesig: boolean;
  desigDialogOpen: boolean;
  editingDesig: DesignationsHookReturn['editingDesig'];
  deleteDesigId: string | null;
  desigForm: DesignationsHookReturn['formData'];
  desigErrors: DesignationsHookReturn['errors'];
  fetchDesignations: DesignationsHookReturn['fetchDesignations'];
  openAddDesig: DesignationsHookReturn['openAddDialog'];
  openEditDesig: DesignationsHookReturn['openEditDialog'];
  closeDesigDialog: DesignationsHookReturn['closeDialog'];
  handleSaveDesig: DesignationsHookReturn['saveDesignation'];
  handleDeleteDesig: DesignationsHookReturn['deleteDesignation'];
  handlePermanentDeleteDesig: DesignationsHookReturn['permanentlyDeleteDesignation'];
  setDeleteDesigId: DesignationsHookReturn['setDeleteId'];
  updateDesigFormField: DesignationsHookReturn['updateFormField'];

  // Team Members
  teamMembers: TeamMembersHookReturn['teamMembers'];
  loadingTeam: boolean;
  sendingInvite: boolean;
  inviteDialogOpen: boolean;
  editingMember: TeamMembersHookReturn['editingMember'];
  removeMemberId: string | null;
  inviteForm: TeamMembersHookReturn['inviteForm'];
  fetchTeamMembers: TeamMembersHookReturn['fetchTeamMembers'];
  openInviteDialog: TeamMembersHookReturn['openInviteDialog'];
  closeInviteDialog: TeamMembersHookReturn['closeInviteDialog'];
  handleSendInvite: TeamMembersHookReturn['sendInvite'];
  handleUpdateMemberRole: TeamMembersHookReturn['updateMemberRole'];
  handleRemoveMember: TeamMembersHookReturn['removeMember'];
  handleResendInvite: TeamMembersHookReturn['resendInvite'];
  setEditingMember: TeamMembersHookReturn['setEditingMember'];
  setRemoveMemberId: TeamMembersHookReturn['setRemoveId'];
  updateInviteForm: TeamMembersHookReturn['updateInviteForm'];

  // Integrations
  integrations: IntegrationsHookReturn['integrations'];
  loadingIntegrations: boolean;
  connectingIntegration: string | null;
  fetchIntegrations: IntegrationsHookReturn['fetchIntegrations'];
  connectIntegration: IntegrationsHookReturn['connectIntegration'];
  disconnectIntegration: IntegrationsHookReturn['disconnectIntegration'];
  openAISettings: OpenAISettings;
  openAIDialogOpen: boolean;
  savingOpenAI: boolean;
  testingConnection: boolean;
  saveOpenAISettings: IntegrationsHookReturn['saveOpenAISettings'];
  testOpenAIConnection: IntegrationsHookReturn['testOpenAIConnection'];
  openOpenAIDialog: IntegrationsHookReturn['openOpenAIDialog'];
  closeOpenAIDialog: IntegrationsHookReturn['closeOpenAIDialog'];
  
  // Organization Settings
  orgSettings: OrganizationSettingsHookReturn['settings'];
  orgSettingsForm: OrganizationSettingsHookReturn['settingsForm'];
  orgSettingsErrors: OrganizationSettingsHookReturn['errors'];
  loadingSettings: boolean;
  savingSettings: boolean;
  fetchOrgSettings: OrganizationSettingsHookReturn['fetchSettings'];
  saveOrgSettings: OrganizationSettingsHookReturn['saveSettings'];
  saveRegionalSettings: OrganizationSettingsHookReturn['saveRegionalSettings'];
  saveWorkingEnvironmentSettings: OrganizationSettingsHookReturn['saveWorkingEnvironmentSettings'];
  updateOrgSettingsField: OrganizationSettingsHookReturn['updateFormField'];
  resetOrgSettingsForm: OrganizationSettingsHookReturn['resetForm'];
  resetRegionalSettings: OrganizationSettingsHookReturn['resetRegionalSettings'];
  resetWorkingEnvironmentSettings: OrganizationSettingsHookReturn['resetWorkingEnvironmentSettings'];
}

export const OrganizationContext = createContext<OrganizationContextType | null>(null);

export function useOrganizationContext() {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error('useOrganizationContext must be used within OrganizationLayout');
  }
  return context;
}

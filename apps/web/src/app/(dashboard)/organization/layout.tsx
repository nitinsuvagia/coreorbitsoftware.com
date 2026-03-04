'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { getInitials } from '@/lib/utils';
import {
  Users,
  FolderTree,
  Globe,
  Camera,
  RefreshCw,
  Briefcase,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useEmployeeStatusCounts } from '@/hooks/use-employees';

// Import hooks
import {
  useOrganization,
  useDepartments,
  useDesignations,
  useTeamMembers,
  useOrganizationSettings,
  useIntegrations,
} from './hooks';

// Import context
import { OrganizationContext, OrganizationContextType } from './context';

// Navigation items
const NAV_ITEMS = [
  { href: '/organization', label: 'General', exact: true },
  { href: '/organization/settings', label: 'Settings' },
  { href: '/organization/email', label: 'Email' },
  { href: '/organization/email-templates', label: 'Email Templates' },
  { href: '/organization/departments', label: 'Departments' },
  { href: '/organization/designations', label: 'Designations' },
  { href: '/organization/roles', label: 'Roles' },
  { href: '/organization/team', label: 'Team' },
  { href: '/organization/badges', label: 'Badges' },
  { href: '/organization/sso', label: 'SSO' },
  { href: '/organization/integrations', label: 'Integrations' },
];

export default function OrganizationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  // All hooks
  const organizationHook = useOrganization();
  const departmentsHook = useDepartments();
  const designationsHook = useDesignations();
  const teamMembersHook = useTeamMembers();
  const orgSettingsHook = useOrganizationSettings();
  const integrationsHook = useIntegrations();
  const { data: statusCounts } = useEmployeeStatusCounts();

  const {
    org,
    orgForm,
    orgErrors,
    loading: loadingOrg,
    saving: savingOrg,
    fetchOrganization,
    saveOrganization,
    updateFormField,
    updateAddressField,
    setOrgErrors,
  } = organizationHook;

  const {
    departments,
    loading: loadingDepts,
    saving: savingDept,
    dialogOpen: deptDialogOpen,
    editingDept,
    deleteId: deleteDeptId,
    formData: deptForm,
    errors: deptErrors,
    fetchDepartments,
    openAddDialog: openAddDept,
    openEditDialog: openEditDept,
    closeDialog: closeDeptDialog,
    saveDepartment: handleSaveDept,
    deleteDepartment: handleDeleteDept,
    permanentlyDeleteDepartment: handlePermanentDeleteDept,
    setDeleteId: setDeleteDeptId,
    updateFormField: updateDeptFormField,
  } = departmentsHook;

  const {
    designations,
    loading: loadingDesigs,
    saving: savingDesig,
    dialogOpen: desigDialogOpen,
    editingDesig,
    deleteId: deleteDesigId,
    formData: desigForm,
    errors: desigErrors,
    fetchDesignations,
    openAddDialog: openAddDesig,
    openEditDialog: openEditDesig,
    closeDialog: closeDesigDialog,
    saveDesignation: handleSaveDesig,
    deleteDesignation: handleDeleteDesig,
    permanentlyDeleteDesignation: handlePermanentDeleteDesig,
    setDeleteId: setDeleteDesigId,
    updateFormField: updateDesigFormField,
  } = designationsHook;

  const {
    teamMembers,
    loading: loadingTeam,
    sendingInvite,
    inviteDialogOpen,
    editingMember,
    removeId: removeMemberId,
    inviteForm,
    fetchTeamMembers,
    openInviteDialog,
    closeInviteDialog,
    sendInvite: handleSendInvite,
    updateMemberRole: handleUpdateMemberRole,
    removeMember: handleRemoveMember,
    resendInvite: handleResendInvite,
    setEditingMember,
    setRemoveId: setRemoveMemberId,
    updateInviteForm,
  } = teamMembersHook;

  const {
    integrations,
    loadingIntegrations,
    connectingIntegration,
    fetchIntegrations,
    connectIntegration,
    disconnectIntegration,
    openAISettings,
    openAIDialogOpen,
    savingOpenAI,
    testingConnection,
    saveOpenAISettings,
    testOpenAIConnection,
    openOpenAIDialog,
    closeOpenAIDialog,
  } = integrationsHook;

  const {
    settings: orgSettings,
    settingsForm: orgSettingsForm,
    errors: orgSettingsErrors,
    loading: loadingSettings,
    saving: savingSettings,
    fetchSettings: fetchOrgSettings,
    saveSettings: saveOrgSettings,
    saveRegionalSettings,
    saveWorkingEnvironmentSettings,
    updateFormField: updateOrgSettingsField,
    resetForm: resetOrgSettingsForm,
    resetRegionalSettings,
    resetWorkingEnvironmentSettings,
  } = orgSettingsHook;

  // Fetch data on mount
  useEffect(() => {
    fetchOrganization();
    fetchDepartments();
    fetchDesignations();
    fetchTeamMembers();
    fetchOrgSettings();
  }, [fetchOrganization, fetchDepartments, fetchDesignations, fetchTeamMembers, fetchOrgSettings]);

  // Context value
  const contextValue: OrganizationContextType = {
    org,
    orgForm,
    orgErrors,
    loadingOrg,
    savingOrg,
    fetchOrganization,
    saveOrganization,
    updateFormField,
    updateAddressField,
    setOrgErrors,
    departments,
    loadingDepts,
    savingDept,
    deptDialogOpen,
    editingDept,
    deleteDeptId,
    deptForm,
    deptErrors,
    fetchDepartments,
    openAddDept,
    openEditDept,
    closeDeptDialog,
    handleSaveDept,
    handleDeleteDept,
    handlePermanentDeleteDept,
    setDeleteDeptId,
    updateDeptFormField,
    designations,
    loadingDesigs,
    savingDesig,
    desigDialogOpen,
    editingDesig,
    deleteDesigId,
    desigForm,
    desigErrors,
    fetchDesignations,
    openAddDesig,
    openEditDesig,
    closeDesigDialog,
    handleSaveDesig,
    handleDeleteDesig,
    handlePermanentDeleteDesig,
    setDeleteDesigId,
    updateDesigFormField,
    teamMembers,
    loadingTeam,
    sendingInvite,
    inviteDialogOpen,
    editingMember,
    removeMemberId,
    inviteForm,
    fetchTeamMembers,
    openInviteDialog,
    closeInviteDialog,
    handleSendInvite,
    handleUpdateMemberRole,
    handleRemoveMember,
    handleResendInvite,
    setEditingMember,
    setRemoveMemberId,
    updateInviteForm,
    // Integrations
    integrations,
    loadingIntegrations,
    connectingIntegration,
    fetchIntegrations,
    connectIntegration,
    disconnectIntegration,
    openAISettings,
    openAIDialogOpen,
    savingOpenAI,
    testingConnection,
    saveOpenAISettings,
    testOpenAIConnection,
    openOpenAIDialog,
    closeOpenAIDialog,
    // Organization Settings
    orgSettings,
    orgSettingsForm,
    orgSettingsErrors,
    loadingSettings,
    savingSettings,
    fetchOrgSettings,
    saveOrgSettings,
    saveRegionalSettings,
    saveWorkingEnvironmentSettings,
    updateOrgSettingsField,
    resetOrgSettingsForm,
    resetRegionalSettings,
    resetWorkingEnvironmentSettings,
  };

  // Loading skeleton
  if (loadingOrg) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-6">
              <Skeleton className="h-20 w-20 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-64" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!org) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium">Failed to load organization</h3>
          {organizationHook.fetchError && (
            <p className="text-sm text-muted-foreground mt-2">{organizationHook.fetchError}</p>
          )}
          <Button onClick={fetchOrganization} className="mt-4">
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // Get active employees count (current + probation)
  const activeEmployeesCount = (statusCounts?.current || 0) + (statusCounts?.probation || 0);

  return (
    <OrganizationContext.Provider value={contextValue}>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Organization</h2>
            <p className="text-muted-foreground">
              Manage your organization settings and structure
            </p>
          </div>
        </div>

        {/* Org Overview */}
        <Card className="mt-6 flex-shrink-0">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div className="relative">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={org.logo} />
                  <AvatarFallback className="text-xl">{getInitials(org.name)}</AvatarFallback>
                </Avatar>
                <Button
                  size="icon"
                  variant="outline"
                  className="absolute bottom-0 right-0 h-8 w-8 rounded-full"
                >
                  <Camera className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="text-2xl font-bold">{org.name}</h3>
                  <Badge className={org.status === 'ACTIVE' ? 'bg-green-500' : 'bg-yellow-500'}>
                    {org.status}
                  </Badge>
                  {org.plan && <Badge variant="secondary">{org.plan.name}</Badge>}
                </div>
                <p className="text-muted-foreground">{org.slug}.youroms.com</p>
                <div className="flex flex-wrap gap-4 mt-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {activeEmployeesCount} employees
                  </span>
                  <span className="flex items-center gap-1">
                    <FolderTree className="h-4 w-4" />
                    {departments.length} departments
                  </span>
                  <span className="flex items-center gap-1">
                    <Briefcase className="h-4 w-4" />
                    {designations.length} designations
                  </span>
                  {org.website && (
                    <a href={org.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-primary">
                      <Globe className="h-4 w-4" />
                      {org.website}
                    </a>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Navigation Tabs */}
        <nav className="flex space-x-1 border-b mt-6 flex-shrink-0">
          {NAV_ITEMS.map((item) => {
            const isActive = item.exact 
              ? pathname === item.href 
              : pathname.startsWith(item.href);
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/50'
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Page Content */}
        <div className="mt-4 flex-1 min-h-0">
          {children}
        </div>
      </div>
    </OrganizationContext.Provider>
  );
}

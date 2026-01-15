'use client';

import { useOrganizationContext } from '../../layout';
import { TeamTab } from '../../_components';

export default function TeamPage() {
  const {
    teamMembers,
    loadingTeam,
    sendingInvite,
    inviteDialogOpen,
    editingMember,
    removeMemberId,
    inviteForm,
    openInviteDialog,
    closeInviteDialog,
    handleSendInvite,
    handleUpdateMemberRole,
    handleRemoveMember,
    handleResendInvite,
    setEditingMember,
    setRemoveMemberId,
    updateInviteForm,
  } = useOrganizationContext();

  return (
    <TeamTab
      teamMembers={teamMembers}
      loading={loadingTeam}
      sendingInvite={sendingInvite}
      inviteDialogOpen={inviteDialogOpen}
      editingMember={editingMember}
      removeId={removeMemberId}
      inviteForm={inviteForm}
      onOpenInviteDialog={openInviteDialog}
      onCloseInviteDialog={closeInviteDialog}
      onSendInvite={handleSendInvite}
      onUpdateMemberRole={handleUpdateMemberRole}
      onRemoveMember={handleRemoveMember}
      onResendInvite={handleResendInvite}
      onSetEditingMember={setEditingMember}
      onSetRemoveId={setRemoveMemberId}
      onUpdateInviteForm={updateInviteForm}
    />
  );
}

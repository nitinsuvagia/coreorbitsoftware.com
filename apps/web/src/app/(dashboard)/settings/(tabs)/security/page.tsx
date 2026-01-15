'use client';

import { useSecurity } from '../../hooks';
import { SecurityTab } from '../../_components';

export default function SecurityPage() {
  const {
    passwordForm,
    showPasswords,
    savingPassword,
    updatePasswordForm,
    togglePasswordVisibility,
    changePassword,
    twoFactorEnabled,
    twoFactorLoading,
    show2FADialog,
    qrCode,
    secret,
    verificationCode,
    enabling2FA,
    backupCodes,
    showBackupCodes,
    setShow2FADialog,
    setVerificationCode,
    setShowBackupCodes,
    enable2FA,
    verify2FA,
    disable2FA,
    sessions,
    loadingSessions,
    terminatingSession,
    terminateSession,
    terminateAllSessions,
    showDeleteDialog,
    deleteConfirmation,
    deletePassword,
    deletingAccount,
    setShowDeleteDialog,
    setDeleteConfirmation,
    setDeletePassword,
    deleteAccount,
  } = useSecurity();

  return (
    <SecurityTab
      passwordForm={passwordForm}
      showPasswords={showPasswords}
      savingPassword={savingPassword}
      onUpdatePasswordForm={updatePasswordForm}
      onTogglePasswordVisibility={togglePasswordVisibility}
      onChangePassword={changePassword}
      twoFactorEnabled={twoFactorEnabled}
      twoFactorLoading={twoFactorLoading}
      show2FADialog={show2FADialog}
      qrCode={qrCode}
      secret={secret}
      verificationCode={verificationCode}
      enabling2FA={enabling2FA}
      backupCodes={backupCodes}
      showBackupCodes={showBackupCodes}
      onSetShow2FADialog={setShow2FADialog}
      onSetVerificationCode={setVerificationCode}
      onSetShowBackupCodes={setShowBackupCodes}
      onEnable2FA={enable2FA}
      onVerify2FA={verify2FA}
      onDisable2FA={disable2FA}
      sessions={sessions}
      loadingSessions={loadingSessions}
      terminatingSession={terminatingSession}
      onTerminateSession={terminateSession}
      onTerminateAllSessions={terminateAllSessions}
      showDeleteDialog={showDeleteDialog}
      deleteConfirmation={deleteConfirmation}
      deletePassword={deletePassword}
      deletingAccount={deletingAccount}
      onSetShowDeleteDialog={setShowDeleteDialog}
      onSetDeleteConfirmation={setDeleteConfirmation}
      onSetDeletePassword={setDeletePassword}
      onDeleteAccount={deleteAccount}
    />
  );
}

'use client';

import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import type { PasswordForm, ShowPasswords, ActiveSession } from '../types';

interface UseSecurityReturn {
  // Password
  passwordForm: PasswordForm;
  showPasswords: ShowPasswords;
  savingPassword: boolean;
  updatePasswordForm: (field: keyof PasswordForm, value: string) => void;
  togglePasswordVisibility: (field: keyof ShowPasswords) => void;
  changePassword: () => Promise<void>;
  
  // 2FA
  twoFactorEnabled: boolean;
  twoFactorLoading: boolean;
  show2FADialog: boolean;
  qrCode: string;
  secret: string;
  verificationCode: string;
  enabling2FA: boolean;
  backupCodes: string[];
  showBackupCodes: boolean;
  setShow2FADialog: (open: boolean) => void;
  setVerificationCode: (code: string) => void;
  setShowBackupCodes: (show: boolean) => void;
  enable2FA: () => Promise<void>;
  verify2FA: () => Promise<void>;
  disable2FA: () => Promise<void>;
  fetch2FAStatus: () => Promise<void>;
  
  // Sessions
  sessions: ActiveSession[];
  loadingSessions: boolean;
  terminatingSession: string | null;
  fetchSessions: () => Promise<void>;
  terminateSession: (sessionId: string) => Promise<void>;
  terminateAllSessions: () => Promise<void>;
  
  // Delete Account
  showDeleteDialog: boolean;
  deleteConfirmation: string;
  deletePassword: string;
  deletingAccount: boolean;
  setShowDeleteDialog: (open: boolean) => void;
  setDeleteConfirmation: (value: string) => void;
  setDeletePassword: (value: string) => void;
  deleteAccount: () => Promise<void>;
}

export function useSecurity(): UseSecurityReturn {
  const router = useRouter();
  
  // Password state
  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState<ShowPasswords>({
    current: false,
    new: false,
    confirm: false,
  });
  const [savingPassword, setSavingPassword] = useState(false);

  // 2FA state
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFactorLoading, setTwoFactorLoading] = useState(true);
  const [show2FADialog, setShow2FADialog] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [enabling2FA, setEnabling2FA] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [showBackupCodes, setShowBackupCodes] = useState(false);

  // Sessions state
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [terminatingSession, setTerminatingSession] = useState<string | null>(null);

  // Delete account state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);

  // Fetch 2FA status
  const fetch2FAStatus = useCallback(async () => {
    try {
      setTwoFactorLoading(true);
      const response = await apiClient.get<{ enabled: boolean; type: string | null }>('/api/v1/auth/2fa/status');
      if (response.success && response.data) {
        setTwoFactorEnabled(response.data.enabled);
      }
    } catch (error: any) {
      console.error('Failed to fetch 2FA status:', error);
    } finally {
      setTwoFactorLoading(false);
    }
  }, []);

  // Fetch sessions
  const fetchSessions = useCallback(async () => {
    try {
      setLoadingSessions(true);
      const response = await apiClient.get<ActiveSession[]>('/api/v1/auth/sessions');
      if (response.success && response.data) {
        setSessions(response.data);
      }
    } catch (error: any) {
      console.error('Failed to fetch sessions:', error);
      setSessions([]);
    } finally {
      setLoadingSessions(false);
    }
  }, []);

  useEffect(() => {
    fetch2FAStatus();
    fetchSessions();
  }, [fetch2FAStatus, fetchSessions]);

  // Password functions
  const updatePasswordForm = (field: keyof PasswordForm, value: string) => {
    setPasswordForm({ ...passwordForm, [field]: value });
  };

  const togglePasswordVisibility = (field: keyof ShowPasswords) => {
    setShowPasswords({ ...showPasswords, [field]: !showPasswords[field] });
  };

  const changePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    try {
      setSavingPassword(true);
      const response = await apiClient.post('/api/v1/auth/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });

      if (response.success) {
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        toast.success('Password changed successfully');
      } else {
        throw new Error(response.error?.message || 'Failed to change password');
      }
    } catch (error: any) {
      console.error('Failed to change password:', error);
      toast.error(error.message || 'Failed to change password');
    } finally {
      setSavingPassword(false);
    }
  };

  // 2FA functions
  const enable2FA = async () => {
    try {
      const response = await apiClient.post<{ qrCode: string; secret: string }>('/api/v1/auth/2fa/setup');
      if (response.success && response.data) {
        setQrCode(response.data.qrCode);
        setSecret(response.data.secret);
        setShow2FADialog(true);
      } else {
        throw new Error(response.error?.message || 'Failed to setup 2FA');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to setup 2FA');
    }
  };

  const verify2FA = async () => {
    if (verificationCode.length !== 6) {
      toast.error('Please enter a 6-digit code');
      return;
    }

    try {
      setEnabling2FA(true);
      const response = await apiClient.post<{ backupCodes: string[] }>('/api/v1/auth/2fa/verify', {
        code: verificationCode,
      });

      if (response.success) {
        setTwoFactorEnabled(true);
        setShow2FADialog(false);
        setVerificationCode('');
        setQrCode('');
        setSecret('');
        
        // Show backup codes
        if (response.data?.backupCodes) {
          setBackupCodes(response.data.backupCodes);
          setShowBackupCodes(true);
        }
        
        toast.success('Two-factor authentication enabled');
      } else {
        throw new Error(response.error?.message || 'Invalid verification code');
      }
    } catch (error: any) {
      toast.error(error.message || 'Invalid verification code');
    } finally {
      setEnabling2FA(false);
    }
  };

  const disable2FA = async () => {
    // Prompt for password
    const password = window.prompt('Enter your password to disable 2FA:');
    if (!password) return;

    try {
      const response = await apiClient.post('/api/v1/auth/2fa/disable', { password });
      if (response.success) {
        setTwoFactorEnabled(false);
        toast.success('Two-factor authentication disabled');
      } else {
        throw new Error(response.error?.message || 'Failed to disable 2FA');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to disable 2FA');
    }
  };

  // Session functions
  const terminateSession = async (sessionId: string) => {
    try {
      setTerminatingSession(sessionId);
      const response = await apiClient.delete(`/api/v1/auth/sessions/${sessionId}`);
      if (response.success) {
        setSessions(sessions.filter(s => s.id !== sessionId));
        toast.success('Session terminated');
      } else {
        throw new Error(response.error?.message || 'Failed to terminate session');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to terminate session');
    } finally {
      setTerminatingSession(null);
    }
  };

  const terminateAllSessions = async () => {
    try {
      const response = await apiClient.delete('/api/v1/auth/sessions');
      if (response.success) {
        setSessions(sessions.filter(s => s.isCurrent));
        toast.success('All other sessions terminated');
      } else {
        throw new Error(response.error?.message || 'Failed to terminate sessions');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to terminate sessions');
    }
  };

  // Delete account function
  const deleteAccount = async () => {
    if (deleteConfirmation !== 'DELETE') {
      toast.error('Please type DELETE to confirm');
      return;
    }

    if (!deletePassword) {
      toast.error('Please enter your password');
      return;
    }

    try {
      setDeletingAccount(true);
      const response = await apiClient.delete('/api/v1/auth/account', {
        data: {
          password: deletePassword,
          confirmation: 'DELETE',
        },
      });

      if (response.success) {
        toast.success('Your account has been frozen. Check your email for reactivation instructions.');
        // Clear auth and redirect
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      } else {
        throw new Error(response.error?.message || 'Failed to delete account');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete account');
    } finally {
      setDeletingAccount(false);
    }
  };

  return {
    // Password
    passwordForm,
    showPasswords,
    savingPassword,
    updatePasswordForm,
    togglePasswordVisibility,
    changePassword,
    
    // 2FA
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
    fetch2FAStatus,
    
    // Sessions
    sessions,
    loadingSessions,
    terminatingSession,
    fetchSessions,
    terminateSession,
    terminateAllSessions,
    
    // Delete Account
    showDeleteDialog,
    deleteConfirmation,
    deletePassword,
    deletingAccount,
    setShowDeleteDialog,
    setDeleteConfirmation,
    setDeletePassword,
    deleteAccount,
  };
}

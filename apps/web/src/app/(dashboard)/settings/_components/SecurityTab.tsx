'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Key,
  Smartphone,
  Monitor,
  Laptop,
  Tablet,
  Globe,
  Eye,
  EyeOff,
  Check,
  X,
  Lock,
  LogOut,
  AlertTriangle,
  Trash2,
  RefreshCw,
  Copy,
  Shield,
} from 'lucide-react';
import type { PasswordForm, ShowPasswords, ActiveSession } from '../types';

interface SecurityTabProps {
  // Password
  passwordForm: PasswordForm;
  showPasswords: ShowPasswords;
  savingPassword: boolean;
  onUpdatePasswordForm: (field: keyof PasswordForm, value: string) => void;
  onTogglePasswordVisibility: (field: keyof ShowPasswords) => void;
  onChangePassword: () => Promise<void>;
  
  // 2FA
  twoFactorEnabled: boolean;
  twoFactorLoading?: boolean;
  show2FADialog: boolean;
  qrCode: string;
  secret?: string;
  verificationCode: string;
  enabling2FA: boolean;
  backupCodes?: string[];
  showBackupCodes?: boolean;
  onSetShow2FADialog: (open: boolean) => void;
  onSetVerificationCode: (code: string) => void;
  onSetShowBackupCodes?: (show: boolean) => void;
  onEnable2FA: () => Promise<void>;
  onVerify2FA: () => Promise<void>;
  onDisable2FA: () => Promise<void>;
  
  // Sessions
  sessions: ActiveSession[];
  loadingSessions: boolean;
  terminatingSession: string | null;
  onTerminateSession: (sessionId: string) => Promise<void>;
  onTerminateAllSessions: () => Promise<void>;
  
  // Delete Account
  showDeleteDialog: boolean;
  deleteConfirmation: string;
  deletePassword?: string;
  deletingAccount?: boolean;
  onSetShowDeleteDialog: (open: boolean) => void;
  onSetDeleteConfirmation: (value: string) => void;
  onSetDeletePassword?: (value: string) => void;
  onDeleteAccount: () => Promise<void>;
}

// Get device icon based on device type
function getDeviceIcon(deviceType?: string, device?: string) {
  const deviceLower = (device || '').toLowerCase();
  
  if (deviceType === 'mobile' || deviceLower.includes('iphone') || deviceLower.includes('android')) {
    return <Smartphone className="h-5 w-5" />;
  }
  if (deviceType === 'tablet' || deviceLower.includes('ipad')) {
    return <Tablet className="h-5 w-5" />;
  }
  return <Laptop className="h-5 w-5" />;
}

export function SecurityTab({
  passwordForm,
  showPasswords,
  savingPassword,
  onUpdatePasswordForm,
  onTogglePasswordVisibility,
  onChangePassword,
  twoFactorEnabled,
  twoFactorLoading,
  show2FADialog,
  qrCode,
  secret,
  verificationCode,
  enabling2FA,
  backupCodes,
  showBackupCodes,
  onSetShow2FADialog,
  onSetVerificationCode,
  onSetShowBackupCodes,
  onEnable2FA,
  onVerify2FA,
  onDisable2FA,
  sessions,
  loadingSessions,
  terminatingSession,
  onTerminateSession,
  onTerminateAllSessions,
  showDeleteDialog,
  deleteConfirmation,
  deletePassword,
  deletingAccount,
  onSetShowDeleteDialog,
  onSetDeleteConfirmation,
  onSetDeletePassword,
  onDeleteAccount,
}: SecurityTabProps) {
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedBackupCodes, setCopiedBackupCodes] = useState(false);
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  
  const handleCopySecret = async () => {
    if (secret) {
      await navigator.clipboard.writeText(secret);
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    }
  };
  
  const handleCopyBackupCodes = async () => {
    if (backupCodes) {
      await navigator.clipboard.writeText(backupCodes.join('\n'));
      setCopiedBackupCodes(true);
      setTimeout(() => setCopiedBackupCodes(false), 2000);
    }
  };
  return (
    <div className="space-y-4">
      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Change Password
          </CardTitle>
          <CardDescription>
            Update your password to keep your account secure
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current Password</Label>
            <div className="relative">
              <Input 
                id="currentPassword" 
                type={showPasswords.current ? 'text' : 'password'}
                value={passwordForm.currentPassword}
                onChange={(e) => onUpdatePasswordForm('currentPassword', e.target.value)}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => onTogglePasswordVisibility('current')}
              >
                {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <div className="relative">
              <Input 
                id="newPassword" 
                type={showPasswords.new ? 'text' : 'password'}
                value={passwordForm.newPassword}
                onChange={(e) => onUpdatePasswordForm('newPassword', e.target.value)}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => onTogglePasswordVisibility('new')}
              >
                {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Minimum 8 characters</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <div className="relative">
              <Input 
                id="confirmPassword" 
                type={showPasswords.confirm ? 'text' : 'password'}
                value={passwordForm.confirmPassword}
                onChange={(e) => onUpdatePasswordForm('confirmPassword', e.target.value)}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => onTogglePasswordVisibility('confirm')}
              >
                {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            {passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword && (
              <p className="text-xs text-red-500">Passwords do not match</p>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            onClick={onChangePassword} 
            disabled={savingPassword || !passwordForm.currentPassword || !passwordForm.newPassword || passwordForm.newPassword !== passwordForm.confirmPassword}
          >
            {savingPassword ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Lock className="mr-2 h-4 w-4" />
            )}
            Update Password
          </Button>
        </CardFooter>
      </Card>

      {/* Two-Factor Authentication */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Two-Factor Authentication
              </CardTitle>
              <CardDescription>
                Add an extra layer of security to your account using an authenticator app
              </CardDescription>
            </div>
            {twoFactorLoading ? (
              <Skeleton className="h-5 w-20" />
            ) : (
              <Badge variant={twoFactorEnabled ? 'default' : 'outline'} className={twoFactorEnabled ? 'bg-green-500' : ''}>
                {twoFactorEnabled ? 'Enabled' : 'Not Enabled'}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {twoFactorLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : twoFactorEnabled ? (
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                  <Check className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium">Two-factor authentication is enabled</p>
                  <p className="text-sm text-muted-foreground">Your account is protected with 2FA</p>
                </div>
              </div>
              <Button variant="outline" onClick={onDisable2FA}>
                Disable 2FA
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="font-medium">Two-factor authentication is not enabled</p>
                  <p className="text-sm text-muted-foreground">Protect your account with an authenticator app</p>
                </div>
              </div>
              <Button onClick={onEnable2FA}>
                <Smartphone className="mr-2 h-4 w-4" />
                Enable 2FA
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Sessions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="h-5 w-5" />
                Active Sessions
              </CardTitle>
              <CardDescription>
                Manage your active sessions across devices
              </CardDescription>
            </div>
            {sessions.filter(s => !s.isCurrent).length > 0 && (
              <Button variant="outline" size="sm" onClick={onTerminateAllSessions}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign out all other devices
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loadingSessions ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {sessions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Globe className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No active sessions found</p>
                </div>
              ) : (
                sessions.map((session) => (
                  <div key={session.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                        {getDeviceIcon(session.deviceType, session.device)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{session.device || 'Unknown Device'}</p>
                          {session.isCurrent && (
                            <Badge variant="default" className="text-xs">Current</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {session.browser || 'Unknown Browser'} • {session.location || 'Unknown Location'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Last active: {new Date(session.lastActive).toLocaleString()}
                        </p>
                        {session.ip && (
                          <p className="text-xs text-muted-foreground">
                            IP: {session.ip}
                          </p>
                        )}
                      </div>
                    </div>
                    {!session.isCurrent && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => onTerminateSession(session.id)}
                        disabled={terminatingSession === session.id}
                      >
                        {terminatingSession === session.id ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <X className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>
            Actions that will impact your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg">
            <div>
              <p className="font-medium">Delete Account</p>
              <p className="text-sm text-muted-foreground">
                Your account will be frozen. You can reactivate it within 30 days via email.
              </p>
            </div>
            <Button variant="destructive" onClick={() => onSetShowDeleteDialog(true)}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Account
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 2FA Setup Dialog */}
      <Dialog open={show2FADialog} onOpenChange={onSetShow2FADialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Set Up Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              Scan the QR code with your authenticator app (Google Authenticator, Authy, etc.)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {qrCode && (
              <div className="flex justify-center">
                <div className="p-4 bg-white rounded-lg">
                  <img src={qrCode} alt="2FA QR Code" className="w-48 h-48" />
                </div>
              </div>
            )}
            {secret && (
              <div className="space-y-2">
                <Label>Manual Setup Code</Label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 bg-muted rounded text-sm font-mono break-all">
                    {secret}
                  </code>
                  <Button variant="outline" size="icon" onClick={handleCopySecret}>
                    {copiedSecret ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Can't scan? Enter this code manually in your authenticator app.
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="verificationCode">Verification Code</Label>
              <Input
                id="verificationCode"
                value={verificationCode}
                onChange={(e) => onSetVerificationCode(e.target.value.replace(/\D/g, ''))}
                placeholder="Enter 6-digit code"
                maxLength={6}
                className="text-center text-2xl tracking-widest"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onSetShow2FADialog(false)}>Cancel</Button>
            <Button onClick={onVerify2FA} disabled={enabling2FA || verificationCode.length !== 6}>
              {enabling2FA && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
              Verify & Enable
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Backup Codes Dialog */}
      <Dialog open={showBackupCodes || false} onOpenChange={(open) => onSetShowBackupCodes?.(open)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-500" />
              Two-Factor Authentication Enabled!
            </DialogTitle>
            <DialogDescription>
              Save these backup codes in a safe place. You can use them to access your account if you lose access to your authenticator app.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-2 p-4 bg-muted rounded-lg">
              {backupCodes?.map((code, index) => (
                <code key={index} className="px-2 py-1 bg-background rounded text-sm font-mono text-center">
                  {code}
                </code>
              ))}
            </div>
            <div className="flex justify-center">
              <Button variant="outline" onClick={handleCopyBackupCodes}>
                {copiedBackupCodes ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy Backup Codes
                  </>
                )}
              </Button>
            </div>
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <AlertTriangle className="inline h-4 w-4 mr-1" />
                Each code can only be used once. Store them securely and don't share them.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => onSetShowBackupCodes?.(false)}>
              I've Saved My Codes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Account Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={onSetShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Account</AlertDialogTitle>
            <AlertDialogDescription>
              Your account will be frozen immediately. You will receive an email with instructions to reactivate within 30 days. After 30 days, your data will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="deletePassword">Current Password</Label>
              <div className="relative">
                <Input
                  id="deletePassword"
                  type={showDeletePassword ? 'text' : 'password'}
                  value={deletePassword || ''}
                  onChange={(e) => onSetDeletePassword?.(e.target.value)}
                  placeholder="Enter your password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowDeletePassword(!showDeletePassword)}
                >
                  {showDeletePassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="deleteConfirm">Type DELETE to confirm</Label>
              <Input
                id="deleteConfirm"
                value={deleteConfirmation}
                onChange={(e) => onSetDeleteConfirmation(e.target.value)}
                placeholder="DELETE"
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              onSetDeleteConfirmation('');
              onSetDeletePassword?.('');
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={onDeleteAccount} 
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteConfirmation !== 'DELETE' || !deletePassword || deletingAccount}
            >
              {deletingAccount ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Delete Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

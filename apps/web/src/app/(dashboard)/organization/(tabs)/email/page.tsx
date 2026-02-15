'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Mail, Save, TestTube, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api/client';

interface EmailSettings {
  smtpHost: string;
  smtpPort: number;
  smtpUsername: string;
  smtpPassword: string;
  smtpEncryption: 'none' | 'tls' | 'ssl';
  smtpFromEmail: string;
  smtpFromName: string;
  emailConfigured: boolean;
}

const DEFAULT_SETTINGS: EmailSettings = {
  smtpHost: '',
  smtpPort: 587,
  smtpUsername: '',
  smtpPassword: '',
  smtpEncryption: 'tls',
  smtpFromEmail: '',
  smtpFromName: '',
  emailConfigured: false,
};

export default function OrganizationEmailPage() {
  const [settings, setSettings] = useState<EmailSettings>(DEFAULT_SETTINGS);
  const [formData, setFormData] = useState<EmailSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [testEmailDialog, setTestEmailDialog] = useState(false);
  const [testEmail, setTestEmail] = useState('');

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<EmailSettings>('/api/v1/organization/email-settings');
      if (response.success && response.data) {
        setSettings(response.data);
        setFormData(response.data);
      }
    } catch (error: any) {
      console.error('Failed to fetch email settings:', error);
      toast.error('Failed to load email settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async () => {
    // Validation
    if (!formData.smtpHost) {
      toast.error('SMTP Host is required');
      return;
    }
    if (!formData.smtpFromEmail) {
      toast.error('From Email is required');
      return;
    }
    if (!formData.smtpFromName) {
      toast.error('From Name is required');
      return;
    }

    try {
      setSaving(true);
      const response = await apiClient.put<EmailSettings>('/api/v1/organization/email-settings', formData);
      if (response.success && response.data) {
        setSettings(response.data);
        setFormData(response.data);
        toast.success('Email settings saved successfully');
      } else {
        toast.error(response.error?.message || 'Failed to save email settings');
      }
    } catch (error: any) {
      console.error('Failed to save email settings:', error);
      toast.error('Failed to save email settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    if (!testEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }

    try {
      setTesting(true);
      const response = await apiClient.post('/api/v1/organization/email-settings/test', { testEmail });
      if (response.success) {
        toast.success(`Test email sent to ${testEmail}`);
        setTestEmailDialog(false);
        setTestEmail('');
      } else {
        toast.error(response.error?.message || 'Failed to send test email');
      }
    } catch (error: any) {
      console.error('Failed to send test email:', error);
      toast.error('Failed to send test email');
    } finally {
      setTesting(false);
    }
  };

  const resetForm = () => {
    setFormData(settings);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-96 mt-2" />
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email Configuration
              </CardTitle>
              <CardDescription>
                Configure SMTP email settings for your organization. These settings will be used for sending emails such as notifications, reports, and invitations.
              </CardDescription>
            </div>
            {formData.emailConfigured ? (
              <Badge variant="default" className="bg-green-100 text-green-800">
                <CheckCircle className="h-3 w-3 mr-1" />
                Configured
              </Badge>
            ) : (
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                <AlertCircle className="h-3 w-3 mr-1" />
                Not Configured
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* SMTP Host */}
            <div className="space-y-2">
              <Label htmlFor="smtpHost">SMTP Host *</Label>
              <Input
                id="smtpHost"
                value={formData.smtpHost}
                onChange={(e) => setFormData((f) => ({ ...f, smtpHost: e.target.value }))}
                placeholder="smtp.example.com"
              />
            </div>

            {/* SMTP Port */}
            <div className="space-y-2">
              <Label htmlFor="smtpPort">SMTP Port</Label>
              <Input
                id="smtpPort"
                type="number"
                value={formData.smtpPort}
                onChange={(e) => setFormData((f) => ({ ...f, smtpPort: parseInt(e.target.value) || 587 }))}
                placeholder="587"
              />
            </div>

            {/* SMTP Username */}
            <div className="space-y-2">
              <Label htmlFor="smtpUsername">SMTP Username</Label>
              <Input
                id="smtpUsername"
                value={formData.smtpUsername}
                onChange={(e) => setFormData((f) => ({ ...f, smtpUsername: e.target.value }))}
                placeholder="username@example.com"
              />
            </div>

            {/* SMTP Password */}
            <div className="space-y-2">
              <Label htmlFor="smtpPassword">SMTP Password</Label>
              <div className="relative">
                <Input
                  id="smtpPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.smtpPassword}
                  onChange={(e) => setFormData((f) => ({ ...f, smtpPassword: e.target.value }))}
                  placeholder="••••••••"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* From Email */}
            <div className="space-y-2">
              <Label htmlFor="smtpFromEmail">From Email *</Label>
              <Input
                id="smtpFromEmail"
                type="email"
                value={formData.smtpFromEmail}
                onChange={(e) => setFormData((f) => ({ ...f, smtpFromEmail: e.target.value }))}
                placeholder="noreply@example.com"
              />
            </div>

            {/* From Name */}
            <div className="space-y-2">
              <Label htmlFor="smtpFromName">From Name *</Label>
              <Input
                id="smtpFromName"
                value={formData.smtpFromName}
                onChange={(e) => setFormData((f) => ({ ...f, smtpFromName: e.target.value }))}
                placeholder="Your Organization Name"
              />
            </div>
          </div>

          {/* Encryption */}
          <div className="space-y-2">
            <Label htmlFor="smtpEncryption">Encryption</Label>
            <Select
              value={formData.smtpEncryption}
              onValueChange={(v: 'none' | 'tls' | 'ssl') => setFormData((f) => ({ ...f, smtpEncryption: v }))}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tls">TLS (Recommended)</SelectItem>
                <SelectItem value="ssl">SSL</SelectItem>
                <SelectItem value="none">None</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              TLS is recommended for secure email transmission. Use port 587 for TLS or port 465 for SSL.
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Changes
          </Button>
          <Button variant="outline" onClick={() => setTestEmailDialog(true)} disabled={testing || !formData.emailConfigured}>
            <TestTube className="mr-2 h-4 w-4" />
            Send Test Email
          </Button>
          <Button variant="ghost" onClick={resetForm}>
            Reset
          </Button>
        </CardFooter>
      </Card>

      {/* Common SMTP Providers Reference */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Common SMTP Providers</CardTitle>
          <CardDescription>
            Reference settings for popular email providers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Gmail / Google Workspace</h4>
              <p className="text-sm text-muted-foreground">Host: smtp.gmail.com</p>
              <p className="text-sm text-muted-foreground">Port: 587 (TLS)</p>
              <p className="text-xs text-muted-foreground mt-1">Requires App Password</p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Microsoft 365 / Outlook</h4>
              <p className="text-sm text-muted-foreground">Host: smtp.office365.com</p>
              <p className="text-sm text-muted-foreground">Port: 587 (TLS)</p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Amazon SES</h4>
              <p className="text-sm text-muted-foreground">Host: email-smtp.[region].amazonaws.com</p>
              <p className="text-sm text-muted-foreground">Port: 587 (TLS)</p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">SendGrid</h4>
              <p className="text-sm text-muted-foreground">Host: smtp.sendgrid.net</p>
              <p className="text-sm text-muted-foreground">Port: 587 (TLS)</p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Mailgun</h4>
              <p className="text-sm text-muted-foreground">Host: smtp.mailgun.org</p>
              <p className="text-sm text-muted-foreground">Port: 587 (TLS)</p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Zoho Mail</h4>
              <p className="text-sm text-muted-foreground">Host: smtp.zoho.com</p>
              <p className="text-sm text-muted-foreground">Port: 587 (TLS)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Email Dialog */}
      <Dialog open={testEmailDialog} onOpenChange={setTestEmailDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Test Email</DialogTitle>
            <DialogDescription>
              Enter an email address to send a test email and verify your SMTP configuration.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="testEmail">Test Email Address</Label>
              <Input
                id="testEmail"
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="test@example.com"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTestEmailDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleTestEmail} disabled={testing}>
              {testing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
              Send Test
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Bottom spacing to prevent content touching screen bottom */}
      <div className="h-6" />
    </div>
  );
}

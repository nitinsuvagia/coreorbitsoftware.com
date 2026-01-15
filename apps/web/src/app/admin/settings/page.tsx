'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Settings,
  Globe,
  Mail,
  Bell,
  Shield,
  Database,
  Key,
  CreditCard,
  Save,
  RefreshCw,
  AlertTriangle,
  Check,
  Plus,
  Trash2,
  Edit,
  TestTube,
  Loader2,
  Eye,
  EyeOff,
  HardDrive,
  Cloud,
  Slack,
  BarChart3,
  MessageSquare,
  X,
  Download,
  Upload,
  Calendar,
  Clock,
  History,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api/client';
import { formatCurrency, formatDate } from '@/lib/utils';

interface GeneralSettings {
  platformName: string;
  primaryDomain: string;
  supportEmail: string;
  defaultTimezone: string;
  description: string;
}

interface EmailSettings {
  smtpHost: string;
  smtpPort: number;
  smtpUsername: string;
  smtpPassword: string;
  encryption: 'none' | 'tls' | 'ssl';
  fromEmail: string;
  fromName: string;
}

interface SecuritySettings {
  requireMfaForAdmins: boolean;
  sessionTimeoutMinutes: number;
  ipAllowlistEnabled: boolean;
  ipAllowlist: string[];
  passwordMinLength: number;
  passwordRequireUppercase: boolean;
  passwordRequireNumbers: boolean;
  passwordRequireSymbols: boolean;
  maxLoginAttempts: number;
  lockoutDurationMinutes: number;
}

interface BillingSettings {
  stripePublishableKey: string;
  stripeSecretKey: string;
  stripeWebhookSecret: string;
  defaultCurrency: string;
  taxEnabled: boolean;
  defaultTaxRate: number;
}

interface IntegrationSettings {
  slack: { enabled: boolean; webhookUrl: string; botToken: string };
  aws: { enabled: boolean; accessKeyId: string; secretAccessKey: string; region: string; s3Bucket: string };
  googleAnalytics: { enabled: boolean; trackingId: string };
  sentry: { enabled: boolean; dsn: string };
}

interface MaintenanceSettings {
  maintenanceMode: boolean;
  maintenanceMessage: string;
  scheduledMaintenanceAt: string | null;
  scheduledMaintenanceEndAt: string | null;
}

interface Plan {
  id: string;
  name: string;
  slug: string;
  tier: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  currency: string;
  maxUsers: number;
  maxProjects: number;
  maxClients: number;
  maxStorage: number;
  features: {
    customDomain: boolean;
    ssoEnabled: boolean;
    advancedReports: boolean;
    apiAccess: boolean;
    prioritySupport: boolean;
    whiteLabel: boolean;
  };
  isActive: boolean;
  isPublic: boolean;
  stripeProductId?: string;
  stripePriceIdMonthly?: string;
  stripePriceIdYearly?: string;
}

interface DatabaseStats {
  databaseSize: string;
  tenantCount: number;
  adminCount: number;
  subscriptionCount: number;
  lastBackup: string | null;
}

interface BackupSettings {
  scheduleEnabled: boolean;
  scheduleFrequency: 'daily' | 'weekly' | 'monthly';
  scheduleTime: string; // HH:MM format
  scheduleDayOfWeek: number; // 0-6 for weekly
  scheduleDayOfMonth: number; // 1-31 for monthly
  s3Enabled: boolean;
  retentionDays: number;
}

interface BackupHistory {
  id: string;
  filename: string;
  size: string;
  createdAt: string;
  type: 'manual' | 'scheduled';
  destination: 'local' | 's3';
  status: 'completed' | 'failed' | 'in_progress';
}

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Settings state
  const [generalSettings, setGeneralSettings] = useState<GeneralSettings>({
    platformName: '', primaryDomain: '', supportEmail: '', defaultTimezone: 'UTC', description: ''
  });
  const [emailSettings, setEmailSettings] = useState<EmailSettings>({
    smtpHost: '', smtpPort: 587, smtpUsername: '', smtpPassword: '', encryption: 'tls', fromEmail: '', fromName: ''
  });
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({
    requireMfaForAdmins: false, sessionTimeoutMinutes: 60, ipAllowlistEnabled: false, ipAllowlist: [],
    passwordMinLength: 8, passwordRequireUppercase: true, passwordRequireNumbers: true, passwordRequireSymbols: false,
    maxLoginAttempts: 5, lockoutDurationMinutes: 15
  });
  const [billingSettings, setBillingSettings] = useState<BillingSettings>({
    stripePublishableKey: '', stripeSecretKey: '', stripeWebhookSecret: '', defaultCurrency: 'USD', taxEnabled: false, defaultTaxRate: 0
  });
  const [integrationSettings, setIntegrationSettings] = useState<IntegrationSettings>({
    slack: { enabled: false, webhookUrl: '', botToken: '' },
    aws: { enabled: false, accessKeyId: '', secretAccessKey: '', region: 'us-east-1', s3Bucket: '' },
    googleAnalytics: { enabled: false, trackingId: '' },
    sentry: { enabled: false, dsn: '' }
  });
  const [maintenanceSettings, setMaintenanceSettings] = useState<MaintenanceSettings>({
    maintenanceMode: false, maintenanceMessage: '', scheduledMaintenanceAt: null, scheduledMaintenanceEndAt: null
  });
  
  // Plans state
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [showPlanDialog, setShowPlanDialog] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [planForm, setPlanForm] = useState<Partial<Plan>>({});
  
  // Database stats
  const [dbStats, setDbStats] = useState<DatabaseStats | null>(null);
  
  // Backup state
  const [backupSettings, setBackupSettings] = useState<BackupSettings>({
    scheduleEnabled: false,
    scheduleFrequency: 'daily',
    scheduleTime: '02:00',
    scheduleDayOfWeek: 0,
    scheduleDayOfMonth: 1,
    s3Enabled: false,
    retentionDays: 30,
  });
  const [backupHistory, setBackupHistory] = useState<BackupHistory[]>([]);
  const [loadingBackups, setLoadingBackups] = useState(false);
  
  // UI state
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [testingEmail, setTestingEmail] = useState(false);
  const [testingSlack, setTestingSlack] = useState(false);
  const [runningBackup, setRunningBackup] = useState(false);
  
  // Test email dialog state
  const [showTestEmailDialog, setShowTestEmailDialog] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState('');

  useEffect(() => {
    loadSettings();
    loadPlans();
    loadDbStats(); // Load database stats on page load
    loadBackupHistory(); // Load backup history
    loadBackupSettings(); // Load backup schedule settings
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const [general, email, security, billing, integrations, maintenance] = await Promise.all([
        api.get('/api/v1/platform/settings/general').catch(() => ({ data: { data: {} } })),
        api.get('/api/v1/platform/settings/email').catch(() => ({ data: { data: {} } })),
        api.get('/api/v1/platform/settings/security').catch(() => ({ data: { data: {} } })),
        api.get('/api/v1/platform/settings/billing').catch(() => ({ data: { data: {} } })),
        api.get('/api/v1/platform/settings/integrations').catch(() => ({ data: { data: {} } })),
        api.get('/api/v1/platform/settings/maintenance').catch(() => ({ data: { data: {} } })),
      ]);
      
      if (general.data.data) setGeneralSettings(prev => ({ ...prev, ...general.data.data }));
      if (email.data.data) setEmailSettings(prev => ({ ...prev, ...email.data.data }));
      if (security.data.data) setSecuritySettings(prev => ({ ...prev, ...security.data.data }));
      if (billing.data.data) setBillingSettings(prev => ({ ...prev, ...billing.data.data }));
      if (integrations.data.data) setIntegrationSettings(prev => ({ ...prev, ...integrations.data.data }));
      if (maintenance.data.data) setMaintenanceSettings(prev => ({ ...prev, ...maintenance.data.data }));
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPlans = async () => {
    setLoadingPlans(true);
    try {
      const response = await api.get('/api/v1/platform/plans');
      setPlans(response.data.data || []);
    } catch (error) {
      console.error('Failed to load plans:', error);
    } finally {
      setLoadingPlans(false);
    }
  };

  const loadDbStats = async () => {
    try {
      const response = await api.get('/api/v1/platform/settings/maintenance/database-stats');
      setDbStats(response.data.data);
    } catch (error) {
      console.error('Failed to load database stats:', error);
    }
  };

  const saveSettings = async (section: string, data: any) => {
    setSaving(true);
    try {
      await api.put(`/api/v1/platform/settings/${section}`, data);
      toast.success('Settings saved successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const openTestEmailDialog = () => {
    setTestEmailAddress(generalSettings.supportEmail || '');
    setShowTestEmailDialog(true);
  };

  const handleTestEmail = async () => {
    if (!testEmailAddress.trim()) {
      toast.error('Please enter an email address');
      return;
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(testEmailAddress.trim())) {
      toast.error('Please enter a valid email address');
      return;
    }
    
    setTestingEmail(true);
    try {
      await api.post('/api/v1/platform/settings/email/test', {
        testEmail: testEmailAddress.trim()
      });
      toast.success(`Test email sent successfully to ${testEmailAddress.trim()}`);
      setShowTestEmailDialog(false);
      setTestEmailAddress('');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to send test email');
    } finally {
      setTestingEmail(false);
    }
  };

  const handleTestSlack = async () => {
    setTestingSlack(true);
    try {
      await api.post('/api/v1/platform/settings/integrations/slack/test');
      toast.success('Test message sent to Slack');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to send Slack message');
    } finally {
      setTestingSlack(false);
    }
  };

  const handleRunBackup = async (destination: 'download' | 's3' = 'download') => {
    setRunningBackup(true);
    try {
      const response = await api.post('/api/v1/platform/settings/maintenance/backup', { destination });
      
      if (destination === 'download' && response.data.data?.downloadUrl) {
        // Trigger file download
        window.open(response.data.data.downloadUrl, '_blank');
        toast.success('Backup created! Download started.');
      } else if (destination === 's3') {
        toast.success('Backup uploaded to S3 successfully');
      } else {
        toast.success('Backup initiated successfully');
      }
      
      // Refresh backup history
      loadBackupHistory();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to run backup');
    } finally {
      setRunningBackup(false);
    }
  };

  const loadBackupHistory = async () => {
    setLoadingBackups(true);
    try {
      const response = await api.get('/api/v1/platform/settings/maintenance/backups');
      setBackupHistory(response.data.data || []);
    } catch (error) {
      console.error('Failed to load backup history:', error);
    } finally {
      setLoadingBackups(false);
    }
  };

  const loadBackupSettings = async () => {
    try {
      const response = await api.get('/api/v1/platform/settings/maintenance/backup-settings');
      if (response.data.data) {
        setBackupSettings(prev => ({ ...prev, ...response.data.data }));
      }
    } catch (error) {
      console.error('Failed to load backup settings:', error);
    }
  };

  const saveBackupSettings = async () => {
    setSaving(true);
    try {
      await api.put('/api/v1/platform/settings/maintenance/backup-settings', backupSettings);
      toast.success('Backup settings saved successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save backup settings');
    } finally {
      setSaving(false);
    }
  };

  const downloadBackup = async (backupId: string) => {
    try {
      const response = await api.get(`/api/v1/platform/settings/maintenance/backups/${backupId}/download`);
      if (response.data.data?.downloadUrl) {
        window.open(response.data.data.downloadUrl, '_blank');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to download backup');
    }
  };

  const deleteBackup = async (backupId: string) => {
    if (!confirm('Are you sure you want to delete this backup?')) return;
    
    try {
      await api.delete(`/api/v1/platform/settings/maintenance/backups/${backupId}`);
      toast.success('Backup deleted');
      loadBackupHistory();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete backup');
    }
  };

  const handleSavePlan = async () => {
    setSaving(true);
    try {
      // Only send allowed fields to API
      const payload = {
        name: planForm.name,
        slug: planForm.slug,
        description: planForm.description,
        tier: planForm.tier,
        monthlyPrice: planForm.monthlyPrice,
        yearlyPrice: planForm.yearlyPrice,
        currency: planForm.currency,
        maxUsers: planForm.maxUsers,
        maxStorage: planForm.maxStorage,
        maxProjects: planForm.maxProjects,
        maxClients: planForm.maxClients,
        features: planForm.features,
        isActive: planForm.isActive,
        isPublic: planForm.isPublic,
      };
      
      if (editingPlan) {
        await api.put(`/api/v1/platform/plans/${editingPlan.id}`, payload);
        toast.success('Plan updated successfully');
      } else {
        await api.post('/api/v1/platform/plans', payload);
        toast.success('Plan created successfully');
      }
      setShowPlanDialog(false);
      setEditingPlan(null);
      setPlanForm({});
      loadPlans();
    } catch (error: any) {
      const errorData = error.response?.data?.error;
      if (Array.isArray(errorData)) {
        // Handle Zod validation errors
        const messages = errorData.map((e: any) => e.message || e.path?.join('.') || 'Validation error').join(', ');
        toast.error(messages);
      } else if (typeof errorData === 'object' && errorData !== null) {
        toast.error(errorData.message || 'Failed to save plan');
      } else {
        toast.error(errorData || 'Failed to save plan');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePlan = async (planId: string) => {
    if (!confirm('Are you sure you want to delete this plan?')) return;
    try {
      await api.delete(`/api/v1/platform/plans/${planId}`);
      toast.success('Plan deleted');
      loadPlans();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete plan');
    }
  };

  const handleTogglePlanActive = async (plan: Plan) => {
    try {
      await api.patch(`/api/v1/platform/plans/${plan.id}/toggle-active`);
      toast.success(plan.isActive ? 'Plan deactivated' : 'Plan activated');
      loadPlans();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to toggle plan');
    }
  };

  const openEditPlan = (plan: Plan) => {
    setEditingPlan(plan);
    // Transform features if it's an array (legacy format) to object format
    let features = plan.features;
    if (Array.isArray(features)) {
      const featureStrings = features as unknown as string[];
      features = {
        customDomain: featureStrings.some(f => f.toLowerCase().includes('custom domain')),
        ssoEnabled: featureStrings.some(f => f.toLowerCase().includes('sso')),
        advancedReports: featureStrings.some(f => f.toLowerCase().includes('report')),
        apiAccess: featureStrings.some(f => f.toLowerCase().includes('api')),
        prioritySupport: featureStrings.some(f => f.toLowerCase().includes('priority') || f.toLowerCase().includes('support')),
        whiteLabel: featureStrings.some(f => f.toLowerCase().includes('white label')),
      };
    }
    // maxStorage is now stored in GB directly - no conversion needed
    setPlanForm({ ...plan, features });
    setShowPlanDialog(true);
  };

  const openNewPlan = () => {
    setEditingPlan(null);
    setPlanForm({
      name: '', slug: '', tier: 'STARTER', description: '', currency: 'USD',
      monthlyPrice: 0, yearlyPrice: 0, maxUsers: 10, maxProjects: 5, maxClients: 10, maxStorage: 1,
      features: {
        customDomain: false,
        ssoEnabled: false,
        advancedReports: false,
        apiAccess: false,
        prioritySupport: false,
        whiteLabel: false
      },
      isActive: true, isPublic: true
    });
    setShowPlanDialog(true);
  };

  const toggleSecret = (key: string) => {
    setShowSecrets(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Skeleton components for settings tabs
  const FormFieldSkeleton = () => (
    <div className="space-y-2">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-10 w-full" />
    </div>
  );

  const SettingsCardSkeleton = ({ title = true, fields = 4 }: { title?: boolean; fields?: number }) => (
    <Card>
      <CardHeader>
        {title && (
          <>
            <Skeleton className="h-5 w-40 mb-1" />
            <Skeleton className="h-4 w-56" />
          </>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: fields }).map((_, i) => (
            <FormFieldSkeleton key={i} />
          ))}
        </div>
      </CardContent>
      <CardFooter>
        <Skeleton className="h-10 w-32" />
      </CardFooter>
    </Card>
  );

  const GeneralTabSkeleton = () => (
    <div className="space-y-4">
      <SettingsCardSkeleton fields={4} />
    </div>
  );

  const EmailTabSkeleton = () => (
    <div className="space-y-4">
      <SettingsCardSkeleton fields={6} />
    </div>
  );

  const SecurityTabSkeleton = () => (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-44 mb-1" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="space-y-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-6 w-11 rounded-full" />
            </div>
          ))}
        </CardContent>
      </Card>
      <SettingsCardSkeleton fields={4} />
    </div>
  );

  const BillingTabSkeleton = () => (
    <div className="space-y-4">
      <SettingsCardSkeleton fields={4} />
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32 mb-1" />
          <Skeleton className="h-4 w-48\" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded" />
                  <div>
                    <Skeleton className="h-4 w-24 mb-1\" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
                <Skeleton className="h-8 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const IntegrationsTabSkeleton = () => (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-5 rounded" />
                <Skeleton className="h-5 w-24" />
              </div>
              <Skeleton className="h-6 w-11 rounded-full" />
            </div>
            <Skeleton className="h-4 w-56" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <FormFieldSkeleton />
              <FormFieldSkeleton />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const MaintenanceTabSkeleton = () => (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-36 mb-1" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-4 w-32 mb-1" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-6 w-11 rounded-full" />
          </div>
          <FormFieldSkeleton />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32 mb-1" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="text-center p-4 border rounded-lg">
                <Skeleton className="h-8 w-16 mx-auto mb-2" />
                <Skeleton className="h-3 w-20 mx-auto" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-56" />
          </div>
          <Skeleton className="h-10 w-24" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-10 w-full max-w-2xl" />
          <GeneralTabSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Platform Settings</h2>
          <p className="text-muted-foreground">Configure global platform settings</p>
        </div>
        <Button variant="outline" onClick={loadSettings} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
        </TabsList>

        {/* General Settings Tab */}
        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />Platform Information
              </CardTitle>
              <CardDescription>Basic platform configuration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="platformName">Platform Name</Label>
                  <Input id="platformName" value={generalSettings.platformName}
                    onChange={(e) => setGeneralSettings(s => ({ ...s, platformName: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="primaryDomain">Primary Domain</Label>
                  <Input id="primaryDomain" value={generalSettings.primaryDomain}
                    onChange={(e) => setGeneralSettings(s => ({ ...s, primaryDomain: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supportEmail">Support Email</Label>
                  <Input id="supportEmail" type="email" value={generalSettings.supportEmail}
                    onChange={(e) => setGeneralSettings(s => ({ ...s, supportEmail: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Default Timezone</Label>
                  <Select value={generalSettings.defaultTimezone}
                    onValueChange={(v) => setGeneralSettings(s => ({ ...s, defaultTimezone: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UTC">UTC</SelectItem>
                      <SelectItem value="America/New_York">Eastern Time</SelectItem>
                      <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                      <SelectItem value="Europe/London">London</SelectItem>
                      <SelectItem value="Asia/Kolkata">India (IST)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Platform Description</Label>
                <Textarea id="description" value={generalSettings.description}
                  onChange={(e) => setGeneralSettings(s => ({ ...s, description: e.target.value }))} />
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={() => saveSettings('general', generalSettings)} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Changes
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Email Settings Tab */}
        <TabsContent value="email" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />Email Configuration
              </CardTitle>
              <CardDescription>Configure SMTP email settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="smtpHost">SMTP Host</Label>
                  <Input id="smtpHost" value={emailSettings.smtpHost} placeholder="smtp.example.com"
                    onChange={(e) => setEmailSettings(s => ({ ...s, smtpHost: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtpPort">SMTP Port</Label>
                  <Input id="smtpPort" type="number" value={emailSettings.smtpPort}
                    onChange={(e) => setEmailSettings(s => ({ ...s, smtpPort: parseInt(e.target.value) || 587 }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtpUsername">SMTP Username</Label>
                  <Input id="smtpUsername" value={emailSettings.smtpUsername}
                    onChange={(e) => setEmailSettings(s => ({ ...s, smtpUsername: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtpPassword">SMTP Password</Label>
                  <div className="relative">
                    <Input id="smtpPassword" type={showSecrets['smtpPassword'] ? 'text' : 'password'}
                      value={emailSettings.smtpPassword}
                      onChange={(e) => setEmailSettings(s => ({ ...s, smtpPassword: e.target.value }))} />
                    <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full"
                      onClick={() => toggleSecret('smtpPassword')}>
                      {showSecrets['smtpPassword'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fromEmail">From Email</Label>
                  <Input id="fromEmail" type="email" value={emailSettings.fromEmail}
                    onChange={(e) => setEmailSettings(s => ({ ...s, fromEmail: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fromName">From Name</Label>
                  <Input id="fromName" value={emailSettings.fromName}
                    onChange={(e) => setEmailSettings(s => ({ ...s, fromName: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="encryption">Encryption</Label>
                <Select value={emailSettings.encryption}
                  onValueChange={(v: 'none' | 'tls' | 'ssl') => setEmailSettings(s => ({ ...s, encryption: v }))}>
                  <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tls">TLS</SelectItem>
                    <SelectItem value="ssl">SSL</SelectItem>
                    <SelectItem value="none">None</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
            <CardFooter className="flex gap-2">
              <Button onClick={() => saveSettings('email', emailSettings)} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Changes
              </Button>
              <Button variant="outline" onClick={openTestEmailDialog} disabled={testingEmail}>
                <TestTube className="mr-2 h-4 w-4" />
                Send Test Email
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Security Settings Tab */}
        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />Security Settings
              </CardTitle>
              <CardDescription>Configure security policies. API Keys below are for external systems to access your platform API (webhooks, integrations).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">Require MFA for Admins</p>
                    <p className="text-sm text-muted-foreground">All platform admins must enable 2FA</p>
                  </div>
                  <Switch checked={securitySettings.requireMfaForAdmins}
                    onCheckedChange={(c) => setSecuritySettings(s => ({ ...s, requireMfaForAdmins: c }))} />
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">Session Timeout</p>
                    <p className="text-sm text-muted-foreground">Auto logout after inactivity</p>
                  </div>
                  <Select value={String(securitySettings.sessionTimeoutMinutes)}
                    onValueChange={(v) => setSecuritySettings(s => ({ ...s, sessionTimeoutMinutes: parseInt(v) }))}>
                    <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 min</SelectItem>
                      <SelectItem value="30">30 min</SelectItem>
                      <SelectItem value="60">1 hour</SelectItem>
                      <SelectItem value="120">2 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">IP Allowlist</p>
                    <p className="text-sm text-muted-foreground">Restrict admin access to specific IPs</p>
                  </div>
                  <Switch checked={securitySettings.ipAllowlistEnabled}
                    onCheckedChange={(c) => setSecuritySettings(s => ({ ...s, ipAllowlistEnabled: c }))} />
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">Password Requirements</p>
                    <p className="text-sm text-muted-foreground">
                      Min {securitySettings.passwordMinLength} chars
                      {securitySettings.passwordRequireUppercase && ', uppercase'}
                      {securitySettings.passwordRequireNumbers && ', numbers'}
                      {securitySettings.passwordRequireSymbols && ', symbols'}
                    </p>
                  </div>
                  <div className="flex gap-2 items-center">
                    <Input type="number" className="w-16" value={securitySettings.passwordMinLength}
                      onChange={(e) => setSecuritySettings(s => ({ ...s, passwordMinLength: parseInt(e.target.value) || 8 }))} />
                    <div className="flex flex-col text-xs">
                      <label className="flex items-center gap-1">
                        <input type="checkbox" checked={securitySettings.passwordRequireUppercase}
                          onChange={(e) => setSecuritySettings(s => ({ ...s, passwordRequireUppercase: e.target.checked }))} />
                        A-Z
                      </label>
                      <label className="flex items-center gap-1">
                        <input type="checkbox" checked={securitySettings.passwordRequireNumbers}
                          onChange={(e) => setSecuritySettings(s => ({ ...s, passwordRequireNumbers: e.target.checked }))} />
                        0-9
                      </label>
                      <label className="flex items-center gap-1">
                        <input type="checkbox" checked={securitySettings.passwordRequireSymbols}
                          onChange={(e) => setSecuritySettings(s => ({ ...s, passwordRequireSymbols: e.target.checked }))} />
                        !@#
                      </label>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">Max Login Attempts</p>
                    <p className="text-sm text-muted-foreground">Lock account after failed attempts</p>
                  </div>
                  <Input type="number" className="w-20" value={securitySettings.maxLoginAttempts}
                    onChange={(e) => setSecuritySettings(s => ({ ...s, maxLoginAttempts: parseInt(e.target.value) || 5 }))} />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={() => saveSettings('security', securitySettings)} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Changes
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />Platform API Keys
              </CardTitle>
              <CardDescription>API keys for external services to authenticate with your platform (NOT for Stripe payments)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">Production API Key</p>
                    <p className="text-sm text-muted-foreground font-mono">pk_live_••••••••••••••••</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">Regenerate</Button>
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">Test API Key</p>
                    <p className="text-sm text-muted-foreground font-mono">pk_test_••••••••••••••••</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">Regenerate</Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Billing Settings Tab */}
        <TabsContent value="billing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />Stripe Configuration
              </CardTitle>
              <CardDescription>Configure Stripe payment gateway</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="stripePublishableKey">Stripe Publishable Key</Label>
                  <Input id="stripePublishableKey" value={billingSettings.stripePublishableKey}
                    placeholder="pk_live_..." onChange={(e) => setBillingSettings(s => ({ ...s, stripePublishableKey: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stripeSecretKey">Stripe Secret Key</Label>
                  <div className="relative">
                    <Input id="stripeSecretKey" type={showSecrets['stripeSecretKey'] ? 'text' : 'password'}
                      value={billingSettings.stripeSecretKey} placeholder="sk_live_..."
                      onChange={(e) => setBillingSettings(s => ({ ...s, stripeSecretKey: e.target.value }))} />
                    <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full"
                      onClick={() => toggleSecret('stripeSecretKey')}>
                      {showSecrets['stripeSecretKey'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stripeWebhookSecret">Webhook Secret</Label>
                  <div className="relative">
                    <Input id="stripeWebhookSecret" type={showSecrets['stripeWebhookSecret'] ? 'text' : 'password'}
                      value={billingSettings.stripeWebhookSecret} placeholder="whsec_..."
                      onChange={(e) => setBillingSettings(s => ({ ...s, stripeWebhookSecret: e.target.value }))} />
                    <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full"
                      onClick={() => toggleSecret('stripeWebhookSecret')}>
                      {showSecrets['stripeWebhookSecret'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="defaultCurrency">Default Currency</Label>
                  <Select value={billingSettings.defaultCurrency}
                    onValueChange={(v) => setBillingSettings(s => ({ ...s, defaultCurrency: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD - US Dollar</SelectItem>
                      <SelectItem value="EUR">EUR - Euro</SelectItem>
                      <SelectItem value="GBP">GBP - British Pound</SelectItem>
                      <SelectItem value="INR">INR - Indian Rupee</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={() => saveSettings('billing', billingSettings)} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Changes
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Pricing Plans</CardTitle>
                  <CardDescription>Manage subscription plans (synced with Stripe)</CardDescription>
                </div>
                <Button onClick={openNewPlan}><Plus className="mr-2 h-4 w-4" />Add Plan</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {loadingPlans ? (
                  // Skeleton loading for plans
                  [...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="space-y-2">
                          <Skeleton className="h-5 w-32" />
                          <Skeleton className="h-4 w-40" />
                        </div>
                        <Skeleton className="h-5 w-16 rounded-full" />
                      </div>
                      <div className="flex gap-2">
                        <Skeleton className="h-8 w-8" />
                        <Skeleton className="h-8 w-8" />
                        <Skeleton className="h-8 w-8" />
                      </div>
                    </div>
                  ))
                ) : plans.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">No plans configured</p>
                ) : (
                  plans.map((plan) => (
                    <div key={plan.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="font-medium">{plan.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatCurrency(plan.monthlyPrice)}/mo · {formatCurrency(plan.yearlyPrice)}/yr
                          </p>
                        </div>
                        <Badge variant={plan.isActive ? 'default' : 'secondary'}>
                          {plan.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                        {plan.stripeProductId && (
                          <Badge variant="outline" className="gap-1">
                            <Check className="h-3 w-3" />Stripe Synced
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openEditPlan(plan)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleTogglePlanActive(plan)}>
                          {plan.isActive ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeletePlan(plan.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integrations Tab */}
        <TabsContent value="integrations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Slack className="h-5 w-5" />Slack Integration
              </CardTitle>
              <CardDescription>Send notifications to Slack channels</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch checked={integrationSettings.slack.enabled}
                  onCheckedChange={(c) => setIntegrationSettings(s => ({ ...s, slack: { ...s.slack, enabled: c } }))} />
                <Label>Enable Slack notifications</Label>
              </div>
              {integrationSettings.slack.enabled && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="slackWebhook">Webhook URL</Label>
                    <Input id="slackWebhook" value={integrationSettings.slack.webhookUrl} placeholder="https://hooks.slack.com/services/..."
                      onChange={(e) => setIntegrationSettings(s => ({ ...s, slack: { ...s.slack, webhookUrl: e.target.value } }))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="slackBotToken">Bot Token (optional)</Label>
                    <Input id="slackBotToken" value={integrationSettings.slack.botToken} placeholder="xoxb-..."
                      onChange={(e) => setIntegrationSettings(s => ({ ...s, slack: { ...s.slack, botToken: e.target.value } }))} />
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex gap-2">
              <Button onClick={() => saveSettings('integrations', integrationSettings)} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save
              </Button>
              {integrationSettings.slack.enabled && (
                <Button variant="outline" onClick={handleTestSlack} disabled={testingSlack}>
                  {testingSlack ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <TestTube className="mr-2 h-4 w-4" />}
                  Test
                </Button>
              )}
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cloud className="h-5 w-5" />AWS S3 Storage
              </CardTitle>
              <CardDescription>Configure file storage</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch checked={integrationSettings.aws.enabled}
                  onCheckedChange={(c) => setIntegrationSettings(s => ({ ...s, aws: { ...s.aws, enabled: c } }))} />
                <Label>Enable AWS S3</Label>
              </div>
              {integrationSettings.aws.enabled && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Access Key ID</Label>
                    <Input value={integrationSettings.aws.accessKeyId}
                      onChange={(e) => setIntegrationSettings(s => ({ ...s, aws: { ...s.aws, accessKeyId: e.target.value } }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Secret Access Key</Label>
                    <Input type="password" value={integrationSettings.aws.secretAccessKey}
                      onChange={(e) => setIntegrationSettings(s => ({ ...s, aws: { ...s.aws, secretAccessKey: e.target.value } }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Region</Label>
                    <Input value={integrationSettings.aws.region}
                      onChange={(e) => setIntegrationSettings(s => ({ ...s, aws: { ...s.aws, region: e.target.value } }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>S3 Bucket</Label>
                    <Input value={integrationSettings.aws.s3Bucket}
                      onChange={(e) => setIntegrationSettings(s => ({ ...s, aws: { ...s.aws, s3Bucket: e.target.value } }))} />
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button onClick={() => saveSettings('integrations', integrationSettings)} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />Analytics & Monitoring
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium">Google Analytics</p>
                  <Switch checked={integrationSettings.googleAnalytics.enabled}
                    onCheckedChange={(c) => setIntegrationSettings(s => ({ ...s, googleAnalytics: { ...s.googleAnalytics, enabled: c } }))} />
                </div>
                {integrationSettings.googleAnalytics.enabled && (
                  <Input placeholder="GA-XXXXXXXXXX" value={integrationSettings.googleAnalytics.trackingId}
                    onChange={(e) => setIntegrationSettings(s => ({ ...s, googleAnalytics: { ...s.googleAnalytics, trackingId: e.target.value } }))} />
                )}
              </div>
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium">Sentry Error Tracking</p>
                  <Switch checked={integrationSettings.sentry.enabled}
                    onCheckedChange={(c) => setIntegrationSettings(s => ({ ...s, sentry: { ...s.sentry, enabled: c } }))} />
                </div>
                {integrationSettings.sentry.enabled && (
                  <Input placeholder="https://xxxxx@sentry.io/xxxxx" value={integrationSettings.sentry.dsn}
                    onChange={(e) => setIntegrationSettings(s => ({ ...s, sentry: { ...s.sentry, dsn: e.target.value } }))} />
                )}
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={() => saveSettings('integrations', integrationSettings)} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save All Integrations
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Maintenance Tab */}
        <TabsContent value="maintenance" className="space-y-4">
          {/* Database Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />Database Status
              </CardTitle>
              <CardDescription>Current database statistics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">Database Size</p>
                  {dbStats ? (
                    <p className="text-sm text-muted-foreground">{dbStats.databaseSize} across {dbStats.tenantCount} tenants</p>
                  ) : (
                    <Skeleton className="h-4 w-40 mt-1" />
                  )}
                </div>
                <Button variant="outline" onClick={loadDbStats}>
                  <RefreshCw className="mr-2 h-4 w-4" />Refresh
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Manual Backup */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HardDrive className="h-5 w-5" />Manual Backup
              </CardTitle>
              <CardDescription>Create a database backup now</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-center gap-2">
                    <Download className="h-5 w-5 text-blue-500" />
                    <p className="font-medium">Download Backup</p>
                  </div>
                  <p className="text-sm text-muted-foreground">Create and download a backup file (.sql) to your computer</p>
                  <Button onClick={() => handleRunBackup('download')} disabled={runningBackup} className="w-full">
                    {runningBackup ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                    Download Backup
                  </Button>
                </div>
                <div className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-center gap-2">
                    <Cloud className="h-5 w-5 text-green-500" />
                    <p className="font-medium">S3 Cloud Backup</p>
                  </div>
                  <p className="text-sm text-muted-foreground">Upload backup directly to your AWS S3 bucket</p>
                  <Button 
                    onClick={() => handleRunBackup('s3')} 
                    disabled={runningBackup || !integrationSettings.aws.enabled} 
                    variant="outline"
                    className="w-full"
                  >
                    {runningBackup ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                    Upload to S3
                  </Button>
                  {!integrationSettings.aws.enabled && (
                    <p className="text-xs text-amber-600">Enable AWS integration in Integrations tab first</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Scheduled Backups */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />Scheduled Backups
              </CardTitle>
              <CardDescription>Configure automatic backup schedule</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Enable Scheduled Backups</p>
                  <p className="text-sm text-muted-foreground">Automatically create backups on a schedule</p>
                </div>
                <Switch 
                  checked={backupSettings.scheduleEnabled} 
                  onCheckedChange={(checked) => setBackupSettings(s => ({ ...s, scheduleEnabled: checked }))} 
                />
              </div>

              {backupSettings.scheduleEnabled && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Frequency</Label>
                      <Select 
                        value={backupSettings.scheduleFrequency} 
                        onValueChange={(v: 'daily' | 'weekly' | 'monthly') => setBackupSettings(s => ({ ...s, scheduleFrequency: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Time (24hr)</Label>
                      <Input 
                        type="time" 
                        value={backupSettings.scheduleTime} 
                        onChange={(e) => setBackupSettings(s => ({ ...s, scheduleTime: e.target.value }))} 
                      />
                    </div>
                  </div>

                  {backupSettings.scheduleFrequency === 'weekly' && (
                    <div className="space-y-2">
                      <Label>Day of Week</Label>
                      <Select 
                        value={String(backupSettings.scheduleDayOfWeek)} 
                        onValueChange={(v) => setBackupSettings(s => ({ ...s, scheduleDayOfWeek: parseInt(v) }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">Sunday</SelectItem>
                          <SelectItem value="1">Monday</SelectItem>
                          <SelectItem value="2">Tuesday</SelectItem>
                          <SelectItem value="3">Wednesday</SelectItem>
                          <SelectItem value="4">Thursday</SelectItem>
                          <SelectItem value="5">Friday</SelectItem>
                          <SelectItem value="6">Saturday</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {backupSettings.scheduleFrequency === 'monthly' && (
                    <div className="space-y-2">
                      <Label>Day of Month</Label>
                      <Select 
                        value={String(backupSettings.scheduleDayOfMonth)} 
                        onValueChange={(v) => setBackupSettings(s => ({ ...s, scheduleDayOfMonth: parseInt(v) }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[...Array(28)].map((_, i) => (
                            <SelectItem key={i + 1} value={String(i + 1)}>{i + 1}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Backup Destination</Label>
                      <div className="flex items-center gap-2">
                        <Switch 
                          checked={backupSettings.s3Enabled} 
                          onCheckedChange={(checked) => setBackupSettings(s => ({ ...s, s3Enabled: checked }))} 
                          disabled={!integrationSettings.aws.enabled}
                        />
                        <span className="text-sm">Upload to S3</span>
                      </div>
                      {!integrationSettings.aws.enabled && (
                        <p className="text-xs text-amber-600">Enable AWS integration first</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Retention (days)</Label>
                      <Input 
                        type="number" 
                        min={1} 
                        max={365} 
                        value={backupSettings.retentionDays} 
                        onChange={(e) => setBackupSettings(s => ({ ...s, retentionDays: parseInt(e.target.value) || 30 }))} 
                      />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button onClick={saveBackupSettings} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Schedule
              </Button>
            </CardFooter>
          </Card>

          {/* Backup History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />Backup History
              </CardTitle>
              <CardDescription>Recent database backups</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingBackups ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-4 w-4" />
                        <div className="space-y-1">
                          <Skeleton className="h-4 w-48" />
                          <Skeleton className="h-3 w-32" />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-8 w-8" />
                        <Skeleton className="h-8 w-8" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : backupHistory.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No backups yet. Create your first backup above.</p>
              ) : (
                <div className="space-y-2">
                  {backupHistory.map((backup) => (
                    <div key={backup.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {backup.destination === 's3' ? (
                          <Cloud className="h-4 w-4 text-green-500" />
                        ) : (
                          <HardDrive className="h-4 w-4 text-blue-500" />
                        )}
                        <div>
                          <p className="font-medium text-sm">{backup.filename}</p>
                          <p className="text-xs text-muted-foreground">
                            {backup.size} • {formatDate(backup.createdAt)} • 
                            <Badge variant="outline" className="ml-1 text-xs">
                              {backup.type}
                            </Badge>
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {backup.status === 'completed' && (
                          <Button variant="ghost" size="sm" onClick={() => downloadBackup(backup.id)}>
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                        {backup.status === 'in_progress' && (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        )}
                        <Button variant="ghost" size="sm" onClick={() => deleteBackup(backup.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-yellow-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-yellow-600">
                <AlertTriangle className="h-5 w-5" />Maintenance Mode
              </CardTitle>
              <CardDescription>Take the platform offline for maintenance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Enabling maintenance mode will show a maintenance page to all users except platform admins.
              </p>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">Maintenance Mode</p>
                  <p className="text-sm text-muted-foreground">
                    {maintenanceSettings.maintenanceMode ? 'Currently ENABLED' : 'Currently disabled'}
                  </p>
                </div>
                <Switch checked={maintenanceSettings.maintenanceMode}
                  onCheckedChange={(c) => setMaintenanceSettings(s => ({ ...s, maintenanceMode: c }))} />
              </div>
              {maintenanceSettings.maintenanceMode && (
                <div className="space-y-2">
                  <Label>Maintenance Message</Label>
                  <Textarea value={maintenanceSettings.maintenanceMessage} placeholder="We're performing scheduled maintenance..."
                    onChange={(e) => setMaintenanceSettings(s => ({ ...s, maintenanceMessage: e.target.value }))} />
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button onClick={() => saveSettings('maintenance', maintenanceSettings)} disabled={saving}
                variant={maintenanceSettings.maintenanceMode ? 'destructive' : 'default'}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Maintenance Settings
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Test Email Dialog */}
      <Dialog open={showTestEmailDialog} onOpenChange={setShowTestEmailDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Send Test Email
            </DialogTitle>
            <DialogDescription>
              Enter the email address where you want to receive the test email.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="testEmail">Email Address</Label>
              <Input
                id="testEmail"
                type="email"
                placeholder="test@example.com"
                value={testEmailAddress}
                onChange={(e) => setTestEmailAddress(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleTestEmail()}
              />
              <p className="text-sm text-muted-foreground">
                A test email will be sent using your current SMTP configuration.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTestEmailDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleTestEmail} disabled={testingEmail}>
              {testingEmail ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Send Test Email
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Plan Dialog */}
      <Dialog open={showPlanDialog} onOpenChange={setShowPlanDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPlan ? 'Edit Plan' : 'Create New Plan'}</DialogTitle>
            <DialogDescription>Configure plan details. Plans will be synced to Stripe if configured.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Plan Name</Label>
                <Input value={planForm.name || ''} onChange={(e) => setPlanForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Slug</Label>
                <Input value={planForm.slug || ''} placeholder="e.g. starter-plan" onChange={(e) => setPlanForm(f => ({ ...f, slug: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Tier</Label>
                <Select value={planForm.tier || 'STARTER'} onValueChange={(v) => setPlanForm(f => ({ ...f, tier: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STARTER">Starter</SelectItem>
                    <SelectItem value="PROFESSIONAL">Professional</SelectItem>
                    <SelectItem value="ENTERPRISE">Enterprise</SelectItem>
                    <SelectItem value="CUSTOM">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <Select value={planForm.currency || 'USD'} onValueChange={(v) => setPlanForm(f => ({ ...f, currency: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                    <SelectItem value="INR">INR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Monthly Price</Label>
                <Input type="number" value={planForm.monthlyPrice || 0}
                  onChange={(e) => setPlanForm(f => ({ ...f, monthlyPrice: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div className="space-y-2">
                <Label>Yearly Price</Label>
                <Input type="number" value={planForm.yearlyPrice || 0}
                  onChange={(e) => setPlanForm(f => ({ ...f, yearlyPrice: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div className="space-y-2">
                <Label>Max Users (-1 = unlimited)</Label>
                <Input type="number" value={planForm.maxUsers ?? 10}
                  onChange={(e) => setPlanForm(f => ({ ...f, maxUsers: parseInt(e.target.value) }))} />
              </div>
              <div className="space-y-2">
                <Label>Max Projects (-1 = unlimited)</Label>
                <Input type="number" value={planForm.maxProjects ?? 5}
                  onChange={(e) => setPlanForm(f => ({ ...f, maxProjects: parseInt(e.target.value) }))} />
              </div>
              <div className="space-y-2">
                <Label>Max Clients (-1 = unlimited)</Label>
                <Input type="number" value={planForm.maxClients ?? 10}
                  onChange={(e) => setPlanForm(f => ({ ...f, maxClients: parseInt(e.target.value) }))} />
              </div>
              <div className="space-y-2">
                <Label>Max Storage (GB, -1 = unlimited)</Label>
                <Input type="number" value={planForm.maxStorage ?? 1}
                  onChange={(e) => setPlanForm(f => ({ ...f, maxStorage: parseInt(e.target.value) }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={planForm.description || ''}
                onChange={(e) => setPlanForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label className="text-base font-medium">Features</Label>
              <div className="grid gap-2 md:grid-cols-2">
                <label className="flex items-center gap-2 p-2 border rounded">
                  <input type="checkbox" checked={planForm.features?.customDomain ?? false}
                    onChange={(e) => setPlanForm(f => ({ ...f, features: { ...f.features!, customDomain: e.target.checked } }))} />
                  <span>Custom Domain</span>
                </label>
                <label className="flex items-center gap-2 p-2 border rounded">
                  <input type="checkbox" checked={planForm.features?.ssoEnabled ?? false}
                    onChange={(e) => setPlanForm(f => ({ ...f, features: { ...f.features!, ssoEnabled: e.target.checked } }))} />
                  <span>SSO Enabled</span>
                </label>
                <label className="flex items-center gap-2 p-2 border rounded">
                  <input type="checkbox" checked={planForm.features?.advancedReports ?? false}
                    onChange={(e) => setPlanForm(f => ({ ...f, features: { ...f.features!, advancedReports: e.target.checked } }))} />
                  <span>Advanced Reports</span>
                </label>
                <label className="flex items-center gap-2 p-2 border rounded">
                  <input type="checkbox" checked={planForm.features?.apiAccess ?? false}
                    onChange={(e) => setPlanForm(f => ({ ...f, features: { ...f.features!, apiAccess: e.target.checked } }))} />
                  <span>API Access</span>
                </label>
                <label className="flex items-center gap-2 p-2 border rounded">
                  <input type="checkbox" checked={planForm.features?.prioritySupport ?? false}
                    onChange={(e) => setPlanForm(f => ({ ...f, features: { ...f.features!, prioritySupport: e.target.checked } }))} />
                  <span>Priority Support</span>
                </label>
                <label className="flex items-center gap-2 p-2 border rounded">
                  <input type="checkbox" checked={planForm.features?.whiteLabel ?? false}
                    onChange={(e) => setPlanForm(f => ({ ...f, features: { ...f.features!, whiteLabel: e.target.checked } }))} />
                  <span>White Label</span>
                </label>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center space-x-2">
                <Switch checked={planForm.isActive ?? true}
                  onCheckedChange={(c) => setPlanForm(f => ({ ...f, isActive: c }))} />
                <Label>Active</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch checked={planForm.isPublic ?? true}
                  onCheckedChange={(c) => setPlanForm(f => ({ ...f, isPublic: c }))} />
                <Label>Public (visible on pricing page)</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPlanDialog(false)}>Cancel</Button>
            <Button onClick={handleSavePlan} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingPlan ? 'Update Plan' : 'Create Plan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

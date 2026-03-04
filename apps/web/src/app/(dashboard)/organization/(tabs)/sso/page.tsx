'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
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
import {
  useSSOStatus,
  useConfigureSSO,
  useDeleteSSO,
  useTestSSO,
  GOOGLE_OAUTH_PRESET,
  MICROSOFT_OAUTH_PRESET,
  SSOProviderType,
  OAuthConfig,
} from '@/hooks/use-sso';
import {
  Shield,
  Key,
  Globe,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
  ExternalLink,
  Copy,
  Eye,
  EyeOff,
  Trash2,
  Settings2,
  Users,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';

type ProviderPreset = 'google' | 'microsoft' | 'custom';

interface GoogleFormState {
  clientId: string;
  clientSecret: string;
  allowedDomain?: string;
}

export default function SSOSettingsPage() {
  const { data: ssoStatus, isLoading: loadingStatus, error: statusError } = useSSOStatus();
  const configureSSO = useConfigureSSO();
  const deleteSSO = useDeleteSSO();
  const testSSO = useTestSSO();

  const [showSetup, setShowSetup] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<ProviderPreset>('google');
  const [showSecret, setShowSecret] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  const [googleForm, setGoogleForm] = useState<GoogleFormState>({
    clientId: '',
    clientSecret: '',
    allowedDomain: '',
  });

  // Get callback URL based on current domain
  const getCallbackUrl = () => {
    if (typeof window === 'undefined') return '';
    const protocol = window.location.protocol;
    const host = window.location.host;
    return `${protocol}//${host}/api/auth/sso/oauth/callback`;
  };

  const handleCopyCallbackUrl = () => {
    navigator.clipboard.writeText(getCallbackUrl());
    toast.success('Callback URL copied to clipboard');
  };

  const handleSaveGoogleSSO = async () => {
    if (!googleForm.clientId || !googleForm.clientSecret) {
      toast.error('Client ID and Client Secret are required');
      return;
    }

    try {
      const config: OAuthConfig = {
        ...GOOGLE_OAUTH_PRESET,
        clientId: googleForm.clientId,
        clientSecret: googleForm.clientSecret,
        callbackUrl: getCallbackUrl(),
      };

      await configureSSO.mutateAsync({
        type: 'oauth',
        name: 'Google Workspace',
        enabled: true,
        config,
      });

      toast.success('Google SSO configured successfully');
      setShowSetup(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to configure SSO');
    }
  };

  const handleTestConnection = async () => {
    try {
      const result = await testSSO.mutateAsync('oauth');
      if (result.success) {
        toast.success('SSO configuration is valid');
      } else {
        toast.error(result.message || 'SSO test failed');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to test SSO');
    }
  };

  const handleDeleteSSO = async () => {
    try {
      // For now, we use a generic delete - the backend handles finding the provider
      await deleteSSO.mutateAsync('current');
      toast.success('SSO configuration removed');
      setDeleteDialogOpen(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove SSO');
    }
  };

  const handleDisableSSO = async () => {
    try {
      // Update to disable
      await configureSSO.mutateAsync({
        type: ssoStatus?.type || 'oauth',
        name: ssoStatus?.name || 'SSO Provider',
        enabled: false,
        config: {} as OAuthConfig, // Will be merged with existing
      });
      toast.success('SSO disabled');
    } catch (error: any) {
      toast.error(error.message || 'Failed to disable SSO');
    }
  };

  if (loadingStatus) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isConfigured = ssoStatus?.enabled;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Single Sign-On (SSO)</h2>
        <p className="text-muted-foreground">
          Allow employees to sign in using their corporate identity provider
        </p>
      </div>

      {/* Current Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${isConfigured ? 'bg-green-100 dark:bg-green-900' : 'bg-gray-100 dark:bg-gray-800'}`}>
                <Shield className={`h-5 w-5 ${isConfigured ? 'text-green-600 dark:text-green-400' : 'text-gray-500'}`} />
              </div>
              <div>
                <CardTitle className="text-lg">SSO Status</CardTitle>
                <CardDescription>
                  {isConfigured 
                    ? `Connected to ${ssoStatus?.name || 'SSO Provider'}` 
                    : 'No SSO provider configured'
                  }
                </CardDescription>
              </div>
            </div>
            <Badge variant={isConfigured ? 'default' : 'secondary'}>
              {isConfigured ? 'Active' : 'Not Configured'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {isConfigured ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <div className="flex-1">
                  <p className="font-medium text-green-800 dark:text-green-200">
                    {ssoStatus?.name} SSO is active
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Employees can sign in using their {ssoStatus?.name} accounts
                  </p>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleTestConnection} disabled={testSSO.isPending}>
                  {testSSO.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Settings2 className="mr-2 h-4 w-4" />
                  )}
                  Test Connection
                </Button>
                <Button variant="outline" onClick={() => setShowSetup(true)}>
                  <Key className="mr-2 h-4 w-4" />
                  Update Configuration
                </Button>
                <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Remove SSO
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Why enable SSO?</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                    <li>Employees use their existing corporate credentials</li>
                    <li>No separate passwords to remember</li>
                    <li>Automatic account provisioning</li>
                    <li>Centralized access control</li>
                    <li>Enhanced security with your identity provider</li>
                  </ul>
                </AlertDescription>
              </Alert>
              
              <Button onClick={() => setShowSetup(true)}>
                <Key className="mr-2 h-4 w-4" />
                Configure SSO
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Setup Dialog */}
      <Dialog open={showSetup} onOpenChange={setShowSetup}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configure Single Sign-On</DialogTitle>
            <DialogDescription>
              Set up SSO to allow employees to sign in with their corporate accounts
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="google" onValueChange={(v) => setSelectedPreset(v as ProviderPreset)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="google" className="gap-2">
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Google
              </TabsTrigger>
              <TabsTrigger value="microsoft" className="gap-2">
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zm12.6 0H12.6V0H24v11.4z"/>
                </svg>
                Microsoft
              </TabsTrigger>
              <TabsTrigger value="custom" className="gap-2">
                <Globe className="h-4 w-4" />
                Custom
              </TabsTrigger>
            </TabsList>

            <TabsContent value="google" className="space-y-4 mt-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Google Workspace Setup</AlertTitle>
                <AlertDescription>
                  <ol className="list-decimal list-inside mt-2 space-y-2 text-sm">
                    <li>Go to <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener" className="text-primary hover:underline">Google Cloud Console <ExternalLink className="inline h-3 w-3" /></a></li>
                    <li>Create a new OAuth 2.0 Client ID (Web application)</li>
                    <li>Add the callback URL below to "Authorized redirect URIs"</li>
                    <li>Copy the Client ID and Client Secret here</li>
                  </ol>
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Callback URL (copy this to Google)</Label>
                  <div className="flex gap-2">
                    <Input
                      value={getCallbackUrl()}
                      readOnly
                      className="font-mono text-sm bg-muted"
                    />
                    <Button variant="outline" size="icon" onClick={handleCopyCallbackUrl}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="clientId">Client ID *</Label>
                  <Input
                    id="clientId"
                    placeholder="xxxx.apps.googleusercontent.com"
                    value={googleForm.clientId}
                    onChange={(e) => setGoogleForm({ ...googleForm, clientId: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="clientSecret">Client Secret *</Label>
                  <div className="flex gap-2">
                    <Input
                      id="clientSecret"
                      type={showSecret ? 'text' : 'password'}
                      placeholder="GOCSPX-xxxx"
                      value={googleForm.clientSecret}
                      onChange={(e) => setGoogleForm({ ...googleForm, clientSecret: e.target.value })}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setShowSecret(!showSecret)}
                    >
                      {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="allowedDomain">Restrict to Domain (optional)</Label>
                  <Input
                    id="allowedDomain"
                    placeholder="yourcompany.com"
                    value={googleForm.allowedDomain}
                    onChange={(e) => setGoogleForm({ ...googleForm, allowedDomain: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Only allow users with email addresses from this domain
                  </p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="microsoft" className="space-y-4 mt-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Microsoft Azure AD Setup</AlertTitle>
                <AlertDescription>
                  <ol className="list-decimal list-inside mt-2 space-y-2 text-sm">
                    <li>Go to <a href="https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade" target="_blank" rel="noopener" className="text-primary hover:underline">Azure Portal App Registrations <ExternalLink className="inline h-3 w-3" /></a></li>
                    <li>Create a new registration or select existing</li>
                    <li>Add the callback URL to "Redirect URIs"</li>
                    <li>Create a client secret under "Certificates & secrets"</li>
                  </ol>
                </AlertDescription>
              </Alert>

              <div className="p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  Microsoft Azure AD configuration coming soon.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="custom" className="space-y-4 mt-4">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Advanced Configuration</AlertTitle>
                <AlertDescription>
                  Custom SAML/OIDC providers require technical knowledge. Contact support if you need help.
                </AlertDescription>
              </Alert>

              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Custom provider configuration (SAML 2.0, OIDC, LDAP) coming soon.
                </p>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setShowSetup(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveGoogleSSO} 
              disabled={configureSSO.isPending || selectedPreset !== 'google'}
            >
              {configureSSO.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Configuration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove SSO Configuration</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove SSO? Employees will no longer be able to sign in with their {ssoStatus?.name} accounts.
            </DialogDescription>
          </DialogHeader>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Warning</AlertTitle>
            <AlertDescription>
              Users who were provisioned via SSO will need to set a password to continue accessing the system.
            </AlertDescription>
          </Alert>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteSSO} disabled={deleteSSO.isPending}>
              {deleteSSO.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Remove SSO
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* How it works */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">How SSO Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-bold text-primary">1</span>
              </div>
              <div>
                <p className="font-medium">Employee clicks "Sign in with Google"</p>
                <p className="text-sm text-muted-foreground">On the login page</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-bold text-primary">2</span>
              </div>
              <div>
                <p className="font-medium">Google authenticates the user</p>
                <p className="text-sm text-muted-foreground">Using their Google Workspace credentials</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-bold text-primary">3</span>
              </div>
              <div>
                <p className="font-medium">User is logged in automatically</p>
                <p className="text-sm text-muted-foreground">Account created if first time</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User Provisioning Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            User Provisioning
          </CardTitle>
          <CardDescription>
            Control how new users are created when they sign in via SSO
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto-provision users</Label>
              <p className="text-sm text-muted-foreground">
                Automatically create accounts for new SSO users
              </p>
            </div>
            <Switch defaultChecked disabled={!isConfigured} />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Default role for new users</Label>
              <p className="text-sm text-muted-foreground">
                Role assigned to auto-provisioned users
              </p>
            </div>
            <Select defaultValue="employee" disabled={!isConfigured}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="employee">Employee</SelectItem>
                <SelectItem value="hr_manager">HR Manager</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Require admin approval</Label>
              <p className="text-sm text-muted-foreground">
                New SSO users need admin approval before accessing
              </p>
            </div>
            <Switch disabled={!isConfigured} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

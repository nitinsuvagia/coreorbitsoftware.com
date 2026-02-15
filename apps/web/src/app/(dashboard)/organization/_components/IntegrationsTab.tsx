'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
  Slider,
} from '@/components/ui/slider';
import {
  Link,
  Unlink,
  RefreshCw,
  Settings,
  Check,
  Eye,
  EyeOff,
  Zap,
  Brain,
  AlertCircle,
} from 'lucide-react';
import type { Integration, OpenAISettings } from '../types';

interface IntegrationsTabProps {
  integrations: Integration[];
  connectingIntegration: string | null;
  onConnect: (integrationId: string) => void;
  onDisconnect: (integrationId: string) => void;
  // OpenAI specific props
  openAISettings: OpenAISettings;
  openAIDialogOpen: boolean;
  savingOpenAI: boolean;
  testingConnection: boolean;
  onSaveOpenAI: (settings: Partial<OpenAISettings>) => Promise<boolean>;
  onTestOpenAI: (apiKey: string) => Promise<boolean>;
  onOpenOpenAIDialog: () => void;
  onCloseOpenAIDialog: () => void;
}

export function IntegrationsTab({
  integrations,
  connectingIntegration,
  onConnect,
  onDisconnect,
  openAISettings,
  openAIDialogOpen,
  savingOpenAI,
  testingConnection,
  onSaveOpenAI,
  onTestOpenAI,
  onOpenOpenAIDialog,
  onCloseOpenAIDialog,
}: IntegrationsTabProps) {
  const [showApiKey, setShowApiKey] = useState(false);
  const [formData, setFormData] = useState<Partial<OpenAISettings>>({
    apiKey: '',
    model: openAISettings.model || 'gpt-3.5-turbo',
    enabled: true,
    maxTokens: openAISettings.maxTokens || 2000,
    temperature: openAISettings.temperature || 0.7,
  });
  const [connectionTested, setConnectionTested] = useState(false);

  const connectedIntegrations = integrations.filter(i => i.connected);
  const availableIntegrations = integrations.filter(i => !i.connected);
  
  // Separate AI integrations for special handling
  const aiIntegrations = integrations.filter(i => i.category === 'ai');
  const openAIIntegration = aiIntegrations.find(i => i.id === 'openai');

  const handleTestConnection = async () => {
    if (formData.apiKey && formData.apiKey !== '********') {
      // Sanitize the API key - replace special dashes with regular hyphens
      const sanitizedKey = formData.apiKey
        .replace(/[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/g, '-') // Replace various dash characters with regular hyphen
        .trim();
      const success = await onTestOpenAI(sanitizedKey);
      setConnectionTested(success);
    }
  };

  const handleSaveSettings = async () => {
    if (!formData.apiKey || formData.apiKey === '********') {
      // If no new API key provided, only update other settings
      const { apiKey, ...otherSettings } = formData;
      await onSaveOpenAI(otherSettings);
    } else {
      // Sanitize the API key before saving
      const sanitizedKey = formData.apiKey
        .replace(/[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/g, '-')
        .trim();
      await onSaveOpenAI({ ...formData, apiKey: sanitizedKey });
    }
    setFormData(prev => ({ ...prev, apiKey: '' }));
    setConnectionTested(false);
  };

  const handleOpenDialog = () => {
    setFormData({
      apiKey: '',
      model: openAISettings.model || 'gpt-3.5-turbo',
      enabled: openAISettings.enabled ?? true,
      maxTokens: openAISettings.maxTokens || 2000,
      temperature: openAISettings.temperature || 0.7,
    });
    setConnectionTested(false);
    onOpenOpenAIDialog();
  };

  const handleCloseDialog = () => {
    setFormData({
      apiKey: '',
      model: 'gpt-3.5-turbo',
      enabled: true,
      maxTokens: 2000,
      temperature: 0.7,
    });
    setConnectionTested(false);
    onCloseOpenAIDialog();
  };

  const renderIntegrationCard = (integration: Integration, isConnected: boolean) => (
    <div 
      key={integration.id} 
      className={`flex items-center justify-between p-4 border rounded-lg ${
        isConnected ? 'bg-green-50 border-green-200' : 'hover:border-primary/50 transition-colors'
      }`}
    >
      <div className="flex items-center gap-4">
        <div className="text-3xl">{integration.icon}</div>
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium">{integration.name}</p>
            {isConnected && <Check className="h-4 w-4 text-green-600" />}
            {integration.category === 'ai' && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                <Brain className="h-3 w-3 mr-1" />
                AI
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{integration.description}</p>
          {isConnected && integration.connectedAt && (
            <p className="text-xs text-muted-foreground mt-1">
              Connected {new Date(integration.connectedAt).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {isConnected ? (
          <>
            {integration.id === 'openai' ? (
              <Button variant="outline" size="sm" onClick={handleOpenDialog}>
                <Settings className="h-4 w-4" />
              </Button>
            ) : (
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
            )}
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onDisconnect(integration.id)}
              disabled={connectingIntegration === integration.id}
            >
              {connectingIntegration === integration.id ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Unlink className="h-4 w-4" />
              )}
            </Button>
          </>
        ) : (
          <Button 
            variant={integration.id === 'openai' ? 'default' : 'outline'}
            onClick={() => integration.id === 'openai' ? handleOpenDialog() : onConnect(integration.id)}
            disabled={connectingIntegration === integration.id}
          >
            {connectingIntegration === integration.id ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : integration.id === 'openai' ? (
              <Zap className="mr-2 h-4 w-4" />
            ) : (
              <Link className="mr-2 h-4 w-4" />
            )}
            {integration.id === 'openai' ? 'Configure' : 'Connect'}
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <>
      <div className="space-y-6">
        {/* AI Integrations - Special Section */}
        {aiIntegrations.length > 0 && (
          <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-transparent">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-purple-600" />
                AI Integrations
              </CardTitle>
              <CardDescription>
                Connect AI services to power intelligent features like question generation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {aiIntegrations.map((integration) => 
                  renderIntegrationCard(integration, integration.connected)
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Other Integrations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link className="h-5 w-5" />
              Integrations
            </CardTitle>
            <CardDescription>Connect your favorite tools and services</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Connected */}
              <div>
                <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">Connected</h4>
                {connectedIntegrations.filter(i => i.category !== 'ai').length === 0 ? (
                  <p className="text-muted-foreground text-sm">No integrations connected yet.</p>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {connectedIntegrations
                      .filter(i => i.category !== 'ai')
                      .map((integration) => renderIntegrationCard(integration, true))}
                  </div>
                )}
              </div>

              <Separator />

              {/* Available */}
              <div>
                <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">Available Integrations</h4>
                {availableIntegrations.filter(i => i.category !== 'ai').length === 0 ? (
                  <p className="text-muted-foreground text-sm">All integrations are connected.</p>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {availableIntegrations
                      .filter(i => i.category !== 'ai')
                      .map((integration) => renderIntegrationCard(integration, false))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Bottom spacing to prevent content touching screen bottom */}
        <div className="h-6" />
      </div>

      {/* OpenAI Settings Dialog */}
      <Dialog open={openAIDialogOpen} onOpenChange={(open) => !open && handleCloseDialog()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-600" />
              OpenAI Configuration
            </DialogTitle>
            <DialogDescription>
              Configure OpenAI to enable AI-powered features like intelligent question generation for assessments.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* API Key */}
            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key</Label>
              {openAIIntegration?.apiKeyConfigured && !formData.apiKey && (
                <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-700">
                  <Check className="h-4 w-4" />
                  API key is configured. Enter a new key below only if you want to change it.
                </div>
              )}
              <div className="relative">
                <Input
                  id="apiKey"
                  type={showApiKey ? 'text' : 'password'}
                  placeholder={openAIIntegration?.apiKeyConfigured ? 'Enter new key to change (optional)' : 'sk-...'}
                  value={formData.apiKey}
                  onChange={(e) => {
                    setFormData({ ...formData, apiKey: e.target.value });
                    setConnectionTested(false);
                  }}
                  className="pr-20"
                />
                <div className="absolute inset-y-0 right-0 flex items-center gap-1 pr-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Get your API key from{' '}
                <a 
                  href="https://platform.openai.com/api-keys" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  platform.openai.com
                </a>
              </p>
            </div>

            {/* Test Connection */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleTestConnection}
                  disabled={testingConnection || !formData.apiKey}
                >
                  {testingConnection ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Zap className="mr-2 h-4 w-4" />
                  )}
                  Test Connection
                </Button>
                {connectionTested && (
                  <span className="text-sm text-green-600 flex items-center gap-1">
                    <Check className="h-4 w-4" />
                    Connection successful
                  </span>
                )}
              </div>
              {!formData.apiKey && openAIIntegration?.apiKeyConfigured && (
                <p className="text-xs text-muted-foreground">
                  Enter a new API key above to test it. Your saved key is working.
                </p>
              )}
            </div>

            <Separator />

            {/* Model Selection */}
            <div className="space-y-2">
              <Label htmlFor="model">Model</Label>
              <Select
                value={formData.model}
                onValueChange={(value: 'gpt-3.5-turbo' | 'gpt-4' | 'gpt-4-turbo') => 
                  setFormData({ ...formData, model: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo (Fast & Cost-effective)</SelectItem>
                  <SelectItem value="gpt-4">GPT-4 (Most Capable)</SelectItem>
                  <SelectItem value="gpt-4-turbo">GPT-4 Turbo (Latest & Fast)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Temperature */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Temperature: {formData.temperature?.toFixed(1)}</Label>
              </div>
              <Slider
                value={[formData.temperature || 0.7]}
                onValueChange={([value]) => setFormData({ ...formData, temperature: value })}
                min={0}
                max={1}
                step={0.1}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Lower = more focused, Higher = more creative
              </p>
            </div>

            {/* Max Tokens */}
            <div className="space-y-2">
              <Label htmlFor="maxTokens">Max Tokens</Label>
              <Input
                id="maxTokens"
                type="number"
                min={100}
                max={4000}
                value={formData.maxTokens}
                onChange={(e) => setFormData({ ...formData, maxTokens: parseInt(e.target.value) || 2000 })}
              />
              <p className="text-xs text-muted-foreground">
                Maximum number of tokens for AI responses (100-4000)
              </p>
            </div>

            {/* Enable/Disable */}
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label htmlFor="enabled">Enable Integration</Label>
                <p className="text-xs text-muted-foreground">
                  Turn on AI-powered features
                </p>
              </div>
              <Switch
                id="enabled"
                checked={formData.enabled}
                onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
              />
            </div>

            {!formData.enabled && (
              <div className="flex items-center gap-2 p-3 rounded-md border border-amber-200 bg-amber-50 text-amber-800 text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>
                  AI features will be disabled. The system will use predefined question database instead.
                </span>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveSettings}
              disabled={savingOpenAI}
            >
              {savingOpenAI ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              Save Settings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

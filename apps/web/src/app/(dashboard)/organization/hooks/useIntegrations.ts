'use client';

import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api/client';
import type { Integration, OpenAISettings } from '../types';

// Default integrations list
const defaultIntegrations: Integration[] = [
  { id: '1', name: 'Slack', description: 'Team communication and notifications', icon: '💬', category: 'communication', connected: false },
  { id: '2', name: 'Google Calendar', description: 'Sync events and meetings', icon: '📅', category: 'calendar', connected: false },
  { id: '3', name: 'Microsoft Teams', description: 'Video calls and collaboration', icon: '👥', category: 'communication', connected: false },
  { id: '4', name: 'Dropbox', description: 'File storage and sharing', icon: '📦', category: 'storage', connected: false },
  { id: '5', name: 'Google Drive', description: 'Cloud storage integration', icon: '☁️', category: 'storage', connected: false },
  { id: '6', name: 'Zoom', description: 'Video conferencing', icon: '📹', category: 'communication', connected: false },
  { id: '7', name: 'Jira', description: 'Project and issue tracking', icon: '🎯', category: 'productivity', connected: false },
  { id: '8', name: 'GitHub', description: 'Code repository integration', icon: '🐙', category: 'productivity', connected: false },
  { 
    id: 'openai', 
    name: 'OpenAI', 
    description: 'AI-powered question generation for assessments', 
    icon: '🤖', 
    category: 'ai', 
    connected: false,
    requiresApiKey: true,
    apiKeyConfigured: false,
  },
];

const defaultOpenAISettings: OpenAISettings = {
  apiKey: '',
  model: 'gpt-3.5-turbo',
  enabled: false,
  maxTokens: 2000,
  temperature: 0.7,
};

export function useIntegrations() {
  const [integrations, setIntegrations] = useState<Integration[]>(defaultIntegrations);
  const [loadingIntegrations, setLoadingIntegrations] = useState(true);
  const [connectingIntegration, setConnectingIntegration] = useState<string | null>(null);
  
  // OpenAI specific state
  const [openAISettings, setOpenAISettings] = useState<OpenAISettings>(defaultOpenAISettings);
  const [openAIDialogOpen, setOpenAIDialogOpen] = useState(false);
  const [savingOpenAI, setSavingOpenAI] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);

  // Fetch integrations from backend
  const fetchIntegrations = useCallback(async () => {
    try {
      setLoadingIntegrations(true);
      const response = await apiClient.get<{ integrations: string[]; openai?: OpenAISettings }>('/api/v1/organization/integrations');
      
      // Handle both wrapped and unwrapped response formats
      const data = response.data || response;
      const integrationsList = (data as any).integrations || [];
      const openaiData = (data as any).openai;
      
      // Backend returns integrations as array of enabled integration IDs (strings)
      const enabledIntegrationIds = integrationsList;
      
      // Update integrations based on enabled IDs
      let updatedIntegrations = defaultIntegrations.map(defaultInt => {
        const isConnected = enabledIntegrationIds.includes(defaultInt.id);
        return { 
          ...defaultInt, 
          connected: isConnected,
          connectedAt: isConnected ? new Date().toISOString() : undefined,
        };
      });
      
      // Set OpenAI settings if available
      if (openaiData) {
        setOpenAISettings(prev => ({ 
          ...prev, 
          ...openaiData, 
          apiKey: openaiData?.apiKey ? '********' : '' 
        }));
        // Update OpenAI integration status specifically
        updatedIntegrations = updatedIntegrations.map(i => 
          i.id === 'openai' 
            ? { 
                ...i, 
                connected: openaiData?.enabled || false, 
                apiKeyConfigured: !!openaiData?.apiKey 
              }
            : i
        );
      }
      
      setIntegrations(updatedIntegrations);
    } catch (error: any) {
      console.error('[useIntegrations] Failed to fetch integrations:', error);
      // Keep default integrations on error
    } finally {
      setLoadingIntegrations(false);
    }
  }, []);

  // Initialize on mount
  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  const connectIntegration = useCallback(async (integrationId: string) => {
    // Handle OpenAI specially - open dialog
    if (integrationId === 'openai') {
      setOpenAIDialogOpen(true);
      return true;
    }

    try {
      setConnectingIntegration(integrationId);
      // Simulate OAuth flow for other integrations
      await new Promise(resolve => setTimeout(resolve, 1500));
      setIntegrations(prev => prev.map(i => 
        i.id === integrationId 
          ? { ...i, connected: true, connectedAt: new Date().toISOString() } 
          : i
      ));
      toast.success('Integration connected successfully');
      return true;
    } catch (error: any) {
      toast.error('Failed to connect integration');
      return false;
    } finally {
      setConnectingIntegration(null);
    }
  }, []);

  const disconnectIntegration = useCallback(async (integrationId: string) => {
    try {
      setConnectingIntegration(integrationId);
      
      if (integrationId === 'openai') {
        // Disable OpenAI integration
        const response = await apiClient.post('/api/v1/organization/integrations/openai/disable');
        if (response.success) {
          setOpenAISettings(defaultOpenAISettings);
          setIntegrations(prev => prev.map(i => 
            i.id === 'openai' 
              ? { ...i, connected: false, apiKeyConfigured: false, connectedAt: undefined } 
              : i
          ));
          toast.success('OpenAI integration disabled');
        }
      } else {
        await apiClient.delete(`/api/v1/integrations/${integrationId}`);
        setIntegrations(prev => prev.map(i => 
          i.id === integrationId 
            ? { ...i, connected: false, connectedAt: undefined } 
            : i
        ));
        toast.success('Integration disconnected');
      }
      return true;
    } catch (error: any) {
      // Demo - still update UI for non-OpenAI integrations
      if (integrationId !== 'openai') {
        setIntegrations(prev => prev.map(i => 
          i.id === integrationId 
            ? { ...i, connected: false, connectedAt: undefined } 
            : i
        ));
        toast.success('Integration disconnected');
      } else {
        toast.error('Failed to disable OpenAI integration');
      }
      return integrationId !== 'openai';
    } finally {
      setConnectingIntegration(null);
    }
  }, []);

  // OpenAI specific functions
  const saveOpenAISettings = useCallback(async (settings: Partial<OpenAISettings>) => {
    try {
      setSavingOpenAI(true);
      const response = await apiClient.post('/api/v1/organization/integrations/openai', settings);
      
      if (response.success) {
        setOpenAISettings(prev => ({ ...prev, ...settings, apiKey: settings.apiKey ? '********' : prev.apiKey }));
        setIntegrations(prev => prev.map(i => 
          i.id === 'openai' 
            ? { ...i, connected: settings.enabled ?? true, apiKeyConfigured: true, connectedAt: new Date().toISOString() } 
            : i
        ));
        toast.success('OpenAI settings saved successfully');
        setOpenAIDialogOpen(false);
        return true;
      } else {
        throw new Error(response.error?.message || 'Failed to save settings');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to save OpenAI settings');
      return false;
    } finally {
      setSavingOpenAI(false);
    }
  }, []);

  const testOpenAIConnection = useCallback(async (apiKey: string) => {
    try {
      setTestingConnection(true);
      const response = await apiClient.post<{ success: boolean; message: string }>('/api/v1/organization/integrations/openai/test', { apiKey });
      
      // Handle both wrapped {success, data: {success, message}} and flat {success, message} responses
      const isSuccess = response.data?.success ?? response.success;
      const message = response.data?.message ?? (response as any).message;
      
      if (isSuccess) {
        toast.success(message || 'Connection successful! OpenAI API key is valid.');
        return true;
      } else {
        const errorMessage = message || response.error?.message || 'Connection test failed';
        toast.error(errorMessage);
        return false;
      }
    } catch (error: any) {
      console.error('OpenAI connection test error:', error);
      toast.error(error.message || 'Failed to test OpenAI connection');
      return false;
    } finally {
      setTestingConnection(false);
    }
  }, []);

  const openOpenAIDialog = useCallback(() => {
    setOpenAIDialogOpen(true);
  }, []);

  const closeOpenAIDialog = useCallback(() => {
    setOpenAIDialogOpen(false);
  }, []);

  return {
    integrations,
    loadingIntegrations,
    connectingIntegration,
    fetchIntegrations,
    connectIntegration,
    disconnectIntegration,
    // OpenAI specific
    openAISettings,
    openAIDialogOpen,
    savingOpenAI,
    testingConnection,
    saveOpenAISettings,
    testOpenAIConnection,
    openOpenAIDialog,
    closeOpenAIDialog,
  };
}

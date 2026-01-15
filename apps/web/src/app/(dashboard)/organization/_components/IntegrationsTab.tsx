'use client';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Link,
  Unlink,
  RefreshCw,
  Settings,
  Check,
} from 'lucide-react';
import type { Integration } from '../types';

interface IntegrationsTabProps {
  integrations: Integration[];
  connectingIntegration: string | null;
  onConnect: (integrationId: string) => void;
  onDisconnect: (integrationId: string) => void;
}

export function IntegrationsTab({
  integrations,
  connectingIntegration,
  onConnect,
  onDisconnect,
}: IntegrationsTabProps) {
  const connectedIntegrations = integrations.filter(i => i.connected);
  const availableIntegrations = integrations.filter(i => !i.connected);

  return (
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
            {connectedIntegrations.length === 0 ? (
              <p className="text-muted-foreground text-sm">No integrations connected yet.</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {connectedIntegrations.map((integration) => (
                  <div key={integration.id} className="flex items-center justify-between p-4 border rounded-lg bg-green-50 border-green-200">
                    <div className="flex items-center gap-4">
                      <div className="text-3xl">{integration.icon}</div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{integration.name}</p>
                          <Check className="h-4 w-4 text-green-600" />
                        </div>
                        <p className="text-sm text-muted-foreground">{integration.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Connected {integration.connectedAt ? new Date(integration.connectedAt).toLocaleDateString() : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm">
                        <Settings className="h-4 w-4" />
                      </Button>
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
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Available */}
          <div>
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">Available Integrations</h4>
            {availableIntegrations.length === 0 ? (
              <p className="text-muted-foreground text-sm">All integrations are connected.</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {availableIntegrations.map((integration) => (
                  <div key={integration.id} className="flex items-center justify-between p-4 border rounded-lg hover:border-primary/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="text-3xl">{integration.icon}</div>
                      <div>
                        <p className="font-medium">{integration.name}</p>
                        <p className="text-sm text-muted-foreground">{integration.description}</p>
                      </div>
                    </div>
                    <Button 
                      variant="outline"
                      onClick={() => onConnect(integration.id)}
                      disabled={connectingIntegration === integration.id}
                    >
                      {connectingIntegration === integration.id ? (
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Link className="mr-2 h-4 w-4" />
                      )}
                      Connect
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

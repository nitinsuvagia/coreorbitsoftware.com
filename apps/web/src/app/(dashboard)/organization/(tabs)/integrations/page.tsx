'use client';

import { useOrganizationContext } from '../../layout';
import { IntegrationsTab } from '../../_components';

export default function IntegrationsPage() {
  const {
    integrations,
    connectingIntegration,
    connectIntegration,
    disconnectIntegration,
  } = useOrganizationContext();

  return (
    <IntegrationsTab
      integrations={integrations}
      connectingIntegration={connectingIntegration}
      onConnect={connectIntegration}
      onDisconnect={disconnectIntegration}
    />
  );
}

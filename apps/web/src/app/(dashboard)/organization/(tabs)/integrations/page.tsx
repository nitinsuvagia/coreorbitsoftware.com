'use client';

import { useOrganizationContext } from '../../layout';
import { IntegrationsTab } from '../../_components';

export default function IntegrationsPage() {
  const {
    integrations,
    connectingIntegration,
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
  } = useOrganizationContext();

  return (
    <IntegrationsTab
      integrations={integrations}
      connectingIntegration={connectingIntegration}
      onConnect={connectIntegration}
      onDisconnect={disconnectIntegration}
      openAISettings={openAISettings}
      openAIDialogOpen={openAIDialogOpen}
      savingOpenAI={savingOpenAI}
      testingConnection={testingConnection}
      onSaveOpenAI={saveOpenAISettings}
      onTestOpenAI={testOpenAIConnection}
      onOpenOpenAIDialog={openOpenAIDialog}
      onCloseOpenAIDialog={closeOpenAIDialog}
    />
  );
}

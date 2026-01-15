'use client';

import { useOrganizationContext } from '../../layout';
import { DesignationsTab } from '../../_components';

export default function DesignationsPage() {
  const {
    designations,
    loadingDesigs,
    savingDesig,
    desigDialogOpen,
    editingDesig,
    deleteDesigId,
    desigForm,
    desigErrors,
    openAddDesig,
    openEditDesig,
    closeDesigDialog,
    handleSaveDesig,
    handleDeleteDesig,
    handlePermanentDeleteDesig,
    setDeleteDesigId,
    updateDesigFormField,
  } = useOrganizationContext();

  return (
    <DesignationsTab
      designations={designations}
      loading={loadingDesigs}
      saving={savingDesig}
      dialogOpen={desigDialogOpen}
      editingDesig={editingDesig}
      deleteId={deleteDesigId}
      formData={desigForm}
      errors={desigErrors}
      onOpenAddDialog={openAddDesig}
      onOpenEditDialog={openEditDesig}
      onCloseDialog={closeDesigDialog}
      onSave={handleSaveDesig}
      onDelete={handleDeleteDesig}
      onPermanentDelete={handlePermanentDeleteDesig}
      onSetDeleteId={setDeleteDesigId}
      onUpdateFormField={updateDesigFormField}
    />
  );
}

'use client';

import { useOrganizationContext } from '../../layout';
import { DepartmentsTab } from '../../_components';

export default function DepartmentsPage() {
  const {
    departments,
    loadingDepts,
    savingDept,
    deptDialogOpen,
    editingDept,
    deleteDeptId,
    deptForm,
    deptErrors,
    openAddDept,
    openEditDept,
    closeDeptDialog,
    handleSaveDept,
    handleDeleteDept,
    handlePermanentDeleteDept,
    setDeleteDeptId,
    updateDeptFormField,
  } = useOrganizationContext();

  return (
    <DepartmentsTab
      departments={departments}
      loading={loadingDepts}
      saving={savingDept}
      dialogOpen={deptDialogOpen}
      editingDept={editingDept}
      deleteId={deleteDeptId}
      formData={deptForm}
      errors={deptErrors}
      onOpenAddDialog={openAddDept}
      onOpenEditDialog={openEditDept}
      onCloseDialog={closeDeptDialog}
      onSave={handleSaveDept}
      onDelete={handleDeleteDept}
      onPermanentDelete={handlePermanentDeleteDept}
      onSetDeleteId={setDeleteDeptId}
      onUpdateFormField={updateDeptFormField}
    />
  );
}

'use client';

import { useOrganizationContext } from '../layout';
import { DetailsTab } from '../_components';

export default function OrganizationGeneralPage() {
  const {
    org,
    orgForm,
    orgErrors,
    savingOrg,
    saveOrganization,
    updateFormField,
    updateAddressField,
    setOrgErrors,
  } = useOrganizationContext();

  if (!org) return null;

  return (
    <DetailsTab
      org={org}
      orgForm={orgForm}
      orgErrors={orgErrors}
      saving={savingOrg}
      onSave={saveOrganization}
      onUpdateField={updateFormField}
      onUpdateAddressField={updateAddressField}
      onClearError={(field) => setOrgErrors({ ...orgErrors, [field]: undefined })}
    />
  );
}

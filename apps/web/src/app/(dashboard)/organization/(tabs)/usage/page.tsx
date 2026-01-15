'use client';

import { useOrganizationContext } from '../../layout';
import { UsageTab } from '../../_components';

export default function UsagePage() {
  const {
    org,
    departments,
    designations,
  } = useOrganizationContext();

  if (!org) return null;

  return (
    <UsageTab
      org={org}
      departments={departments}
      designations={designations}
    />
  );
}

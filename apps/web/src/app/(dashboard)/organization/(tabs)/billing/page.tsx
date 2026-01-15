'use client';

import { useOrganizationContext } from '../../layout';
import { BillingTab } from '../../_components';

export default function BillingPage() {
  const {
    org,
    invoices,
    loadingInvoices,
    loadingBilling,
    billingInfo,
    changePlan,
    cancelSubscription,
  } = useOrganizationContext();

  if (!org) return null;

  return (
    <BillingTab
      org={org}
      invoices={invoices}
      loadingInvoices={loadingInvoices}
      loadingBilling={loadingBilling}
      billingInfo={billingInfo}
      onChangePlan={changePlan}
      onCancelSubscription={cancelSubscription}
    />
  );
}

import "server-only";

import { notFound } from "next/navigation";

import { VoucherToolbar } from "@/components/voucher/voucher-toolbar";
import { hasPermission } from "@/features/auth/session";
import { PERMISSIONS } from "@/features/auth/permissions";
import { getVoucherAccess } from "@/features/vouchers/access";
import { editVoucherPath, newVoucherPath } from "@/features/vouchers/config";
import { loadVoucherFormData } from "@/features/vouchers/form-data";
import { LoadFailure } from "@/features/vouchers/load-failure";
import { isMissing, type VoucherReadModule } from "@/features/vouchers/routes";
import {
  CancelledNotEditable,
  ManageForbidden,
} from "@/features/vouchers/voucher-states";

import {
  cancelCashHandover,
  createCashHandover,
  updateCashHandover,
} from "./actions";
import { cashHandoversApi as api } from "./api";
import { CASH_HANDOVER_CONFIG as config } from "./constants";
import { HandoverForm } from "./handover-form";

/** The list and view pages are the shared voucher ones. */
export const CASH_HANDOVERS_MODULE: VoucherReadModule = {
  config,
  api,
  cancelAction: cancelCashHandover,
};

const back = { href: config.basePath, label: config.title };

/**
 * Accounts and cashiers for the form. A scoped user hands over from their
 * assigned accounts as their own cashier, but may pay into any account.
 */
async function loadHandoverFormData(preselectMine: boolean) {
  const [formData, canSeePending] = await Promise.all([
    loadVoucherFormData({
      preselectMine,
      getHeaderAccounts: api.getHeaderAccounts,
    }),
    hasPermission(PERMISSIONS.REPORTS_SALESMAN),
  ]);
  if (!formData.ok) return formData;

  const { headerAccounts, cashiers, myCashierId, scoped } = formData.data;
  let toAccounts = headerAccounts;
  if (scoped) {
    const all = await api.getHeaderAccounts();
    if (!all.ok) return all;
    toAccounts = all.data;
  }
  return {
    ok: true as const,
    data: {
      fromAccounts: headerAccounts,
      toAccounts,
      cashiers,
      myCashierId,
      scoped,
      canSeePending,
    },
  };
}

export async function HandoverNewRoute() {
  const title = `New ${config.singular}`;
  if (!(await getVoucherAccess(config)).canCreate) {
    return <ManageForbidden config={config} title={title} action="create" />;
  }

  const formData = await loadHandoverFormData(true);
  if (!formData.ok) {
    return (
      <LoadFailure
        failure={formData}
        returnTo={newVoucherPath(config)}
        subject={`the ${config.noun} form`}
        header={<VoucherToolbar title={title} back={back} />}
      />
    );
  }

  return (
    <HandoverForm
      mode="create"
      createAction={createCashHandover}
      updateAction={updateCashHandover}
      {...formData.data}
    />
  );
}

export async function HandoverEditRoute({ id }: { id: string }) {
  const title = `Edit ${config.singular}`;
  if (!(await getVoucherAccess(config)).canEdit) {
    return <ManageForbidden config={config} title={title} action="edit" />;
  }

  const [voucher, formData] = await Promise.all([
    api.getVoucher(id),
    loadHandoverFormData(false),
  ]);
  const header = <VoucherToolbar title={title} back={back} />;
  const returnTo = editVoucherPath(config, id);

  if (!voucher.ok) {
    if (isMissing(voucher)) notFound();
    return (
      <LoadFailure
        failure={voucher}
        returnTo={returnTo}
        subject={`this ${config.singular.toLowerCase()}`}
        header={header}
      />
    );
  }
  if (voucher.data.status === "cancelled") {
    return (
      <CancelledNotEditable
        config={config}
        id={id}
        voucherNo={voucher.data.voucherNo}
      />
    );
  }
  if (!formData.ok) {
    return (
      <LoadFailure
        failure={formData}
        returnTo={returnTo}
        subject={`the ${config.noun} form`}
        header={header}
      />
    );
  }

  return (
    <HandoverForm
      mode="edit"
      voucher={voucher.data}
      createAction={createCashHandover}
      updateAction={updateCashHandover}
      {...formData.data}
    />
  );
}

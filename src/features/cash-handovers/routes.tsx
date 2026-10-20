import "server-only";

import { VoucherToolbar } from "@/components/voucher/voucher-toolbar";
import { PERMISSIONS } from "@/features/auth/permissions";
import { getServerSession } from "@/features/auth/session";
import { getCashierLookup } from "@/features/cashiers/api";
import { STAFF_TYPE_LABELS } from "@/features/cashiers/types";
import { getVoucherAccess } from "@/features/vouchers/access";
import { newVoucherPath } from "@/features/vouchers/config";
import { LoadFailure } from "@/features/vouchers/load-failure";
import type { VoucherReadModule } from "@/features/vouchers/routes";
import type { AccountLookupItem } from "@/features/vouchers/types";
import { ManageForbidden } from "@/features/vouchers/voucher-states";
import { uaeToday } from "@/lib/datetime";

import { cancelCashHandover } from "./actions";
import {
  cashHandoversApi as api,
  getHandoverDetail,
  getUnsettledReceipts,
} from "./api";
import {
  CASH_HANDOVER_CONFIG as config,
  HANDOVER_SOURCE_ACCOUNT_TYPES,
} from "./constants";
import { HandoverForm } from "./handover-form";
import { HandoverReceiptsPanel } from "./handover-receipts-panel";

/** The list and view pages are the shared voucher ones; the view shows the
 * handover's receipts and, while pending, the approver's controls. */
export const CASH_HANDOVERS_MODULE: VoucherReadModule = {
  config,
  api,
  cancelAction: cancelCashHandover,
  detailBody: async (voucher) => {
    const session = await getServerSession();
    const canApprove =
      session?.user.permissions.includes(PERMISSIONS.CASH_HANDOVERS_APPROVE) ??
      false;
    const [detail, accounts] = await Promise.all([
      getHandoverDetail(voucher.id),
      canApprove && voucher.status === "submitted"
        ? api.getHeaderAccounts()
        : null,
    ]);
    if (!detail.ok) return undefined;
    return (
      <HandoverReceiptsPanel
        detail={detail.data}
        receiveAccounts={accounts?.ok ? accounts.data : null}
      />
    );
  },
};

const isSource = (account: AccountLookupItem) =>
  HANDOVER_SOURCE_ACCOUNT_TYPES.includes(account.type);

export async function HandoverNewRoute({ staffParam }: { staffParam: string }) {
  const title = `New ${config.singular}`;
  if (!(await getVoucherAccess(config)).canCreate) {
    return <ManageForbidden config={config} title={title} action="create" />;
  }
  const failure = (result: Parameters<typeof LoadFailure>[0]["failure"]) => (
    <LoadFailure
      failure={result}
      returnTo={newVoucherPath(config)}
      subject={`the ${config.noun} form`}
      header={
        <VoucherToolbar
          title={title}
          back={{ href: config.basePath, label: config.title }}
        />
      }
    />
  );

  const user = (await getServerSession())?.user;
  const linked = user?.linkedCashier ?? null;
  const ownStaff =
    linked?.status === "active" && linked.settlesWithOffice ? linked : null;

  // A salesman ("own" scope) hands over only their own receipts, from their
  // assigned accounts; the backend picks their staff record.
  if (user?.dataScope === "own") {
    const unsettled = ownStaff ? await getUnsettledReceipts(null) : null;
    if (unsettled && !unsettled.ok) return failure(unsettled);
    return (
      <HandoverForm
        staff={null}
        staffId={ownStaff?.id ?? null}
        lockedStaffLabel={
          ownStaff
            ? `${ownStaff.name} (${ownStaff.code}) · ${STAFF_TYPE_LABELS[ownStaff.staffType]}`
            : null
        }
        sourceAccounts={user.allowedCashAccounts.filter(isSource)}
        unsettled={unsettled?.data ?? null}
        today={uaeToday()}
      />
    );
  }

  const [staff, accounts] = await Promise.all([
    getCashierLookup(true, true),
    api.getHeaderAccounts(),
  ]);
  if (!staff.ok) return failure(staff);
  if (!accounts.ok) return failure(accounts);

  const known = (id: string | undefined) =>
    id && staff.data.some((member) => member.id === id) ? id : null;
  const staffId = known(staffParam) ?? known(ownStaff?.id);
  const unsettled = staffId ? await getUnsettledReceipts(staffId) : null;
  if (unsettled && !unsettled.ok) return failure(unsettled);

  return (
    <HandoverForm
      // Fresh receipts and selection for each staff member.
      key={staffId ?? "none"}
      staff={staff.data}
      staffId={staffId}
      lockedStaffLabel={null}
      sourceAccounts={accounts.data.filter(isSource)}
      unsettled={unsettled?.data ?? null}
      today={uaeToday()}
    />
  );
}

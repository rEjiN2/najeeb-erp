import "server-only";

import { createVoucherApi } from "@/features/vouchers/api";
import type {
  CashierRef,
  NamedRef,
  PaymentMethod,
  UserRef,
  VoucherListRow,
  VoucherStatus,
} from "@/features/vouchers/types";

/** One GET /cash-handovers item (cash-handover.service.ts CashHandoverListRow). */
interface RawHandoverRow {
  id: string;
  voucherNo: string;
  date: string;
  fromAccount: NamedRef;
  toAccount: NamedRef | null;
  handedBy: CashierRef;
  receivedBy: NamedRef | null;
  amount: number;
  paymentMethod?: PaymentMethod;
  status: VoucherStatus;
  createdBy: UserRef | null;
  createdAt: string | null;
  updatedBy: UserRef | null;
  updatedAt: string | null;
  commentCount: number;
}

/** Into the shared list shape: from → header, to → counterparty. */
function toListRow(raw: Record<string, unknown>): VoucherListRow {
  const row = raw as unknown as RawHandoverRow;
  return {
    id: row.id,
    voucherNo: row.voucherNo,
    date: row.date,
    headerAccount: row.fromAccount,
    cashier: row.handedBy,
    cashierNote: row.receivedBy?.name ? `to ${row.receivedBy.name}` : null,
    paymentMethod: row.paymentMethod ?? "cash",
    partiesSummary: { firstAccount: row.toAccount, othersCount: 0 },
    grandTotal: row.amount,
    status: row.status,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedBy: row.updatedBy,
    updatedAt: row.updatedAt,
    commentCount: row.commentCount,
  };
}

/** GET /cash-handovers, /cash-handovers/:id and the from/to accounts. */
export const cashHandoversApi = createVoucherApi({
  path: "/cash-handovers",
  listHeaderKey: "fromAccount",
  detailHeaderKey: "fromAccountId",
  queryHeaderKey: "fromAccountId",
  methodFilter: true,
  scopedLookup: true,
  mapListRow: toListRow,
  detailExtras: (raw) => [
    {
      key: "receivedBy",
      label: "Received By",
      value:
        typeof raw.receivedByCashierName === "string"
          ? raw.receivedByCashierName
          : null,
      id:
        typeof raw.receivedByCashierId === "string"
          ? raw.receivedByCashierId
          : null,
    },
  ],
});

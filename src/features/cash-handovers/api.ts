import "server-only";

import { apiGet, type ApiResult } from "@/lib/api";
import { formatAmount } from "@/lib/format";
import { createVoucherApi } from "@/features/vouchers/api";
import type {
  CashierRef,
  NamedRef,
  UserRef,
  VoucherListRow,
  VoucherStatus,
} from "@/features/vouchers/types";

import type {
  HandoverDetail,
  HandoverReceipt,
  UnsettledReceipts,
} from "./types";

/** One GET /cash-handovers item (cash-handover.service.ts CashHandoverListRow). */
interface RawHandoverRow {
  id: string;
  voucherNo: string;
  date: string;
  staff: CashierRef;
  sourceAccount: NamedRef;
  receivedInto: NamedRef | null;
  receiptCount: number;
  expectedCash: number;
  bankTotal: number;
  countedCash: number | null;
  receivedCash: number | null;
  status: VoucherStatus;
  createdBy: UserRef | null;
  createdAt: string | null;
  commentCount: number;
}

/** Into the shared list shape: source → header, received into → counterparty,
 * expected cash → amount. */
function toListRow(raw: Record<string, unknown>): VoucherListRow {
  const row = raw as unknown as RawHandoverRow;
  const notes = [
    `${row.receiptCount} receipt${row.receiptCount === 1 ? "" : "s"}`,
    row.bankTotal > 0 ? `+ ${formatAmount(row.bankTotal)} bank` : null,
    row.receivedCash !== null && row.receivedCash !== row.expectedCash
      ? `received ${formatAmount(row.receivedCash)}`
      : null,
  ];
  return {
    id: row.id,
    voucherNo: row.voucherNo,
    date: row.date,
    headerAccount: row.sourceAccount,
    cashier: row.staff,
    cashierNote: notes.filter(Boolean).join(" · "),
    paymentMethod: "cash",
    partiesSummary: { firstAccount: row.receivedInto, othersCount: 0 },
    grandTotal: row.expectedCash,
    status: row.status,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedBy: null,
    updatedAt: null,
    commentCount: row.commentCount,
  };
}

const money = (value: unknown) =>
  typeof value === "number" ? formatAmount(value) : null;
const text = (value: unknown) => (typeof value === "string" ? value : null);

/** GET /cash-handovers, /cash-handovers/:id and the source accounts. */
export const cashHandoversApi = createVoucherApi({
  path: "/cash-handovers",
  listHeaderKey: "sourceAccount",
  detailHeaderKey: "fromAccountId",
  queryHeaderKey: "sourceAccountId",
  methodFilter: false,
  scopedLookup: true,
  mapListRow: toListRow,
  // posted/cancelled/all go in `status`; the workflow ones in handoverStatus.
  statusQuery: (status): Record<string, string> =>
    status === "submitted" || status === "approved" || status === "rejected"
      ? { status: "all", handoverStatus: status }
      : { status },
  detailExtras: (raw) => [
    { key: "expected", label: "Expected Cash", value: money(raw.expectedCash) },
    { key: "bank", label: "Bank Receipts", value: money(raw.bankTotal) },
    { key: "counted", label: "Counted Cash", value: money(raw.countedCash) },
    { key: "received", label: "Received Cash", value: money(raw.receivedCash) },
    {
      key: "receivedInto",
      label: "Received Into",
      value: text(raw.receivedIntoAccountName),
    },
    ...(raw.varianceReason
      ? [
          {
            key: "variance",
            label: "Shortage Reason",
            value: text(raw.varianceReason),
          },
        ]
      : []),
    ...(raw.rejectReason
      ? [
          {
            key: "rejected",
            label: "Reject Reason",
            value: text(raw.rejectReason),
          },
        ]
      : []),
  ],
});

/** GET /cash-handovers/:id, the workflow part. */
export async function getHandoverDetail(
  id: string,
): Promise<ApiResult<HandoverDetail>> {
  const result = await apiGet<Record<string, unknown>>(
    `/cash-handovers/${encodeURIComponent(id)}`,
  );
  if (!result.ok) return result;
  const raw = result.data;
  const num = (value: unknown) => (typeof value === "number" ? value : null);
  return {
    ok: true,
    data: {
      id: String(raw._id),
      status: (raw.status as VoucherStatus | undefined) ?? "approved",
      sourceAccountId: String(raw.fromAccountId),
      receipts: ((raw.receipts as HandoverReceipt[] | undefined) ?? []).map(
        (receipt) => ({ ...receipt, receiptId: String(receipt.receiptId) }),
      ),
      expectedCash: num(raw.expectedCash) ?? 0,
      bankTotal: num(raw.bankTotal) ?? 0,
      countedCash: num(raw.countedCash),
      receivedCash: num(raw.receivedCash),
      varianceReason: text(raw.varianceReason),
    },
  };
}

/** A staff member's receipts not yet on a handover. Without staffId the
 * backend uses the signed-in "own"-scoped user's linked staff. */
export function getUnsettledReceipts(
  staffId: string | null,
): Promise<ApiResult<UnsettledReceipts>> {
  const query = staffId ? `?${new URLSearchParams({ staffId })}` : "";
  return apiGet<UnsettledReceipts>(`/cash-handovers/unsettled${query}`);
}

/** Handovers waiting for approval, for the sidebar badge. */
export async function countPendingApprovals(): Promise<number | null> {
  const result = await apiGet<{ summary: { count: number } }>(
    "/cash-handovers?status=all&handoverStatus=submitted&page=1&pageSize=1",
  );
  return result.ok ? result.data.summary.count : null;
}

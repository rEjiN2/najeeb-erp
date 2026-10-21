import "server-only";

import { apiGet, type ApiResult } from "@/lib/api";
import { formatExactUae } from "@/lib/datetime";
import { formatAmount } from "@/lib/format";
import type {
  UserRef,
  VoucherDetail,
  VoucherStatus,
} from "@/features/vouchers/types";

import { HANDOVERS_PAGE_SIZE } from "./constants";
import type {
  HandoverFilters,
  HandoverItem,
  HandoverPage,
  HandoverWorkflow,
  PendingCash,
} from "./types";

/** GET /cash-handovers — only the query keys its DTO declares. */
export async function getHandovers(
  filters: HandoverFilters,
): Promise<ApiResult<HandoverPage>> {
  const query = new URLSearchParams({
    page: String(filters.page),
    pageSize: String(HANDOVERS_PAGE_SIZE),
  });
  if (filters.status !== "all") query.set("status", filters.status);
  if (filters.userId) query.set("userId", filters.userId);
  if (filters.dateFrom) query.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) query.set("dateTo", filters.dateTo);
  const result = await apiGet<HandoverPage>(`/cash-handovers?${query}`);
  if (!result.ok) return result;
  return {
    ok: true,
    data: { ...result.data, items: result.data.items ?? [] },
  };
}

const num = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;
const text = (value: unknown) => (typeof value === "string" ? value : null);
const user = (value: unknown) =>
  value && typeof value === "object" ? (value as UserRef) : null;

/**
 * GET /cash-handovers/:id: the serialized document, as the shared voucher
 * view's shape (submitted total in the header slot) plus its own fields.
 */
export async function getHandover(
  id: string,
): Promise<ApiResult<{ voucher: VoucherDetail; workflow: HandoverWorkflow }>> {
  const result = await apiGet<Record<string, unknown>>(
    `/cash-handovers/${encodeURIComponent(id)}`,
  );
  if (!result.ok) return result;
  const raw = result.data;
  const items = ((raw.items as HandoverItem[] | undefined) ?? []).map(
    (item) => ({
      ...item,
      sourceAccountId: String(item.sourceAccountId),
      submittedAmount: num(item.submittedAmount) ?? 0,
      receivedAmount: num(item.receivedAmount),
      receivedIntoAccountId: item.receivedIntoAccountId
        ? String(item.receivedIntoAccountId)
        : null,
    }),
  );
  const submittedTotal = num(raw.submittedTotal) ?? 0;
  const receivedTotal = num(raw.receivedTotal);
  const workflow: HandoverWorkflow = {
    userId:
      text(raw.userId) ??
      (raw.collectedById ? String(raw.collectedById) : null),
    items,
    submittedTotal,
    receivedTotal,
    reason: text(raw.reason),
    approvedBy: user(raw.approvedBy),
    approvedAt: text(raw.approvedAt),
    rejectedBy: user(raw.rejectedBy),
    rejectedAt: text(raw.rejectedAt),
  };
  const status = (raw.status as VoucherStatus | undefined) ?? "submitted";
  const stamp = (by: UserRef | null, at: string | null) =>
    by ? `${by.name}${at ? ` · ${formatExactUae(at)}` : ""}` : null;

  return {
    ok: true,
    data: {
      workflow,
      voucher: {
        id: String(raw._id),
        voucherNo: String(raw.voucherNo),
        voucherDate: String(raw.voucherDate),
        headerAccount: { id: "", name: formatAmount(submittedTotal) },
        collectedBy: {
          id: workflow.userId,
          name: text(raw.userName) ?? text(raw.collectedByName),
        },
        paymentMethod: "cash",
        paymentReference: null,
        chequeDate: null,
        comments: text(raw.comments) ?? "",
        lines: [],
        grossTotal: submittedTotal,
        totalTax: 0,
        grandTotal: receivedTotal ?? submittedTotal,
        status,
        createdBy: user(raw.createdBy),
        createdAt: text(raw.createdAt),
        updatedBy: user(raw.updatedBy),
        updatedAt: text(raw.updatedAt),
        cancelledBy: user(raw.cancelledBy),
        cancelledAt: text(raw.cancelledAt),
        cancelReason: text(raw.cancelReason),
        extraFields: [
          {
            key: "received",
            label: "Received",
            value: receivedTotal === null ? null : formatAmount(receivedTotal),
          },
          ...(workflow.reason
            ? [
                {
                  key: "reason",
                  label:
                    status === "rejected" ? "Reject Reason" : "Short Reason",
                  value: workflow.reason,
                },
              ]
            : []),
          ...(workflow.approvedBy
            ? [
                {
                  key: "approvedBy",
                  label: "Approved By",
                  value: stamp(workflow.approvedBy, workflow.approvedAt),
                },
              ]
            : []),
          ...(workflow.rejectedBy
            ? [
                {
                  key: "rejectedBy",
                  label: "Rejected By",
                  value: stamp(workflow.rejectedBy, workflow.rejectedAt),
                },
              ]
            : []),
        ],
      },
    },
  };
}

/** A user's cash, wallet and cheque holdings; without userId, the caller's. */
export async function getPendingCash(
  userId: string | null,
): Promise<ApiResult<PendingCash>> {
  const query = userId ? `?${new URLSearchParams({ userId })}` : "";
  const result = await apiGet<PendingCash>(`/cash-handovers/pending${query}`);
  if (!result.ok) return result;
  return {
    ok: true,
    data: {
      ...result.data,
      accounts: result.data.accounts ?? [],
      totals: result.data.totals ?? { balance: 0, submitted: 0, available: 0 },
    },
  };
}

/** Handovers waiting for approval, for the sidebar badge. */
export async function countPendingApprovals(): Promise<number | null> {
  const result = await apiGet<{ summary: { count: number } }>(
    "/cash-handovers?status=submitted&page=1&pageSize=1",
  );
  return result.ok ? (result.data.summary?.count ?? null) : null;
}

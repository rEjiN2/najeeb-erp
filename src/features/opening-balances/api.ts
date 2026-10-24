import "server-only";

import { getAccount } from "@/features/accounts/api";
import { resolveDateRange } from "@/features/vouchers/filters";
import type { UserRef, VoucherDetail } from "@/features/vouchers/types";
import { apiGet, type ApiResult } from "@/lib/api";
import { uaeToday } from "@/lib/datetime";

import { OPENING_BALANCES_PAGE_SIZE } from "./constants";
import type {
  OpeningBalanceFilters,
  OpeningBalanceLine,
  OpeningBalancePage,
} from "./types";

/** GET /opening-balances — only the query keys its DTO declares. */
export function getOpeningBalances(
  filters: OpeningBalanceFilters,
): Promise<ApiResult<OpeningBalancePage>> {
  const query = new URLSearchParams({
    page: String(filters.page),
    pageSize: String(OPENING_BALANCES_PAGE_SIZE),
    status: filters.status,
  });
  const { dateFrom, dateTo } = resolveDateRange(filters, uaeToday());
  if (dateFrom) query.set("dateFrom", dateFrom);
  if (dateTo) query.set("dateTo", dateTo);
  if (filters.accountId) query.set("accountId", filters.accountId);
  return apiGet<OpeningBalancePage>(`/opening-balances?${query}`);
}

/** GET /opening-balances/:id — the serialized document. */
type RawOpeningBalance = {
  _id: string;
  voucherNo: string;
  asOfDate: string;
  comments?: string | null;
  lines: { accountId: string; debit: number; credit: number }[];
  totalDebit: number;
  totalCredit: number;
  equityAccountId: string;
  equityDebit: number;
  equityCredit: number;
  status?: "posted" | "cancelled";
  createdBy?: UserRef | null;
  createdAt?: string | null;
  updatedBy?: UserRef | null;
  updatedAt?: string | null;
  cancelledBy?: UserRef | null;
  cancelledAt?: string | null;
  cancelReason?: string | null;
};

export interface OpeningBalanceDetail {
  /** In the shared voucher view's shape (meta strip, cancel, Activity). */
  voucher: VoucherDetail;
  lines: OpeningBalanceLine[];
  equity: { name: string | null; debit: number; credit: number };
  totalDebit: number;
  totalCredit: number;
}

/**
 * One opening balance with every account named. The document stores only
 * account ids, so each is read once; a deleted one shows as unknown.
 */
export async function getOpeningBalance(
  id: string,
): Promise<ApiResult<OpeningBalanceDetail>> {
  const result = await apiGet<RawOpeningBalance>(
    `/opening-balances/${encodeURIComponent(id)}`,
  );
  if (!result.ok) return result;
  const raw = result.data;
  const ids = [
    ...new Set([
      raw.equityAccountId,
      ...raw.lines.map((line) => line.accountId),
    ]),
  ].map(String);
  const accounts = new Map<
    string,
    { code: string; name: string; type: string } | null
  >();
  for (const [accountId, account] of await Promise.all(
    ids.map(
      async (accountId) => [accountId, await getAccount(accountId)] as const,
    ),
  )) {
    if (!account.ok) return account;
    accounts.set(accountId, account.data);
  }
  const equityName = accounts.get(String(raw.equityAccountId))?.name ?? null;
  const equityAmount = raw.equityDebit || raw.equityCredit;

  return {
    ok: true,
    data: {
      lines: raw.lines.map((line) => {
        const account = accounts.get(String(line.accountId)) ?? null;
        return {
          accountId: String(line.accountId),
          code: account?.code ?? null,
          name: account?.name ?? null,
          type: account?.type ?? null,
          debit: line.debit,
          credit: line.credit,
        };
      }),
      equity: {
        name: equityName,
        debit: raw.equityDebit,
        credit: raw.equityCredit,
      },
      totalDebit: raw.totalDebit,
      totalCredit: raw.totalCredit,
      voucher: {
        id: String(raw._id),
        voucherNo: raw.voucherNo,
        voucherDate: raw.asOfDate,
        headerAccount: {
          id: String(raw.equityAccountId),
          name: `${equityName ?? "Opening Balance Equity"} · ${
            raw.equityDebit ? "Dr" : "Cr"
          } ${equityAmount.toFixed(2)}`,
        },
        collectedBy: {
          id: raw.createdBy?.id ?? null,
          name: raw.createdBy?.name ?? null,
        },
        paymentMethod: "cash",
        paymentReference: null,
        chequeDate: null,
        chequeNumber: null,
        chequeBankName: null,
        chequeStatus: null,
        comments: raw.comments ?? "",
        lines: [],
        grossTotal: raw.totalDebit,
        totalTax: 0,
        grandTotal: raw.totalDebit,
        status: raw.status ?? "posted",
        createdBy: raw.createdBy ?? null,
        createdAt: raw.createdAt ?? null,
        updatedBy: raw.updatedBy ?? null,
        updatedAt: raw.updatedAt ?? null,
        cancelledBy: raw.cancelledBy ?? null,
        cancelledAt: raw.cancelledAt ?? null,
        cancelReason: raw.cancelReason ?? null,
        extraFields: [],
        attachments: [],
      },
    },
  };
}

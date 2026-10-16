import "server-only";

import { apiGet, type ApiResult } from "@/lib/api";
import { uaeToday } from "@/lib/datetime";

import { getAccount } from "@/features/accounts/api";

import { CASH_ACCOUNT_TYPES } from "./constants";
import { resolveDateRange, type CashReceiptFilters } from "./filters";
import type {
  AccountLookupItem,
  CashReceiptDetail,
  CashReceiptPage,
  CashReceiptStatus,
  UserRef,
} from "./types";

/** Filters → GET /cash-receipts query. Date presets resolve in UAE time. */
function toBackendQuery(
  filters: CashReceiptFilters,
  overrides: Record<string, string> = {},
): URLSearchParams {
  const query = new URLSearchParams({
    page: String(filters.page),
    pageSize: String(filters.pageSize),
    sortBy: filters.sortBy,
    sortDir: filters.sortDir,
    status: filters.status,
  });
  const { dateFrom, dateTo } = resolveDateRange(filters, uaeToday());
  if (dateFrom) query.set("dateFrom", dateFrom);
  if (dateTo) query.set("dateTo", dateTo);
  if (filters.cashAccountId) query.set("cashAccountId", filters.cashAccountId);
  if (filters.accountId) query.set("accountId", filters.accountId);
  if (filters.createdBy) query.set("createdBy", filters.createdBy);
  if (filters.cashierId) query.set("cashierId", filters.cashierId);
  if (filters.q) query.set("q", filters.q);
  if (filters.amountMin !== null)
    query.set("amountMin", String(filters.amountMin));
  if (filters.amountMax !== null)
    query.set("amountMax", String(filters.amountMax));
  for (const [key, value] of Object.entries(overrides)) query.set(key, value);
  return query;
}

export function getCashReceipts(
  filters: CashReceiptFilters,
): Promise<ApiResult<CashReceiptPage>> {
  return apiGet<CashReceiptPage>(`/cash-receipts?${toBackendQuery(filters)}`);
}

/**
 * How many of the filtered receipts are posted. The backend's summary count
 * includes cancelled ones; the summary strip counts what the total counts.
 */
export async function countPostedCashReceipts(
  filters: CashReceiptFilters,
): Promise<ApiResult<number>> {
  const result = await apiGet<CashReceiptPage>(
    `/cash-receipts?${toBackendQuery(filters, { status: "posted", page: "1", pageSize: "1" })}`,
  );
  return result.ok ? { ok: true, data: result.data.summary.count } : result;
}

/** Whether any receipt exists at all — tells "nothing yet" from "no matches". */
export async function hasAnyCashReceipt(): Promise<ApiResult<boolean>> {
  const result = await apiGet<CashReceiptPage>(
    "/cash-receipts?status=all&page=1&pageSize=1",
  );
  return result.ok ? { ok: true, data: result.data.summary.count > 0 } : result;
}

/** Active cash and wallet accounts for the Cash Account picker and filter. */
export function getCashAccounts(): Promise<ApiResult<AccountLookupItem[]>> {
  return apiGet<AccountLookupItem[]>(
    `/accounts/lookup?types=${CASH_ACCOUNT_TYPES.join(",")}&limit=100`,
  );
}

// --- Detail -----------------------------------------------------------------

interface RawLine {
  accountId: string;
  narration?: string | null;
  remarks?: string | null;
  oldBalance: number;
  amount: number;
  vat: number;
  netAmount: number;
}

/** GET /cash-receipts/:id — the serialized Mongoose document. */
interface RawCashReceipt {
  _id: string;
  voucherNo: string;
  voucherDate: string;
  cashAccountId: string;
  cashierId?: string | null;
  cashierName?: string | null;
  comments?: string | null;
  lines: RawLine[];
  grossTotal: number;
  totalTax: number;
  grandTotal: number;
  /** Absent on receipts from before cancellation existed: they're posted. */
  status?: CashReceiptStatus;
  createdBy?: UserRef | null;
  createdAt?: string | null;
  updatedBy?: UserRef | null;
  updatedAt?: string | null;
  cancelledBy?: UserRef | null;
  cancelledAt?: string | null;
  cancelReason?: string | null;
}

/**
 * One receipt, with every account it references named. The document only
 * stores account ids, so each distinct account is read once; one that has
 * since been deleted shows as unknown rather than failing the page.
 */
export async function getCashReceipt(
  id: string,
): Promise<ApiResult<CashReceiptDetail>> {
  const result = await apiGet<RawCashReceipt>(
    `/cash-receipts/${encodeURIComponent(id)}`,
  );
  if (!result.ok) return result;
  const raw = result.data;

  const accountIds = [
    ...new Set([raw.cashAccountId, ...raw.lines.map((line) => line.accountId)]),
  ];
  const accounts = await Promise.all(
    accountIds.map(async (accountId) => ({
      accountId,
      result: await getAccount(accountId),
    })),
  );
  const names = new Map<string, string | null>();
  for (const { accountId, result: account } of accounts) {
    if (!account.ok) return account;
    names.set(accountId, account.data?.name ?? null);
  }

  return {
    ok: true,
    data: {
      id: raw._id,
      voucherNo: raw.voucherNo,
      voucherDate: raw.voucherDate,
      cashAccount: {
        id: raw.cashAccountId,
        name: names.get(raw.cashAccountId) ?? null,
      },
      cashier: { id: raw.cashierId ?? null, name: raw.cashierName ?? null },
      comments: raw.comments ?? "",
      lines: raw.lines.map((line) => ({
        accountId: line.accountId,
        accountName: names.get(line.accountId) ?? null,
        narration: line.narration ?? "",
        remarks: line.remarks ?? "",
        oldBalance: line.oldBalance,
        amount: line.amount,
        vat: line.vat,
        netAmount: line.netAmount,
      })),
      grossTotal: raw.grossTotal,
      totalTax: raw.totalTax,
      grandTotal: raw.grandTotal,
      status: raw.status ?? "posted",
      createdBy: raw.createdBy ?? null,
      createdAt: raw.createdAt ?? null,
      updatedBy: raw.updatedBy ?? null,
      updatedAt: raw.updatedAt ?? null,
      cancelledBy: raw.cancelledBy ?? null,
      cancelledAt: raw.cancelledAt ?? null,
      cancelReason: raw.cancelReason ?? null,
    },
  };
}

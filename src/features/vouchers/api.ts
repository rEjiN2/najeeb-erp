import "server-only";

import { apiGet, type ApiResult } from "@/lib/api";
import { uaeToday } from "@/lib/datetime";

import { getAccount } from "@/features/accounts/api";

import { MONEY_ACCOUNT_TYPES } from "./constants";
import {
  resolveDateRange,
  type StatusFilter,
  type VoucherFilters,
} from "./filters";
import type {
  AccountLookupItem,
  ChequeStatus,
  LineAllocation,
  NamedRef,
  PaymentMethod,
  UserRef,
  VoucherDetail,
  VoucherExtraField,
  VoucherListRow,
  VoucherPage,
  VoucherStatus,
} from "./types";

/** How one voucher type is spelled on the backend. */
export interface VoucherEndpoint {
  /** e.g. "/cash-receipts". */
  path: string;
  /** Header account on a list row, e.g. "cashAccount" / "paidFromAccount". */
  listHeaderKey: string;
  /** Header account id on the document, e.g. "cashAccountId". */
  detailHeaderKey: string;
  /** Header account id as a list filter, e.g. "cashAccountId". */
  queryHeaderKey: string;
  /** Whether the list accepts `paymentMethod`. */
  methodFilter: boolean;
  /** Whether the account lookup is narrowed with scope=company. */
  scopedLookup: boolean;
  /** Header account types; default cash, wallet, bank. */
  headerAccountTypes?: readonly string[];
  /** Fields only this voucher type has, for the view page. */
  detailExtras?: (raw: Record<string, unknown>) => VoucherExtraField[];
  /** How a status filter goes on the query; default `status=<filter>`. */
  statusQuery?: (status: StatusFilter) => Record<string, string>;
}

type RawListRow = Omit<VoucherListRow, "headerAccount" | "paymentMethod"> & {
  /** Absent on vouchers from before bank support: they're cash. */
  paymentMethod?: PaymentMethod;
};

interface RawVoucherPage {
  /** Each row also carries its header account under `listHeaderKey`. */
  items: RawListRow[];
  page: number;
  pageSize: number;
  summary: { count: number; total: number };
}

interface RawLine {
  accountId: string;
  narration?: string | null;
  remarks?: string | null;
  /** Absent without balances:view. */
  oldBalance?: number;
  amount: number;
  vat: number;
  netAmount: number;
}

/** GET /<vouchers>/:id — the serialized Mongoose document. */
type RawVoucher = Record<string, unknown> & {
  _id: string;
  voucherNo: string;
  voucherDate: string;
  collectedById?: string | null;
  collectedByName?: string | null;
  /** Absent on vouchers from before bank support: they're cash. */
  paymentMethod?: PaymentMethod;
  paymentReference?: string | null;
  chequeDate?: string | null;
  chequeNumber?: string | null;
  chequeBankName?: string | null;
  chequeStatus?: ChequeStatus | null;
  comments?: string | null;
  lines: RawLine[];
  /** Cash payments: active allocations, by line position. */
  allocations?: {
    paymentLineIndex: number;
    targetType: LineAllocation["targetType"];
    targetId: string;
    targetNo: string;
    amount: number;
  }[];
  grossTotal: number;
  totalTax: number;
  grandTotal: number;
  /** Absent on vouchers from before cancellation existed: they're posted. */
  status?: VoucherStatus;
  createdBy?: UserRef | null;
  createdAt?: string | null;
  updatedBy?: UserRef | null;
  updatedAt?: string | null;
  cancelledBy?: UserRef | null;
  cancelledAt?: string | null;
  cancelReason?: string | null;
  attachments?: {
    _id: string;
    fileRef: string;
    title: string;
    mimeType: string;
    uploadedAt: string;
  }[];
};

/** Reads for one voucher type: list, counts, detail and its header accounts. */
export function createVoucherApi(endpoint: VoucherEndpoint) {
  /** Filters → list query. Date presets resolve in UAE time. */
  function toBackendQuery(
    filters: VoucherFilters,
    overrides: Record<string, string> = {},
  ): URLSearchParams {
    const query = new URLSearchParams({
      page: String(filters.page),
      pageSize: String(filters.pageSize),
      sortBy: filters.sortBy,
      sortDir: filters.sortDir,
      ...(endpoint.statusQuery?.(filters.status) ?? { status: filters.status }),
    });
    const { dateFrom, dateTo } = resolveDateRange(filters, uaeToday());
    if (dateFrom) query.set("dateFrom", dateFrom);
    if (dateTo) query.set("dateTo", dateTo);
    if (filters.headerAccountId)
      query.set(endpoint.queryHeaderKey, filters.headerAccountId);
    if (endpoint.methodFilter && filters.method !== "all")
      query.set("paymentMethod", filters.method);
    if (filters.accountId) query.set("accountId", filters.accountId);
    if (filters.createdBy) query.set("createdBy", filters.createdBy);
    if (filters.collectedBy) query.set("collectedBy", filters.collectedBy);
    if (filters.q) query.set("q", filters.q);
    if (filters.amountMin !== null)
      query.set("amountMin", String(filters.amountMin));
    if (filters.amountMax !== null)
      query.set("amountMax", String(filters.amountMax));
    for (const [key, value] of Object.entries(overrides)) query.set(key, value);
    return query;
  }

  async function list(
    query: URLSearchParams | string,
  ): Promise<ApiResult<VoucherPage>> {
    const result = await apiGet<RawVoucherPage>(`${endpoint.path}?${query}`);
    if (!result.ok) return result;
    return {
      ok: true,
      data: {
        ...result.data,
        items: result.data.items.map((item): VoucherListRow => {
          const {
            [endpoint.listHeaderKey]: header,
            paymentMethod,
            ...row
          } = item as RawListRow & Record<string, unknown>;
          return {
            ...(row as Omit<RawListRow, "paymentMethod">),
            headerAccount: header as NamedRef,
            paymentMethod:
              (paymentMethod as PaymentMethod | undefined) ?? "cash",
          };
        }),
      },
    };
  }

  function getVouchers(filters: VoucherFilters) {
    return list(toBackendQuery(filters));
  }

  /**
   * How many of the filtered vouchers are cancelled. The backend's summary
   * count includes them; the summary strip counts what the total counts.
   */
  async function countCancelled(
    filters: VoucherFilters,
  ): Promise<ApiResult<number>> {
    const result = await list(
      toBackendQuery(
        { ...filters, status: "cancelled" },
        { page: "1", pageSize: "1" },
      ),
    );
    return result.ok ? { ok: true, data: result.data.summary.count } : result;
  }

  /** Whether any voucher exists at all — tells "nothing yet" from "no matches". */
  async function hasAny(): Promise<ApiResult<boolean>> {
    const result = await list("status=all&page=1&pageSize=1");
    return result.ok
      ? { ok: true, data: result.data.summary.count > 0 }
      : result;
  }

  /** Active header accounts (cash, wallet, bank; cheque on receipts). */
  function getHeaderAccounts(): Promise<ApiResult<AccountLookupItem[]>> {
    const query = new URLSearchParams({
      ...(endpoint.scopedLookup ? { scope: "company" } : {}),
      types: (endpoint.headerAccountTypes ?? MONEY_ACCOUNT_TYPES).join(","),
      limit: "100",
    });
    // Commas stay literal, as the backend's examples spell them.
    return apiGet<AccountLookupItem[]>(
      `/accounts/lookup?${query.toString().replaceAll("%2C", ",")}`,
    );
  }

  /**
   * One voucher, with every account it references named. The document only
   * stores account ids, so each distinct account is read once; one that has
   * since been deleted shows as unknown rather than failing the page.
   */
  async function getVoucher(id: string): Promise<ApiResult<VoucherDetail>> {
    const result = await apiGet<RawVoucher>(
      `${endpoint.path}/${encodeURIComponent(id)}`,
    );
    if (!result.ok) return result;
    const raw = result.data;
    const headerId = String(raw[endpoint.detailHeaderKey]);

    const accountIds = [
      ...new Set([headerId, ...raw.lines.map((line) => line.accountId)]),
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
        headerAccount: { id: headerId, name: names.get(headerId) ?? null },
        collectedBy: {
          id: raw.collectedById ?? null,
          name: raw.collectedByName ?? null,
        },
        paymentMethod: raw.paymentMethod ?? "cash",
        paymentReference: raw.paymentReference ?? null,
        chequeDate: raw.chequeDate ?? null,
        chequeNumber: raw.chequeNumber ?? null,
        chequeBankName: raw.chequeBankName ?? null,
        chequeStatus: raw.chequeStatus ?? null,
        comments: raw.comments ?? "",
        lines: raw.lines.map((line, index) => ({
          ...(raw.allocations
            ? {
                allocations: raw.allocations
                  .filter((row) => row.paymentLineIndex === index)
                  .map((row) => ({
                    targetType: row.targetType,
                    targetId: row.targetId,
                    number: row.targetNo,
                    amount: row.amount,
                  })),
              }
            : {}),
          accountId: line.accountId,
          accountName: names.get(line.accountId) ?? null,
          narration: line.narration ?? "",
          remarks: line.remarks ?? "",
          oldBalance: line.oldBalance ?? null,
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
        extraFields: endpoint.detailExtras?.(raw) ?? [],
        attachments: (raw.attachments ?? []).map((attachment) => ({
          id: String(attachment._id),
          fileId: String(attachment.fileRef),
          title: attachment.title,
          mimeType: attachment.mimeType,
          uploadedAt: attachment.uploadedAt,
        })),
      },
    };
  }

  return { getVouchers, countCancelled, hasAny, getHeaderAccounts, getVoucher };
}

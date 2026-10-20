import "server-only";

import { hasPermission } from "@/features/auth/session";
import { apiGet, type ApiResult } from "@/lib/api";

import { CASHIERS_MANAGE_PERMISSION, CASHIERS_PAGE_SIZE } from "./constants";
import {
  CASHIER_STATUSES,
  STAFF_TYPES,
  toCashier,
  type Cashier,
  type CashierFilters,
  type CashierLookupItem,
  type CashierPage,
  type RawCashier,
} from "./types";

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

/** URL → filters; anything unrecognised falls back to the default. */
export function parseCashierFilters(params: SearchParams): CashierFilters {
  const status = first(params.status);
  const staffType = first(params.type);
  const settles = first(params.settles);
  const page = Number.parseInt(first(params.page), 10);
  return {
    q: first(params.q).trim().slice(0, 100),
    status: (CASHIER_STATUSES as readonly string[]).includes(status)
      ? (status as CashierFilters["status"])
      : "all",
    staffType: (STAFF_TYPES as readonly string[]).includes(staffType)
      ? (staffType as CashierFilters["staffType"])
      : "all",
    settles: settles === "yes" || settles === "no" ? settles : "all",
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

export async function getCashiers(
  filters: CashierFilters,
): Promise<ApiResult<CashierPage>> {
  const query = new URLSearchParams({
    page: String(filters.page),
    limit: String(CASHIERS_PAGE_SIZE),
  });
  if (filters.q) query.set("q", filters.q);
  if (filters.status !== "all") query.set("status", filters.status);
  if (filters.staffType !== "all") query.set("staffType", filters.staffType);
  if (filters.settles !== "all")
    query.set("settlesWithOffice", String(filters.settles === "yes"));

  const result = await apiGet<
    Omit<CashierPage, "items"> & { items: RawCashier[] }
  >(`/cashiers?${query}`);
  if (!result.ok) return result;
  return {
    ok: true,
    data: { ...result.data, items: result.data.items.map(toCashier) },
  };
}

/** Cashiers for a dropdown — active ones only unless `activeOnly` is false. */
export function getCashierLookup(
  activeOnly: boolean,
): Promise<ApiResult<CashierLookupItem[]>> {
  return apiGet<CashierLookupItem[]>(
    `/cashiers/lookup?activeOnly=${activeOnly}&limit=100`,
  );
}

/** The cashier linked to the signed-in user, or null. */
export async function getMyCashier(): Promise<ApiResult<Cashier | null>> {
  const result = await apiGet<RawCashier | null>("/cashiers/me");
  if (!result.ok) return result;
  return { ok: true, data: result.data ? toCashier(result.data) : null };
}

export function canManageCashiers(): Promise<boolean> {
  return hasPermission(CASHIERS_MANAGE_PERMISSION);
}

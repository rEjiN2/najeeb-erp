import {
  endOfMonth,
  endOfWeek,
  endOfYear,
  isIsoDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from "@/lib/datetime";

// Everything the list shows lives in the URL, so refresh and shared links
// reproduce the exact view. Shared by the server page (parse → backend query)
// and the client list (state → URL).

export const DATE_PRESETS = [
  "today",
  "week",
  "month",
  "year",
  "all",
  "custom",
] as const;
export type DatePreset = (typeof DATE_PRESETS)[number];

export const DATE_PRESET_LABELS: Record<DatePreset, string> = {
  today: "Today",
  week: "This week",
  month: "This month",
  year: "This year",
  all: "All time",
  custom: "Custom range",
};

/** Every status a list can filter on; each voucher type offers its own
 * subset (VoucherConfig.statusFilters). */
export const STATUS_FILTERS = [
  "all",
  "posted",
  "submitted",
  "approved",
  "rejected",
  "cancelled",
] as const;
export type StatusFilter = (typeof STATUS_FILTERS)[number];

/** What receipts and payments offer. */
export const DEFAULT_STATUS_FILTERS: readonly StatusFilter[] = [
  "all",
  "posted",
  "cancelled",
];

export const STATUS_FILTER_LABELS: Record<StatusFilter, string> = {
  all: "All statuses",
  posted: "Posted",
  submitted: "Pending approval",
  approved: "Approved",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

export const METHOD_FILTERS = ["all", "cash", "bank"] as const;
export type MethodFilter = (typeof METHOD_FILTERS)[number];

export const METHOD_FILTER_LABELS: Record<MethodFilter, string> = {
  all: "All methods",
  cash: "Cash",
  bank: "Bank",
};

export const SORT_FIELDS = ["date", "amount", "voucherNo"] as const;
export type SortField = (typeof SORT_FIELDS)[number];
export type SortDir = "asc" | "desc";

export const PAGE_SIZES = [10, 20, 50, 100] as const;

export interface VoucherFilters {
  range: DatePreset;
  /** Only with range "custom". YYYY-MM-DD. */
  from: string;
  to: string;
  status: StatusFilter;
  /** Cash covers cash and wallet accounts. */
  method: MethodFilter;
  /** The header ("Received Into" / "Paid From") account. */
  headerAccountId: string;
  accountId: string;
  cashierId: string;
  createdBy: string;
  q: string;
  amountMin: number | null;
  amountMax: number | null;
  sortBy: SortField;
  sortDir: SortDir;
  page: number;
  pageSize: number;
}

export const DEFAULT_FILTERS: VoucherFilters = {
  range: "month",
  from: "",
  to: "",
  status: "all",
  method: "all",
  headerAccountId: "",
  accountId: "",
  cashierId: "",
  createdBy: "",
  q: "",
  amountMin: null,
  amountMax: null,
  sortBy: "date",
  sortDir: "desc",
  page: 1,
  pageSize: 20,
};

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

function oneOf<T extends string>(
  value: string,
  allowed: readonly T[],
  fallback: T,
): T {
  return (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

const isMongoId = (value: string) => /^[a-f\d]{24}$/i.test(value);

function amount(value: string): number | null {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function positiveInt(value: string, fallback: number): number {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/** The ?range=&from=&to= part of a URL; reports share it. */
export function parseDateRange(
  params: SearchParams,
  fallback: DatePreset = DEFAULT_FILTERS.range,
): Pick<VoucherFilters, "range" | "from" | "to"> {
  let range = oneOf(first(params.range), DATE_PRESETS, fallback);
  let from = first(params.from);
  let to = first(params.to);
  if (range === "custom") {
    from = isIsoDay(from) ? from : "";
    to = isIsoDay(to) ? to : "";
    if (from && to && from > to) [from, to] = [to, from];
    if (!from && !to) range = fallback;
  } else {
    from = "";
    to = "";
  }
  return { range, from, to };
}

/** URL → filters. Values the backend would reject are dropped here rather
 * than turning a hand-edited link into an error page. */
export function parseFilters(
  params: SearchParams,
  statusFilters: readonly StatusFilter[] = DEFAULT_STATUS_FILTERS,
): VoucherFilters {
  const { range, from, to } = parseDateRange(params);

  let amountMin = amount(first(params.min));
  let amountMax = amount(first(params.max));
  if (amountMin !== null && amountMax !== null && amountMin > amountMax) {
    [amountMin, amountMax] = [amountMax, amountMin];
  }

  const pageSize = positiveInt(first(params.size), DEFAULT_FILTERS.pageSize);
  const idParam = (key: string) => {
    const value = first(params[key]);
    return isMongoId(value) ? value : "";
  };

  return {
    range,
    from,
    to,
    status: oneOf(first(params.status), statusFilters, DEFAULT_FILTERS.status),
    method: oneOf(first(params.method), METHOD_FILTERS, DEFAULT_FILTERS.method),
    headerAccountId: idParam("cash"),
    accountId: idParam("account"),
    cashierId: idParam("cashier"),
    createdBy: idParam("by"),
    q: first(params.q).trim().slice(0, 100),
    amountMin,
    amountMax,
    sortBy: oneOf(first(params.sort), SORT_FIELDS, DEFAULT_FILTERS.sortBy),
    sortDir: first(params.dir) === "asc" ? "asc" : "desc",
    page: positiveInt(first(params.page), 1),
    pageSize: (PAGE_SIZES as readonly number[]).includes(pageSize)
      ? pageSize
      : DEFAULT_FILTERS.pageSize,
  };
}

/** Filters → query string, leaving defaults out so URLs stay short. */
export function toSearch(filters: VoucherFilters): string {
  const params = new URLSearchParams();
  const d = DEFAULT_FILTERS;
  if (filters.range !== d.range) params.set("range", filters.range);
  if (filters.range === "custom") {
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
  }
  if (filters.status !== d.status) params.set("status", filters.status);
  if (filters.method !== d.method) params.set("method", filters.method);
  if (filters.headerAccountId) params.set("cash", filters.headerAccountId);
  if (filters.accountId) params.set("account", filters.accountId);
  if (filters.cashierId) params.set("cashier", filters.cashierId);
  if (filters.createdBy) params.set("by", filters.createdBy);
  if (filters.q) params.set("q", filters.q);
  if (filters.amountMin !== null) params.set("min", String(filters.amountMin));
  if (filters.amountMax !== null) params.set("max", String(filters.amountMax));
  if (filters.sortBy !== d.sortBy) params.set("sort", filters.sortBy);
  if (filters.sortDir !== d.sortDir) params.set("dir", filters.sortDir);
  if (filters.page > 1) params.set("page", String(filters.page));
  if (filters.pageSize !== d.pageSize)
    params.set("size", String(filters.pageSize));
  const search = params.toString();
  return search ? `?${search}` : "";
}

/** The calendar days a preset covers, relative to `today` (UAE). */
export function resolveDateRange(
  filters: Pick<VoucherFilters, "range" | "from" | "to">,
  today: string,
): { dateFrom?: string; dateTo?: string } {
  switch (filters.range) {
    case "today":
      return { dateFrom: today, dateTo: today };
    case "week":
      return { dateFrom: startOfWeek(today), dateTo: endOfWeek(today) };
    case "month":
      return { dateFrom: startOfMonth(today), dateTo: endOfMonth(today) };
    case "year":
      return { dateFrom: startOfYear(today), dateTo: endOfYear(today) };
    case "all":
      return {};
    case "custom":
      return {
        ...(filters.from ? { dateFrom: filters.from } : {}),
        ...(filters.to ? { dateTo: filters.to } : {}),
      };
  }
}

/** Filters that narrow the list — sorting and paging don't count. */
export function hasActiveFilters(filters: VoucherFilters): boolean {
  const d = DEFAULT_FILTERS;
  return (
    filters.range !== d.range ||
    filters.status !== d.status ||
    filters.method !== d.method ||
    filters.headerAccountId !== "" ||
    filters.accountId !== "" ||
    filters.cashierId !== "" ||
    filters.createdBy !== "" ||
    filters.q !== "" ||
    filters.amountMin !== null ||
    filters.amountMax !== null
  );
}

/** Clears every filter but keeps how the list is sorted and sized. */
export function clearedFilters(filters: VoucherFilters): VoucherFilters {
  return {
    ...DEFAULT_FILTERS,
    sortBy: filters.sortBy,
    sortDir: filters.sortDir,
    pageSize: filters.pageSize,
  };
}

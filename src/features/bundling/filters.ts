import { parseDateRange } from "@/features/vouchers/filters";

import type { BundlingFilters } from "./types";

// The list's view lives in the URL.

type SearchParams = Record<string, string | string[] | undefined>;

const ID = /^[a-f\d]{24}$/i;

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

export function parseBundlingFilters(params: SearchParams): BundlingFilters {
  const status = first(params.status);
  const mode = first(params.mode);
  const location = first(params.location);
  const bundle = first(params.bundle);
  const page = Number.parseInt(first(params.page), 10);
  return {
    ...parseDateRange(params, "all"),
    status: status === "posted" || status === "cancelled" ? status : "all",
    mode: mode === "bundle" || mode === "unbundle" ? mode : "all",
    locationId: ID.test(location) ? location : "",
    bundleProductId: ID.test(bundle) ? bundle : "",
    q: first(params.q).slice(0, 100),
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

export function toBundlingSearch(filters: BundlingFilters): string {
  const params = new URLSearchParams();
  if (filters.range !== "all") params.set("range", filters.range);
  if (filters.range === "custom") {
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
  }
  if (filters.status !== "all") params.set("status", filters.status);
  if (filters.mode !== "all") params.set("mode", filters.mode);
  if (filters.locationId) params.set("location", filters.locationId);
  if (filters.bundleProductId) params.set("bundle", filters.bundleProductId);
  if (filters.q) params.set("q", filters.q);
  if (filters.page > 1) params.set("page", String(filters.page));
  const search = params.toString();
  return search ? `?${search}` : "";
}

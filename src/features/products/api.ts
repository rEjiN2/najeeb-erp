import "server-only";

import { hasPermission } from "@/features/auth/session";
import { PERMISSIONS } from "@/features/auth/permissions";
import { apiGet, type ApiResult } from "@/lib/api";

import { PRODUCTS_PAGE_SIZE } from "./constants";
import {
  PRODUCT_STATUSES,
  PRODUCT_TYPES,
  type ProductFilters,
  type ProductPage,
} from "./types";

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

/** URL → filters; anything unrecognised falls back to the default. */
export function parseProductFilters(params: SearchParams): ProductFilters {
  const type = first(params.type);
  const status = first(params.status);
  const groupId = first(params.group);
  const page = Number.parseInt(first(params.page), 10);
  return {
    q: first(params.q).trim().slice(0, 100),
    groupId: /^[a-f\d]{24}$/i.test(groupId) ? groupId : "",
    type: (PRODUCT_TYPES as readonly string[]).includes(type)
      ? (type as ProductFilters["type"])
      : "all",
    status: (PRODUCT_STATUSES as readonly string[]).includes(status)
      ? (status as ProductFilters["status"])
      : "all",
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

/** One page of GET /products; q matches name, code or barcode. */
export function getProducts(
  filters: ProductFilters,
): Promise<ApiResult<ProductPage>> {
  const query = new URLSearchParams({
    page: String(filters.page),
    limit: String(PRODUCTS_PAGE_SIZE),
  });
  if (filters.q) query.set("q", filters.q);
  if (filters.groupId) query.set("groupId", filters.groupId);
  if (filters.type !== "all") query.set("type", filters.type);
  if (filters.status !== "all") query.set("status", filters.status);
  return apiGet<ProductPage>(`/products?${query}`);
}

export function canManageProducts(): Promise<boolean> {
  return hasPermission(PERMISSIONS.PRODUCTS_MANAGE);
}

/** products:view-cost: never for van salesmen. The backend strips cost anyway. */
export function canViewCost(): Promise<boolean> {
  return hasPermission(PERMISSIONS.PRODUCTS_VIEW_COST);
}

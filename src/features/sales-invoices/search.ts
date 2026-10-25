import type { SearchableSelectOption } from "@/components/shared/searchable-select";
import {
  toProductOption,
  type ProductOption,
} from "@/features/stock/product-search";
import type { ProductLookupItem } from "@/features/stock/types";
import { browserApi } from "@/lib/browser-api";
import { formatAmount } from "@/lib/format";

/** Active customers by name or code (GET /parties/lookup?kind=customer).
 * The balance comes only with balances:view; scoped users see name and code. */
export async function searchCustomers(query: string, signal: AbortSignal) {
  const params = new URLSearchParams({ kind: "customer", limit: "30" });
  if (query) params.set("q", query.slice(0, 100));
  const result = await browserApi<
    { id: string; code: string; name: string; balance?: number }[]
  >(`/parties/lookup?${params}`, { signal });
  if (!result.ok) return result;
  return {
    ok: true as const,
    data: result.data.map((party): SearchableSelectOption => ({
      value: party.id,
      label: party.name,
      description:
        party.balance !== undefined
          ? `${party.code} · AED ${formatAmount(party.balance)}`
          : party.code,
    })),
  };
}

export interface SaleProductOption extends ProductOption {
  salePrice: number;
  vatRate: number;
}

/** Active products with their sale price and VAT (GET /products/lookup). */
export async function searchSaleProducts(query: string, signal: AbortSignal) {
  const params = new URLSearchParams({ limit: "30" });
  if (query) params.set("q", query.slice(0, 100));
  const result = await browserApi<
    (ProductLookupItem & { salePrice: number; vatRate: number })[]
  >(`/products/lookup?${params}`, { signal });
  if (!result.ok) return result;
  return {
    ok: true as const,
    data: result.data.map((product): SaleProductOption => ({
      ...toProductOption(product),
      salePrice: product.salePrice,
      vatRate: product.vatRate,
    })),
  };
}

import type { SearchableSelectOption } from "@/components/shared/searchable-select";
import { browserApi } from "@/lib/browser-api";

import type { ProductLookupItem } from "./types";

export interface ProductOption extends SearchableSelectOption {
  code: string;
  unit: string | null;
}

export function toProductOption(product: ProductLookupItem): ProductOption {
  return {
    value: product.id,
    label: product.name,
    description: product.code,
    badge: product.unit?.symbol,
    code: product.code,
    unit: product.unit?.symbol ?? null,
  };
}

/** Active products by name, code or barcode (GET /products/lookup). */
export async function searchProducts(query: string, signal: AbortSignal) {
  const params = new URLSearchParams({ limit: "30" });
  if (query) params.set("q", query.slice(0, 100));
  const result = await browserApi<ProductLookupItem[]>(
    `/products/lookup?${params}`,
    { signal },
  );
  if (!result.ok) return result;
  return { ok: true as const, data: result.data.map(toProductOption) };
}

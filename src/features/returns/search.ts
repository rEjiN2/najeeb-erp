import type { SearchableSelectOption } from "@/components/shared/searchable-select";
import { browserApi } from "@/lib/browser-api";
import { formatAmount } from "@/lib/format";

import { RETURN_KINDS } from "./constants";
import type { ReturnKind } from "./types";

type InvoiceHit = {
  id: string;
  voucherNo: string;
  customer?: { name: string | null };
  supplier?: { name: string | null };
  netTotal: number;
  returnedQty?: number;
};

/** Posted invoices by number (GET /sales-invoices | /purchase-invoices?q=),
 * optionally one customer's or supplier's. Purchase search also matches the
 * supplier's bill number. */
export function searchInvoices(kind: ReturnKind, partyId: string) {
  return async (query: string, signal: AbortSignal) => {
    const params = new URLSearchParams({
      status: "posted",
      pageSize: "30",
    });
    if (query) params.set("q", query.slice(0, 100));
    if (partyId) {
      params.set(kind === "sales" ? "customerId" : "supplierId", partyId);
    }
    const result = await browserApi<{ items: InvoiceHit[] }>(
      `${RETURN_KINDS[kind].invoiceApiPath}?${params}`,
      { signal },
    );
    if (!result.ok) return result;
    return {
      ok: true as const,
      data: result.data.items.map((invoice): SearchableSelectOption => {
        const party = (invoice.customer ?? invoice.supplier)?.name ?? "—";
        return {
          value: invoice.id,
          label: invoice.voucherNo,
          description: `${party} · AED ${formatAmount(invoice.netTotal)}`,
        };
      }),
    };
  };
}

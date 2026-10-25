import type { SearchableSelectOption } from "@/components/shared/searchable-select";
import { browserApi } from "@/lib/browser-api";

/** Active suppliers by name or code (GET /parties/lookup?kind=supplier). */
export async function searchSuppliers(query: string, signal: AbortSignal) {
  const params = new URLSearchParams({ kind: "supplier", limit: "30" });
  if (query) params.set("q", query.slice(0, 100));
  const result = await browserApi<{ id: string; code: string; name: string }[]>(
    `/parties/lookup?${params}`,
    { signal },
  );
  if (!result.ok) return result;
  return {
    ok: true as const,
    data: result.data.map((party): SearchableSelectOption => ({
      value: party.id,
      label: party.name,
      description: party.code,
    })),
  };
}

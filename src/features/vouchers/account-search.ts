import type { SearchableSelectOption } from "@/components/shared/searchable-select";
import type { ApiResult } from "@/lib/api-types";
import { browserApi } from "@/lib/browser-api";
import { formatAmount } from "@/lib/format";

import { ACCOUNT_TYPE_BADGES } from "./constants";
import type { AccountLookupItem } from "./types";

export interface LineAccountOption extends SearchableSelectOption {
  /** null when the backend leaves balances out (no balances:view). */
  balance: number | null;
  /** Ledger account type, e.g. "supplier", "party", "expense". */
  type: string;
}

export type LineAccountSearch = (
  query: string,
  signal: AbortSignal,
) => Promise<ApiResult<LineAccountOption[]>>;

// One function per type list: the picker re-searches when its `search` changes.
const searches = new Map<string, LineAccountSearch>();

/** Backend search over the accounts a voucher line can post to. */
export function lineAccountSearch(types: readonly string[]): LineAccountSearch {
  const key = types.join(",");
  let search = searches.get(key);
  if (!search) {
    search = createSearch(types);
    searches.set(key, search);
  }
  return search;
}

function createSearch(types: readonly string[]): LineAccountSearch {
  return async (query, signal) => {
    const params = new URLSearchParams({
      types: types.join(","),
      limit: "30",
    });
    if (query) params.set("q", query.slice(0, 100));

    const result = await browserApi<AccountLookupItem[]>(
      `/accounts/lookup?${params}`,
      { signal },
    );
    if (!result.ok) return result;

    return {
      ok: true,
      data: result.data.map((account) => ({
        value: account.id,
        label: account.name,
        badge: ACCOUNT_TYPE_BADGES[account.type] ?? account.type,
        // Without balances:view the picker shows name and code only.
        description:
          account.balance === undefined
            ? account.code
            : `${account.code} · Balance ${formatAmount(account.balance)}`,
        balance: account.balance ?? null,
        type: account.type,
      })),
    };
  };
}

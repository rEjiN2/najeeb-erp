import type { SearchableSelectOption } from "@/components/shared/searchable-select";
import type { ApiResult } from "@/lib/api-types";
import { browserApi } from "@/lib/browser-api";
import { formatAmount } from "@/lib/format";

import { LINE_ACCOUNT_TYPES } from "./constants";
import type { AccountLookupItem } from "./types";

export interface LineAccountOption extends SearchableSelectOption {
  balance: number;
}

/** Backend search over the accounts a receipt line can post to. */
export async function searchLineAccounts(
  query: string,
  signal: AbortSignal,
): Promise<ApiResult<LineAccountOption[]>> {
  const params = new URLSearchParams({
    types: LINE_ACCOUNT_TYPES.join(","),
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
      description: `${account.code} · Balance ${formatAmount(account.balance)}`,
      balance: account.balance,
    })),
  };
}

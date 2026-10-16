import "server-only";

import { getAccount } from "@/features/accounts/api";
import { hasPermission } from "@/features/auth/session";
import { apiGet, type ApiResult } from "@/lib/api";

import { PARTIES_MANAGE_PERMISSION, PARTIES_PAGE_SIZE } from "./constants";
import {
  PARTY_STATUSES,
  type Party,
  type PartyFilters,
  type PartyKind,
  type PartyPage,
} from "./types";

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

/** URL → filters; anything unrecognised falls back to the default. */
export function parsePartyFilters(params: SearchParams): PartyFilters {
  const status = first(params.status);
  const page = Number.parseInt(first(params.page), 10);
  return {
    q: first(params.q).trim().slice(0, 100),
    status: (PARTY_STATUSES as readonly string[]).includes(status)
      ? (status as PartyFilters["status"])
      : "all",
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

/**
 * One page of GET /parties for a kind, with each row's ledger balance.
 * GET /parties doesn't carry balances, so the page's ledger accounts are
 * read alongside (one call each, at most a page's worth). A balance that
 * can't be read shows as unavailable on its row rather than failing the
 * list; a 401 still sends the user to sign in.
 */
export async function getParties(
  kind: PartyKind,
  filters: PartyFilters,
): Promise<ApiResult<PartyPage>> {
  const query = new URLSearchParams({
    kind,
    page: String(filters.page),
    limit: String(PARTIES_PAGE_SIZE),
  });
  if (filters.q) query.set("q", filters.q);
  if (filters.status !== "all") query.set("status", filters.status);

  const result = await apiGet<Omit<PartyPage, "items"> & { items: Party[] }>(
    `/parties?${query}`,
  );
  if (!result.ok) return result;

  const balances = await Promise.all(
    result.data.items.map((party) => getAccount(party.ledgerAccountId)),
  );
  const expired = balances.find(
    (balance) => !balance.ok && balance.reason === "unauthorized",
  );
  if (expired && !expired.ok) return expired;

  return {
    ok: true,
    data: {
      ...result.data,
      items: result.data.items.map((party, index) => {
        const balance = balances[index];
        return {
          ...party,
          balance: balance?.ok && balance.data ? balance.data.balance : null,
        };
      }),
    },
  };
}

export function canManageParties(): Promise<boolean> {
  return hasPermission(PARTIES_MANAGE_PERMISSION);
}

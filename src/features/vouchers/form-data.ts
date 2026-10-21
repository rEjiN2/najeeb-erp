import "server-only";

import { getServerSession } from "@/features/auth/session";
import { PERMISSIONS } from "@/features/auth/permissions";
import type { AuthUser } from "@/features/auth/types";
import { canManageParties } from "@/features/parties/api";
import { getCollectorLookup, type UserLookupItem } from "@/features/users/api";
import type { ApiFailure, ApiResult } from "@/lib/api";

import type { VoucherConfig } from "./config";
import type { AccountLookupItem } from "./types";

export interface VoucherFormData {
  /** Active cash, wallet and bank accounts for the header picker. */
  headerAccounts: AccountLookupItem[];
  /** Users who can be Collected By / Paid By (GET /users/lookup?for=...). */
  collectors: UserLookupItem[];
  /** The signed-in user, pre-selected on a new voucher. */
  me: UserLookupItem | null;
  /** vouchers:select-collector — without it Collected By is read-only. */
  canSelectCollector: boolean;
  /** parties:manage — the line picker offers "Add customer" / "Add supplier". */
  canAddParty: boolean;
  /**
   * An "own"-scoped user: the header picks only from their allowed cash
   * accounts. The backend refuses anything else (403).
   */
  scoped: boolean;
}

function allowedAccounts(user: AuthUser): AccountLookupItem[] {
  return user.allowedCashAccounts.map((account) => ({
    id: account.id,
    code: account.code,
    name: account.name,
    type: account.type,
  }));
}

/**
 * Everything the create/edit form needs besides the voucher. Header accounts
 * and collectors are required (the voucher can't be saved without them).
 */
export async function loadVoucherFormData({
  config,
  getHeaderAccounts,
}: {
  config: VoucherConfig;
  getHeaderAccounts: () => Promise<ApiResult<AccountLookupItem[]>>;
}): Promise<{ ok: true; data: VoucherFormData } | ApiFailure> {
  const [canAddParty, session] = await Promise.all([
    canManageParties(),
    getServerSession(),
  ]);
  const user = session?.user ?? null;
  const scoped = user?.dataScope === "own";
  const [headerAccounts, collectors] = await Promise.all([
    scoped && user
      ? { ok: true as const, data: allowedAccounts(user) }
      : getHeaderAccounts(),
    getCollectorLookup(config.collectorFor),
  ]);

  if (!headerAccounts.ok) return headerAccounts;
  if (!collectors.ok) return collectors;

  return {
    ok: true,
    data: {
      headerAccounts: headerAccounts.data,
      collectors: collectors.data,
      me: user ? { id: user.id, name: user.name } : null,
      canSelectCollector:
        user?.permissions.includes(PERMISSIONS.VOUCHERS_SELECT_COLLECTOR) ??
        false,
      canAddParty,
      scoped,
    },
  };
}

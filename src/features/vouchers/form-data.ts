import "server-only";

import {
  canManageCashiers,
  getCashierLookup,
  getMyCashier,
} from "@/features/cashiers/api";
import type { CashierLookupItem } from "@/features/cashiers/types";
import { getLocations } from "@/features/locations/api";
import { canManageParties } from "@/features/parties/api";
import { getUsers } from "@/features/users/api";
import type { ApiFailure, ApiResult } from "@/lib/api";

import type { CashierPanelData } from "./form/voucher-form";
import type { AccountLookupItem } from "./types";

export interface VoucherFormData {
  /** Active cash, wallet and bank accounts for the header picker. */
  headerAccounts: AccountLookupItem[];
  cashiers: CashierLookupItem[];
  myCashierId: string | null;
  /** /cashiers/me failed: the form says so instead of quietly not pre-selecting. */
  myCashierFailed: boolean;
  cashierPanel: CashierPanelData | null;
  /** parties:manage — the line picker offers "Add customer" / "Add supplier". */
  canAddParty: boolean;
}

/**
 * Everything the create/edit form needs besides the voucher. Header accounts
 * and cashiers are required (the voucher can't be saved without them); the
 * rest only adds conveniences, so their failures are reported in place.
 */
export async function loadVoucherFormData({
  preselectMine,
  getHeaderAccounts,
}: {
  preselectMine: boolean;
  getHeaderAccounts: () => Promise<ApiResult<AccountLookupItem[]>>;
}): Promise<{ ok: true; data: VoucherFormData } | ApiFailure> {
  const [manageCashiers, canAddParty] = await Promise.all([
    canManageCashiers(),
    canManageParties(),
  ]);
  const [headerAccounts, cashiers, mine, users, locations] = await Promise.all([
    getHeaderAccounts(),
    getCashierLookup(true),
    preselectMine ? getMyCashier() : null,
    manageCashiers ? getUsers() : null,
    manageCashiers ? getLocations() : null,
  ]);

  if (!headerAccounts.ok) return headerAccounts;
  if (!cashiers.ok) return cashiers;
  for (const optional of [mine, users, locations]) {
    if (optional && !optional.ok && optional.reason === "unauthorized") {
      return optional;
    }
  }

  // Pre-select only a cashier the backend will accept: an active one.
  const myCashier = mine?.ok ? mine.data : null;
  return {
    ok: true,
    data: {
      headerAccounts: headerAccounts.data,
      cashiers: cashiers.data,
      myCashierId: myCashier?.status === "active" ? myCashier.id : null,
      myCashierFailed: mine !== null && !mine.ok,
      canAddParty,
      cashierPanel: manageCashiers
        ? {
            users: users?.ok ? users.data : null,
            locations: locations?.ok ? locations.data : null,
          }
        : null,
    },
  };
}

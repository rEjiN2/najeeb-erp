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
import type { ApiFailure } from "@/lib/api";

import { getCashAccounts } from "./api";
import type { CashierPanelData } from "./form/cash-receipt-form";
import type { AccountLookupItem } from "./types";

export interface ReceiptFormData {
  cashAccounts: AccountLookupItem[];
  cashiers: CashierLookupItem[];
  myCashierId: string | null;
  /** /cashiers/me failed: the form says so instead of quietly not pre-selecting. */
  myCashierFailed: boolean;
  cashierPanel: CashierPanelData | null;
  /** parties:manage — the party picker offers "Add customer". */
  canAddCustomer: boolean;
}

/**
 * Everything the create/edit form needs besides the receipt. Cash accounts
 * and cashiers are required (the receipt can't be saved without them); the
 * rest only adds conveniences, so their failures are reported in place.
 */
export async function loadReceiptFormData({
  preselectMine,
}: {
  preselectMine: boolean;
}): Promise<{ ok: true; data: ReceiptFormData } | ApiFailure> {
  const [manageCashiers, canAddCustomer] = await Promise.all([
    canManageCashiers(),
    canManageParties(),
  ]);
  const [cashAccounts, cashiers, mine, users, locations] = await Promise.all([
    getCashAccounts(),
    getCashierLookup(true),
    preselectMine ? getMyCashier() : null,
    manageCashiers ? getUsers() : null,
    manageCashiers ? getLocations() : null,
  ]);

  if (!cashAccounts.ok) return cashAccounts;
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
      cashAccounts: cashAccounts.data,
      cashiers: cashiers.data,
      myCashierId: myCashier?.status === "active" ? myCashier.id : null,
      myCashierFailed: mine !== null && !mine.ok,
      canAddCustomer,
      cashierPanel: manageCashiers
        ? {
            users: users?.ok ? users.data : null,
            locations: locations?.ok ? locations.data : null,
          }
        : null,
    },
  };
}

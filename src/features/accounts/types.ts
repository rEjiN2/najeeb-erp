import type { MasterStatus } from "@/components/master/status-badge";

// Mirrors the backend's ledger-account.schema.ts / ledger-account.service.ts.
// Values are the wire values — lowercase.

export const ACCOUNT_TYPES = [
  "cash",
  "bank",
  "wallet",
  "party",
  "supplier",
  "income",
  "expense",
  "other",
] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

/** Types the Accounts API may create/update/delete (MANAGEABLE_ACCOUNT_TYPES).
 * Party/supplier accounts belong to the Customers/Suppliers screens. */
export const MANAGEABLE_ACCOUNT_TYPES = [
  "cash",
  "bank",
  "wallet",
  "income",
  "expense",
  "other",
] as const satisfies readonly AccountType[];
export type ManageableAccountType = (typeof MANAGEABLE_ACCOUNT_TYPES)[number];

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  cash: "Cash",
  bank: "Bank",
  wallet: "Wallet",
  party: "Customer",
  supplier: "Supplier",
  income: "Income",
  expense: "Expense",
  other: "Other",
};

export const ACCOUNT_STATUSES = ["active", "inactive"] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

export const ACCOUNT_STATUS_LABELS: Record<AccountStatus, MasterStatus> = {
  active: "Active",
  inactive: "Inactive",
};

export interface BankDetails {
  bankName?: string;
  accountNumber?: string;
  iban?: string;
  swiftCode?: string;
  branchCode?: string;
  /** Must be an expense account. */
  bankChargeAccountId?: string | null;
  commissionPercent?: number;
  isMerchantAccount?: boolean;
}

/** One row of GET /accounts (a serialized LedgerAccount document). */
export interface Account {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  /** Moved only by posted vouchers; never sent from the form. */
  balance: number;
  status: AccountStatus;
  /** Cash accounts only. */
  locationId: string | null;
  /** Bank accounts only. */
  bankDetails: BankDetails | null;
  /** Party/supplier — read-only here. */
  isSystemManaged: boolean;
}

/** GET /accounts response. */
export interface AccountPage {
  items: Account[];
  total: number;
  page: number;
  limit: number;
}

/** GET /accounts/lookup item (active accounts only). */
export interface AccountLookupItem {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  balance: number;
}

/**
 * What the form submits. Never `code` (generated) or `balance` (postings
 * only); `type` is only honoured on create — the backend rejects it on
 * update.
 */
export interface AccountInput {
  name: string;
  type: ManageableAccountType;
  status: AccountStatus;
  locationId: string | null;
  bankDetails: BankDetails | null;
}

/** The saved document POST/PATCH /accounts respond with — fields the UI reads. */
export interface SavedAccount {
  code: string;
  name: string;
  type: AccountType;
  status: AccountStatus;
}

export interface AccountFilters {
  q: string;
  type: ManageableAccountType | "all";
  status: AccountStatus | "all";
  page: number;
}

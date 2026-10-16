/** The company's own money accounts — what a voucher's header ("Received
 * Into" / "Paid From") picks from. Never customers or suppliers. */
export const MONEY_ACCOUNT_TYPES = ["cash", "wallet", "bank"] as const;

/** Badge text per ledger account type, for pickers. */
export const ACCOUNT_TYPE_BADGES: Record<string, string> = {
  cash: "Cash",
  wallet: "Wallet",
  bank: "Bank",
  party: "Customer",
  supplier: "Supplier",
  income: "Income",
  expense: "Expense",
  other: "Other",
};

/** Backend limits (vouchers/dto/voucher.dto.ts). */
export const CANCEL_REASON_MIN_LENGTH = 3;
export const REASON_MAX_LENGTH = 500;
export const PAYMENT_REFERENCE_MAX_LENGTH = 100;

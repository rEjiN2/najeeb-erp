import type { ChequeFilters, ChequeStatus, ChequeTab } from "./types";

export const CHEQUES_PATH = "/accounting-inventory/transactions/cheques";

/** Audit, comments and activity of cheque steps (backend CHEQUE_ENTITY_TYPE). */
export const CHEQUE_ENTITY_TYPE = "cheque";

export const CHEQUES_PAGE_SIZE = 20;

export const CHEQUE_TABS: { value: ChequeTab; label: string }[] = [
  // Collected, not yet handed over and approved: nothing can be done yet.
  { value: "with_salesman", label: "With Salesman" },
  { value: "at_office", label: "In Hand" },
  { value: "deposited", label: "Deposited" },
  { value: "cleared", label: "Cleared" },
  { value: "returned", label: "Returned" },
];

/** Not yet cleared or returned (backend PENDING). */
export const PENDING_STATUSES: readonly ChequeStatus[] = [
  "with_salesman",
  "submitted",
  "at_office",
  "deposited",
];

/** Pending and not yet at the bank (backend UNDEPOSITED). */
export const UNDEPOSITED_STATUSES: readonly ChequeStatus[] = [
  "with_salesman",
  "submitted",
  "at_office",
];

/** Backend "due soon": cheque date within the next 7 days. */
export const DUE_SOON_DAYS = 7;

export const DEFAULT_CHEQUE_FILTERS: ChequeFilters = {
  tab: "at_office",
  q: "",
  dueFrom: "",
  dueTo: "",
  customerId: "",
  bank: "",
  collectedBy: "",
  page: 1,
};

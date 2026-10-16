import type { PartyKind } from "./types";

/** Needed to create, edit, deactivate, delete and attach documents. */
export const PARTIES_MANAGE_PERMISSION = "parties:manage";

/** Entity type of parties in audit logs, comments and the activity timeline. */
export const PARTY_ENTITY_TYPE = "party";

/** Rows per page; the backend allows up to 100. */
export const PARTIES_PAGE_SIZE = 20;

/** Types the backend accepts for documents (files.service.ts). */
export const DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;
/** Backend default upload limit (STORAGE_MAX_FILE_SIZE_MB). */
export const DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;

export interface PartyKindConfig {
  kind: PartyKind;
  path: string;
  title: string;
  /** Lowercase singular for sentences: "customer". */
  noun: string;
  /** Title-case singular for buttons: "Customer". */
  Noun: string;
  description: string;
  emptyDescription: string;
  showShipping: boolean;
}

/** Everything that differs between the two screens — the components are shared. */
export const PARTY_KIND_CONFIG: Record<PartyKind, PartyKindConfig> = {
  customer: {
    kind: "customer",
    path: "/accounting-inventory/masters/customers",
    title: "Customers",
    noun: "customer",
    Noun: "Customer",
    description: "Who you sell to (debtors). Each has its own ledger account.",
    emptyDescription:
      "Add the businesses you sell to. Each customer gets a ledger account that receipts and invoices post to.",
    showShipping: true,
  },
  supplier: {
    kind: "supplier",
    path: "/accounting-inventory/masters/suppliers",
    title: "Suppliers",
    noun: "supplier",
    Noun: "Supplier",
    description:
      "Who you buy from (creditors). Each has its own ledger account.",
    emptyDescription:
      "Add the businesses you buy from. Each supplier gets a ledger account that purchases and payments post to.",
    showShipping: false,
  },
};

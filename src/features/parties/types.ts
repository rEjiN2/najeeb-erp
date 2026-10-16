import type { MasterStatus } from "@/components/master/status-badge";

// Mirrors the backend's party module (schemas/party.schema.ts, dto/party.dto.ts,
// party.service.ts PartyView). Customers and suppliers share one shape; only
// customers carry shipping addresses. Dates arrive as ISO strings.

export const PARTY_KINDS = ["customer", "supplier"] as const;
export type PartyKind = (typeof PARTY_KINDS)[number];

export const PARTY_STATUSES = ["active", "inactive"] as const;
export type PartyStatus = (typeof PARTY_STATUSES)[number];

export const PARTY_STATUS_LABELS: Record<PartyStatus, MasterStatus> = {
  active: "Active",
  inactive: "Inactive",
};

export const ADDRESS_FIELDS = [
  "address1",
  "address2",
  "address3",
  "city",
  "state",
  "country",
  "postalCode",
] as const;
export type AddressField = (typeof ADDRESS_FIELDS)[number];

export type ShippingAddress = {
  id: string;
  label: string;
  telephone: string | null;
} & Record<AddressField, string | null>;

export interface PartyDocument {
  id: string;
  /** Our FileAttachment id — read through GET /files/:id, never a storage URL. */
  fileId: string;
  title: string;
  uploadedAt: string;
}

/** GET /parties/:id, each GET /parties item, and every write's response. */
export type Party = {
  id: string;
  code: string;
  kind: PartyKind;
  name: string;
  status: PartyStatus;
  contactPerson: string | null;
  telephone: string | null;
  mobile: string | null;
  email: string | null;
  /** UAE TRN, stored as its 15 digits. */
  vatNumber: string | null;
  creditLimit: number | null;
  creditDays: number | null;
  salesman: string | null;
  shippingAddresses: ShippingAddress[];
  documents: PartyDocument[];
  ledgerAccountId: string;
} & Record<AddressField, string | null>;

/** A list row: the party plus its ledger account's balance (read separately). */
export type PartyRow = Party & {
  /** null when the ledger account couldn't be read. */
  balance: number | null;
};

export interface PartyPage {
  items: PartyRow[];
  total: number;
  page: number;
  limit: number;
}

/** What the form submits. Text fields are sent as typed; the backend trims
 * them and reads blank as "clear". */
export type PartyInput = {
  name: string;
  status: PartyStatus;
  contactPerson: string;
  telephone: string;
  mobile: string;
  email: string;
  vatNumber: string;
  creditLimit: number | null;
  creditDays: number | null;
  salesman: string;
  /** Customers only; omitted for suppliers. */
  shippingAddresses?: ShippingAddressInput[];
} & Record<AddressField, string>;

export type ShippingAddressInput = {
  label: string;
  telephone: string;
} & Record<AddressField, string>;

export interface PartyFilters {
  q: string;
  status: PartyStatus | "all";
  page: number;
}

/** The bits a voucher needs about a party saved from its side panel. */
export interface SavedPartySummary {
  id: string;
  code: string;
  name: string;
  ledgerAccountId: string;
}

import type { MasterStatus } from "@/components/master/status-badge";

// Mirrors the backend's cashier module (schemas/cashier.schema.ts,
// dto/cashier.dto.ts, cashier.service.ts). Values are the wire values.

export const CASHIER_STATUSES = ["active", "inactive"] as const;
export type CashierStatus = (typeof CASHIER_STATUSES)[number];

export const CASHIER_STATUS_LABELS: Record<CashierStatus, MasterStatus> = {
  active: "Active",
  inactive: "Inactive",
};

/** A cashier as the UI uses it (from the serialized document). */
export interface Cashier {
  id: string;
  code: string;
  name: string;
  mobile: string | null;
  email: string | null;
  status: CashierStatus;
  linkedUserId: string | null;
  locationId: string | null;
}

/** GET /cashiers/:id, GET /cashiers/me and each GET /cashiers item. */
export interface RawCashier {
  _id: string;
  code: string;
  name: string;
  mobile?: string | null;
  email?: string | null;
  status: CashierStatus;
  linkedUserId?: string | null;
  locationId?: string | null;
}

export function toCashier(raw: RawCashier): Cashier {
  return {
    id: raw._id,
    code: raw.code,
    name: raw.name,
    mobile: raw.mobile ?? null,
    email: raw.email ?? null,
    status: raw.status,
    linkedUserId: raw.linkedUserId ?? null,
    locationId: raw.locationId ?? null,
  };
}

/** GET /cashiers response. */
export interface CashierPage {
  items: Cashier[];
  total: number;
  page: number;
  limit: number;
}

/** GET /cashiers/lookup item. */
export interface CashierLookupItem {
  id: string;
  code: string;
  name: string;
}

/** What the form submits. Never `code` — the backend generates it. */
export interface CashierInput {
  name: string;
  mobile: string;
  email: string;
  status: CashierStatus;
  linkedUserId: string | null;
  locationId: string | null;
}

export interface CashierFilters {
  q: string;
  status: CashierStatus | "all";
  page: number;
}

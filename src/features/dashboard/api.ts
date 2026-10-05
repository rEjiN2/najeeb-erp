import "server-only";

import { apiGet } from "@/lib/api";

// Mirrors DashboardSummary in the backend's dashboard.service.ts.

export type LedgerAccountType =
  "cash" | "bank" | "party" | "supplier" | "income" | "expense" | "other";

export interface DashboardAccountBalance {
  id: string;
  code: string;
  name: string;
  status: "active" | "inactive";
  balance: number;
}

export interface DashboardBalanceGroup {
  type: LedgerAccountType;
  total: number;
  accountCount: number;
  accounts: DashboardAccountBalance[];
}

export interface DashboardSummary {
  /** ISO timestamp the backend computed the figures at. */
  asOf: string;
  /** One entry per ledger account type, empty types included. */
  balancesByType: DashboardBalanceGroup[];
  /** Cash + bank combined. */
  cashAndBankTotal: number;
}

export function getDashboardSummary() {
  return apiGet<DashboardSummary>("/dashboard/summary");
}

export function findBalanceGroup(
  summary: DashboardSummary,
  type: LedgerAccountType,
): DashboardBalanceGroup {
  return (
    summary.balancesByType.find((group) => group.type === type) ?? {
      type,
      total: 0,
      accountCount: 0,
      accounts: [],
    }
  );
}

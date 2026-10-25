"use client";

import { useEffect, useState } from "react";

import { describeFailure } from "@/lib/api-types";
import { browserApi } from "@/lib/browser-api";

// Mirrors InvoiceTotalsService in the backend's dashboard module: daily net
// totals of posted invoices; "own"-scoped users get their own.

export interface DailyTotal {
  /** YYYY-MM-DD */
  date: string;
  count: number;
  netTotal: number;
}

export interface InvoiceTotals {
  days: DailyTotal[];
  count: number;
  netTotal: number;
  /** /dashboard/sales only. */
  bySalesman?: { id: string; name: string; count: number; netTotal: number }[];
}

export type TotalsState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: InvoiceTotals };

/** GET /dashboard/sales | /dashboard/purchases for a date range. */
export function useInvoiceTotals(
  kind: "sales" | "purchases",
  dateFrom: string,
  dateTo: string,
): TotalsState {
  const path = `/dashboard/${kind}?${new URLSearchParams({ dateFrom, dateTo })}`;
  // The answer for the last path loaded; another path is still loading.
  const [loaded, setLoaded] = useState<{
    path: string;
    state: TotalsState;
  } | null>(null);
  useEffect(() => {
    let cancelled = false;
    void browserApi<InvoiceTotals>(path).then((result) => {
      if (cancelled) return;
      setLoaded({
        path,
        state: result.ok
          ? { status: "ready", data: result.data }
          : {
              status: "error",
              message:
                result.reason === "forbidden"
                  ? "You don't have permission to see these figures."
                  : describeFailure(result),
            },
      });
    });
    return () => {
      cancelled = true;
    };
  }, [path]);
  return loaded?.path === path ? loaded.state : { status: "loading" };
}

/** YYYY-MM-DD shifted by whole days (UTC calendar arithmetic). */
export function shiftDay(day: string, days: number): string {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

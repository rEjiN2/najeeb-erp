import "server-only";

import { Send } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { PERMISSIONS } from "@/features/auth/permissions";
import { getServerSession } from "@/features/auth/session";
import { formatCurrency } from "@/lib/format";

import { getUnsettledReceipts } from "./api";
import { CASH_HANDOVERS_PATH } from "./constants";

/**
 * For staff who settle with the office: what they still hold, and the way to
 * hand it over. Nothing for anyone else, or when the lookup fails.
 */
export async function UnsettledBanner() {
  const user = (await getServerSession())?.user;
  const staff = user?.linkedCashier;
  if (
    !user ||
    !staff ||
    staff.status !== "active" ||
    !staff.settlesWithOffice ||
    !user.permissions.includes(PERMISSIONS.CASH_HANDOVERS_CREATE)
  ) {
    return null;
  }

  // "Own"-scoped users may not name a staff id; the backend uses theirs.
  const result = await getUnsettledReceipts(
    user.dataScope === "own" ? null : staff.id,
  );
  if (!result.ok) return null;
  const { receipts, totals } = result.data;

  return (
    <div className="border-primary/30 bg-primary/5 flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center">
      <div className="flex-1 space-y-0.5">
        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          Not yet handed over
        </p>
        <p className="font-heading font-mono text-2xl font-semibold tabular-nums">
          {formatCurrency(totals.cash)}
        </p>
        <p className="text-muted-foreground text-sm">
          {receipts.length} receipt{receipts.length === 1 ? "" : "s"}
          {totals.bank > 0 ? ` · ${formatCurrency(totals.bank)} by bank` : ""}
        </p>
      </div>
      {receipts.length > 0 ? (
        <Link
          href={`${CASH_HANDOVERS_PATH}/new`}
          className={buttonVariants({ className: "w-full sm:w-auto" })}
        >
          <Send /> Submit handover
        </Link>
      ) : null}
    </div>
  );
}

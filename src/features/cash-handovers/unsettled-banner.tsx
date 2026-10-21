import "server-only";

import { Send } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { PERMISSIONS } from "@/features/auth/permissions";
import { getServerSession } from "@/features/auth/session";
import { formatAmount } from "@/lib/format";

import { getPendingCash } from "./api";
import { CASH_HANDOVERS_PATH } from "./constants";

/**
 * For users who settle with the office: the cash and cheques they still hold,
 * and the way to hand them over. Nothing for anyone else, or when the lookup
 * fails.
 */
export async function UnsettledBanner() {
  const user = (await getServerSession())?.user;
  if (
    !user ||
    !user.settlesWithOffice ||
    !user.permissions.includes(PERMISSIONS.CASH_HANDOVERS_CREATE)
  ) {
    return null;
  }

  const result = await getPendingCash(null);
  if (!result.ok) return null;
  const { accounts, totals, chequesTotal, bankReceiptsTotal } = result.data;
  const sum = (cheque: boolean) =>
    accounts
      .filter((account) => (account.type === "cheque") === cheque)
      .reduce((total, account) => total + (account.available ?? 0), 0);

  return (
    <div className="border-primary/30 bg-primary/5 flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center">
      <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-3">
        <div>
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Cash to hand over
          </p>
          <p className="font-mono text-xl font-semibold tabular-nums">
            {formatAmount(sum(false))}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Cheques
          </p>
          <p className="font-mono text-xl font-semibold tabular-nums">
            {formatAmount(sum(true) + chequesTotal)}
          </p>
        </div>
        {totals.submitted > 0 ? (
          <div>
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Pending approval
            </p>
            <p className="font-mono text-xl font-semibold tabular-nums">
              {formatAmount(totals.submitted)}
            </p>
          </div>
        ) : null}
      </div>
      {totals.available > 0 || chequesTotal > 0 || bankReceiptsTotal > 0 ? (
        <Link
          href={`${CASH_HANDOVERS_PATH}/new`}
          className={buttonVariants({ className: "w-full sm:w-auto" })}
        >
          <Send /> Hand over
        </Link>
      ) : null}
    </div>
  );
}

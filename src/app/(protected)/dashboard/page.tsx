import { ShieldX } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { StatePanel } from "@/components/master/state-panel";
import { homePath } from "@/config/nav";
import { PERMISSIONS } from "@/features/auth/permissions";

import {
  CashSummaryCard,
  CashSummaryCardSkeleton,
} from "@/features/dashboard/components/cash-summary-card";
import { IncomeExpenseCard } from "@/features/dashboard/components/income-expense-card";
import { PartyBalancesCard } from "@/features/dashboard/components/party-balances-card";
import { PurchaseAnalysisCard } from "@/features/dashboard/components/purchase-analysis-card";
import { SalesAnalysisCard } from "@/features/dashboard/components/sales-analysis-card";
import { SupplierBalancesCard } from "@/features/dashboard/components/supplier-balances-card";
import { getServerSession } from "@/features/auth/session";

export const metadata: Metadata = {
  title: "Dashboard | ALA Dates",
};

export default async function DashboardPage() {
  const session = await getServerSession();
  const permissions = session?.user.permissions ?? [];

  // Hidden from the menu without dashboard:view; send them somewhere useful.
  if (!permissions.includes(PERMISSIONS.DASHBOARD_VIEW)) {
    const home = homePath(permissions);
    if (home !== "/dashboard") redirect(home);
    return (
      <StatePanel icon={ShieldX} title="You don't have permission">
        Your role has no screens assigned yet. Ask an administrator for access.
      </StatePanel>
    );
  }

  // Company cash/bank totals and party balances need balances:view.
  const canViewBalances = permissions.includes(PERMISSIONS.BALANCES_VIEW);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold">
          Welcome back{session ? `, ${session.user.name}` : ""}
        </h1>
        <p className="text-muted-foreground text-sm">
          Here&apos;s how the business is tracking today.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className={canViewBalances ? "md:col-span-2" : "md:col-span-3"}>
          <IncomeExpenseCard />
        </div>
        {canViewBalances ? (
          <Suspense fallback={<CashSummaryCardSkeleton />}>
            <CashSummaryCard
              showCheques={permissions.includes(PERMISSIONS.CHEQUES_READ)}
            />
          </Suspense>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <PurchaseAnalysisCard />
        <SalesAnalysisCard />
      </div>

      {canViewBalances ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <PartyBalancesCard />
          <SupplierBalancesCard />
        </div>
      ) : null}
    </div>
  );
}

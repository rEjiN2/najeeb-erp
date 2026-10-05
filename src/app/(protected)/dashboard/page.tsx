import type { Metadata } from "next";
import { Suspense } from "react";

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
        <div className="md:col-span-2">
          <IncomeExpenseCard />
        </div>
        <Suspense fallback={<CashSummaryCardSkeleton />}>
          <CashSummaryCard />
        </Suspense>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <PurchaseAnalysisCard />
        <SalesAnalysisCard />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <PartyBalancesCard />
        <SupplierBalancesCard />
      </div>
    </div>
  );
}

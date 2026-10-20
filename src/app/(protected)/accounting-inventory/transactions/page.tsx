import { ArrowRightLeft, Banknote, HandCoins } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PERMISSIONS } from "@/features/auth/permissions";
import { getServerSession } from "@/features/auth/session";

export const metadata: Metadata = {
  title: "Transactions | ALA Dates",
};

const TRANSACTION_LINKS = [
  {
    href: "/accounting-inventory/transactions/cash-receipts",
    title: "Cash Receipts",
    description: "Record cash received against one or more party accounts.",
    icon: HandCoins,
    permission: PERMISSIONS.CASH_RECEIPTS_READ,
  },
  {
    href: "/accounting-inventory/transactions/cash-payments",
    title: "Cash Payments",
    description:
      "Record money paid to suppliers, customers and expenses, from cash or bank.",
    icon: Banknote,
    permission: PERMISSIONS.CASH_PAYMENTS_READ,
  },
  {
    href: "/accounting-inventory/transactions/cash-handovers",
    title: "Cash Handovers",
    description: "Staff hand collected cash over to the office for approval.",
    icon: ArrowRightLeft,
    permission: PERMISSIONS.CASH_HANDOVERS_READ,
  },
];

export default async function TransactionsPage() {
  const permissions = (await getServerSession())?.user.permissions ?? [];
  const links = TRANSACTION_LINKS.filter((link) =>
    permissions.includes(link.permission),
  );
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Transactions</h1>
        <p className="text-muted-foreground text-sm">
          Vouchers that move money, stock or both.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {links.map(({ href, title, description, icon: Icon }) => (
          <Link key={href} href={href}>
            <Card className="hover:bg-muted/50 transition-colors">
              <CardHeader className="flex-row items-center gap-3 space-y-0">
                <span className="bg-accent text-accent-foreground flex size-10 shrink-0 items-center justify-center rounded-lg">
                  <Icon className="size-5" />
                </span>
                <div>
                  <CardTitle>{title}</CardTitle>
                  <CardDescription>{description}</CardDescription>
                </div>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

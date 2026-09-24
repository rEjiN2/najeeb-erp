import { HandCoins } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Transactions | ALA Dates",
};

const TRANSACTION_LINKS = [
  {
    href: "/accounting-inventory/transactions/cash-receipt",
    title: "Cash Receipt",
    description: "Record cash received against one or more party accounts.",
    icon: HandCoins,
  },
];

export default function TransactionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Transactions</h1>
        <p className="text-muted-foreground text-sm">
          Vouchers that move money, stock or both.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {TRANSACTION_LINKS.map(({ href, title, description, icon: Icon }) => (
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

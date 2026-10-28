import {
  ArrowRightLeft,
  Banknote,
  Boxes,
  FileText,
  HandCoins,
  Landmark,
  PackagePlus,
  Receipt,
  ScrollText,
  Undo2,
} from "lucide-react";
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
    title: "Receipts",
    description:
      "Record cash, cheques and transfers received against party accounts.",
    icon: HandCoins,
    permission: PERMISSIONS.CASH_RECEIPTS_READ,
  },
  {
    href: "/accounting-inventory/transactions/reference-receipts",
    title: "Reference Receipts",
    description: "Plain receipt slips with their own CRV numbers.",
    icon: HandCoins,
    permission: PERMISSIONS.REFERENCE_RECEIPTS_READ,
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
    description: "Salesmen hand cash and cheques to the office for approval.",
    icon: ArrowRightLeft,
    permission: PERMISSIONS.CASH_HANDOVERS_READ,
  },
  {
    href: "/accounting-inventory/transactions/opening-balances",
    title: "Opening Balances",
    description: "Balances brought over from the old system, by hand or CSV.",
    icon: Landmark,
    permission: PERMISSIONS.OPENING_BALANCES_READ,
  },
  {
    href: "/accounting-inventory/transactions/purchase-invoices",
    title: "Purchase Invoices",
    description:
      "Supplier bills: stock in at a location, owed to the supplier.",
    icon: FileText,
    permission: PERMISSIONS.PURCHASE_INVOICES_READ,
  },
  {
    href: "/accounting-inventory/transactions/sales-invoices",
    title: "Sales Invoices",
    description:
      "Sales to customers: stock out of a location, paid now or owed.",
    icon: Receipt,
    permission: PERMISSIONS.SALES_INVOICES_READ,
  },
  {
    href: "/accounting-inventory/transactions/purchase-returns",
    title: "Purchase Returns",
    description: "Goods sent back to suppliers: stock out, debit note.",
    icon: Undo2,
    permission: PERMISSIONS.PURCHASE_RETURNS_READ,
  },
  {
    href: "/accounting-inventory/transactions/sales-returns",
    title: "Sales Returns",
    description: "Goods customers send back: stock in, credit note.",
    icon: Undo2,
    permission: PERMISSIONS.SALES_RETURNS_READ,
  },
  {
    href: "/accounting-inventory/transactions/opening-stock",
    title: "Opening Stock",
    description: "Stock on hand per location, brought over by hand or CSV.",
    icon: PackagePlus,
    permission: PERMISSIONS.OPENING_STOCK_READ,
  },
  {
    href: "/accounting-inventory/transactions/bundling",
    title: "Bundling",
    description: "Pack parts into bundles, or break bundles back into parts.",
    icon: Boxes,
    permission: PERMISSIONS.BUNDLING_READ,
  },
  {
    href: "/accounting-inventory/transactions/cheques",
    title: "Cheques",
    description: "Deposit, clear or return cheques received on receipts.",
    icon: ScrollText,
    permission: PERMISSIONS.CHEQUES_READ,
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

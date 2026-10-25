import { Paperclip } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatQty, historyHref } from "@/features/stock/constants";
import { BACKEND_PROXY_PATH } from "@/features/auth/constants";
import { formatAmount } from "@/lib/format";
import { cn } from "@/lib/utils";

import type { PurchaseInvoiceDetail } from "./api";
import type { PaymentStatus } from "./types";

const PAYMENT_LABELS: Record<PaymentStatus, string> = {
  unpaid: "Unpaid",
  partly_paid: "Partly paid",
  paid: "Paid",
};

/** Unpaid | Partly paid | Paid, plus Overdue when money is owed past the due day. */
export function PaymentStatusBadge({
  status,
  overdue,
}: {
  status: PaymentStatus;
  overdue: boolean;
}) {
  return (
    <>
      <Badge
        variant="outline"
        className={cn(
          status === "paid"
            ? "border-success/30 text-success"
            : "border-primary/40 text-primary",
        )}
      >
        {PAYMENT_LABELS[status]}
      </Badge>
      {overdue ? (
        <Badge
          variant="outline"
          className="border-destructive/30 text-destructive"
        >
          Overdue
        </Badge>
      ) : null}
    </>
  );
}

/** The view page's body: each product line, the totals and the supplier bill.
 * Sales invoices use it too (no bill files). */
export function PurchaseInvoiceLines({
  detail,
}: {
  detail: Pick<
    PurchaseInvoiceDetail,
    | "lines"
    | "locationId"
    | "grossTotal"
    | "totalDiscount"
    | "taxableTotal"
    | "totalTax"
    | "netTotal"
  > & { attachmentFileRefs?: string[] };
}) {
  const { lines } = detail;
  const totals = [
    ["Gross", detail.grossTotal],
    ["Discount", detail.totalDiscount],
    ["Taxable", detail.taxableTotal],
    ["Tax", detail.totalTax],
  ] as const;
  return (
    <>
      <Card className="gap-4">
        <CardHeader>
          <CardTitle>Products ({lines.length})</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table className="min-w-[760px]">
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead className="text-right">Discount</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">VAT</TableHead>
                <TableHead className="text-right">Net</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((line, index) => (
                <TableRow key={`${line.productId}-${index}`}>
                  <TableCell>
                    {line.name ? (
                      <Link
                        href={historyHref(line.productId, detail.locationId)}
                        className="hover:underline"
                      >
                        {line.name}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground italic">
                        Unknown product
                      </span>
                    )}
                    <span className="text-muted-foreground block font-mono text-xs">
                      {line.code}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {formatQty(line.qty)}{" "}
                    <span className="text-muted-foreground">{line.unit}</span>
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {line.rate}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {formatAmount(line.discount)}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {formatAmount(line.amount)}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {formatAmount(line.vat)}
                    <span className="text-muted-foreground block text-xs">
                      {line.vatRate}%
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {formatAmount(line.netAmount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              {totals.map(([label, value]) => (
                <TableRow key={label}>
                  <TableCell colSpan={6} className="text-right">
                    {label}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {formatAmount(value)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell colSpan={6} className="text-right font-semibold">
                  Net Total (AED)
                </TableCell>
                <TableCell className="text-right font-mono font-semibold tabular-nums">
                  {formatAmount(detail.netTotal)}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>

      {detail.attachmentFileRefs?.length ? (
        <Card className="gap-4">
          <CardHeader>
            <CardTitle>Supplier bill</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {detail.attachmentFileRefs.map((fileId, index) => (
              <a
                key={fileId}
                href={`${BACKEND_PROXY_PATH}/files/${encodeURIComponent(fileId)}`}
                target="_blank"
                rel="noopener"
                className="hover:bg-muted inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm"
              >
                <Paperclip className="size-4" /> Attachment {index + 1}
              </a>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </>
  );
}

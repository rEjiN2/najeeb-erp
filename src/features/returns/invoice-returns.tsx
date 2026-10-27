import { Plus } from "lucide-react";
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { VoucherStatusBadge } from "@/components/voucher/voucher-status-badge";
import { formatCalendarDate } from "@/lib/datetime";
import { formatAmount } from "@/lib/format";

import { newReturnPath, returnPath } from "./constants";
import type { InvoiceReturn, ReturnKind } from "./types";

/** The invoice view's Returns card: its returns and "Create return". */
export function InvoiceReturns({
  kind,
  invoiceId,
  returns,
  canCreate,
}: {
  kind: ReturnKind;
  invoiceId: string;
  returns: InvoiceReturn[];
  /** Posted invoice with quantity left, and the user may create returns. */
  canCreate: boolean;
}) {
  return (
    <Card className="gap-4">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Returns ({returns.length})</CardTitle>
        {canCreate ? (
          <Link
            href={newReturnPath(kind, invoiceId)}
            className={buttonVariants({ variant: "outline" })}
          >
            <Plus /> Create return
          </Link>
        ) : null}
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {returns.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Nothing has been returned on this invoice.
          </p>
        ) : (
          <Table className="min-w-[520px]">
            <TableHeader>
              <TableRow>
                <TableHead>Return</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead className="text-right">Net total</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {returns.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <Link
                      href={returnPath(kind, row.id)}
                      className="font-mono text-sm font-medium hover:underline"
                    >
                      {row.voucherNo}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm whitespace-nowrap">
                    {formatCalendarDate(row.voucherDate)}
                  </TableCell>
                  <TableCell className="text-sm">{row.reason}</TableCell>
                  <TableCell className="text-right font-mono text-sm tabular-nums">
                    {formatAmount(row.netTotal)}
                  </TableCell>
                  <TableCell>
                    <VoucherStatusBadge status={row.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

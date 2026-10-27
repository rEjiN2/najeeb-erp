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
import { formatQty } from "@/features/stock/constants";
import { formatAmount } from "@/lib/format";

import type { ReturnDetail } from "./api";
import { RETURN_KINDS } from "./constants";
import type { ReturnKind } from "./types";

/** The return view's body: each returned line, the totals and the reason. */
export function ReturnLines({
  kind,
  detail,
}: {
  kind: ReturnKind;
  detail: ReturnDetail;
}) {
  const showRestock = RETURN_KINDS[kind].restock;
  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle>Returned products ({detail.lines.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 overflow-x-auto">
        <Table className="min-w-[640px]">
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              {showRestock ? <TableHead>Stock</TableHead> : null}
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">VAT</TableHead>
              <TableHead className="text-right">Net</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {detail.lines.map((line) => (
              <TableRow key={line.invoiceLineId}>
                <TableCell>
                  {line.name ?? (
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
                {showRestock ? (
                  <TableCell>
                    <Badge variant="outline">
                      {line.restock ? "Restocked" : "Not restocked"}
                    </Badge>
                  </TableCell>
                ) : null}
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
            <TableRow>
              <TableCell colSpan={showRestock ? 5 : 4} className="text-right">
                Taxable
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums">
                {formatAmount(detail.taxableTotal)}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell colSpan={showRestock ? 5 : 4} className="text-right">
                Tax
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums">
                {formatAmount(detail.totalTax)}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell
                colSpan={showRestock ? 5 : 4}
                className="text-right font-semibold"
              >
                Net Total (AED)
              </TableCell>
              <TableCell className="text-right font-mono font-semibold tabular-nums">
                {formatAmount(detail.netTotal)}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
        <p className="text-sm">
          <span className="text-muted-foreground">Reason: </span>
          {detail.voucher.comments}
        </p>
      </CardContent>
    </Card>
  );
}

import Link from "next/link";

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
import { formatAmount } from "@/lib/format";

import type { OpeningStockDetail } from "./api";

/** The view page's lines: each product's quantity and unit cost. */
export function OpeningStockLines({
  detail,
}: {
  detail: Pick<OpeningStockDetail, "lines" | "totalQty" | "locationId">;
}) {
  const { lines } = detail;
  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle>Products ({lines.length})</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Unit cost</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.map((line) => (
              <TableRow key={line.productId}>
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
                  {line.unitCost !== null ? (
                    formatAmount(line.unitCost)
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell className="font-medium">Total quantity</TableCell>
              <TableCell className="text-right font-mono font-semibold tabular-nums">
                {formatQty(detail.totalQty)}
              </TableCell>
              <TableCell />
            </TableRow>
          </TableFooter>
        </Table>
      </CardContent>
    </Card>
  );
}

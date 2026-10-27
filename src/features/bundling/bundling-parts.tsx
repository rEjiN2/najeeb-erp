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

import type { BundlingDetail } from "./types";

/** The view page's body: the recipe as it was when posted, the parts moved
 * and (with products:view-cost) the cost per bundle. */
export function BundlingParts({ detail }: { detail: BundlingDetail }) {
  const { components, extraCostPerUnit } = detail.recipeSnapshot;
  const showCost = detail.costPerUnit !== undefined;
  const direction = detail.mode === "bundle" ? "Used" : "Returned";
  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle>Parts ({components.length})</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Part</TableHead>
              <TableHead className="text-right">Per bundle</TableHead>
              <TableHead className="text-right">{direction}</TableHead>
              {showCost ? (
                <TableHead className="text-right">Unit cost</TableHead>
              ) : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {components.map((part) => (
              <TableRow key={part.productId}>
                <TableCell>
                  {part.productName ? (
                    <Link
                      href={historyHref(part.productId, detail.location.id)}
                      className="hover:underline"
                    >
                      {part.productName}
                    </Link>
                  ) : (
                    <span className="text-muted-foreground italic">
                      Unknown product
                    </span>
                  )}
                  <span className="text-muted-foreground block font-mono text-xs">
                    {part.productCode}
                  </span>
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {formatQty(part.qty)}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {formatQty(part.totalQty)}
                </TableCell>
                {showCost ? (
                  <TableCell className="text-right font-mono tabular-nums">
                    {part.unitCost !== undefined
                      ? formatAmount(part.unitCost)
                      : "—"}
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
          </TableBody>
          {showCost ? (
            <TableFooter>
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="text-muted-foreground text-right"
                >
                  Extra cost per bundle
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {formatAmount(extraCostPerUnit ?? 0)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell colSpan={3} className="text-right font-medium">
                  Cost per bundle
                </TableCell>
                <TableCell className="text-right font-mono font-semibold tabular-nums">
                  {formatAmount(detail.costPerUnit ?? 0)}
                </TableCell>
              </TableRow>
            </TableFooter>
          ) : null}
        </Table>
        {detail.mode === "bundle" ? (
          <p className="text-muted-foreground mt-3 text-xs">
            {detail.updateBundlePurchasePrice
              ? "The bundle's purchase price was set to this cost."
              : "The bundle's purchase price was left as it was."}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

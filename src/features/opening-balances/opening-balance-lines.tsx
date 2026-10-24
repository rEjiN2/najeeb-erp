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
import { ACCOUNT_TYPE_BADGES } from "@/features/vouchers/constants";
import { formatAmount } from "@/lib/format";

import type { OpeningBalanceDetail } from "./api";

const amount = (value: number) =>
  value ? (
    formatAmount(value)
  ) : (
    <span className="text-muted-foreground">—</span>
  );

/** The view page's lines: each account's Dr or Cr, then the equity line. */
export function OpeningBalanceLines({
  detail,
}: {
  detail: Pick<
    OpeningBalanceDetail,
    "lines" | "equity" | "totalDebit" | "totalCredit"
  >;
}) {
  const { lines, equity } = detail;
  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle>Accounts ({lines.length})</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Account</TableHead>
              <TableHead className="text-right">Debit</TableHead>
              <TableHead className="text-right">Credit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.map((line) => (
              <TableRow key={line.accountId}>
                <TableCell>
                  <span className="flex flex-wrap items-center gap-2">
                    {line.name ?? (
                      <span className="text-muted-foreground italic">
                        Unknown account
                      </span>
                    )}
                    {line.type ? (
                      <Badge variant="secondary" className="font-normal">
                        {ACCOUNT_TYPE_BADGES[line.type] ?? line.type}
                      </Badge>
                    ) : null}
                  </span>
                  <span className="text-muted-foreground font-mono text-xs">
                    {line.code}
                  </span>
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {amount(line.debit)}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {amount(line.credit)}
                </TableCell>
              </TableRow>
            ))}
            <TableRow className="bg-muted/40">
              <TableCell>
                {equity.name ?? "Opening Balance Equity"}
                <span className="text-muted-foreground block text-xs">
                  Auto: balances the difference
                </span>
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums">
                {amount(equity.debit)}
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums">
                {amount(equity.credit)}
              </TableCell>
            </TableRow>
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell className="font-medium">Total</TableCell>
              <TableCell className="text-right font-mono font-semibold tabular-nums">
                {formatAmount(detail.totalDebit + equity.debit)}
              </TableCell>
              <TableCell className="text-right font-mono font-semibold tabular-nums">
                {formatAmount(detail.totalCredit + equity.credit)}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </CardContent>
    </Card>
  );
}

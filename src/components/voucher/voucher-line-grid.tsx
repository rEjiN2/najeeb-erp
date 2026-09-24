import { Trash2 } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface VoucherColumn<TLine> {
  key: string;
  header: string;
  className?: string;
  render: (
    line: TLine,
    helpers: { update: (patch: Partial<TLine>) => void },
  ) => ReactNode;
}

interface VoucherLineGridProps<TLine extends { id: string }> {
  columns: VoucherColumn<TLine>[];
  lines: TLine[];
  onUpdateLine: (id: string, patch: Partial<TLine>) => void;
  onRemoveLine: (id: string) => void;
  /**
   * The account picker that turns into a new line once something is
   * selected — rendered as the grid's trailing "add a line" row, so the
   * grid grows the same way it will need to for any future voucher type.
   */
  addRowControl: ReactNode;
  emptyMessage?: string;
}

export function VoucherLineGrid<TLine extends { id: string }>({
  columns,
  lines,
  onUpdateLine,
  onRemoveLine,
  addRowControl,
  emptyMessage = "No lines yet — pick an account below to add one.",
}: VoucherLineGridProps<TLine>) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column.key} className={column.className}>
                {column.header}
              </TableHead>
            ))}
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {lines.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columns.length + 1}
                className="text-muted-foreground h-20 text-center text-sm"
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            lines.map((line) => (
              <TableRow key={line.id}>
                {columns.map((column) => (
                  <TableCell key={column.key} className={column.className}>
                    {column.render(line, {
                      update: (patch) => onUpdateLine(line.id, patch),
                    })}
                  </TableCell>
                ))}
                <TableCell>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Remove line"
                    onClick={() => onRemoveLine(line.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
          <TableRow className="bg-muted/30 hover:bg-muted/30">
            <TableCell colSpan={columns.length + 1}>{addRowControl}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}

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
  /** Omit (with onRemoveLine and addRowControl) for a read-only grid. */
  onUpdateLine?: (id: string, patch: Partial<TLine>) => void;
  onRemoveLine?: (id: string) => void;
  /**
   * The account picker that turns into a new line once something is
   * selected — rendered as the grid's trailing "add a line" row, so the
   * grid grows the same way it will need to for any future voucher type.
   */
  addRowControl?: ReactNode;
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
  const editable = Boolean(onRemoveLine);
  const span = columns.length + (editable ? 1 : 0);

  return (
    <div className="bg-card overflow-x-auto rounded-lg border">
      <Table className="min-w-[860px]">
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column.key} className={column.className}>
                {column.header}
              </TableHead>
            ))}
            {editable ? <TableHead className="w-10" /> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {lines.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={span}
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
                      update: (patch) => onUpdateLine?.(line.id, patch),
                    })}
                  </TableCell>
                ))}
                {onRemoveLine ? (
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
                ) : null}
              </TableRow>
            ))
          )}
          {addRowControl ? (
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableCell colSpan={span}>{addRowControl}</TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
    </div>
  );
}

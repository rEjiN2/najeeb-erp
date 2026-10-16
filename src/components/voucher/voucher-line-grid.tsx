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

  const [titleColumn, ...detailColumns] = columns;

  return (
    <>
      {/* Phone: one card per line — the first column is its title, the rest
        stack as label/value rows. */}
      <div className="bg-card divide-y rounded-lg border md:hidden">
        {lines.length === 0 ? (
          <p className="text-muted-foreground p-4 text-center text-sm">
            {emptyMessage}
          </p>
        ) : (
          lines.map((line) => {
            const update = (patch: Partial<TLine>) =>
              onUpdateLine?.(line.id, patch);
            return (
              <div key={line.id} className="space-y-2 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 pt-1 text-sm">
                    {titleColumn?.render(line, { update })}
                  </div>
                  {onRemoveLine ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Remove line"
                      onClick={() => onRemoveLine(line.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  ) : null}
                </div>
                <dl className="space-y-2">
                  {detailColumns.map((column) => (
                    <div
                      key={column.key}
                      className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-2"
                    >
                      <dt className="text-muted-foreground text-xs">
                        {column.header}
                      </dt>
                      <dd className="min-w-0 text-right text-sm [&_input]:w-full [&_input]:min-w-0">
                        {column.render(line, { update })}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            );
          })
        )}
        {addRowControl ? (
          <div className="bg-muted/30 p-3 [&>div]:max-w-none">
            {addRowControl}
          </div>
        ) : null}
      </div>

      <div className="bg-card hidden overflow-x-auto rounded-lg border md:block">
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
    </>
  );
}

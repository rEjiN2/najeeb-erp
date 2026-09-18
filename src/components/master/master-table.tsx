"use client";

import { ChevronRight, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { FlattenedNode } from "@/lib/tree";
import { cn } from "@/lib/utils";

export interface MasterColumn<T> {
  key: string;
  header: string;
  render: (item: T) => ReactNode;
  className?: string;
}

interface MasterTableProps<T> {
  columns: MasterColumn<T>[];
  rows: FlattenedNode<T>[];
  getId: (item: T) => string;
  collapsedIds: ReadonlySet<string>;
  onToggleExpand: (id: string) => void;
  onEdit: (item: T) => void;
  onDelete: (item: T) => void;
  /** Non-null return disables delete for that row and becomes its tooltip. */
  deleteDisabledReason?: (item: T, hasChildren: boolean) => string | null;
  emptyMessage?: string;
}

export function MasterTable<T>({
  columns,
  rows,
  getId,
  collapsedIds,
  onToggleExpand,
  onEdit,
  onDelete,
  deleteDisabledReason,
  emptyMessage = "No records found.",
}: MasterTableProps<T>) {
  const [firstColumn, ...restColumns] = columns;

  if (rows.length === 0) {
    return (
      <div className="text-muted-foreground flex min-h-40 items-center justify-center rounded-lg border border-dashed text-sm">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            {firstColumn ? <TableHead>{firstColumn.header}</TableHead> : null}
            {restColumns.map((column) => (
              <TableHead key={column.key} className={column.className}>
                {column.header}
              </TableHead>
            ))}
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(({ item, depth, hasChildren }) => {
            const id = getId(item);
            const collapsed = collapsedIds.has(id);
            const disabledReason =
              deleteDisabledReason?.(item, hasChildren) ?? null;

            return (
              <TableRow key={id}>
                {firstColumn ? (
                  <TableCell>
                    <div
                      className="flex items-center gap-1.5"
                      style={
                        depth
                          ? { paddingLeft: `${depth * 1.25}rem` }
                          : undefined
                      }
                    >
                      {hasChildren ? (
                        <button
                          type="button"
                          onClick={() => onToggleExpand(id)}
                          aria-label={collapsed ? "Expand" : "Collapse"}
                          className="text-muted-foreground hover:bg-muted hover:text-foreground flex size-5 shrink-0 items-center justify-center rounded-sm"
                        >
                          <ChevronRight
                            className={cn(
                              "size-3.5 transition-transform",
                              !collapsed && "rotate-90",
                            )}
                          />
                        </button>
                      ) : (
                        <span className="size-5 shrink-0" aria-hidden />
                      )}
                      {firstColumn.render(item)}
                    </div>
                  </TableCell>
                ) : null}
                {restColumns.map((column) => (
                  <TableCell key={column.key} className={column.className}>
                    {column.render(item)}
                  </TableCell>
                ))}
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Row actions"
                        >
                          <MoreHorizontal className="size-4" />
                        </Button>
                      }
                    />
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(item)}>
                        <Pencil /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        disabled={Boolean(disabledReason)}
                        title={disabledReason ?? undefined}
                        onClick={() => onDelete(item)}
                      >
                        <Trash2 /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

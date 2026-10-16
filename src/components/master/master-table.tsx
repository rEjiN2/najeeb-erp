"use client";

import {
  ChevronRight,
  Lock,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
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

/**
 * Indent guides drawn before a row; deeper rows share the last guide and show
 * a "+n" marker, so the name column never gets squeezed off-screen however
 * deep a branch goes.
 */
const MAX_INDENT_GUIDES = 8;

function TreeIndent({ depth }: { depth: number }) {
  const guides = Math.min(depth, MAX_INDENT_GUIDES);
  const overflow = depth - guides;

  return (
    <>
      {Array.from({ length: guides }, (_, level) => (
        <span
          key={level}
          aria-hidden
          className="before:border-border relative -my-2 w-5 shrink-0 self-stretch before:absolute before:inset-y-0 before:left-2.5 before:border-l"
        />
      ))}
      {overflow > 0 ? (
        <span
          className="text-muted-foreground mr-0.5 text-xs tabular-nums"
          title={`${depth + 1} levels deep`}
        >
          +{overflow}
        </span>
      ) : null}
    </>
  );
}

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
  /** More row-menu items (DropdownMenuItem) between Edit and Delete. */
  extraActions?: (item: T) => ReactNode;
  /** false hides Edit and Delete (e.g. no permission) but keeps extraActions. */
  canModify?: boolean;
  /** Non-null return makes the row read-only: no actions, this note instead
   * (e.g. records owned by another module). */
  readOnlyNote?: (item: T) => string | null;
  /** Fresh rows are loading (e.g. after a filter change) — dims the table. */
  busy?: boolean;
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
  readOnlyNote,
  extraActions,
  canModify = true,
  busy = false,
  emptyMessage = "No records found.",
}: MasterTableProps<T>) {
  const [firstColumn, ...restColumns] = columns;
  // Flat lists get no expander gutter.
  const isTree = rows.some((row) => row.depth > 0 || row.hasChildren);

  if (rows.length === 0) {
    return (
      <div
        aria-busy={busy}
        className={cn(
          "text-muted-foreground flex min-h-40 items-center justify-center rounded-lg border border-dashed text-sm transition-opacity",
          busy && "opacity-60",
        )}
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <div
      aria-busy={busy}
      className={cn(
        "overflow-hidden rounded-lg border transition-opacity",
        busy && "pointer-events-none opacity-60",
      )}
    >
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
          {rows.map(({ item, depth, hasChildren, childCount }) => {
            const id = getId(item);
            const collapsed = collapsedIds.has(id);
            const disabledReason =
              deleteDisabledReason?.(item, hasChildren) ?? null;
            const lockedNote = readOnlyNote?.(item) ?? null;

            return (
              <TableRow key={id}>
                {firstColumn ? (
                  <TableCell>
                    <div className="flex items-center">
                      <TreeIndent depth={depth} />
                      {hasChildren ? (
                        <button
                          type="button"
                          onClick={() => onToggleExpand(id)}
                          aria-label={collapsed ? "Expand" : "Collapse"}
                          aria-expanded={!collapsed}
                          className="text-muted-foreground hover:bg-muted hover:text-foreground mr-1.5 flex size-5 shrink-0 items-center justify-center rounded-sm"
                        >
                          <ChevronRight
                            className={cn(
                              "size-3.5 transition-transform",
                              !collapsed && "rotate-90",
                            )}
                          />
                        </button>
                      ) : isTree ? (
                        <span className="mr-1.5 size-5 shrink-0" aria-hidden />
                      ) : null}
                      {firstColumn.render(item)}
                      {hasChildren && collapsed ? (
                        <span
                          className="bg-muted text-muted-foreground ml-2 rounded-full px-1.5 text-xs tabular-nums"
                          title={`${childCount} hidden below`}
                        >
                          {childCount}
                        </span>
                      ) : null}
                    </div>
                  </TableCell>
                ) : null}
                {restColumns.map((column) => (
                  <TableCell key={column.key} className={column.className}>
                    {column.render(item)}
                  </TableCell>
                ))}
                <TableCell className="text-right">
                  {lockedNote ? (
                    <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
                      <Lock className="size-3" /> {lockedNote}
                    </span>
                  ) : (
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
                        {canModify ? (
                          <DropdownMenuItem onClick={() => onEdit(item)}>
                            <Pencil /> Edit
                          </DropdownMenuItem>
                        ) : null}
                        {extraActions?.(item)}
                        {canModify ? (
                          <DropdownMenuItem
                            variant="destructive"
                            disabled={Boolean(disabledReason)}
                            title={disabledReason ?? undefined}
                            onClick={() => onDelete(item)}
                          >
                            <Trash2 /> Delete
                          </DropdownMenuItem>
                        ) : null}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

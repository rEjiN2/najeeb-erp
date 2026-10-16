"use client";

import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Ban,
  Eye,
  History,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Printer,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { RelativeTime } from "@/components/shared/relative-time";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import { VoucherStatusBadge } from "@/components/voucher/voucher-status-badge";
import { formatCalendarDate } from "@/lib/datetime";
import { formatAmount } from "@/lib/format";
import { cn } from "@/lib/utils";

import { cashReceiptPath, editCashReceiptPath } from "../constants";
import type { CashReceiptFilters, SortField } from "../filters";
import type { CashReceiptListRow, UserRef } from "../types";

interface ReceiptsTableProps {
  rows: CashReceiptListRow[];
  filters: CashReceiptFilters;
  onSort: (field: SortField) => void;
  canManage: boolean;
  onPrint: (row: CashReceiptListRow) => void;
  onActivity: (row: CashReceiptListRow) => void;
  onCancel: (row: CashReceiptListRow) => void;
  busy: boolean;
}

const NO_PERMISSION = "You don't have permission to manage cash receipts";

function SortableHead({
  field,
  filters,
  onSort,
  className,
  children,
}: {
  field: SortField;
  filters: CashReceiptFilters;
  onSort: (field: SortField) => void;
  className?: string;
  children: ReactNode;
}) {
  const active = filters.sortBy === field;
  const Icon = !active
    ? ArrowUpDown
    : filters.sortDir === "asc"
      ? ArrowUp
      : ArrowDown;

  return (
    <TableHead
      className={className}
      aria-sort={
        active
          ? filters.sortDir === "asc"
            ? "ascending"
            : "descending"
          : undefined
      }
    >
      <button
        type="button"
        onClick={() => onSort(field)}
        className={cn(
          "hover:text-foreground -mx-1 inline-flex items-center gap-1 rounded px-1 py-0.5",
          active && "text-foreground",
        )}
      >
        {children}
        <Icon className={cn("size-3.5", !active && "opacity-40")} />
      </button>
    </TableHead>
  );
}

function WhoWhen({
  user,
  at,
  emptyLabel,
}: {
  user: UserRef | null;
  at: string | null;
  emptyLabel: string;
}) {
  if (!user) {
    return <span className="text-muted-foreground text-sm">{emptyLabel}</span>;
  }
  return (
    <div className="min-w-0 text-sm leading-tight">
      <p className="truncate font-medium">{user.name}</p>
      {at ? (
        <RelativeTime value={at} className="text-muted-foreground text-xs" />
      ) : null}
    </div>
  );
}

export function ReceiptsTable({
  rows,
  filters,
  onSort,
  canManage,
  onPrint,
  onActivity,
  onCancel,
  busy,
}: ReceiptsTableProps) {
  const router = useRouter();

  return (
    <div
      aria-busy={busy}
      className={cn(
        "bg-card overflow-x-auto rounded-lg border transition-opacity",
        busy && "pointer-events-none opacity-60",
      )}
    >
      <Table className="min-w-[1200px]">
        <TableHeader>
          <TableRow>
            <SortableHead field="voucherNo" filters={filters} onSort={onSort}>
              Voucher No
            </SortableHead>
            <SortableHead field="date" filters={filters} onSort={onSort}>
              Date
            </SortableHead>
            <TableHead>Cash Account</TableHead>
            <TableHead>Cashier</TableHead>
            <TableHead>Received From</TableHead>
            <SortableHead
              field="amount"
              filters={filters}
              onSort={onSort}
              className="text-right"
            >
              Amount
            </SortableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created by</TableHead>
            <TableHead>Last updated by</TableHead>
            <TableHead className="text-center">Comments</TableHead>
            <TableHead className="w-10">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const viewHref = cashReceiptPath(row.id);
            const isPosted = row.status === "posted";
            const first = row.partiesSummary.firstAccount;

            return (
              <TableRow
                key={row.id}
                onClick={() => router.push(viewHref)}
                className={cn(
                  "cursor-pointer",
                  !isPosted && "text-muted-foreground",
                )}
              >
                <TableCell>
                  <Link
                    href={viewHref}
                    onClick={(event) => event.stopPropagation()}
                    className="font-mono text-sm font-medium hover:underline"
                  >
                    {row.voucherNo}
                  </Link>
                </TableCell>
                <TableCell className="text-sm whitespace-nowrap">
                  {formatCalendarDate(row.date)}
                </TableCell>
                <TableCell className="max-w-48 truncate text-sm">
                  {row.cashAccount.name ?? (
                    <span className="text-muted-foreground italic">
                      Unknown account
                    </span>
                  )}
                </TableCell>
                <TableCell className="max-w-40 truncate text-sm">
                  {row.cashier.name ? (
                    <span
                      title={
                        row.cashier.id
                          ? undefined
                          : "Entered before cashiers were set up"
                      }
                      className={cn(!row.cashier.id && "italic")}
                    >
                      {row.cashier.name}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="max-w-56 text-sm">
                  {first ? (
                    <span className="flex items-center gap-1.5">
                      <span className="truncate">
                        {first.name ?? (
                          <span className="text-muted-foreground italic">
                            Unknown account
                          </span>
                        )}
                      </span>
                      {row.partiesSummary.othersCount > 0 ? (
                        <span className="bg-muted text-muted-foreground shrink-0 rounded-full px-1.5 text-xs whitespace-nowrap">
                          +{row.partiesSummary.othersCount} more
                        </span>
                      ) : null}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell
                  className={cn(
                    "text-right font-mono text-sm font-medium tabular-nums",
                    !isPosted && "line-through",
                  )}
                >
                  {formatAmount(row.grandTotal)}
                </TableCell>
                <TableCell>
                  <VoucherStatusBadge status={row.status} />
                </TableCell>
                <TableCell className="max-w-40">
                  <WhoWhen
                    user={row.createdBy}
                    at={row.createdAt}
                    emptyLabel="Unknown"
                  />
                </TableCell>
                <TableCell className="max-w-40">
                  <WhoWhen
                    user={row.updatedBy}
                    at={row.updatedAt}
                    emptyLabel="—"
                  />
                </TableCell>
                <TableCell className="text-center">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onActivity(row);
                    }}
                    aria-label={`${row.commentCount} comments — open activity`}
                    className={cn(
                      "hover:bg-muted inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-sm tabular-nums",
                      row.commentCount === 0 && "text-muted-foreground",
                    )}
                  >
                    <MessageSquare className="size-3.5" />
                    {row.commentCount}
                  </button>
                </TableCell>
                <TableCell
                  className="text-right"
                  onClick={(event) => event.stopPropagation()}
                >
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Actions for ${row.voucherNo}`}
                        >
                          <MoreHorizontal className="size-4" />
                        </Button>
                      }
                    />
                    <DropdownMenuContent align="end" className="w-52">
                      <DropdownMenuItem onClick={() => router.push(viewHref)}>
                        <Eye /> View
                      </DropdownMenuItem>
                      {isPosted ? (
                        <DropdownMenuItem
                          disabled={!canManage}
                          title={canManage ? undefined : NO_PERMISSION}
                          onClick={() =>
                            router.push(editCashReceiptPath(row.id))
                          }
                        >
                          <Pencil /> Edit
                        </DropdownMenuItem>
                      ) : null}
                      <DropdownMenuItem onClick={() => onPrint(row)}>
                        <Printer /> Print
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onActivity(row)}>
                        <History /> Activity &amp; Comments
                      </DropdownMenuItem>
                      {isPosted ? (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            disabled={!canManage}
                            title={canManage ? undefined : NO_PERMISSION}
                            onClick={() => onCancel(row)}
                          >
                            <Ban /> Cancel receipt
                          </DropdownMenuItem>
                        </>
                      ) : null}
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

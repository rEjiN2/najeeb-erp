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
import {
  VoucherStatusBadge,
  isVoidStatus,
} from "@/components/voucher/voucher-status-badge";
import { ChequeStatusBadge } from "@/features/cheques/cheque-status-badge";
import { PaymentMethodBadge } from "../payment-method-badge";
import { formatCalendarDate } from "@/lib/datetime";
import { formatAmount } from "@/lib/format";
import { cn } from "@/lib/utils";

import { editVoucherPath, voucherPath, type VoucherConfig } from "../config";
import type { SortField, VoucherFilters } from "../filters";
import type { UserRef, VoucherListRow } from "../types";

interface VouchersTableProps {
  config: VoucherConfig;
  rows: VoucherListRow[];
  filters: VoucherFilters;
  onSort: (field: SortField) => void;
  /** Without the permission the action is left out of the menu. */
  canEdit: boolean;
  canCancel: boolean;
  onPrint: (row: VoucherListRow) => void;
  onActivity: (row: VoucherListRow) => void;
  onCancel: (row: VoucherListRow) => void;
  busy: boolean;
}

function SortableHead({
  field,
  filters,
  onSort,
  className,
  children,
}: {
  field: SortField;
  filters: VoucherFilters;
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

function RowActions({
  config,
  row,
  canEdit,
  canCancel,
  onPrint,
  onActivity,
  onCancel,
}: Pick<
  VouchersTableProps,
  "config" | "canEdit" | "canCancel" | "onPrint" | "onActivity" | "onCancel"
> & { row: VoucherListRow }) {
  const router = useRouter();
  const isPosted = !isVoidStatus(row.status);
  const viewHref = voucherPath(config, row.id);

  return (
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
        {isPosted && canEdit ? (
          <DropdownMenuItem
            onClick={() => router.push(editVoucherPath(config, row.id))}
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
        {isPosted && canCancel ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => onCancel(row)}
            >
              <Ban /> Cancel {config.noun}
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function CounterpartyText({ row }: { row: VoucherListRow }) {
  const first = row.partiesSummary.firstAccount;
  if (!first) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <span className="truncate">
        {first.name ?? (
          <span className="text-muted-foreground italic">Unknown account</span>
        )}
      </span>
      {row.partiesSummary.othersCount > 0 ? (
        <span className="bg-muted text-muted-foreground shrink-0 rounded-full px-1.5 text-xs whitespace-nowrap">
          +{row.partiesSummary.othersCount} more
        </span>
      ) : null}
    </span>
  );
}

/** Phone layout: one card per voucher, the essentials only. */
function VoucherCards(props: VouchersTableProps) {
  const { config, rows, busy } = props;
  const router = useRouter();

  return (
    <ul
      aria-busy={busy}
      className={cn(
        "space-y-2 transition-opacity md:hidden",
        busy && "pointer-events-none opacity-60",
      )}
    >
      {rows.map((row) => {
        const viewHref = voucherPath(config, row.id);
        const isPosted = !isVoidStatus(row.status);
        return (
          <li
            key={row.id}
            onClick={() => router.push(viewHref)}
            className={cn(
              "bg-card cursor-pointer space-y-2 rounded-lg border p-3",
              !isPosted && "text-muted-foreground",
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <Link
                  href={viewHref}
                  onClick={(event) => event.stopPropagation()}
                  className="font-mono text-sm font-medium hover:underline"
                >
                  {row.voucherNo}
                </Link>
                <p className="text-muted-foreground text-xs">
                  {formatCalendarDate(row.date)}
                  {row.collectedBy.name ? ` · ${row.collectedBy.name}` : ""}
                </p>
              </div>
              <div
                className="flex shrink-0 items-center gap-1"
                onClick={(event) => event.stopPropagation()}
              >
                <VoucherStatusBadge status={row.status} />
                <RowActions {...props} row={row} />
              </div>
            </div>
            <div className="flex items-end justify-between gap-3 text-sm">
              <div className="min-w-0 space-y-0.5">
                <CounterpartyText row={row} />
                <p className="text-muted-foreground truncate text-xs">
                  {config.copy.headerLabel}:{" "}
                  {row.headerAccount.name ?? "Unknown account"}
                </p>
              </div>
              <span
                className={cn(
                  "shrink-0 font-mono font-semibold tabular-nums",
                  !isPosted && "line-through",
                )}
              >
                {formatAmount(row.grandTotal)}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function VouchersTable(props: VouchersTableProps) {
  const { config, rows, filters, onSort, onActivity, busy } = props;
  const router = useRouter();
  const showMethod = config.showPaymentDetails || config.methodSelector;
  // Receipts' Cheque tab: the cheque's own details.
  const chequeColumns = config.methodSelector && filters.method === "cheque";

  return (
    <>
      <VoucherCards {...props} />
      <div
        aria-busy={busy}
        className={cn(
          "bg-card hidden overflow-x-auto rounded-lg border transition-opacity md:block",
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
              <TableHead>{config.copy.headerLabel}</TableHead>
              <TableHead>{config.copy.collectorLabel}</TableHead>
              <TableHead>{config.copy.counterpartyLabel}</TableHead>
              {chequeColumns ? (
                <>
                  <TableHead>Cheque No</TableHead>
                  <TableHead>Cheque Date</TableHead>
                  <TableHead>Bank</TableHead>
                  <TableHead>Cheque Status</TableHead>
                </>
              ) : null}
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
              const viewHref = voucherPath(config, row.id);
              const isPosted = !isVoidStatus(row.status);
              const headerName = row.headerAccount.name ?? (
                <span className="text-muted-foreground italic">
                  Unknown account
                </span>
              );

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
                  {showMethod ? (
                    <TableCell className="max-w-56 text-sm">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate">{headerName}</span>
                        <PaymentMethodBadge method={row.paymentMethod} />
                      </span>
                    </TableCell>
                  ) : (
                    <TableCell className="max-w-48 truncate text-sm">
                      {headerName}
                    </TableCell>
                  )}
                  <TableCell className="max-w-40 truncate text-sm">
                    {row.collectedBy.name ? (
                      <span
                        title={
                          row.collectedBy.id
                            ? undefined
                            : "Legacy cashier with no login"
                        }
                        className={cn(!row.collectedBy.id && "italic")}
                      >
                        {row.collectedBy.name}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-56 text-sm">
                    <CounterpartyText row={row} />
                  </TableCell>
                  {chequeColumns ? (
                    <>
                      <TableCell className="font-mono text-sm">
                        {row.cheque?.number ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {row.cheque?.date
                          ? formatCalendarDate(row.cheque.date)
                          : "—"}
                      </TableCell>
                      <TableCell className="max-w-40 truncate text-sm">
                        {row.cheque?.bankName ?? "—"}
                      </TableCell>
                      <TableCell>
                        {row.cheque?.status ? (
                          <ChequeStatusBadge status={row.cheque.status} />
                        ) : (
                          "—"
                        )}
                      </TableCell>
                    </>
                  ) : null}
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
                    <RowActions {...props} row={row} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

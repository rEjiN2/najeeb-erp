"use client";

import { Eye, Loader2, Send, ShieldCheck, Wallet } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";

import { MasterPagination } from "@/components/master/master-pagination";
import { StatePanel } from "@/components/master/state-panel";
import { SearchableSelect } from "@/components/shared/searchable-select";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { VoucherStatusBadge } from "@/components/voucher/voucher-status-badge";
import type { UserRef } from "@/features/vouchers/types";
import { formatCalendarDate } from "@/lib/datetime";
import { formatAmount } from "@/lib/format";
import { cn } from "@/lib/utils";

import {
  CASH_HANDOVERS_DESCRIPTION,
  CASH_HANDOVERS_PATH,
  CASH_HANDOVERS_TITLE,
  HANDOVER_STATUS_LABELS,
  HANDOVER_STATUS_TABS,
  HANDOVERS_PAGE_SIZE,
  cashHandoverPath,
} from "./constants";
import { toHandoverSearch as toSearch } from "./filters";
import type { HandoverFilters, HandoverPage } from "./types";

interface HandoverListProps {
  page: HandoverPage;
  filters: HandoverFilters;
  /** null for an "own"-scoped user: no user filter. */
  users: UserRef[] | null;
  canCreate: boolean;
  canApprove: boolean;
  /** The signed-in user: approvers never approve their own. */
  meId: string | null;
}

export function HandoverList({
  page,
  filters,
  users,
  canCreate,
  canApprove,
  meId,
}: HandoverListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isNavigating, startNavigation] = useTransition();
  const items = page.items ?? [];
  const count = page.summary?.count ?? 0;

  function navigate(next: Partial<HandoverFilters>) {
    // A filter change starts again at page 1.
    const merged = { ...filters, page: 1, ...next };
    startNavigation(() =>
      router.replace(`${pathname}${toSearch(merged)}`, { scroll: false }),
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold">
            {CASH_HANDOVERS_TITLE}
          </h1>
          <p className="text-muted-foreground text-sm">
            {CASH_HANDOVERS_DESCRIPTION}
          </p>
        </div>
        {canCreate ? (
          <Link
            href={`${CASH_HANDOVERS_PATH}/new`}
            className={buttonVariants()}
          >
            <Send /> Hand over
          </Link>
        ) : null}
      </div>

      <div
        role="tablist"
        aria-label="Status"
        className="bg-muted/50 inline-flex flex-wrap gap-1 rounded-lg p-1"
      >
        {HANDOVER_STATUS_TABS.map((status) => (
          <button
            key={status}
            type="button"
            role="tab"
            aria-selected={filters.status === status}
            onClick={() => navigate({ status })}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              filters.status === status
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {HANDOVER_STATUS_LABELS[status]}
          </button>
        ))}
      </div>

      <div className="bg-card flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:flex-wrap sm:items-center sm:p-4">
        <div className="flex items-center gap-2">
          <Input
            type="date"
            aria-label="From date"
            value={filters.dateFrom}
            onChange={(event) => navigate({ dateFrom: event.target.value })}
            className="w-40"
          />
          <span className="text-muted-foreground text-sm">to</span>
          <Input
            type="date"
            aria-label="To date"
            value={filters.dateTo}
            onChange={(event) => navigate({ dateTo: event.target.value })}
            className="w-40"
          />
        </div>
        {users ? (
          <div className="sm:w-56">
            <SearchableSelect
              value={filters.userId || null}
              onChange={(value) => navigate({ userId: value ?? "" })}
              options={users.map((user) => ({
                value: user.id,
                label: user.name,
              }))}
              placeholder="Handed by: any"
              clearLabel="Handed by: any"
              emptyText="No matching users"
            />
          </div>
        ) : null}
        {isNavigating ? (
          <Loader2
            className="text-muted-foreground size-4 animate-spin"
            aria-label="Loading"
          />
        ) : null}
      </div>

      {items.length === 0 ? (
        <StatePanel icon={Wallet} title="No handovers">
          {filters.status === "submitted"
            ? "Nothing is waiting for approval."
            : "No handovers match these filters."}
        </StatePanel>
      ) : (
        <div
          aria-busy={isNavigating}
          className={cn(
            "space-y-3 transition-opacity",
            isNavigating && "pointer-events-none opacity-60",
          )}
        >
          {/* Phone: one card per handover. */}
          <ul className="space-y-2 md:hidden">
            {items.map((row) => (
              <li key={row.id}>
                <Link
                  href={cashHandoverPath(row.id)}
                  className="bg-card block space-y-1 rounded-lg border p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-sm font-medium">
                      {row.voucherNo}
                    </span>
                    <VoucherStatusBadge status={row.status} />
                  </div>
                  <div className="text-muted-foreground flex justify-between gap-2 text-xs">
                    <span>
                      {formatCalendarDate(row.date)} · {row.user?.name ?? "—"}
                    </span>
                    <span className="text-foreground font-mono">
                      {formatAmount(row.receivedTotal ?? row.submittedTotal)}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          <div className="bg-card hidden overflow-x-auto rounded-lg border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Voucher No</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Handed By</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Submitted</TableHead>
                  <TableHead className="text-right">Received</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((row) => {
                  const review =
                    canApprove &&
                    row.status === "submitted" &&
                    row.user?.id !== meId;
                  return (
                    <TableRow key={row.id}>
                      <TableCell>
                        <Link
                          href={cashHandoverPath(row.id)}
                          className="font-mono font-medium hover:underline"
                        >
                          {row.voucherNo}
                        </Link>
                      </TableCell>
                      <TableCell>{formatCalendarDate(row.date)}</TableCell>
                      <TableCell>{row.user?.name ?? "—"}</TableCell>
                      <TableCell>
                        <VoucherStatusBadge status={row.status} />
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {formatAmount(row.submittedTotal)}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {row.receivedTotal === null
                          ? "—"
                          : formatAmount(row.receivedTotal)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          href={cashHandoverPath(row.id)}
                          className={buttonVariants({
                            variant: review ? "default" : "ghost",
                            size: "sm",
                          })}
                        >
                          {review ? <ShieldCheck /> : <Eye />}
                          {review ? "Review" : "View"}
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <MasterPagination
            page={filters.page}
            pageCount={Math.max(1, Math.ceil(count / HANDOVERS_PAGE_SIZE))}
            totalItems={count}
            pageSize={HANDOVERS_PAGE_SIZE}
            onPageChange={(next) => navigate({ page: next })}
          />
        </div>
      )}
    </div>
  );
}

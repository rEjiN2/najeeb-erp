"use client";

import {
  ArrowLeftRight,
  Ban,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  History,
  Landmark,
  Loader2,
  MessageSquare,
  MoreHorizontal,
  ScrollText,
  Search,
  SearchX,
  Undo2,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { ActivitySheet } from "@/components/activity/activity-sheet";
import { StatePanel } from "@/components/master/state-panel";
import { AsyncSearchableSelect } from "@/components/shared/async-searchable-select";
import { SearchableSelect } from "@/components/shared/searchable-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cashReceiptPath } from "@/features/cash-receipts/constants";
import { downloadCsv } from "@/features/reports/salesman-collections/csv";
import { lineAccountSearch } from "@/features/vouchers/account-search";
import type { Loadable } from "@/features/vouchers/list/voucher-filter-bar";
import type { AccountLookupItem, UserRef } from "@/features/vouchers/types";
import { formatCalendarDate, toDateInputValue } from "@/lib/datetime";
import { formatAmount } from "@/lib/format";
import { cn } from "@/lib/utils";

import { exportCheques } from "./actions";
import { ChequeStatusBadge } from "./cheque-status-badge";
import { ChequeStepDialog, type ChequeStep } from "./cheque-step-dialog";
import {
  CHEQUE_ENTITY_TYPE,
  CHEQUE_TABS,
  CHEQUES_PAGE_SIZE,
  DEFAULT_CHEQUE_FILTERS,
  DUE_SOON_DAYS,
  PENDING_STATUSES,
  UNDEPOSITED_STATUSES,
} from "./constants";
import { chequesToCsv } from "./csv";
import { hasChequeFilters, toChequeSearch } from "./filters";
import type {
  ChequeFilters,
  ChequePage,
  ChequeRow,
  ChequeSummary,
  ChequeTab,
} from "./types";

const SEARCH_DEBOUNCE_MS = 300;

export interface ChequeAccess {
  canDeposit: boolean;
  canClear: boolean;
  canReturn: boolean;
  /** Admins only (the backend checks the role). */
  canUndo: boolean;
}

interface ChequesPageProps {
  page: ChequePage;
  /** Every tab together, for the summary strip. */
  summary: ChequeSummary;
  filters: ChequeFilters;
  access: ChequeAccess;
  /** Company bank, cash and wallet accounts; null without deposit/clear. */
  accounts: AccountLookupItem[] | null;
  /** null for an "own"-scoped user: the Collected By filter is hidden. */
  users: Loadable<UserRef[]> | null;
  customerName: string | null;
  today: string;
}

function addDays(day: string, days: number): string {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** The backend's dueSoon / overdue rules, per row. */
function dueState(row: ChequeRow, today: string): "overdue" | "soon" | null {
  if (!row.status || !row.chequeDate) return null;
  const day = toDateInputValue(row.chequeDate);
  if (UNDEPOSITED_STATUSES.includes(row.status) && day < today) {
    return "overdue";
  }
  if (
    PENDING_STATUSES.includes(row.status) &&
    day >= today &&
    day <= addDays(today, DUE_SOON_DAYS)
  ) {
    return "soon";
  }
  return null;
}

function DueBadge({ state }: { state: "overdue" | "soon" | null }) {
  if (!state) return null;
  return state === "overdue" ? (
    <Badge variant="destructive">Overdue</Badge>
  ) : (
    <Badge variant="outline" className="border-primary/40 text-primary">
      Due soon
    </Badge>
  );
}

function SummaryStrip({ summary }: { summary: ChequeSummary }) {
  const figures = [
    {
      label: "Pending",
      value: summary.pendingTotal,
      count: summary.pendingCount,
    },
    {
      label: `Due in ${DUE_SOON_DAYS} days`,
      value: summary.dueSoon.total,
      count: summary.dueSoon.count,
    },
    {
      label: "Overdue (not deposited)",
      value: summary.overdue.total,
      count: summary.overdue.count,
      alert: summary.overdue.count > 0,
    },
    {
      label: "Deposited, awaiting clearance",
      value: summary.depositedPending.total,
      count: summary.depositedPending.count,
    },
  ];
  return (
    <div className="bg-card grid grid-cols-2 gap-4 rounded-lg border p-4 lg:grid-cols-4">
      {figures.map((figure) => (
        <div key={figure.label}>
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            {figure.label}
          </p>
          <p
            className={cn(
              "font-heading font-mono text-xl font-semibold tabular-nums",
              figure.alert && "text-destructive",
            )}
          >
            {formatAmount(figure.value)}
          </p>
          <p className="text-muted-foreground text-xs">
            {figure.count} cheque{figure.count === 1 ? "" : "s"}
          </p>
        </div>
      ))}
    </div>
  );
}

function DebouncedInput({
  value,
  onCommit,
  placeholder,
  label,
  icon,
}: {
  value: string;
  onCommit: (value: string) => void;
  placeholder: string;
  label: string;
  icon?: boolean;
}) {
  const [text, setText] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  // Follow the URL when it changes underneath (Clear filters, back button).
  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    setLastValue(value);
    setText(value);
  }
  return (
    <div className="relative w-full">
      {icon ? (
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
      ) : null}
      <Input
        type="search"
        value={text}
        onChange={(event) => {
          const next = event.target.value;
          setText(next);
          clearTimeout(timer.current);
          timer.current = setTimeout(
            () => onCommit(next.trim()),
            SEARCH_DEBOUNCE_MS,
          );
        }}
        placeholder={placeholder}
        aria-label={label}
        maxLength={100}
        className={cn(icon && "pl-8")}
      />
    </div>
  );
}

export function ChequesPage({
  page,
  summary,
  filters,
  access,
  accounts,
  users,
  customerName,
  today,
}: ChequesPageProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isNavigating, startNavigation] = useTransition();
  const [exporting, startExport] = useTransition();
  const [stepTarget, setStepTarget] = useState<{
    cheque: ChequeRow;
    step: ChequeStep;
  } | null>(null);
  const [activityTarget, setActivityTarget] = useState<{
    entityId: string;
    title: string;
  } | null>(null);

  function navigate(next: Partial<ChequeFilters>, resetPage = true) {
    const merged = { ...filters, ...(resetPage ? { page: 1 } : {}), ...next };
    startNavigation(() =>
      router.replace(`${pathname}${toChequeSearch(merged)}`, {
        scroll: false,
      }),
    );
  }

  function exportCsv() {
    startExport(async () => {
      try {
        const result = await exportCheques(toChequeSearch(filters));
        if (!result.ok) {
          toast.error(result.message);
          return;
        }
        downloadCsv(
          chequesToCsv(result.rows),
          `cheques-${filters.tab}-${today}.csv`,
        );
      } catch {
        toast.error(
          "Couldn't reach the app. Check your connection and try again.",
        );
      }
    });
  }

  const filtered = hasChequeFilters(filters);
  const hasNext = page.items.length === CHEQUES_PAGE_SIZE;
  const canStep = (row: ChequeRow) => {
    const status = row.status;
    return {
      deposit: access.canDeposit && status === "at_office",
      clear:
        access.canClear && (status === "at_office" || status === "deposited"),
      return:
        access.canReturn && (status === "at_office" || status === "deposited"),
      undo:
        access.canUndo &&
        (status === "deposited" ||
          status === "cleared" ||
          status === "returned"),
    };
  };

  function RowActions({ row }: { row: ChequeRow }) {
    const can = canStep(row);
    const open = (step: ChequeStep) => setStepTarget({ cheque: row, step });
    return (
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Actions for cheque ${row.chequeNumber ?? row.voucherNo}`}
            >
              <MoreHorizontal className="size-4" />
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="w-52">
          {can.deposit && accounts ? (
            <DropdownMenuItem onClick={() => open("deposit")}>
              <Landmark /> Deposit
            </DropdownMenuItem>
          ) : null}
          {can.clear && accounts ? (
            <DropdownMenuItem onClick={() => open("clear")}>
              <ArrowLeftRight /> Clear
            </DropdownMenuItem>
          ) : null}
          {can.return ? (
            <DropdownMenuItem
              variant="destructive"
              onClick={() => open("return")}
            >
              <Ban /> Return
            </DropdownMenuItem>
          ) : null}
          {can.undo ? (
            <DropdownMenuItem onClick={() => open("undo")}>
              <Undo2 /> Undo last step
            </DropdownMenuItem>
          ) : null}
          {can.deposit || can.clear || can.return || can.undo ? (
            <DropdownMenuSeparator />
          ) : null}
          <DropdownMenuItem
            onClick={() => router.push(cashReceiptPath(row.id))}
          >
            <Eye /> View receipt
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() =>
              setActivityTarget({
                entityId: row.id,
                title: `Activity · Cheque ${row.chequeNumber ?? ""}`,
              })
            }
          >
            <History /> Activity &amp; Comments
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Cheques</h1>
          <p className="text-muted-foreground text-sm">
            Cheques received on receipts: deposit, clear or return them.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={exportCsv}
          disabled={exporting || page.items.length === 0}
        >
          {exporting ? <Loader2 className="animate-spin" /> : <Download />}
          Export CSV
        </Button>
      </div>

      <SummaryStrip summary={summary} />

      <div className="bg-card space-y-3 rounded-lg border p-3 sm:p-4">
        <Tabs
          value={filters.tab}
          onValueChange={(value) => navigate({ tab: value as ChequeTab })}
        >
          <TabsList className="w-full overflow-x-auto sm:w-fit">
            {CHEQUE_TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,18rem)_auto_minmax(0,14rem)_minmax(0,12rem)_minmax(0,12rem)_auto] lg:items-center">
          <DebouncedInput
            value={filters.q}
            onCommit={(q) => navigate({ q })}
            placeholder="Cheque no, bank or receipt no…"
            label="Search cheques"
            icon
          />
          <div className="flex items-center gap-2">
            <Input
              type="date"
              aria-label="Cheque date from"
              value={filters.dueFrom}
              max={filters.dueTo || undefined}
              onChange={(event) => navigate({ dueFrom: event.target.value })}
              className="w-full lg:w-38"
            />
            <span className="text-muted-foreground text-sm">to</span>
            <Input
              type="date"
              aria-label="Cheque date to"
              value={filters.dueTo}
              min={filters.dueFrom || undefined}
              onChange={(event) => navigate({ dueTo: event.target.value })}
              className="w-full lg:w-38"
            />
          </div>
          <AsyncSearchableSelect
            aria-label="Customer"
            value={filters.customerId || null}
            valueLabel={customerName ?? "Unknown customer"}
            onChange={(option) => navigate({ customerId: option?.value ?? "" })}
            search={lineAccountSearch(["party"])}
            placeholder="All customers"
            searchPlaceholder="Search customers…"
            emptyText="No matching customers"
            clearLabel="All customers"
          />
          <DebouncedInput
            value={filters.bank}
            onCommit={(bank) => navigate({ bank })}
            placeholder="Drawn on bank"
            label="Drawn on bank"
          />
          {users ? (
            <div title={users.ok ? undefined : users.message}>
              <SearchableSelect
                value={filters.collectedBy || null}
                onChange={(value) => navigate({ collectedBy: value ?? "" })}
                options={
                  users.ok
                    ? users.data.map((user) => ({
                        value: user.id,
                        label: user.name,
                      }))
                    : []
                }
                placeholder={
                  users.ok ? "Collected By: any" : "Users unavailable"
                }
                emptyText="No matching users"
                clearLabel="Collected By: any"
                disabled={!users.ok}
              />
            </div>
          ) : null}
          {filtered ? (
            <Button
              variant="ghost"
              onClick={() =>
                navigate({ ...DEFAULT_CHEQUE_FILTERS, tab: filters.tab })
              }
            >
              <X /> Clear filters
            </Button>
          ) : null}
        </div>
      </div>

      {page.items.length === 0 ? (
        filtered || filters.page > 1 ? (
          <StatePanel
            icon={SearchX}
            title="No cheques match these filters"
            action={
              <Button
                variant="outline"
                onClick={() =>
                  navigate({ ...DEFAULT_CHEQUE_FILTERS, tab: filters.tab })
                }
              >
                Clear filters
              </Button>
            }
          >
            Try a wider cheque date range, or clear the filters.
          </StatePanel>
        ) : (
          <StatePanel
            icon={ScrollText}
            title={`No ${CHEQUE_TABS.find((t) => t.value === filters.tab)?.label.toLowerCase()} cheques`}
          >
            Cheques appear here once a receipt is saved with Payment Method
            Cheque.
          </StatePanel>
        )
      ) : (
        <>
          <div
            aria-busy={isNavigating}
            className={cn(
              "bg-card overflow-x-auto rounded-lg border transition-opacity",
              isNavigating && "pointer-events-none opacity-60",
            )}
          >
            <Table className="min-w-[1100px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Cheque No</TableHead>
                  <TableHead>Cheque Date</TableHead>
                  <TableHead>Bank</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Receipt</TableHead>
                  <TableHead>Collected By</TableHead>
                  <TableHead>
                    {filters.tab === "returned" ? "Reason" : "Bank / Into"}
                  </TableHead>
                  <TableHead className="text-center">Comments</TableHead>
                  <TableHead className="w-10">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {page.items.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-sm font-medium">
                      {row.chequeNumber ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      <span className="flex items-center gap-1.5">
                        {row.chequeDate
                          ? formatCalendarDate(row.chequeDate)
                          : "—"}
                        <DueBadge state={dueState(row, today)} />
                      </span>
                    </TableCell>
                    <TableCell className="max-w-40 truncate text-sm">
                      {row.chequeBankName ?? "—"}
                    </TableCell>
                    <TableCell className="max-w-48 truncate text-sm">
                      {row.customer?.name ?? (
                        <span className="text-muted-foreground italic">
                          Unknown
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm font-medium tabular-nums">
                      {formatAmount(row.amount)}
                    </TableCell>
                    <TableCell>
                      {row.status ? (
                        <ChequeStatusBadge status={row.status} />
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      <Link
                        href={cashReceiptPath(row.id)}
                        className="font-mono font-medium hover:underline"
                      >
                        {row.voucherNo}
                      </Link>
                      <p className="text-muted-foreground text-xs">
                        {formatCalendarDate(row.receiptDate)}
                      </p>
                    </TableCell>
                    <TableCell className="max-w-36 truncate text-sm">
                      {row.collectedBy.name ?? "—"}
                    </TableCell>
                    <TableCell className="max-w-48 truncate text-sm">
                      {filters.tab === "returned"
                        ? (row.returnReason ?? "—")
                        : (row.clearedInto?.name ??
                          row.depositedInto?.name ??
                          "—")}
                    </TableCell>
                    <TableCell className="text-center">
                      <button
                        type="button"
                        onClick={() =>
                          setActivityTarget({
                            entityId: row.id,
                            title: `Activity · Cheque ${row.chequeNumber ?? ""}`,
                          })
                        }
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
                    <TableCell className="text-right">
                      <RowActions row={row} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="text-muted-foreground flex items-center justify-between text-sm">
            <p>Page {filters.page}</p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon-sm"
                aria-label="Previous page"
                disabled={filters.page <= 1 || isNavigating}
                onClick={() => navigate({ page: filters.page - 1 }, false)}
              >
                <ChevronLeft />
              </Button>
              <Button
                variant="outline"
                size="icon-sm"
                aria-label="Next page"
                disabled={!hasNext || isNavigating}
                onClick={() => navigate({ page: filters.page + 1 }, false)}
              >
                <ChevronRight />
              </Button>
            </div>
          </div>
        </>
      )}

      <ChequeStepDialog
        target={stepTarget}
        onClose={() => setStepTarget(null)}
        accounts={accounts ?? []}
        today={today}
      />

      <ActivitySheet
        target={activityTarget}
        onClose={() => setActivityTarget(null)}
        entityType={CHEQUE_ENTITY_TYPE}
        subjectLabel="cheque"
        onCommentAdded={() => startNavigation(() => router.refresh())}
      />
    </div>
  );
}

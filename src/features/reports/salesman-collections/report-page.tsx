"use client";

import { Download, Loader2, Users } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { StatePanel } from "@/components/master/state-panel";
import { SearchableSelect } from "@/components/shared/searchable-select";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DATE_PRESET_LABELS } from "@/features/vouchers/filters";
import { DateRangeControl } from "@/features/vouchers/list/voucher-filter-bar";
import { formatCalendarDate, uaeToday } from "@/lib/datetime";
import { formatAmount } from "@/lib/format";
import { cn } from "@/lib/utils";

import {
  SALESMAN_COLLECTIONS_DESCRIPTION,
  SALESMAN_COLLECTIONS_TITLE,
} from "./constants";
import { downloadCsv, toCsv } from "./csv";
import { SalesmanDetailsSheet } from "./details-sheet";
import { reportDateQuery, toReportSearch } from "./filters";
import type {
  SalesmanCollectionFigures,
  SalesmanCollectionRow,
  SalesmanCollectionsFilters,
  SalesmanCollectionsReport,
} from "./types";

const AMOUNT_COLUMNS = [
  ["collectedCash", "Cash"],
  ["collectedCheque", "Cheque"],
  ["collectedBank", "Bank"],
  ["total", "Total"],
  ["handedOver", "Handed Over"],
  ["pendingApproval", "Pending Approval"],
  ["withSalesman", "With Salesman (now)"],
] as const satisfies readonly (readonly [
  keyof SalesmanCollectionFigures,
  string,
])[];

function describeRange(report: SalesmanCollectionsReport, range: string) {
  const { dateFrom, dateTo } = report;
  const span =
    dateFrom && dateTo
      ? dateFrom === dateTo
        ? formatCalendarDate(dateFrom)
        : `${formatCalendarDate(dateFrom)} – ${formatCalendarDate(dateTo)}`
      : dateFrom
        ? `From ${formatCalendarDate(dateFrom)}`
        : dateTo
          ? `Up to ${formatCalendarDate(dateTo)}`
          : "All time";
  return range === "custom" || range === "all" ? span : `${range} · ${span}`;
}

function Money({ value, strong = false }: { value: number; strong?: boolean }) {
  return (
    <span
      className={cn(
        "font-mono tabular-nums",
        strong && "font-semibold",
        value < 0 && "text-destructive",
      )}
    >
      {formatAmount(value)}
    </span>
  );
}

interface SalesmanCollectionsPageProps {
  report: SalesmanCollectionsReport;
  filters: SalesmanCollectionsFilters;
  /** "Own"-scoped: the backend returns only their row; no user filter. */
  scoped: boolean;
  /** null when they couldn't be loaded — that filter is disabled. */
  users: { id: string; name: string }[] | null;
}

export function SalesmanCollectionsPage({
  report,
  filters,
  scoped,
  users,
}: SalesmanCollectionsPageProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isNavigating, startNavigation] = useTransition();
  const [selected, setSelected] = useState<SalesmanCollectionRow | null>(null);

  function navigate(next: Partial<SalesmanCollectionsFilters>) {
    const url = `${pathname}${toReportSearch({ ...filters, ...next })}`;
    startNavigation(() => router.replace(url, { scroll: false }));
  }

  const rangeLabel = describeRange(report, DATE_PRESET_LABELS[filters.range]);
  const dateQuery = reportDateQuery(filters, uaeToday()).toString();
  const rows = report.rows ?? [];
  const totals: SalesmanCollectionFigures = report.totals ?? {
    receipts: 0,
    collectedCash: 0,
    collectedCheque: 0,
    collectedBank: 0,
    total: 0,
    handedOver: 0,
    pendingApproval: 0,
    withSalesman: 0,
  };

  function exportCsv() {
    const span = [report.dateFrom, report.dateTo].filter(Boolean).join("_");
    downloadCsv(
      toCsv(report),
      `salesman-collections${span ? `_${span}` : "_all-time"}.csv`,
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold">
            {SALESMAN_COLLECTIONS_TITLE}
          </h1>
          <p className="text-muted-foreground text-sm">
            {SALESMAN_COLLECTIONS_DESCRIPTION}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={exportCsv}
          disabled={rows.length === 0}
        >
          <Download /> Export CSV
        </Button>
      </div>

      <div className="bg-card flex flex-col gap-2 rounded-lg border p-3 sm:p-4 lg:flex-row lg:items-start">
        <DateRangeControl
          filters={filters}
          onChange={(next) => navigate(next)}
        />
        {!scoped ? (
          <div className="lg:ml-auto lg:w-56">
            <SearchableSelect
              value={filters.userId || null}
              onChange={(value) => navigate({ userId: value ?? "" })}
              options={(users ?? []).map((user) => ({
                value: user.id,
                label: user.name,
              }))}
              placeholder={users ? "All users" : "Users unavailable"}
              clearLabel="All users"
              emptyText="No matching users"
              disabled={users === null}
            />
          </div>
        ) : null}
        {isNavigating ? (
          <Loader2
            className="text-muted-foreground size-4 shrink-0 animate-spin self-center"
            aria-label="Loading"
          />
        ) : null}
      </div>

      <p className="text-muted-foreground text-sm">{rangeLabel}.</p>

      {rows.length === 0 ? (
        <StatePanel icon={Users} title="No collections to show">
          {scoped
            ? "You have no collections in this range."
            : "No users match these filters."}
        </StatePanel>
      ) : (
        <div
          aria-busy={isNavigating}
          className={cn(
            "transition-opacity",
            isNavigating && "pointer-events-none opacity-60",
          )}
        >
          {/* Phone: one card per user, then the totals. */}
          <ul className="space-y-2 md:hidden">
            {[...rows, null].map((row) => {
              const figures = row ?? totals;
              return (
                <li key={row?.staff.id ?? "total"}>
                  <button
                    type="button"
                    disabled={!row}
                    onClick={() => row && setSelected(row)}
                    className={cn(
                      "bg-card w-full space-y-2 rounded-lg border p-3 text-left",
                      !row && "bg-muted/40",
                    )}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="min-w-0 truncate font-medium">
                        {row ? row.staff.name : "Total"}
                      </span>
                      <span className="text-muted-foreground shrink-0 text-xs">
                        {figures.receipts ?? 0} receipt
                        {figures.receipts === 1 ? "" : "s"}
                      </span>
                    </div>
                    <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                      {AMOUNT_COLUMNS.filter(
                        ([key]) => key !== "withSalesman",
                      ).map(([key, label]) => (
                        <div key={key} className="flex justify-between gap-2">
                          <dt className="text-muted-foreground">{label}</dt>
                          <dd>
                            <Money value={figures[key]} />
                          </dd>
                        </div>
                      ))}
                    </dl>
                    <div className="flex items-baseline justify-between border-t pt-2 text-sm">
                      <span className="text-muted-foreground">
                        With salesman (now)
                      </span>
                      <Money value={figures.withSalesman} strong />
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="bg-card hidden overflow-x-auto rounded-lg border md:block">
            <Table className="min-w-[1000px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Collected By</TableHead>
                  <TableHead className="text-right">Receipts</TableHead>
                  {AMOUNT_COLUMNS.map(([key, label]) => (
                    <TableHead key={key} className="text-right">
                      {label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow
                    key={row.staff.id}
                    onClick={() => setSelected(row)}
                    className="cursor-pointer"
                  >
                    <TableCell>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelected(row);
                        }}
                        className="text-left hover:underline"
                      >
                        <span className="font-medium">{row.staff.name}</span>
                      </button>
                      {row.staff.location?.name ? (
                        <p className="text-muted-foreground text-xs">
                          {row.staff.location.name}
                        </p>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">
                      {row.receipts ?? 0}
                    </TableCell>
                    {AMOUNT_COLUMNS.map(([key]) => (
                      <TableCell key={key} className="text-right text-sm">
                        <Money
                          value={row[key]}
                          strong={key === "total" || key === "withSalesman"}
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell className="font-medium">Total</TableCell>
                  <TableCell className="text-right text-sm font-semibold tabular-nums">
                    {totals.receipts ?? 0}
                  </TableCell>
                  {AMOUNT_COLUMNS.map(([key]) => (
                    <TableCell key={key} className="text-right text-sm">
                      <Money value={totals[key]} strong />
                    </TableCell>
                  ))}
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </div>
      )}

      <SalesmanDetailsSheet
        row={selected}
        dateQuery={dateQuery}
        rangeLabel={rangeLabel}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}

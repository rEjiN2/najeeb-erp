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
import type { CashierLookupItem } from "@/features/cashiers/types";
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
  ["unsettledOpening", "Opening Unsettled"],
  ["collectedCash", "Collected Cash"],
  ["collectedBank", "Collected Bank"],
  ["pendingApproval", "Pending Approval"],
  ["settled", "Settled"],
  ["openShortage", "Shortage"],
  ["unsettledClosing", "Closing Unsettled"],
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
  /** "Own"-scoped: the backend returns only their row; no cashier filters. */
  scoped: boolean;
  /** null when they couldn't be loaded — that filter is disabled. */
  cashiers: CashierLookupItem[] | null;
  locations: { id: string; label: string }[] | null;
}

export function SalesmanCollectionsPage({
  report,
  filters,
  scoped,
  cashiers,
  locations,
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
  const { rows, totals } = report;

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
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:ml-auto lg:flex">
            <div className="lg:w-56">
              <SearchableSelect
                value={filters.cashierId || null}
                onChange={(value) => navigate({ cashierId: value ?? "" })}
                options={(cashiers ?? []).map((cashier) => ({
                  value: cashier.id,
                  label: cashier.name,
                  description: cashier.code,
                }))}
                placeholder={cashiers ? "All cashiers" : "Cashiers unavailable"}
                clearLabel="All cashiers"
                emptyText="No matching cashiers"
                disabled={cashiers === null}
              />
            </div>
            <div className="lg:w-56">
              <SearchableSelect
                value={filters.locationId || null}
                onChange={(value) => navigate({ locationId: value ?? "" })}
                options={(locations ?? []).map((location) => ({
                  value: location.id,
                  label: location.label,
                }))}
                placeholder={
                  locations ? "All locations" : "Locations unavailable"
                }
                clearLabel="All locations"
                emptyText="No matching locations"
                disabled={locations === null}
              />
            </div>
          </div>
        ) : null}
        {isNavigating ? (
          <Loader2
            className="text-muted-foreground size-4 shrink-0 animate-spin self-center"
            aria-label="Loading"
          />
        ) : null}
      </div>

      <p className="text-muted-foreground text-sm">
        {rangeLabel}. Pending is cash and wallet receipts not yet handed over;
        bank receipts are shown but never pending.
      </p>

      {rows.length === 0 ? (
        <StatePanel icon={Users} title="No cashiers to show">
          {scoped
            ? "Your user isn't linked to a cashier, so there are no figures to show."
            : "No cashiers match these filters."}
        </StatePanel>
      ) : (
        <div
          aria-busy={isNavigating}
          className={cn(
            "transition-opacity",
            isNavigating && "pointer-events-none opacity-60",
          )}
        >
          {/* Phone: one card per cashier, then the totals. */}
          <ul className="space-y-2 md:hidden">
            {[...rows, null].map((row) => {
              const figures = row ?? totals;
              return (
                <li key={row?.cashier.id ?? "total"}>
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
                        {row ? row.cashier.name : "Total"}
                      </span>
                      <span className="text-muted-foreground shrink-0 text-xs">
                        {figures.receiptCount} receipt
                        {figures.receiptCount === 1 ? "" : "s"}
                      </span>
                    </div>
                    <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                      {AMOUNT_COLUMNS.slice(0, -1).map(([key, label]) => (
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
                        Closing unsettled
                      </span>
                      <Money value={figures.unsettledClosing} strong />
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="bg-card hidden overflow-x-auto rounded-lg border md:block">
            <Table className="min-w-[1100px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Cashier</TableHead>
                  {AMOUNT_COLUMNS.map(([key, label]) => (
                    <TableHead key={key} className="text-right">
                      {label}
                    </TableHead>
                  ))}
                  <TableHead className="text-right">Receipts</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow
                    key={row.cashier.id}
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
                        <span className="font-medium">{row.cashier.name}</span>{" "}
                        <span className="text-muted-foreground font-mono text-xs">
                          {row.cashier.code}
                        </span>
                      </button>
                      {row.cashier.location?.name ? (
                        <p className="text-muted-foreground text-xs">
                          {row.cashier.location.name}
                        </p>
                      ) : null}
                    </TableCell>
                    {AMOUNT_COLUMNS.map(([key]) => (
                      <TableCell key={key} className="text-right text-sm">
                        <Money
                          value={row[key]}
                          strong={key === "unsettledClosing"}
                        />
                      </TableCell>
                    ))}
                    <TableCell className="text-right text-sm tabular-nums">
                      {row.receiptCount}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell className="font-medium">Total</TableCell>
                  {AMOUNT_COLUMNS.map(([key]) => (
                    <TableCell key={key} className="text-right text-sm">
                      <Money value={totals[key]} strong />
                    </TableCell>
                  ))}
                  <TableCell className="text-right text-sm font-semibold tabular-nums">
                    {totals.receiptCount}
                  </TableCell>
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

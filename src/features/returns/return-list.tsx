"use client";

import {
  Ban,
  Eye,
  History,
  MessageSquare,
  MoreHorizontal,
  Plus,
  Printer,
  Search,
  SearchX,
  Undo2,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { ActivitySheet } from "@/components/activity/activity-sheet";
import { MasterPagination } from "@/components/master/master-pagination";
import { StatePanel } from "@/components/master/state-panel";
import { AsyncSearchableSelect } from "@/components/shared/async-searchable-select";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { searchSuppliers } from "@/features/purchase-invoices/supplier-search";
import { searchCustomers } from "@/features/sales-invoices/search";
import {
  CancelVoucherDialog,
  type CancelTarget,
} from "@/features/vouchers/cancel-voucher-dialog";
import type { VoucherAccess } from "@/features/vouchers/config";
import { DateRangeControl } from "@/features/vouchers/list/voucher-filter-bar";
import { useVoucherPdf } from "@/features/vouchers/use-voucher-pdf";
import { formatCalendarDate } from "@/lib/datetime";
import { formatAmount } from "@/lib/format";
import { cn } from "@/lib/utils";

import { cancelPurchaseReturn, cancelSalesReturn } from "./actions";
import { RETURN_KINDS, RETURNS_PAGE_SIZE, returnPath } from "./constants";
import { toReturnSearch } from "./filters";
import { searchInvoices } from "./search";
import type { ReturnFilters, ReturnKind, ReturnPage } from "./types";

const STATUS_ITEMS: Record<ReturnFilters["status"], string> = {
  all: "All statuses",
  posted: "Posted",
  cancelled: "Cancelled",
};

export function ReturnList({
  kind,
  page,
  filters,
  access,
  partyName,
  invoiceNo,
}: {
  kind: ReturnKind;
  page: ReturnPage;
  filters: ReturnFilters;
  access: VoucherAccess;
  /** The customer / supplier filter's label. */
  partyName: string | null;
  /** The invoice filter's label. */
  invoiceNo: string | null;
}) {
  const info = RETURN_KINDS[kind];
  const { config } = info;
  const router = useRouter();
  const pathname = usePathname();
  const [isNavigating, startNavigation] = useTransition();
  const [q, setQ] = useState(filters.q);
  const [cancelTarget, setCancelTarget] = useState<CancelTarget | null>(null);
  const [activity, setActivity] = useState<{
    entityId: string;
    title: string;
  } | null>(null);
  const pdf = useVoucherPdf(config);

  function navigate(next: Partial<ReturnFilters>, resetPage = true) {
    const merged = { ...filters, ...(resetPage ? { page: 1 } : {}), ...next };
    startNavigation(() =>
      router.replace(`${pathname}${toReturnSearch(merged)}`, {
        scroll: false,
      }),
    );
  }

  const filtered =
    filters.range !== "month" ||
    filters.status !== "all" ||
    filters.partyId !== "" ||
    filters.invoiceId !== "" ||
    filters.q !== "";
  const pageCount = Math.max(
    1,
    Math.ceil(page.summary.count / RETURNS_PAGE_SIZE),
  );
  const newButton = access.canCreate ? (
    <Link href={`${info.path}/new`} className={buttonVariants()}>
      <Plus /> {config.copy.createButton}
    </Link>
  ) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold">
            {config.title}
          </h1>
          <p className="text-muted-foreground text-sm">{config.description}</p>
        </div>
        {newButton}
      </div>

      <div className="bg-card flex flex-col flex-wrap gap-2 rounded-lg border p-3 sm:p-4 lg:flex-row lg:items-start">
        <form
          className="relative lg:w-52"
          onSubmit={(event) => {
            event.preventDefault();
            navigate({ q: q.trim() });
          }}
        >
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            aria-label="Search by return or invoice number"
            value={q}
            onChange={(event) => setQ(event.target.value)}
            onBlur={() => q.trim() !== filters.q && navigate({ q: q.trim() })}
            placeholder="Return or invoice no…"
            className="pl-8"
            maxLength={100}
          />
        </form>
        <Select
          value={filters.status}
          onValueChange={(value) =>
            value && navigate({ status: value as ReturnFilters["status"] })
          }
          items={STATUS_ITEMS}
        >
          <SelectTrigger className="w-full lg:w-36" aria-label="Status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(STATUS_ITEMS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="lg:w-52">
          <AsyncSearchableSelect
            aria-label={info.partyLabel}
            value={filters.partyId || null}
            valueLabel={partyName}
            onChange={(option) => navigate({ partyId: option?.value ?? "" })}
            search={kind === "sales" ? searchCustomers : searchSuppliers}
            placeholder={`All ${info.partyLabel.toLowerCase()}s`}
            searchPlaceholder="Search name or code…"
            emptyText={`No matching ${info.partyLabel.toLowerCase()}s`}
            clearLabel={`All ${info.partyLabel.toLowerCase()}s`}
          />
        </div>
        <div className="lg:w-52">
          <AsyncSearchableSelect
            key={filters.partyId}
            aria-label={info.invoiceLabel}
            value={filters.invoiceId || null}
            valueLabel={invoiceNo}
            onChange={(option) => navigate({ invoiceId: option?.value ?? "" })}
            search={searchInvoices(kind, filters.partyId)}
            placeholder="All invoices"
            searchPlaceholder="Search invoice number…"
            emptyText="No matching invoices"
            clearLabel="All invoices"
          />
        </div>
        <DateRangeControl
          filters={filters}
          onChange={(range) => navigate(range)}
        />
      </div>

      <div className="bg-card flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-center sm:gap-10">
        <div>
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            {config.NounPlural}
          </p>
          <p className="font-heading text-2xl font-semibold tabular-nums">
            {page.summary.count}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Net total (AED)
          </p>
          <p className="font-heading font-mono text-2xl font-semibold tabular-nums">
            {formatAmount(page.summary.netTotal)}
          </p>
        </div>
        <p className="text-muted-foreground text-sm sm:ml-auto sm:text-right">
          Cancelled {config.nounPlural} aren&apos;t counted in the total.
        </p>
      </div>

      {page.items.length === 0 ? (
        filtered ? (
          <StatePanel
            icon={SearchX}
            title={`No ${config.nounPlural} match these filters`}
            action={
              <Button
                variant="outline"
                onClick={() => {
                  setQ("");
                  navigate({
                    range: "month",
                    from: "",
                    to: "",
                    status: "all",
                    partyId: "",
                    invoiceId: "",
                    q: "",
                  });
                }}
              >
                Clear filters
              </Button>
            }
          >
            Try another date range, {info.partyLabel.toLowerCase()} or invoice.
          </StatePanel>
        ) : (
          <StatePanel
            icon={Undo2}
            title={`No ${config.nounPlural} this month`}
            action={newButton ?? undefined}
          >
            {kind === "sales"
              ? "A sales return takes goods back from a customer and reduces what they owe."
              : "A purchase return sends goods back to a supplier and reduces what you owe."}
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
            <Table className="min-w-[1040px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Return No</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead>{info.partyLabel}</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="text-right">Net total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Comments</TableHead>
                  <TableHead className="w-10">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {page.items.map((row) => {
                  const viewHref = returnPath(kind, row.id);
                  const isPosted = !isVoidStatus(row.status);
                  const openActivity = () =>
                    setActivity({
                      entityId: row.id,
                      title: `Activity · ${row.voucherNo}`,
                    });
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
                        {formatCalendarDate(row.voucherDate)}
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`${info.invoicesPath}/${encodeURIComponent(row.invoice.id)}`}
                          onClick={(event) => event.stopPropagation()}
                          className="font-mono text-sm hover:underline"
                        >
                          {row.invoice.voucherNo}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm">
                        {row.party.name ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {row.location.name ?? "—"}
                      </TableCell>
                      <TableCell className="max-w-56 truncate text-sm">
                        {row.reason}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm tabular-nums">
                        {formatAmount(row.netTotal)}
                      </TableCell>
                      <TableCell>
                        <VoucherStatusBadge status={row.status} />
                      </TableCell>
                      <TableCell className="text-center">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            openActivity();
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
                            <DropdownMenuItem
                              onClick={() => router.push(viewHref)}
                            >
                              <Eye /> View
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              disabled={pdf.busy !== null}
                              onClick={() =>
                                void pdf.print(row.id, row.voucherNo)
                              }
                            >
                              <Printer /> Print
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={openActivity}>
                              <History /> Activity &amp; Comments
                            </DropdownMenuItem>
                            {isPosted && access.canCancel ? (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  variant="destructive"
                                  onClick={() =>
                                    setCancelTarget({
                                      id: row.id,
                                      voucherNo: row.voucherNo,
                                      grandTotal: row.netTotal,
                                    })
                                  }
                                >
                                  <Ban /> Cancel {config.noun}
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
          <MasterPagination
            page={filters.page}
            pageCount={pageCount}
            totalItems={page.summary.count}
            pageSize={RETURNS_PAGE_SIZE}
            onPageChange={(next) => navigate({ page: next }, false)}
          />
        </>
      )}

      {pdf.fallback}
      <CancelVoucherDialog
        config={config}
        cancelAction={
          kind === "sales" ? cancelSalesReturn : cancelPurchaseReturn
        }
        target={cancelTarget}
        onClose={() => setCancelTarget(null)}
      />
      <ActivitySheet
        target={activity}
        onClose={() => setActivity(null)}
        entityType={config.entityType}
        subjectLabel={config.noun}
        onCommentAdded={() => startNavigation(() => router.refresh())}
      />
    </div>
  );
}

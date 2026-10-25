"use client";

import {
  Ban,
  Eye,
  FileText,
  History,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Plus,
  Printer,
  Search,
  SearchX,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { ActivitySheet } from "@/components/activity/activity-sheet";
import { MasterPagination } from "@/components/master/master-pagination";
import { StatePanel } from "@/components/master/state-panel";
import { AsyncSearchableSelect } from "@/components/shared/async-searchable-select";
import { SearchableSelect } from "@/components/shared/searchable-select";
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
import {
  LOCATION_TYPE_LABELS,
  type StockLocation,
} from "@/features/locations/types";
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

import { cancelPurchaseInvoice } from "./actions";
import {
  PURCHASE_INVOICE_CONFIG as config,
  PURCHASE_INVOICES_PAGE_SIZE,
  PURCHASE_INVOICES_PATH,
  purchaseInvoicePath,
} from "./constants";
import { toPurchaseInvoiceSearch } from "./filters";
import { searchSuppliers } from "./supplier-search";
import { PaymentStatusBadge } from "./purchase-invoice-lines";
import type { PurchaseInvoiceFilters, PurchaseInvoicePage } from "./types";

const PAYMENT_ITEMS: Record<PurchaseInvoiceFilters["paymentStatus"], string> = {
  all: "Any payment",
  unpaid: "Unpaid",
  partly_paid: "Partly paid",
  paid: "Paid",
};

const STATUS_ITEMS: Record<PurchaseInvoiceFilters["status"], string> = {
  all: "All statuses",
  posted: "Posted",
  cancelled: "Cancelled",
};

export function PurchaseInvoiceList({
  page,
  filters,
  access,
  locations,
  supplierName,
}: {
  page: PurchaseInvoicePage;
  filters: PurchaseInvoiceFilters;
  access: VoucherAccess;
  /** null when they couldn't be loaded — that filter is disabled. */
  locations: StockLocation[] | null;
  /** The supplier filter's label. */
  supplierName: string | null;
}) {
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

  function navigate(next: Partial<PurchaseInvoiceFilters>, resetPage = true) {
    const merged = { ...filters, ...(resetPage ? { page: 1 } : {}), ...next };
    startNavigation(() =>
      router.replace(`${pathname}${toPurchaseInvoiceSearch(merged)}`, {
        scroll: false,
      }),
    );
  }

  const filtered =
    filters.range !== "month" ||
    filters.status !== "all" ||
    filters.paymentStatus !== "all" ||
    filters.supplierId !== "" ||
    filters.locationId !== "" ||
    filters.q !== "";
  const pageCount = Math.max(
    1,
    Math.ceil(page.summary.count / PURCHASE_INVOICES_PAGE_SIZE),
  );
  const newButton = access.canCreate ? (
    <Link href={`${PURCHASE_INVOICES_PATH}/new`} className={buttonVariants()}>
      <Plus /> New Purchase Invoice
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
          className="relative lg:w-56"
          onSubmit={(event) => {
            event.preventDefault();
            navigate({ q: q.trim() });
          }}
        >
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            aria-label="Search by invoice or bill number"
            value={q}
            onChange={(event) => setQ(event.target.value)}
            onBlur={() => q.trim() !== filters.q && navigate({ q: q.trim() })}
            placeholder="Invoice or bill no…"
            className="pl-8"
            maxLength={100}
          />
        </form>
        <Select
          value={filters.status}
          onValueChange={(value) =>
            value &&
            navigate({ status: value as PurchaseInvoiceFilters["status"] })
          }
          items={STATUS_ITEMS}
        >
          <SelectTrigger className="w-full lg:w-40" aria-label="Status">
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
        <Select
          value={filters.paymentStatus}
          onValueChange={(value) =>
            value &&
            navigate({
              paymentStatus: value as PurchaseInvoiceFilters["paymentStatus"],
            })
          }
          items={PAYMENT_ITEMS}
        >
          <SelectTrigger className="w-full lg:w-40" aria-label="Payment status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(PAYMENT_ITEMS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="lg:w-56">
          <AsyncSearchableSelect
            aria-label="Supplier"
            value={filters.supplierId || null}
            valueLabel={supplierName}
            onChange={(option) => navigate({ supplierId: option?.value ?? "" })}
            search={searchSuppliers}
            placeholder="All suppliers"
            searchPlaceholder="Search name or code…"
            emptyText="No matching suppliers"
            clearLabel="All suppliers"
          />
        </div>
        <div className="lg:w-56">
          <SearchableSelect
            value={filters.locationId || null}
            onChange={(value) => navigate({ locationId: value ?? "" })}
            options={(locations ?? []).map((location) => ({
              value: location.id,
              label: location.name,
              description: location.code,
              badge: LOCATION_TYPE_LABELS[location.type],
            }))}
            placeholder={locations ? "All locations" : "Locations unavailable"}
            emptyText="No matching locations"
            clearLabel="All locations"
            disabled={locations === null}
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
            Invoices
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
        <div>
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Outstanding (AED)
          </p>
          <p className="font-heading text-primary font-mono text-2xl font-semibold tabular-nums">
            {formatAmount(page.summary.outstanding)}
          </p>
        </div>
        <p className="text-muted-foreground text-sm sm:ml-auto sm:text-right">
          Cancelled invoices aren&apos;t counted in the totals.
        </p>
      </div>

      {page.items.length === 0 ? (
        filtered ? (
          <StatePanel
            icon={SearchX}
            title="No purchase invoices match these filters"
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
                    paymentStatus: "all",
                    supplierId: "",
                    locationId: "",
                    q: "",
                  });
                }}
              >
                Clear filters
              </Button>
            }
          >
            Try another date range, supplier or location.
          </StatePanel>
        ) : (
          <StatePanel
            icon={FileText}
            title="No purchase invoices this month"
            action={newButton ?? undefined}
          >
            Enter each supplier bill: its products come into stock and the
            supplier is owed the total.
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
            <Table className="min-w-[1180px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice No</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Bill No</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead className="text-right">Net total</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Comments</TableHead>
                  <TableHead className="w-10">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {page.items.map((row) => {
                  const viewHref = purchaseInvoicePath(row.id);
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
                      <TableCell className="text-sm">
                        {row.supplier.name ?? "—"}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {row.billNo}
                      </TableCell>
                      <TableCell className="text-sm">
                        {row.location.name ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {formatCalendarDate(row.dueDate)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm tabular-nums">
                        {formatAmount(row.netTotal)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm tabular-nums">
                        {formatAmount(row.paidAmount)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm font-medium tabular-nums">
                        {isPosted ? formatAmount(row.balance) : "—"}
                      </TableCell>
                      <TableCell>
                        <span className="flex flex-wrap gap-1">
                          <VoucherStatusBadge status={row.status} />
                          {isPosted ? (
                            <PaymentStatusBadge
                              status={row.paymentStatus}
                              overdue={row.overdue}
                            />
                          ) : null}
                        </span>
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
                            {isPosted && access.canEdit ? (
                              <DropdownMenuItem
                                onClick={() => router.push(`${viewHref}/edit`)}
                              >
                                <Pencil /> Edit
                              </DropdownMenuItem>
                            ) : null}
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
                                  <Ban /> Cancel invoice
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
            pageSize={PURCHASE_INVOICES_PAGE_SIZE}
            onPageChange={(next) => navigate({ page: next }, false)}
          />
        </>
      )}

      {pdf.fallback}
      <CancelVoucherDialog
        config={config}
        cancelAction={cancelPurchaseInvoice}
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

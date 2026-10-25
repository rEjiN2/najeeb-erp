"use client";

import { CircleAlert, Loader2, Save, Trash2, UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { FormErrorSummary } from "@/components/master/form-error-summary";
import { MasterFormSheet } from "@/components/master/master-form-sheet";
import { AsyncSearchableSelect } from "@/components/shared/async-searchable-select";
import { SearchableSelect } from "@/components/shared/searchable-select";
import { UnsavedChangesGuard } from "@/components/shared/unsaved-changes-guard";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { VoucherToolbar } from "@/components/voucher/voucher-toolbar";
import {
  LOCATION_TYPE_LABELS,
  type StockLocation,
} from "@/features/locations/types";
import { rowErrorsOf } from "@/features/opening-stock/opening-stock-form";
import { createParty } from "@/features/parties/actions";
import { PARTY_KIND_CONFIG } from "@/features/parties/constants";
import { PartyForm } from "@/features/parties/party-form";
import type { PartyInput } from "@/features/parties/types";
import { formatQty } from "@/features/stock/constants";
import type { StockSummaryPage } from "@/features/stock/types";
import type { UserLookupItem } from "@/features/users/api";
import {
  ACCOUNT_TYPE_BADGES,
  CHEQUE_NUMBER_MAX_LENGTH,
  PAYMENT_METHODS,
  PAYMENT_REFERENCE_MAX_LENGTH,
} from "@/features/vouchers/constants";
import type {
  AccountLookupItem,
  PaymentMethod,
} from "@/features/vouchers/types";
import { browserApi } from "@/lib/browser-api";
import { formatAmount } from "@/lib/format";
import type { MutationResult } from "@/lib/mutation";
import { cn } from "@/lib/utils";

import { createSalesInvoice, updateSalesInvoice } from "./actions";
import { SALES_INVOICES_PATH, salesInvoicePath } from "./constants";
import {
  searchCustomers,
  searchSaleProducts,
  type SaleProductOption,
} from "./search";
import type { SalesInvoiceInput, SalesInvoiceLine } from "./types";

interface DraftLine {
  key: string;
  productId: string;
  code: string | null;
  name: string | null;
  unit: string | null;
  qty: string;
  rate: string;
  discount: string;
  vatRate: string;
}

/** Per product: stock tracked (stock/bundle) and on hand at the location;
 * available null when it can't be read (no stock:read). */
interface StockInfo {
  tracked: boolean;
  available: number | null;
}

const QTY = /^\d+(\.\d{1,3})?$/;
const RATE = /^\d+(\.\d{1,4})?$/;
const MONEY = /^\d+(\.\d{1,2})?$/;
const DAY_MS = 24 * 60 * 60 * 1000;
const METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Cash",
  cheque: "Cheque",
  bank: "Bank",
};
/** Account types each Pay now method receives into. */
const METHOD_ACCOUNT_TYPES: Record<PaymentMethod, string[]> = {
  cash: ["cash", "wallet"],
  bank: ["bank"],
  cheque: ["cheque"],
};

let seq = 0;
const newKey = () => `line-${++seq}`;

const round2 = (value: number) => Math.round(value * 100) / 100;
const round3 = (value: number) => Math.round(value * 1000) / 1000;
const num = (value: string, pattern: RegExp) =>
  pattern.test(value.trim()) ? Number(value) : 0;

function addDays(day: string, days: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + days * DAY_MS)
    .toISOString()
    .slice(0, 10);
}

/** Live pricing, as the backend does it: amount = qty x rate - discount. */
function priced(line: DraftLine) {
  const gross = round2(num(line.qty, QTY) * num(line.rate, RATE));
  const discount = num(line.discount, MONEY);
  const amount = round2(gross - discount);
  const vat = round2((amount * num(line.vatRate, MONEY)) / 100);
  return { gross, discount, amount, vat, net: round2(amount + vat) };
}

function lineError(line: DraftLine): string | null {
  if (!QTY.test(line.qty.trim()) || !(Number(line.qty) > 0)) {
    return "Enter a quantity greater than 0, up to 3 decimals.";
  }
  if (!RATE.test(line.rate.trim())) return "Enter a rate, up to 4 decimals.";
  if (line.discount.trim() && !MONEY.test(line.discount.trim())) {
    return "Discount must be 0 or more, up to 2 decimals.";
  }
  if (!MONEY.test(line.vatRate.trim()) || Number(line.vatRate) > 100) {
    return "VAT % must be between 0 and 100.";
  }
  if (priced(line).amount < 0)
    return "The discount is more than the line value.";
  return null;
}

/** On hand at a location (GET /stock/summary); null when it can't be read. */
async function stockOf(
  productId: string,
  code: string | null,
  locationId: string,
): Promise<number | null> {
  const params = new URLSearchParams({ locationId, pageSize: "20" });
  if (code) params.set("q", code);
  const result = await browserApi<StockSummaryPage>(`/stock/summary?${params}`);
  if (!result.ok) return null;
  const row = result.data.items.find((item) => item.productId === productId);
  return (
    row?.byLocation.find((entry) => entry.locationId === locationId)?.qty ?? 0
  );
}

interface SalesInvoiceFormProps {
  today: string;
  /** Active warehouses, stores and vans the user may sell from. */
  locations: StockLocation[];
  /** parties:manage — offers "Add customer". */
  canAddCustomer: boolean;
  /** Users who can be Sold By; the signed-in user is pre-selected. */
  collectors: UserLookupItem[];
  me: UserLookupItem | null;
  /** vouchers:select-collector — without it Sold By is locked. */
  canSelectCollector: boolean;
  /** sales:override-price — rate and VAT % are editable. */
  canOverridePrice: boolean;
  /** sales:discount — shows the discount column. */
  canDiscount: boolean;
  /** stock:read — shows what's on hand and blocks selling more. */
  canReadStock: boolean;
  /** Accounts Pay now can receive into (scoped users: their allowed ones). */
  payAccounts: AccountLookupItem[];
  /** Present when editing. */
  existing?: {
    id: string;
    voucherNo: string;
    date: string;
    customerId: string;
    customerName: string | null;
    locationId: string;
    soldBy: { id: string; name: string };
    dueDate: string;
    remarks: string;
    lines: SalesInvoiceLine[];
  };
}

export function SalesInvoiceForm({
  today,
  locations,
  canAddCustomer,
  collectors,
  me,
  canSelectCollector,
  canOverridePrice,
  canDiscount,
  canReadStock,
  payAccounts,
  existing,
}: SalesInvoiceFormProps) {
  const router = useRouter();
  const [date, setDate] = useState(existing?.date.slice(0, 10) ?? today);
  const [customer, setCustomer] = useState<{
    id: string;
    name: string | null;
  } | null>(
    existing ? { id: existing.customerId, name: existing.customerName } : null,
  );
  const [creditDays, setCreditDays] = useState<number | null>(null);
  const [cashCustomer, setCashCustomer] = useState(false);
  const [locationId, setLocationId] = useState<string | null>(
    existing?.locationId ?? (locations.length === 1 ? locations[0]!.id : null),
  );
  const [soldById, setSoldById] = useState<string | null>(
    existing?.soldBy.id ?? me?.id ?? null,
  );
  const [dueDate, setDueDate] = useState(
    existing?.dueDate.slice(0, 10) ?? today,
  );
  // Once typed (or on an existing invoice), the due date is left alone.
  const [dueTouched, setDueTouched] = useState(Boolean(existing));
  const [remarks, setRemarks] = useState(existing?.remarks ?? "");
  const [lines, setLines] = useState<DraftLine[]>(() =>
    (existing?.lines ?? []).map((line) => ({
      key: newKey(),
      productId: line.productId,
      code: line.code,
      name: line.name,
      unit: line.unit,
      qty: String(line.qty),
      rate: String(line.rate),
      discount: line.discount ? String(line.discount) : "",
      vatRate: String(line.vatRate),
    })),
  );
  const [stock, setStock] = useState<Record<string, StockInfo>>({});

  const firstAccount = (method: PaymentMethod) =>
    payAccounts.find((account) =>
      METHOD_ACCOUNT_TYPES[method].includes(account.type),
    )?.id ?? null;
  const [payNow, setPayNow] = useState(!existing);
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [payAccountId, setPayAccountId] = useState<string | null>(
    firstAccount("cash"),
  );
  const [payAmount, setPayAmount] = useState("");
  // Until typed, Pay now follows the invoice total.
  const [amountTouched, setAmountTouched] = useState(false);
  const [chequeNumber, setChequeNumber] = useState("");
  const [chequeDate, setChequeDate] = useState(today);
  const [chequeBankName, setChequeBankName] = useState("");
  const [paymentReference, setPaymentReference] = useState("");

  const [changeNote, setChangeNote] = useState("");
  const [customerPanelOpen, setCustomerPanelOpen] = useState(false);
  const [creditWarning, setCreditWarning] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [serverErrors, setServerErrors] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();

  const touch = () => setDirty(true);
  const update = (key: string, patch: Partial<DraftLine>) => {
    setLines((current) =>
      current.map((line) => (line.key === key ? { ...line, ...patch } : line)),
    );
    touch();
  };

  // What's on hand follows the location; an edit's own lines were already
  // taken out of it, so they count as available again.
  const productKey = lines
    .map((line) => line.productId)
    .sort()
    .join(",");
  useEffect(() => {
    if (!locationId) return;
    let cancelled = false;
    const ids = [...new Set(productKey ? productKey.split(",") : [])];
    void Promise.all(
      ids.map(async (productId) => {
        const line = lines.find((l) => l.productId === productId);
        const [product, available] = await Promise.all([
          browserApi<{ type: string }>(
            `/products/${encodeURIComponent(productId)}`,
          ),
          canReadStock
            ? stockOf(productId, line?.code ?? null, locationId)
            : Promise.resolve(null),
        ]);
        return [
          productId,
          {
            tracked: product.ok ? product.data.type !== "non_stock" : true,
            available,
          },
        ] as const;
      }),
    ).then((entries) => {
      if (!cancelled) setStock(Object.fromEntries(entries));
    });
    return () => {
      cancelled = true;
    };
    // Re-reads when the location or the set of products changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationId, productKey, canReadStock]);

  const availableOf = (productId: string): number | null => {
    const info = stock[productId];
    if (!info || !info.tracked || info.available === null) return null;
    const own =
      existing && existing.locationId === locationId
        ? existing.lines
            .filter((line) => line.productId === productId)
            .reduce((sum, line) => sum + line.qty, 0)
        : 0;
    return round3(info.available + own);
  };
  const qtyOf = (productId: string) =>
    round3(
      lines
        .filter((line) => line.productId === productId)
        .reduce((sum, line) => sum + num(line.qty, QTY), 0),
    );
  const location = locations.find((candidate) => candidate.id === locationId);
  const stockError = (line: DraftLine): string | null => {
    const available = availableOf(line.productId);
    if (available === null || qtyOf(line.productId) <= available) return null;
    return `Only ${formatQty(Math.max(available, 0))}${line.unit ? ` ${line.unit}` : ""} available at ${location?.name ?? "this location"}.`;
  };

  const totals = lines.reduce(
    (sum, line) => {
      const p = priced(line);
      return {
        gross: sum.gross + p.gross,
        discount: sum.discount + p.discount,
        taxable: sum.taxable + p.amount,
        tax: sum.tax + p.vat,
        net: sum.net + p.net,
      };
    },
    { gross: 0, discount: 0, taxable: 0, tax: 0, net: 0 },
  );
  const net = round2(totals.net);

  const paying = !existing && (payNow || cashCustomer);
  const paidText = cashCustomer || !amountTouched ? net.toFixed(2) : payAmount;
  const paid = num(paidText, MONEY);
  const payProblem = (() => {
    if (!paying) return null;
    if (!MONEY.test(paidText.trim()) || !(paid > 0)) {
      return "Enter the amount paid, greater than 0.";
    }
    if (paid > net + 0.001) return "More than the invoice total.";
    if (method !== "cheque" && !payAccountId) {
      return "Pick the account the money goes into.";
    }
    if (method === "cheque" && (!chequeNumber.trim() || !chequeDate)) {
      return "Enter the cheque number and date.";
    }
    return null;
  })();

  const { byRow, general } = rowErrorsOf(serverErrors);
  const hasLineErrors = lines.some(
    (line) => lineError(line) !== null || stockError(line) !== null,
  );
  const methodAccounts = payAccounts.filter((account) =>
    METHOD_ACCOUNT_TYPES[method].includes(account.type),
  );
  const soldByOptions = [
    ...collectors,
    ...(me && !collectors.some((user) => user.id === me.id) ? [me] : []),
    ...(existing &&
    !collectors.some((user) => user.id === existing.soldBy.id) &&
    existing.soldBy.id !== me?.id
      ? [existing.soldBy]
      : []),
  ];

  async function pickCustomer(next: { id: string; name: string } | null) {
    setCustomer(next);
    setCreditDays(null);
    setCashCustomer(false);
    touch();
    if (!next) return;
    const result = await browserApi<{
      creditDays: number | null;
      systemKey?: string | null;
    }>(`/parties/${encodeURIComponent(next.id)}`);
    const days = result.ok ? (result.data.creditDays ?? 0) : null;
    setCreditDays(days);
    setCashCustomer(result.ok && result.data.systemKey === "cash_customer");
    if (days !== null && !dueTouched) setDueDate(addDays(date, days));
  }

  function addProduct(option: SaleProductOption | null) {
    if (!option) return;
    setLines((current) => [
      ...current,
      {
        key: newKey(),
        productId: option.value,
        code: option.code,
        name: option.label,
        unit: option.unit,
        qty: "",
        rate: String(option.salePrice),
        discount: "",
        vatRate: String(option.vatRate),
      },
    ]);
    touch();
  }

  async function addCustomer(
    values: PartyInput,
  ): Promise<MutationResult<unknown>> {
    let result;
    try {
      result = await createParty("customer", values);
    } catch {
      return {
        ok: false,
        messages: [
          "Couldn't reach the app. Check your connection and try again.",
        ],
      };
    }
    if (!result) return { ok: true }; // Redirected to sign in.
    if (result.ok && result.data) {
      setCustomerPanelOpen(false);
      if (values.status === "inactive") {
        toast.info(`${result.data.name} was saved as inactive`, {
          description: "Sales need an active customer.",
        });
      } else {
        void pickCustomer({ id: result.data.id, name: result.data.name });
      }
    }
    return result;
  }

  function save(acknowledgeCredit = false) {
    setShowErrors(true);
    setServerErrors([]);
    if (
      !customer ||
      !locationId ||
      !soldById ||
      !date ||
      lines.length === 0 ||
      hasLineErrors ||
      payProblem
    ) {
      return;
    }
    startTransition(async () => {
      try {
        const input: SalesInvoiceInput = {
          date,
          customerId: customer.id,
          locationId,
          soldById,
          dueDate,
          remarks,
          lines: lines.map((line) => ({
            productId: line.productId,
            qty: Number(line.qty),
            rate: Number(line.rate),
            discount: num(line.discount, MONEY),
            vatRate: Number(line.vatRate),
          })),
          payNow: paying
            ? {
                method,
                accountId: payAccountId,
                amount: paid,
                chequeNumber,
                chequeDate,
                chequeBankName,
                paymentReference,
              }
            : null,
          acknowledgeCredit,
        };
        const result = existing
          ? await updateSalesInvoice(existing.id, input, changeNote)
          : await createSalesInvoice(input);
        if (!result) return; // Redirected to sign in.
        if (!result.ok) {
          const ask = result.messages.find((m) =>
            m.includes("acknowledgeCredit"),
          );
          if (result.status === 409 && ask && !acknowledgeCredit) {
            setCreditWarning(ask.replace(/\.?\s*Resend with.*$/, "."));
            return;
          }
          setServerErrors(result.messages);
          return;
        }
        setLeaving(true);
        const id = result.id ?? existing?.id;
        router.push(
          id ? `${salesInvoicePath(id)}?saved=1` : SALES_INVOICES_PATH,
        );
      } catch {
        setServerErrors([
          "Couldn't reach the app. Check your connection and try again.",
        ]);
      }
    });
  }

  const backHref = existing
    ? salesInvoicePath(existing.id)
    : SALES_INVOICES_PATH;
  const required = <span className="text-destructive">*</span>;
  const fieldError = (show: boolean, message: string) =>
    showErrors && show ? (
      <p className="text-destructive text-sm">{message}</p>
    ) : null;
  const colCount = canDiscount ? 10 : 9;

  return (
    <div className="space-y-6">
      <VoucherToolbar
        title={
          existing
            ? `Edit Sales Invoice ${existing.voucherNo}`
            : "New Sales Invoice"
        }
        description="A sale: the products leave the location's stock and the customer owes, or pays, the net total."
        back={
          existing
            ? { href: backHref, label: existing.voucherNo }
            : { href: SALES_INVOICES_PATH, label: "Sales Invoices" }
        }
        actions={
          <>
            <Link
              href={backHref}
              className={buttonVariants({ variant: "outline" })}
            >
              Cancel
            </Link>
            <Button onClick={() => save()} disabled={pending}>
              {pending ? <Loader2 className="animate-spin" /> : <Save />}
              {pending ? "Saving…" : existing ? "Save changes" : "Save"}
            </Button>
          </>
        }
      />

      <FormErrorSummary messages={general} />
      {showErrors && lines.length === 0 ? (
        <FormErrorSummary messages={["Add at least one product."]} />
      ) : null}

      <Card className="gap-4">
        <CardContent className="grid gap-4 pt-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Customer {required}</Label>
              {canAddCustomer ? (
                <button
                  type="button"
                  onClick={() => setCustomerPanelOpen(true)}
                  className="text-primary flex items-center gap-1 text-xs font-medium hover:underline"
                >
                  <UserPlus className="size-3.5" /> Add customer
                </button>
              ) : null}
            </div>
            <AsyncSearchableSelect
              aria-label="Customer"
              value={customer?.id ?? null}
              valueLabel={customer?.name}
              onChange={(option) =>
                void pickCustomer(
                  option ? { id: option.value, name: option.label } : null,
                )
              }
              search={searchCustomers}
              placeholder="Pick a customer"
              searchPlaceholder="Search name or code…"
              emptyText="No matching customers"
              allowClear={false}
            />
            {fieldError(!customer, "Pick a customer.")}
            {cashCustomer && !existing ? (
              <p className="text-muted-foreground text-xs">
                Cash customer: paid in full at the sale.
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label>Sold from {required}</Label>
            <SearchableSelect
              value={locationId}
              onChange={(value) => {
                setLocationId(value);
                touch();
              }}
              options={locations.map((candidate) => ({
                value: candidate.id,
                label: candidate.name,
                description: candidate.code,
                badge: LOCATION_TYPE_LABELS[candidate.type],
              }))}
              placeholder="Pick a warehouse, store or van"
              emptyText="No matching locations"
              allowClear={false}
              disabled={locations.length === 1}
            />
            {fieldError(!locationId, "Pick a location.")}
          </div>
          <div className="space-y-2">
            <Label>Sold by {required}</Label>
            <SearchableSelect
              value={soldById}
              onChange={(value) => {
                setSoldById(value);
                touch();
              }}
              options={soldByOptions.map((user) => ({
                value: user.id,
                label: user.name,
              }))}
              placeholder="Pick the salesman"
              emptyText="No matching users"
              allowClear={false}
              disabled={!canSelectCollector}
            />
            {fieldError(!soldById, "Pick who made the sale.")}
          </div>
          <div className="space-y-2">
            <Label htmlFor="si-date">Invoice date {required}</Label>
            <Input
              id="si-date"
              type="date"
              value={date}
              onChange={(event) => {
                const next = event.target.value;
                setDate(next);
                if (next && !dueTouched && creditDays !== null) {
                  setDueDate(addDays(next, creditDays));
                }
                touch();
              }}
            />
            {fieldError(!date, "Enter the invoice date.")}
          </div>
          <div className="space-y-2">
            <Label htmlFor="si-due-date">Due date</Label>
            <Input
              id="si-due-date"
              type="date"
              value={dueDate}
              onChange={(event) => {
                setDueDate(event.target.value);
                setDueTouched(true);
                touch();
              }}
            />
            {creditDays !== null && !dueTouched ? (
              <p className="text-muted-foreground text-xs">
                Invoice date + {creditDays} credit day
                {creditDays === 1 ? "" : "s"}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="si-remarks">Remarks</Label>
            <Textarea
              id="si-remarks"
              value={remarks}
              maxLength={1000}
              onChange={(event) => {
                setRemarks(event.target.value);
                touch();
              }}
              className="min-h-9"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="gap-4">
        <CardHeader>
          <CardTitle>Products ({lines.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="overflow-x-auto rounded-lg border">
            <Table className={canDiscount ? "min-w-[980px]" : "min-w-[860px]"}>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead className="w-28 text-right">Qty</TableHead>
                  <TableHead className="w-32 text-right">Rate</TableHead>
                  {canDiscount ? (
                    <TableHead className="w-28 text-right">Discount</TableHead>
                  ) : null}
                  <TableHead className="w-24 text-right">VAT %</TableHead>
                  <TableHead className="w-28 text-right">Amount</TableHead>
                  <TableHead className="w-24 text-right">VAT</TableHead>
                  <TableHead className="w-28 text-right">Net</TableHead>
                  <TableHead className="w-10">
                    <span className="sr-only">Remove</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line, index) => {
                  const p = priced(line);
                  const available = availableOf(line.productId);
                  const rowErrors = [
                    ...(showErrors && lineError(line)
                      ? [lineError(line)!]
                      : []),
                    ...(stockError(line) ? [stockError(line)!] : []),
                    ...(byRow.get(index + 1) ?? []),
                  ];
                  const label = line.name ?? "product";
                  const numberInput = (
                    field: "qty" | "rate" | "discount" | "vatRate",
                    step: string,
                    aria: string,
                    readOnly = false,
                  ) => (
                    <Input
                      aria-label={`${aria} for ${label}`}
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step={step}
                      value={line[field]}
                      readOnly={readOnly}
                      tabIndex={readOnly ? -1 : undefined}
                      onChange={(event) =>
                        update(line.key, { [field]: event.target.value })
                      }
                      placeholder="0"
                      className={cn(
                        "text-right font-mono",
                        readOnly && "bg-muted/50",
                      )}
                    />
                  );
                  return (
                    <TableRow
                      key={line.key}
                      className={cn(rowErrors.length > 0 && "bg-destructive/5")}
                    >
                      <TableCell className="text-muted-foreground align-top text-sm tabular-nums">
                        {index + 1}
                      </TableCell>
                      <TableCell className="align-top">
                        <span className="text-sm font-medium">
                          {line.name ?? "Unknown product"}
                        </span>
                        <span className="text-muted-foreground block font-mono text-xs">
                          {line.code}
                          {line.unit ? ` · ${line.unit}` : ""}
                          {available !== null
                            ? ` · ${formatQty(available)} available`
                            : ""}
                        </span>
                        {rowErrors.map((message) => (
                          <p
                            key={message}
                            className="text-destructive mt-1 flex items-start gap-1 text-xs"
                          >
                            <CircleAlert className="mt-0.5 size-3 shrink-0" />
                            {message}
                          </p>
                        ))}
                      </TableCell>
                      <TableCell className="align-top">
                        {numberInput("qty", "0.001", "Quantity")}
                      </TableCell>
                      <TableCell className="align-top">
                        {numberInput(
                          "rate",
                          "0.0001",
                          "Rate",
                          !canOverridePrice,
                        )}
                      </TableCell>
                      {canDiscount ? (
                        <TableCell className="align-top">
                          {numberInput("discount", "0.01", "Discount")}
                        </TableCell>
                      ) : null}
                      <TableCell className="align-top">
                        {numberInput(
                          "vatRate",
                          "0.01",
                          "VAT %",
                          !canOverridePrice,
                        )}
                      </TableCell>
                      <TableCell className="pt-4 text-right align-top font-mono text-sm tabular-nums">
                        {formatAmount(p.amount)}
                      </TableCell>
                      <TableCell className="pt-4 text-right align-top font-mono text-sm tabular-nums">
                        {formatAmount(p.vat)}
                      </TableCell>
                      <TableCell className="pt-4 text-right align-top font-mono text-sm font-medium tabular-nums">
                        {formatAmount(p.net)}
                      </TableCell>
                      <TableCell className="align-top">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Remove ${label}`}
                          onClick={() => {
                            setLines((current) =>
                              current.filter((l) => l.key !== line.key),
                            );
                            touch();
                          }}
                        >
                          <Trash2 />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {lines.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={colCount}
                      className="text-muted-foreground py-8 text-center text-sm"
                    >
                      No products yet. Add one below.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="w-full max-w-sm space-y-2">
              <AsyncSearchableSelect<SaleProductOption>
                aria-label="Add a product"
                value={null}
                onChange={(option) => addProduct(option)}
                search={searchSaleProducts}
                placeholder="+ Add a product"
                searchPlaceholder="Search name, code or barcode…"
                emptyText="No matching products"
                allowClear={false}
              />
              {!locationId && lines.length > 0 ? (
                <p className="text-muted-foreground text-sm">
                  Pick a location to see what&apos;s in stock.
                </p>
              ) : null}
            </div>
            <dl className="w-full space-y-1 text-sm sm:w-72">
              {(
                [
                  ["Gross", totals.gross],
                  ["Discount", totals.discount],
                  ["Taxable", totals.taxable],
                  ["Tax", totals.tax],
                ] as const
              ).map(([label, value]) => (
                <div key={label} className="flex justify-between">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="font-mono tabular-nums">
                    {formatAmount(value)}
                  </dd>
                </div>
              ))}
              <div className="flex justify-between border-t pt-1 text-base font-semibold">
                <dt>Net Total (AED)</dt>
                <dd className="font-mono tabular-nums">{formatAmount(net)}</dd>
              </div>
            </dl>
          </div>
        </CardContent>
      </Card>

      {existing ? null : (
        <Card className="gap-4">
          <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
            <CardTitle>Pay now</CardTitle>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={paying}
                disabled={cashCustomer}
                onCheckedChange={(checked) => {
                  setPayNow(checked === true);
                  touch();
                }}
              />
              Payment taken at the sale
            </label>
          </CardHeader>
          {paying ? (
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label>Method</Label>
                <div className="flex gap-1">
                  {PAYMENT_METHODS.map((value) => (
                    <Button
                      key={value}
                      type="button"
                      size="sm"
                      variant={method === value ? "default" : "outline"}
                      onClick={() => {
                        setMethod(value);
                        setPayAccountId(firstAccount(value));
                        touch();
                      }}
                    >
                      {METHOD_LABELS[value]}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>
                  Received into{" "}
                  {method === "cheque" ? (
                    <span className="text-muted-foreground font-normal">
                      (optional)
                    </span>
                  ) : (
                    required
                  )}
                </Label>
                <SearchableSelect
                  value={payAccountId}
                  onChange={(value) => {
                    setPayAccountId(value);
                    touch();
                  }}
                  options={methodAccounts.map((account) => ({
                    value: account.id,
                    label: account.name,
                    description: account.code,
                    badge: ACCOUNT_TYPE_BADGES[account.type] ?? account.type,
                  }))}
                  placeholder={
                    method === "cheque"
                      ? "Company cheques in hand"
                      : "Pick an account"
                  }
                  emptyText="No accounts you can receive into"
                  allowClear={method === "cheque"}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="si-paid">Amount (AED) {required}</Label>
                <Input
                  id="si-paid"
                  inputMode="decimal"
                  value={paidText}
                  readOnly={cashCustomer}
                  onChange={(event) => {
                    setPayAmount(event.target.value);
                    setAmountTouched(true);
                    touch();
                  }}
                  className="text-right font-mono"
                />
                <p className="text-muted-foreground text-xs tabular-nums">
                  Remaining balance AED{" "}
                  {formatAmount(Math.max(round2(net - paid), 0))}
                </p>
              </div>
              {method === "cheque" ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="si-cheque-no">Cheque no {required}</Label>
                    <Input
                      id="si-cheque-no"
                      value={chequeNumber}
                      maxLength={CHEQUE_NUMBER_MAX_LENGTH}
                      onChange={(event) => {
                        setChequeNumber(event.target.value);
                        touch();
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="si-cheque-date">
                      Cheque date {required}
                    </Label>
                    <Input
                      id="si-cheque-date"
                      type="date"
                      value={chequeDate}
                      onChange={(event) => {
                        setChequeDate(event.target.value);
                        touch();
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="si-cheque-bank">Bank</Label>
                    <Input
                      id="si-cheque-bank"
                      value={chequeBankName}
                      maxLength={100}
                      onChange={(event) => {
                        setChequeBankName(event.target.value);
                        touch();
                      }}
                    />
                  </div>
                </>
              ) : null}
              {method === "bank" ? (
                <div className="space-y-2">
                  <Label htmlFor="si-reference">Reference</Label>
                  <Input
                    id="si-reference"
                    value={paymentReference}
                    maxLength={PAYMENT_REFERENCE_MAX_LENGTH}
                    onChange={(event) => {
                      setPaymentReference(event.target.value);
                      touch();
                    }}
                  />
                </div>
              ) : null}
              {showErrors && payProblem ? (
                <p className="text-destructive text-sm sm:col-span-full">
                  {payProblem}
                </p>
              ) : null}
            </CardContent>
          ) : null}
        </Card>
      )}

      {existing ? (
        <div className="bg-card space-y-2 rounded-lg border p-4">
          <Label htmlFor="si-change-note">
            Reason for change{" "}
            <span className="text-muted-foreground font-normal">
              (optional)
            </span>
          </Label>
          <Input
            id="si-change-note"
            value={changeNote}
            onChange={(event) => {
              setChangeNote(event.target.value);
              touch();
            }}
            maxLength={500}
          />
        </div>
      ) : null}

      <Dialog
        open={creditWarning !== null}
        onOpenChange={(open) => !open && setCreditWarning(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Over the credit limit</DialogTitle>
            <DialogDescription>{creditWarning}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreditWarning(null)}>
              Go back
            </Button>
            <Button
              onClick={() => {
                setCreditWarning(null);
                save(true);
              }}
              disabled={pending}
            >
              Save anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {canAddCustomer ? (
        <MasterFormSheet
          open={customerPanelOpen}
          onOpenChange={setCustomerPanelOpen}
          title="Add Customer"
          description="Saved to Customers and picked on this sales invoice."
        >
          {customerPanelOpen ? (
            <PartyForm
              config={PARTY_KIND_CONFIG.customer}
              initialValue={null}
              canManage
              onSubmit={addCustomer}
            />
          ) : null}
        </MasterFormSheet>
      ) : null}

      <UnsavedChangesGuard when={dirty && !leaving} />
    </div>
  );
}

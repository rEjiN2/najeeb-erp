"use client";

import {
  CircleAlert,
  Loader2,
  Paperclip,
  Save,
  Trash2,
  Upload,
  PackagePlus,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { FormErrorSummary } from "@/components/master/form-error-summary";
import { MasterFormSheet } from "@/components/master/master-form-sheet";
import { AsyncSearchableSelect } from "@/components/shared/async-searchable-select";
import { SearchableSelect } from "@/components/shared/searchable-select";
import { UnsavedChangesGuard } from "@/components/shared/unsaved-changes-guard";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import type { ProductGroup } from "@/features/product-groups/types";
import { createProduct } from "@/features/products/actions";
import { ProductForm } from "@/features/products/product-form";
import type { ProductInput } from "@/features/products/types";
import type { Unit } from "@/features/units/types";
import { formatQty } from "@/features/stock/constants";
import {
  searchProducts,
  type ProductOption,
} from "@/features/stock/product-search";
import {
  ATTACHMENT_ACCEPT,
  AttachmentPreview,
  attachmentHref,
  attachmentProblem,
} from "@/features/vouchers/attachments";
import { describeFailure } from "@/lib/api-types";
import { browserApi, browserUpload } from "@/lib/browser-api";
import { formatAmount } from "@/lib/format";
import type { MutationResult } from "@/lib/mutation";
import { cn } from "@/lib/utils";

import { createPurchaseInvoice, updatePurchaseInvoice } from "./actions";
import { PURCHASE_INVOICES_PATH, purchaseInvoicePath } from "./constants";
import { searchSuppliers } from "./supplier-search";
import type { PurchaseInvoiceLine } from "./types";

interface DraftLine {
  key: string;
  productId: string;
  code: string | null;
  name: string | null;
  unit: string | null;
  /** The product's purchase price when it was added; null without products:view-cost. */
  lastPrice: number | null;
  qty: string;
  rate: string;
  discount: string;
  vatRate: string;
}

const QTY = /^\d+(\.\d{1,3})?$/;
const RATE = /^\d+(\.\d{1,4})?$/;
const MONEY = /^\d+(\.\d{1,2})?$/;
const DAY_MS = 24 * 60 * 60 * 1000;

let seq = 0;
const newKey = () => `line-${++seq}`;

const round2 = (value: number) => Math.round(value * 100) / 100;
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

interface PurchaseInvoiceFormProps {
  today: string;
  /** Active warehouses, stores and vans the user may receive stock at. */
  locations: StockLocation[];
  /** parties:manage — offers "Add supplier". */
  canAddSupplier: boolean;
  /** products:manage — offers "Add product" with what its form needs; null hides it. */
  productMaster: {
    groups: ProductGroup[];
    units: Unit[];
    canViewCost: boolean;
  } | null;
  /** Present when editing. */
  existing?: {
    id: string;
    voucherNo: string;
    date: string;
    supplierId: string;
    supplierName: string | null;
    locationId: string;
    billNo: string;
    billDate: string | null;
    dueDate: string;
    remarks: string;
    attachmentFileRefs: string[];
    updatePurchasePrice: boolean;
    lines: PurchaseInvoiceLine[];
  };
}

export function PurchaseInvoiceForm({
  today,
  locations,
  canAddSupplier,
  productMaster,
  existing,
}: PurchaseInvoiceFormProps) {
  const [productPanelOpen, setProductPanelOpen] = useState(false);
  const router = useRouter();
  const [date, setDate] = useState(existing?.date.slice(0, 10) ?? today);
  const [supplier, setSupplier] = useState<{
    id: string;
    name: string | null;
  } | null>(
    existing ? { id: existing.supplierId, name: existing.supplierName } : null,
  );
  const [creditDays, setCreditDays] = useState<number | null>(null);
  const [locationId, setLocationId] = useState<string | null>(
    existing?.locationId ?? (locations.length === 1 ? locations[0]!.id : null),
  );
  const [billNo, setBillNo] = useState(existing?.billNo ?? "");
  const [billDate, setBillDate] = useState(
    existing?.billDate?.slice(0, 10) ?? "",
  );
  const [dueDate, setDueDate] = useState(
    existing?.dueDate.slice(0, 10) ?? today,
  );
  // Once typed (or on an existing invoice), the due date is left alone.
  const [dueTouched, setDueTouched] = useState(Boolean(existing));
  const [remarks, setRemarks] = useState(existing?.remarks ?? "");
  const [keptFiles, setKeptFiles] = useState<string[]>(
    existing?.attachmentFileRefs ?? [],
  );
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [preview, setPreview] = useState<File | null>(null);
  const uploaded = useRef(new Map<File, string>());
  const fileInput = useRef<HTMLInputElement>(null);
  const [updatePrice, setUpdatePrice] = useState(
    existing?.updatePurchasePrice ?? true,
  );
  const [lines, setLines] = useState<DraftLine[]>(() =>
    (existing?.lines ?? []).map((line) => ({
      key: newKey(),
      productId: line.productId,
      code: line.code,
      name: line.name,
      unit: line.unit,
      lastPrice: null,
      qty: String(line.qty),
      rate: String(line.rate),
      discount: line.discount ? String(line.discount) : "",
      vatRate: String(line.vatRate),
    })),
  );
  const [adding, setAdding] = useState(false);
  const [changeNote, setChangeNote] = useState("");
  const [supplierPanelOpen, setSupplierPanelOpen] = useState(false);
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

  const totals = lines.reduce(
    (sum, line) => {
      const p = priced(line);
      return {
        gross: sum.gross + p.gross,
        discount: sum.discount + p.discount,
        tax: sum.tax + p.vat,
        net: sum.net + p.net,
        qty: sum.qty + num(line.qty, QTY),
      };
    },
    { gross: 0, discount: 0, tax: 0, net: 0, qty: 0 },
  );
  const location = locations.find((candidate) => candidate.id === locationId);

  const { byRow, general } = rowErrorsOf(serverErrors);
  const hasLineErrors = lines.some((line) => lineError(line) !== null);

  async function pickSupplier(next: { id: string; name: string } | null) {
    setSupplier(next);
    setCreditDays(null);
    touch();
    if (!next) return;
    const result = await browserApi<{ creditDays: number | null }>(
      `/parties/${encodeURIComponent(next.id)}`,
    );
    const days = result.ok ? (result.data.creditDays ?? 0) : null;
    setCreditDays(days);
    if (days !== null && !dueTouched) setDueDate(addDays(date, days));
  }

  async function addProduct(option: ProductOption | null) {
    if (!option) return;
    setAdding(true);
    // Lookup has no cost; the product itself has it with products:view-cost.
    const result = await browserApi<{
      code: string;
      purchasePrice?: number;
      vatRate: number;
      unit: { symbol: string } | null;
    }>(`/products/${encodeURIComponent(option.value)}`);
    setAdding(false);
    const product = result.ok ? result.data : null;
    setLines((current) => [
      ...current,
      {
        key: newKey(),
        productId: option.value,
        code: product?.code ?? option.code,
        name: option.label,
        unit: product?.unit?.symbol ?? option.unit,
        lastPrice: product?.purchasePrice ?? null,
        qty: "",
        rate:
          product?.purchasePrice !== undefined
            ? String(product.purchasePrice)
            : "",
        discount: "",
        vatRate: product ? String(product.vatRate) : "5",
      },
    ]);
    touch();
  }

  /** Saves a new product from the side panel and puts it on a line. */
  async function addNewProduct(values: ProductInput): Promise<MutationResult> {
    let result;
    try {
      result = await createProduct(values);
    } catch {
      return {
        ok: false,
        messages: [
          "Couldn't reach the app. Check your connection and try again.",
        ],
      };
    }
    if (!result) return { ok: true }; // Redirected to sign in.
    if (result.ok && result.id) {
      setProductPanelOpen(false);
      if (values.status === "inactive") {
        toast.info(`${values.name} was saved as inactive`, {
          description: "Purchases need an active product.",
        });
      } else {
        void addProduct({
          value: result.id,
          label: values.name.trim(),
          code: "",
          unit: null,
        });
      }
    }
    return result;
  }

  async function addSupplier(
    values: PartyInput,
  ): Promise<MutationResult<unknown>> {
    let result;
    try {
      result = await createParty("supplier", values);
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
      setSupplierPanelOpen(false);
      if (values.status === "inactive") {
        toast.info(`${result.data.name} was saved as inactive`, {
          description: "Purchases need an active supplier.",
        });
      } else {
        void pickSupplier({ id: result.data.id, name: result.data.name });
      }
    }
    return result;
  }

  function addFile(file: File | undefined) {
    if (!file) return;
    const problem = attachmentProblem(file);
    if (problem) {
      toast.error(problem);
      return;
    }
    setNewFiles((current) => [...current, file]);
    setPreview(file);
    touch();
  }

  /** Uploads files not yet stored; returns their ids, or an error. */
  async function uploadFiles(
    supplierId: string,
  ): Promise<{ ok: true; ids: string[] } | { ok: false; message: string }> {
    const ids: string[] = [];
    for (const file of newFiles) {
      const known = uploaded.current.get(file);
      if (known) {
        ids.push(known);
        continue;
      }
      const form = new FormData();
      form.set("file", file);
      form.set("ownerType", "supplier");
      form.set("ownerId", supplierId);
      const result = await browserUpload<{ id: string }>("/files/upload", form);
      if (!result.ok) {
        return {
          ok: false,
          message: `Couldn't upload ${file.name}: ${describeFailure(result)}`,
        };
      }
      uploaded.current.set(file, result.data.id);
      ids.push(result.data.id);
    }
    return { ok: true, ids };
  }

  function save() {
    setShowErrors(true);
    setServerErrors([]);
    if (
      !supplier ||
      !locationId ||
      !billNo.trim() ||
      !date ||
      lines.length === 0 ||
      hasLineErrors
    ) {
      return;
    }
    startTransition(async () => {
      try {
        const files = await uploadFiles(supplier.id);
        if (!files.ok) {
          setServerErrors([files.message]);
          return;
        }
        const input = {
          date,
          supplierId: supplier.id,
          locationId,
          billNo,
          billDate,
          dueDate,
          remarks,
          attachmentFileRefs: [...keptFiles, ...files.ids],
          updatePurchasePrice: updatePrice,
          lines: lines.map((line) => ({
            productId: line.productId,
            qty: Number(line.qty),
            rate: Number(line.rate),
            discount: num(line.discount, MONEY),
            vatRate: Number(line.vatRate),
          })),
        };
        const result = existing
          ? await updatePurchaseInvoice(existing.id, input, changeNote)
          : await createPurchaseInvoice(input);
        if (!result) return; // Redirected to sign in.
        if (!result.ok) {
          setServerErrors(result.messages);
          return;
        }
        setLeaving(true);
        const id = result.id ?? existing?.id;
        router.push(
          id ? `${purchaseInvoicePath(id)}?saved=1` : PURCHASE_INVOICES_PATH,
        );
      } catch {
        setServerErrors([
          "Couldn't reach the app. Check your connection and try again.",
        ]);
      }
    });
  }

  const backHref = existing
    ? purchaseInvoicePath(existing.id)
    : PURCHASE_INVOICES_PATH;
  const required = <span className="text-destructive">*</span>;
  const fieldError = (show: boolean, message: string) =>
    showErrors && show ? (
      <p className="text-destructive text-sm">{message}</p>
    ) : null;

  return (
    <div className="space-y-6">
      <VoucherToolbar
        title={
          existing
            ? `Edit Purchase Invoice ${existing.voucherNo}`
            : "New Purchase Invoice"
        }
        description="A supplier's bill: the products come into stock at the location and the supplier is owed the net total."
        back={
          existing
            ? { href: backHref, label: existing.voucherNo }
            : { href: PURCHASE_INVOICES_PATH, label: "Purchase Invoices" }
        }
        actions={
          <>
            <Link
              href={backHref}
              className={buttonVariants({ variant: "outline" })}
            >
              Cancel
            </Link>
            <Button onClick={save} disabled={pending || adding}>
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
              <Label>Supplier {required}</Label>
              {canAddSupplier ? (
                <button
                  type="button"
                  onClick={() => setSupplierPanelOpen(true)}
                  className="text-primary flex items-center gap-1 text-xs font-medium hover:underline"
                >
                  <UserPlus className="size-3.5" /> Add supplier
                </button>
              ) : null}
            </div>
            <AsyncSearchableSelect
              aria-label="Supplier"
              value={supplier?.id ?? null}
              valueLabel={supplier?.name}
              onChange={(option) =>
                void pickSupplier(
                  option ? { id: option.value, name: option.label } : null,
                )
              }
              search={searchSuppliers}
              placeholder="Pick a supplier"
              searchPlaceholder="Search name or code…"
              emptyText="No matching suppliers"
              allowClear={false}
            />
            {fieldError(!supplier, "Pick a supplier.")}
          </div>
          <div className="space-y-2">
            <Label>Receiving location {required}</Label>
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
            />
            {fieldError(!locationId, "Pick a location.")}
          </div>
          <div className="space-y-2">
            <Label htmlFor="pi-date">Invoice date {required}</Label>
            <Input
              id="pi-date"
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
            <Label htmlFor="pi-bill-no">Bill no {required}</Label>
            <Input
              id="pi-bill-no"
              value={billNo}
              maxLength={50}
              onChange={(event) => {
                setBillNo(event.target.value);
                touch();
              }}
              placeholder="The supplier's invoice number"
              aria-invalid={showErrors && !billNo.trim() ? true : undefined}
            />
            {fieldError(!billNo.trim(), "Enter the supplier's bill number.")}
          </div>
          <div className="space-y-2">
            <Label htmlFor="pi-bill-date">Bill date</Label>
            <Input
              id="pi-bill-date"
              type="date"
              value={billDate}
              onChange={(event) => {
                setBillDate(event.target.value);
                touch();
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pi-due-date">Due date</Label>
            <Input
              id="pi-due-date"
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
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="pi-remarks">Remarks</Label>
            <Textarea
              id="pi-remarks"
              value={remarks}
              maxLength={1000}
              onChange={(event) => {
                setRemarks(event.target.value);
                touch();
              }}
              className="min-h-9"
            />
          </div>
          <div className="space-y-2">
            <Label>Supplier bill</Label>
            <input
              ref={fileInput}
              type="file"
              accept={ATTACHMENT_ACCEPT}
              className="hidden"
              onChange={(event) => {
                addFile(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
            <div className="flex flex-wrap gap-2">
              {keptFiles.map((fileId, index) => (
                <span
                  key={fileId}
                  className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-sm"
                >
                  <a
                    href={attachmentHref(fileId)}
                    target="_blank"
                    rel="noopener"
                    className="flex items-center gap-1 hover:underline"
                  >
                    <Paperclip className="size-3.5" /> Attachment {index + 1}
                  </a>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label={`Remove attachment ${index + 1}`}
                    onClick={() => {
                      setKeptFiles((current) =>
                        current.filter((ref) => ref !== fileId),
                      );
                      touch();
                    }}
                  >
                    <Trash2 />
                  </Button>
                </span>
              ))}
              {newFiles.map((file, index) => (
                <span
                  key={`${file.name}-${index}`}
                  className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-sm"
                >
                  <button
                    type="button"
                    onClick={() => setPreview(file)}
                    className="flex max-w-40 items-center gap-1 truncate hover:underline"
                  >
                    <Paperclip className="size-3.5 shrink-0" /> {file.name}
                  </button>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label={`Remove ${file.name}`}
                    onClick={() => {
                      setNewFiles((current) =>
                        current.filter((candidate) => candidate !== file),
                      );
                      touch();
                    }}
                  >
                    <Trash2 />
                  </Button>
                </span>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInput.current?.click()}
              >
                <Upload /> Attach bill
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="gap-4">
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle>Products ({lines.length})</CardTitle>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={updatePrice}
              onCheckedChange={(checked) => {
                setUpdatePrice(checked === true);
                touch();
              }}
            />
            Update product purchase price
          </label>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="overflow-x-auto rounded-lg border">
            <Table className="min-w-[980px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead className="w-28 text-right">Qty</TableHead>
                  <TableHead className="w-32 text-right">Rate</TableHead>
                  <TableHead className="w-28 text-right">Discount</TableHead>
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
                  const rowErrors = [
                    ...(showErrors && lineError(line)
                      ? [lineError(line)!]
                      : []),
                    ...(byRow.get(index + 1) ?? []),
                  ];
                  const label = line.name ?? "product";
                  const numberInput = (
                    field: "qty" | "rate" | "discount" | "vatRate",
                    step: string,
                    aria: string,
                  ) => (
                    <Input
                      aria-label={`${aria} for ${label}`}
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step={step}
                      value={line[field]}
                      onChange={(event) =>
                        update(line.key, { [field]: event.target.value })
                      }
                      placeholder="0"
                      className="text-right font-mono"
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
                          {line.lastPrice !== null
                            ? ` · last ${formatAmount(line.lastPrice)}`
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
                        {numberInput("rate", "0.0001", "Rate")}
                      </TableCell>
                      <TableCell className="align-top">
                        {numberInput("discount", "0.01", "Discount")}
                      </TableCell>
                      <TableCell className="align-top">
                        {numberInput("vatRate", "0.01", "VAT %")}
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
                      colSpan={10}
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
              <AsyncSearchableSelect<ProductOption>
                aria-label="Add a product"
                value={null}
                onChange={(option) => void addProduct(option)}
                search={searchProducts}
                placeholder={adding ? "Adding…" : "+ Add a product"}
                searchPlaceholder="Search name, code or barcode…"
                emptyText={
                  productMaster
                    ? "No matching products. Add it below."
                    : "No matching products"
                }
                allowClear={false}
                disabled={adding}
                footer={
                  productMaster
                    ? (close) => (
                        <button
                          type="button"
                          onClick={() => {
                            close();
                            setProductPanelOpen(true);
                          }}
                          className="text-primary hover:bg-accent flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium"
                        >
                          <PackagePlus className="size-4" /> Add product
                        </button>
                      )
                    : undefined
                }
              />
              {totals.qty > 0 && location ? (
                <p className="text-muted-foreground text-sm">
                  Adds {formatQty(totals.qty)} unit
                  {totals.qty === 1 ? "" : "s"} to{" "}
                  <span className="text-foreground font-medium">
                    {location.name}
                  </span>
                </p>
              ) : null}
            </div>
            <dl className="w-full space-y-1 text-sm sm:w-72">
              {(
                [
                  ["Gross", totals.gross],
                  ["Discount", totals.discount],
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
                <dd className="font-mono tabular-nums">
                  {formatAmount(totals.net)}
                </dd>
              </div>
            </dl>
          </div>
        </CardContent>
      </Card>

      {existing ? (
        <div className="bg-card space-y-2 rounded-lg border p-4">
          <Label htmlFor="pi-change-note">
            Reason for change{" "}
            <span className="text-muted-foreground font-normal">
              (optional)
            </span>
          </Label>
          <Input
            id="pi-change-note"
            value={changeNote}
            onChange={(event) => {
              setChangeNote(event.target.value);
              touch();
            }}
            maxLength={500}
          />
        </div>
      ) : null}

      <AttachmentPreview
        source={preview}
        title={preview?.name ?? ""}
        open={preview !== null}
        onOpenChange={(open) => {
          if (!open) setPreview(null);
        }}
      />

      {productMaster ? (
        <MasterFormSheet
          open={productPanelOpen}
          onOpenChange={setProductPanelOpen}
          title="Add Product"
          description="Saved to Products and added to this purchase invoice as a line. The code is generated when you save."
        >
          {productPanelOpen ? (
            <ProductForm
              initialValue={null}
              groups={productMaster.groups}
              units={productMaster.units}
              canViewCost={productMaster.canViewCost}
              onSubmit={addNewProduct}
            />
          ) : null}
        </MasterFormSheet>
      ) : null}

      {canAddSupplier ? (
        <MasterFormSheet
          open={supplierPanelOpen}
          onOpenChange={setSupplierPanelOpen}
          title="Add Supplier"
          description="Saved to Suppliers and picked on this purchase invoice."
        >
          {supplierPanelOpen ? (
            <PartyForm
              config={PARTY_KIND_CONFIG.supplier}
              initialValue={null}
              canManage
              onSubmit={addSupplier}
            />
          ) : null}
        </MasterFormSheet>
      ) : null}

      <UnsavedChangesGuard when={dirty && !leaving} />
    </div>
  );
}

"use client";

import {
  CircleAlert,
  CircleCheck,
  FileUp,
  ListPlus,
  Loader2,
  Printer,
  Save,
  Send,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { FormErrorSummary } from "@/components/master/form-error-summary";
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
import type { ProductGroup } from "@/features/product-groups/types";
import { groupPathOptions } from "@/features/product-groups/group-options";
import { formatQty } from "@/features/stock/constants";
import {
  searchProducts,
  type ProductOption,
} from "@/features/stock/product-search";
import { useVoucherPdf } from "@/features/vouchers/use-voucher-pdf";
import { cn } from "@/lib/utils";

import {
  loadStockCountProducts,
  saveStockCount,
  submitStockCount,
  validateStockCountRows,
} from "./actions";
import {
  STOCK_COUNT_CONFIG,
  STOCK_COUNTS_PATH,
  stockCountPath,
} from "./constants";
import { parseStockCountCsv, type CountImportRow } from "./csv";
import type {
  CountValidationResult,
  StockCountInput,
  StockCountLine,
} from "./types";

interface DraftLine {
  key: string;
  productId: string;
  code: string | null;
  name: string | null;
  unit: string | null;
  counted: string;
  reason: string;
  /** The system quantity when added; only known with stock:view-system-qty. */
  snapshot: number | null;
}

const QTY = /^\d+(\.\d{1,3})?$/;

let seq = 0;
const newKey = () => `line-${++seq}`;

function lineOf(line: StockCountLine): DraftLine {
  return {
    key: newKey(),
    productId: line.productId,
    code: line.productCode,
    name: line.productName,
    unit: line.unit,
    counted: line.countedQty === null ? "" : String(line.countedQty),
    reason: line.reason ?? "",
    snapshot: line.snapshotQty ?? null,
  };
}

interface StockCountFormProps {
  today: string;
  /** Active warehouses, stores and vans the user may count at. */
  locations: StockLocation[];
  groups: ProductGroup[] | null;
  /** stock:view-system-qty — without it the count is blind. */
  canSystem: boolean;
  /** Scoped users with a single location can't change it. */
  lockLocation: boolean;
  /** Present when continuing a draft. */
  existing?: {
    id: string;
    voucherNo: string;
    date: string;
    locationId: string;
    comments: string;
    lines: StockCountLine[];
  };
}

export function StockCountForm({
  today,
  locations,
  groups,
  canSystem,
  lockLocation,
  existing,
}: StockCountFormProps) {
  const router = useRouter();
  const [date, setDate] = useState(
    existing ? existing.date.slice(0, 10) : today,
  );
  const [locationId, setLocationId] = useState<string | null>(
    existing?.locationId ?? (locations.length === 1 ? locations[0]!.id : null),
  );
  const [comments, setComments] = useState(existing?.comments ?? "");
  const [lines, setLines] = useState<DraftLine[]>(() =>
    (existing?.lines ?? []).map(lineOf),
  );
  const [dirty, setDirty] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [serverErrors, setServerErrors] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();
  const tableRef = useRef<HTMLDivElement>(null);
  const pdf = useVoucherPdf(STOCK_COUNT_CONFIG);

  const [loadOpen, setLoadOpen] = useState(false);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [onlyWithStock, setOnlyWithStock] = useState(false);

  const [importRows, setImportRows] = useState<CountImportRow[] | null>(null);
  const [importCheck, setImportCheck] = useState<CountValidationResult | null>(
    null,
  );
  const [importError, setImportError] = useState<string | null>(null);
  const [importing, startImport] = useTransition();
  const fileInput = useRef<HTMLInputElement>(null);

  const change = (next: DraftLine[]) => {
    setLines(next);
    setDirty(true);
  };
  const update = (key: string, patch: Partial<DraftLine>) =>
    change(
      lines.map((line) => (line.key === key ? { ...line, ...patch } : line)),
    );

  const countedOf = (line: DraftLine) =>
    line.counted.trim() === ""
      ? null
      : QTY.test(line.counted.trim())
        ? Number(line.counted)
        : null;
  const badCount = (line: DraftLine) =>
    line.counted.trim() !== "" && !QTY.test(line.counted.trim());
  const uncounted = lines.filter((line) => line.counted.trim() === "").length;
  const futureDate = date > today;

  const { byRow, general } = rowErrorsOf(serverErrors);

  function addProduct(option: ProductOption | null) {
    if (!option) return;
    if (lines.some((line) => line.productId === option.value)) {
      toast.info(`${option.code} ${option.label} is already on the count`);
      return;
    }
    change([
      ...lines,
      {
        key: newKey(),
        productId: option.value,
        code: option.code,
        name: option.label,
        unit: option.unit,
        counted: "",
        reason: "",
        snapshot: null,
      },
    ]);
  }

  function focusNext(index: number) {
    const next = tableRef.current?.querySelector<HTMLInputElement>(
      `[data-count-input="${index + 1}"]`,
    );
    next?.focus();
    next?.select();
  }

  /** Saves the draft; the id of the saved count, or null when refused. */
  async function persist(): Promise<string | null> {
    setShowErrors(true);
    setServerErrors([]);
    if (!locationId || !date || futureDate || lines.some(badCount)) return null;
    const input: StockCountInput = {
      date,
      locationId,
      comments,
      lines: lines.map((line) => ({
        productId: line.productId,
        countedQty: countedOf(line),
        reason: line.reason,
      })),
    };
    try {
      const result = await saveStockCount(existing?.id ?? null, input);
      if (!result) return null; // Redirected to sign in.
      if (!result.ok) {
        setServerErrors(result.messages);
        return null;
      }
      return result.id ?? existing?.id ?? null;
    } catch {
      setServerErrors([
        "Couldn't reach the app. Check your connection and try again.",
      ]);
      return null;
    }
  }

  function finish(id: string) {
    setLeaving(true);
    router.push(`${stockCountPath(id)}?saved=1`);
  }

  function saveDraft() {
    startTransition(async () => {
      const id = await persist();
      if (id) finish(id);
    });
  }

  function submit() {
    startTransition(async () => {
      if (lines.length === 0) {
        setShowErrors(true);
        setServerErrors(["Add at least one product before submitting."]);
        return;
      }
      if (uncounted > 0) {
        setShowErrors(true);
        return;
      }
      const id = await persist();
      if (!id) return;
      try {
        const result = await submitStockCount(id);
        if (!result) return;
        if (!result.ok) {
          setServerErrors(result.messages);
          return;
        }
        if (result.message) toast.success(result.message);
        finish(id);
      } catch {
        setServerErrors([
          "Couldn't reach the app. Check your connection and try again.",
        ]);
      }
    });
  }

  function loadProducts() {
    startTransition(async () => {
      const id = await persist();
      if (!id) {
        setLoadOpen(false);
        return;
      }
      try {
        const result = await loadStockCountProducts(id, {
          groupId,
          onlyWithStock,
        });
        if (!result) return;
        if (!result.ok) {
          setLoadOpen(false);
          setServerErrors(result.messages);
          return;
        }
        setLoadOpen(false);
        setDirty(false);
        if (existing) {
          router.refresh();
        } else {
          setLeaving(true);
          router.replace(`${stockCountPath(id)}/edit`);
        }
      } catch {
        setLoadOpen(false);
        setServerErrors([
          "Couldn't reach the app. Check your connection and try again.",
        ]);
      }
    });
  }

  function printSheet() {
    if (!existing) return;
    startTransition(async () => {
      if (dirty && !(await persist())) return;
      setDirty(false);
      await pdf.print(existing.id, existing.voucherNo);
    });
  }

  async function readFile(file: File | undefined) {
    if (!file) return;
    setImportError(null);
    setImportCheck(null);
    const rows = parseStockCountCsv(await file.text());
    if (rows.length === 0) {
      setImportError("The file has no rows. Columns: code, counted qty.");
      setImportRows([]);
      return;
    }
    setImportRows(rows);
    const sendable = rows.filter((row) => row.problem === null);
    if (sendable.length === 0 || !locationId) return;
    startImport(async () => {
      try {
        const result = await validateStockCountRows(
          sendable.map((row) => ({
            productCode: row.code,
            countedQty: row.countedQty,
          })),
          locationId,
        );
        if (result.ok) setImportCheck(result.data);
        else setImportError(result.messages.join(" "));
      } catch {
        setImportError(
          "Couldn't reach the app. Check your connection and try again.",
        );
      }
    });
  }

  // The preview: each file row with its product (when found) and why not.
  const sendable = (importRows ?? []).filter((row) => row.problem === null);
  const preview = (importRows ?? []).map((row) => {
    const index = sendable.indexOf(row);
    const checked = index >= 0 ? importCheck?.lines[index] : undefined;
    const errors =
      row.problem !== null
        ? [row.problem]
        : (importCheck?.errors ?? [])
            .filter((error) => error.row === index + 1)
            .map((error) => error.message);
    const onCount = Boolean(
      checked?.productId &&
      lines.some((line) => line.productId === checked.productId),
    );
    return { row, checked, errors, onCount };
  });
  const loadable = preview.filter(
    (entry) => entry.errors.length === 0 && entry.checked?.productId,
  );

  function loadRows() {
    const next = [...lines];
    for (const { checked, row } of loadable) {
      const at = next.findIndex(
        (line) => line.productId === checked!.productId,
      );
      if (at >= 0) {
        next[at] = { ...next[at]!, counted: String(row.countedQty) };
      } else {
        next.push({
          key: newKey(),
          productId: checked!.productId!,
          code: checked!.productCode,
          name: checked!.productName,
          unit: null,
          counted: String(row.countedQty),
          reason: "",
          snapshot: checked!.snapshotQty ?? null,
        });
      }
    }
    change(next);
    toast.success(
      `${loadable.length} count${loadable.length === 1 ? "" : "s"} loaded`,
    );
    setImportRows(null);
    setImportCheck(null);
  }

  const backHref = existing ? stockCountPath(existing.id) : STOCK_COUNTS_PATH;
  const colSpan = canSystem ? 7 : 5;

  return (
    <div className="space-y-6">
      <VoucherToolbar
        title={existing ? `Count ${existing.voucherNo}` : "New Stock Count"}
        description={
          canSystem
            ? "Count each product; the difference to the system quantity shows as you type."
            : "A blind count: enter what you physically count. Quantities stay hidden."
        }
        back={
          existing
            ? { href: backHref, label: existing.voucherNo }
            : { href: STOCK_COUNTS_PATH, label: "Stock Counts" }
        }
        actions={
          <>
            <Link
              href={backHref}
              className={buttonVariants({ variant: "outline" })}
            >
              Cancel
            </Link>
            <Button
              variant="outline"
              onClick={printSheet}
              disabled={pending || !existing || pdf.busy !== null}
              title={
                existing ? undefined : "Load products and save the draft first"
              }
            >
              <Printer /> Print count sheet
            </Button>
            <Button variant="outline" onClick={saveDraft} disabled={pending}>
              {pending ? <Loader2 className="animate-spin" /> : <Save />}
              Save draft
            </Button>
            <Button onClick={submit} disabled={pending}>
              <Send /> Submit
            </Button>
          </>
        }
      />

      <FormErrorSummary messages={general} />
      {showErrors && uncounted > 0 ? (
        <FormErrorSummary
          messages={[
            `${uncounted} line${uncounted === 1 ? " is" : "s are"} not counted. Enter 0 for products with none; every line must be counted to submit.`,
          ]}
        />
      ) : null}

      <Card className="gap-4">
        <CardContent className="grid gap-4 pt-6 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>
              Location <span className="text-destructive">*</span>
            </Label>
            <SearchableSelect
              value={locationId}
              onChange={(value) => {
                setLocationId(value);
                setDirty(true);
              }}
              options={locations.map((location) => ({
                value: location.id,
                label: location.name,
                description: location.code,
                badge: LOCATION_TYPE_LABELS[location.type],
              }))}
              placeholder="Pick a warehouse, store or van"
              emptyText="No matching locations"
              allowClear={false}
              disabled={lockLocation || Boolean(existing)}
            />
            {showErrors && !locationId ? (
              <p className="text-destructive text-sm">Pick a location.</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="sc-date">
              Date <span className="text-destructive">*</span>
            </Label>
            <Input
              id="sc-date"
              type="date"
              value={date}
              max={today}
              onChange={(event) => {
                setDate(event.target.value);
                setDirty(true);
              }}
              aria-invalid={showErrors && futureDate ? true : undefined}
            />
            {showErrors && futureDate ? (
              <p className="text-destructive text-sm">
                The count date can&apos;t be in the future.
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="sc-comments">Comments</Label>
            <Textarea
              id="sc-comments"
              value={comments}
              onChange={(event) => {
                setComments(event.target.value);
                setDirty(true);
              }}
              placeholder="e.g. Month-end van count"
              className="min-h-9"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="gap-4">
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle>
            Products ({lines.length})
            {lines.length > 0 ? (
              <span className="text-muted-foreground ml-2 text-sm font-normal">
                {lines.length - uncounted} counted
              </span>
            ) : null}
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileInput}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(event) => {
                void readFile(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
            <Button
              variant="outline"
              onClick={() => {
                if (!locationId) {
                  setShowErrors(true);
                  toast.info("Pick the location first.");
                  return;
                }
                setLoadOpen(true);
              }}
              disabled={pending}
            >
              <ListPlus /> Load products
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (!locationId) {
                  setShowErrors(true);
                  toast.info("Pick the location first: the import checks it.");
                  return;
                }
                fileInput.current?.click();
              }}
              disabled={pending}
            >
              <FileUp /> Import CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div ref={tableRef} className="overflow-x-auto rounded-lg border">
            <Table className="min-w-[560px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Product</TableHead>
                  {canSystem ? (
                    <TableHead className="w-28 text-right">System</TableHead>
                  ) : null}
                  <TableHead className="w-36 text-right">Counted</TableHead>
                  {canSystem ? (
                    <TableHead className="w-28 text-right">
                      Difference
                    </TableHead>
                  ) : null}
                  <TableHead className="w-48">Reason</TableHead>
                  <TableHead className="w-10">
                    <span className="sr-only">Remove</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line, index) => {
                  const counted = countedOf(line);
                  const difference =
                    counted !== null && line.snapshot !== null
                      ? Math.round((counted - line.snapshot) * 1000) / 1000
                      : null;
                  const rowErrors = [
                    ...(showErrors && badCount(line)
                      ? ["Enter a quantity of 0 or more, up to 3 decimals."]
                      : []),
                    ...(byRow.get(index + 1) ?? []),
                  ];
                  const missing = showErrors && line.counted.trim() === "";
                  return (
                    <TableRow
                      key={line.key}
                      className={cn(
                        (rowErrors.length > 0 || missing) && "bg-destructive/5",
                      )}
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
                      {canSystem ? (
                        <TableCell className="text-muted-foreground text-right align-top font-mono text-sm tabular-nums">
                          {line.snapshot !== null
                            ? formatQty(line.snapshot)
                            : "—"}
                        </TableCell>
                      ) : null}
                      <TableCell className="align-top">
                        <Input
                          data-count-input={index}
                          aria-label={`Counted quantity for ${line.name ?? "product"}`}
                          type="number"
                          inputMode="decimal"
                          min={0}
                          step="0.001"
                          value={line.counted}
                          onChange={(event) =>
                            update(line.key, { counted: event.target.value })
                          }
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              focusNext(index);
                            }
                          }}
                          placeholder="0"
                          className="text-right font-mono"
                          aria-invalid={
                            rowErrors.length > 0 || missing ? true : undefined
                          }
                        />
                      </TableCell>
                      {canSystem ? (
                        <TableCell
                          className={cn(
                            "text-right align-top font-mono text-sm tabular-nums",
                            difference !== null &&
                              difference > 0 &&
                              "text-success",
                            difference !== null &&
                              difference < 0 &&
                              "text-destructive",
                          )}
                        >
                          {difference === null
                            ? "—"
                            : `${difference > 0 ? "+" : ""}${formatQty(difference)}`}
                        </TableCell>
                      ) : null}
                      <TableCell className="align-top">
                        <Input
                          aria-label={`Reason for ${line.name ?? "product"}`}
                          value={line.reason}
                          onChange={(event) =>
                            update(line.key, { reason: event.target.value })
                          }
                          maxLength={200}
                          placeholder="Optional"
                        />
                      </TableCell>
                      <TableCell className="align-top">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Remove ${line.name ?? "line"}`}
                          onClick={() =>
                            change(lines.filter((l) => l.key !== line.key))
                          }
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
                      colSpan={colSpan}
                      className="text-muted-foreground py-8 text-center text-sm"
                    >
                      No products yet. Use Load products, add one below, or
                      import a CSV with columns code, counted qty.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
          <div className="w-full max-w-sm">
            <AsyncSearchableSelect<ProductOption>
              aria-label="Add a product"
              value={null}
              onChange={addProduct}
              search={searchProducts}
              placeholder="+ Add a product"
              searchPlaceholder="Search name, code or barcode…"
              emptyText="No matching products"
              allowClear={false}
            />
          </div>
        </CardContent>
      </Card>

      <Dialog open={loadOpen} onOpenChange={setLoadOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Load products</DialogTitle>
            <DialogDescription>
              Adds the active stock products not yet on this count. Your draft
              is saved first.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Product group</Label>
              <SearchableSelect
                value={groupId}
                onChange={setGroupId}
                options={groupPathOptions(groups ?? [])}
                placeholder={groups ? "All products" : "Groups unavailable"}
                emptyText="No matching groups"
                clearLabel="All products"
                disabled={groups === null}
              />
            </div>
            <Label className="flex items-center gap-2 font-normal">
              <Checkbox
                checked={onlyWithStock}
                onCheckedChange={(checked) =>
                  setOnlyWithStock(checked === true)
                }
              />
              Only products with stock at this location
            </Label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLoadOpen(false)}>
              Close
            </Button>
            <Button onClick={loadProducts} disabled={pending}>
              {pending ? <Loader2 className="animate-spin" /> : <ListPlus />}
              Load
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={importRows !== null}
        onOpenChange={(open) => {
          if (!open) {
            setImportRows(null);
            setImportCheck(null);
            setImportError(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Import preview</DialogTitle>
            <DialogDescription>
              Counts replace the entered quantity of products already on the
              count; other products are added. Rows with an error are skipped.
            </DialogDescription>
          </DialogHeader>
          {importError ? <FormErrorSummary messages={[importError]} /> : null}
          <div className="max-h-[55vh] overflow-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Line</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Counted</TableHead>
                  <TableHead>Check</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.map(({ row, checked, errors, onCount }) => (
                  <TableRow
                    key={row.line}
                    className={cn(errors.length > 0 && "bg-destructive/5")}
                  >
                    <TableCell className="text-muted-foreground tabular-nums">
                      {row.line}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {row.code || "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {checked?.productName ?? "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm tabular-nums">
                      {row.problem === null ? formatQty(row.countedQty) : ""}
                    </TableCell>
                    <TableCell className="text-sm">
                      {errors.length > 0 ? (
                        <span className="text-destructive">
                          {errors.join(" ")}
                        </span>
                      ) : importing || !importCheck ? (
                        <Loader2 className="text-muted-foreground size-4 animate-spin" />
                      ) : (
                        <span className="text-success flex items-center gap-1">
                          <CircleCheck className="size-4" />{" "}
                          {onCount ? "Updates count" : "Adds product"}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="text-muted-foreground text-sm">
            {loadable.length} of {preview.length} rows ready to load.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setImportRows(null);
                setImportCheck(null);
              }}
            >
              Close
            </Button>
            <Button
              onClick={loadRows}
              disabled={importing || loadable.length === 0}
            >
              {importing ? <Loader2 className="animate-spin" /> : null}
              Load {loadable.length} row{loadable.length === 1 ? "" : "s"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {pdf.fallback}
      <UnsavedChangesGuard when={dirty && !leaving} />
    </div>
  );
}

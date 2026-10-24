"use client";

import {
  CircleAlert,
  CircleCheck,
  FileUp,
  Loader2,
  Save,
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
import { formatQty } from "@/features/stock/constants";
import {
  searchProducts,
  type ProductOption,
} from "@/features/stock/product-search";
import { formatAmount } from "@/lib/format";
import { cn } from "@/lib/utils";

import {
  createOpeningStock,
  updateOpeningStock,
  validateOpeningStockRows,
} from "./actions";
import { OPENING_STOCK_PATH, openingStockPath } from "./constants";
import { parseOpeningStockCsv, type StockImportRow } from "./csv";
import type { OpeningStockLine, StockValidationResult } from "./types";

interface DraftLine {
  key: string;
  productId: string;
  code: string | null;
  name: string | null;
  unit: string | null;
  qty: string;
  unitCost: string;
}

const QTY = /^\d+(\.\d{1,3})?$/;
const MONEY = /^\d+(\.\d{1,2})?$/;

let seq = 0;
const newKey = () => `line-${++seq}`;

function lineOf(product: {
  productId: string;
  code: string | null;
  name: string | null;
  unit: string | null;
  qty?: number;
  unitCost?: number | null;
}): DraftLine {
  return {
    key: newKey(),
    productId: product.productId,
    code: product.code,
    name: product.name,
    unit: product.unit,
    qty: product.qty ? String(product.qty) : "",
    unitCost:
      product.unitCost !== undefined && product.unitCost !== null
        ? String(product.unitCost)
        : "",
  };
}

/** "Line 3: X; Line 7: Y" (a refused save) → messages by line number. */
function rowErrorsOf(messages: string[]): {
  byRow: Map<number, string[]>;
  general: string[];
} {
  const byRow = new Map<number, string[]>();
  const general: string[] = [];
  for (const message of messages) {
    for (const part of message.split(/;\s*(?=Line \d+:)/)) {
      const match = /^Line (\d+):\s*([\s\S]*)$/.exec(part.trim());
      if (match) {
        const row = Number(match[1]);
        byRow.set(row, [...(byRow.get(row) ?? []), match[2]!]);
      } else {
        general.push(part);
      }
    }
  }
  return { byRow, general };
}

interface OpeningStockFormProps {
  today: string;
  /** Active warehouses, stores and vans the user may enter stock at. */
  locations: StockLocation[];
  /** Present when editing. */
  existing?: {
    id: string;
    voucherNo: string;
    asOfDate: string;
    locationId: string;
    comments: string;
    lines: OpeningStockLine[];
  };
}

export function OpeningStockForm({
  today,
  locations,
  existing,
}: OpeningStockFormProps) {
  const router = useRouter();
  const [asOfDate, setAsOfDate] = useState(
    existing ? existing.asOfDate.slice(0, 10) : today,
  );
  const [locationId, setLocationId] = useState<string | null>(
    existing?.locationId ?? (locations.length === 1 ? locations[0]!.id : null),
  );
  const [comments, setComments] = useState(existing?.comments ?? "");
  const [lines, setLines] = useState<DraftLine[]>(() =>
    (existing?.lines ?? []).map(lineOf),
  );
  const [changeNote, setChangeNote] = useState("");
  const [dirty, setDirty] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [serverErrors, setServerErrors] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();

  const [importRows, setImportRows] = useState<StockImportRow[] | null>(null);
  const [importCheck, setImportCheck] = useState<StockValidationResult | null>(
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

  const qtyOf = (line: DraftLine) =>
    QTY.test(line.qty.trim()) ? Number(line.qty) : 0;
  const totalQty = lines.reduce((sum, line) => sum + qtyOf(line), 0);

  const { byRow, general } = rowErrorsOf(serverErrors);
  const localError = (line: DraftLine) =>
    !QTY.test(line.qty.trim()) || !(Number(line.qty) > 0)
      ? "Enter a quantity greater than 0, up to 3 decimals."
      : line.unitCost.trim() !== "" && !MONEY.test(line.unitCost.trim())
        ? "Unit cost must be 0 or more, up to 2 decimals."
        : null;
  const hasLocalErrors = lines.some((line) => localError(line) !== null);
  const futureDate = asOfDate > today;

  function addProduct(option: ProductOption | null) {
    if (!option) return;
    if (lines.some((line) => line.productId === option.value)) {
      toast.info(`${option.code} ${option.label} is already on a line`);
      return;
    }
    change([
      ...lines,
      lineOf({
        productId: option.value,
        code: option.code,
        name: option.label,
        unit: option.unit,
      }),
    ]);
  }

  function save() {
    setShowErrors(true);
    setServerErrors([]);
    if (
      !locationId ||
      lines.length === 0 ||
      hasLocalErrors ||
      !asOfDate ||
      futureDate
    ) {
      return;
    }
    const input = {
      asOfDate,
      locationId,
      comments,
      lines: lines.map((line) => ({
        productId: line.productId,
        qty: qtyOf(line),
        unitCost: line.unitCost.trim() === "" ? null : Number(line.unitCost),
      })),
    };
    startTransition(async () => {
      try {
        const result = existing
          ? await updateOpeningStock(existing.id, input, changeNote)
          : await createOpeningStock(input);
        if (!result) return; // Redirected to sign in.
        if (!result.ok) {
          setServerErrors(result.messages);
          return;
        }
        setLeaving(true);
        const id = result.id ?? existing?.id;
        router.push(
          id ? `${openingStockPath(id)}?saved=1` : OPENING_STOCK_PATH,
        );
      } catch {
        setServerErrors([
          "Couldn't reach the app. Check your connection and try again.",
        ]);
      }
    });
  }

  async function readFile(file: File | undefined) {
    if (!file) return;
    setImportError(null);
    setImportCheck(null);
    const rows = parseOpeningStockCsv(await file.text());
    if (rows.length === 0) {
      setImportError("The file has no rows. Columns: code, qty, unitCost.");
      setImportRows([]);
      return;
    }
    setImportRows(rows);
    const sendable = rows.filter((row) => row.problem === null);
    if (sendable.length === 0) return;
    startImport(async () => {
      try {
        const result = await validateOpeningStockRows(
          sendable.map((row) => ({
            productCode: row.code,
            qty: row.qty,
            unitCost: row.unitCost,
          })),
          locationId,
          existing?.id ?? null,
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
    if (
      checked?.productId &&
      lines.some((line) => line.productId === checked.productId)
    ) {
      errors.push("Already on a line in this opening stock");
    }
    return { row, checked, errors };
  });
  const loadable = preview.filter(
    (entry) => entry.errors.length === 0 && entry.checked?.productId,
  );

  function loadRows() {
    change([
      ...lines,
      ...loadable.map(({ checked }) =>
        lineOf({
          productId: checked!.productId!,
          code: checked!.productCode,
          name: checked!.productName,
          unit: null,
          qty: checked!.qty,
          unitCost: checked!.unitCost,
        }),
      ),
    ]);
    toast.success(
      `${loadable.length} line${loadable.length === 1 ? "" : "s"} loaded`,
    );
    setImportRows(null);
    setImportCheck(null);
  }

  const backHref = existing
    ? openingStockPath(existing.id)
    : OPENING_STOCK_PATH;

  return (
    <div className="space-y-6">
      <VoucherToolbar
        title={
          existing
            ? `Edit Opening Stock ${existing.voucherNo}`
            : "New Opening Stock"
        }
        description="Each product's quantity on hand at one location, as of a date."
        back={
          existing
            ? { href: backHref, label: existing.voucherNo }
            : { href: OPENING_STOCK_PATH, label: "Opening Stock" }
        }
        actions={
          <>
            <Link
              href={backHref}
              className={buttonVariants({ variant: "outline" })}
            >
              Cancel
            </Link>
            <Button onClick={save} disabled={pending}>
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
            />
            {showErrors && !locationId ? (
              <p className="text-destructive text-sm">Pick a location.</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="os-date">
              As of <span className="text-destructive">*</span>
            </Label>
            <Input
              id="os-date"
              type="date"
              value={asOfDate}
              max={today}
              onChange={(event) => {
                setAsOfDate(event.target.value);
                setDirty(true);
              }}
              aria-invalid={showErrors && futureDate ? true : undefined}
            />
            {showErrors && futureDate ? (
              <p className="text-destructive text-sm">
                The as-of date can&apos;t be in the future.
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="os-comments">Comments</Label>
            <Textarea
              id="os-comments"
              value={comments}
              onChange={(event) => {
                setComments(event.target.value);
                setDirty(true);
              }}
              placeholder="e.g. Count from atACC as of 30 Sep"
              className="min-h-9"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="gap-4">
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle>Products ({lines.length})</CardTitle>
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
          <div className="overflow-x-auto rounded-lg border">
            <Table className="min-w-[640px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead className="w-40 text-right">Qty</TableHead>
                  <TableHead className="w-40 text-right">
                    Unit cost{" "}
                    <span className="text-muted-foreground font-normal">
                      (optional)
                    </span>
                  </TableHead>
                  <TableHead className="w-10">
                    <span className="sr-only">Remove</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line, index) => {
                  const rowErrors = [
                    ...(showErrors && localError(line)
                      ? [localError(line)!]
                      : []),
                    ...(byRow.get(index + 1) ?? []),
                  ];
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
                        <Input
                          aria-label={`Quantity for ${line.name ?? "product"}`}
                          type="number"
                          inputMode="decimal"
                          min={0}
                          step="0.001"
                          value={line.qty}
                          onChange={(event) =>
                            update(line.key, { qty: event.target.value })
                          }
                          placeholder="0"
                          className="text-right font-mono"
                          aria-invalid={rowErrors.length > 0 ? true : undefined}
                        />
                      </TableCell>
                      <TableCell className="align-top">
                        <Input
                          aria-label={`Unit cost for ${line.name ?? "product"}`}
                          type="number"
                          inputMode="decimal"
                          min={0}
                          step="0.01"
                          value={line.unitCost}
                          onChange={(event) =>
                            update(line.key, { unitCost: event.target.value })
                          }
                          placeholder="—"
                          className="text-right font-mono"
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
                      colSpan={5}
                      className="text-muted-foreground py-8 text-center text-sm"
                    >
                      No products yet. Add one below, or import a CSV with
                      columns code, qty, unitCost.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
            <p className="text-sm">
              <span className="text-muted-foreground">Total quantity </span>
              <span className="font-mono font-semibold tabular-nums">
                {formatQty(totalQty)}
              </span>
            </p>
          </div>
        </CardContent>
      </Card>

      {existing ? (
        <div className="bg-card space-y-2 rounded-lg border p-4">
          <Label htmlFor="os-change-note">
            Reason for change{" "}
            <span className="text-muted-foreground font-normal">
              (optional)
            </span>
          </Label>
          <Input
            id="os-change-note"
            value={changeNote}
            onChange={(event) => {
              setChangeNote(event.target.value);
              setDirty(true);
            }}
            maxLength={500}
          />
        </div>
      ) : null}

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
              Rows with an error are skipped. Fix them in the file and import
              again, or add them by hand.
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
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit cost</TableHead>
                  <TableHead>Check</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.map(({ row, checked, errors }) => (
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
                      {row.qty ? formatQty(row.qty) : ""}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm tabular-nums">
                      {row.unitCost !== null ? formatAmount(row.unitCost) : ""}
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
                          <CircleCheck className="size-4" /> OK
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

      <UnsavedChangesGuard when={dirty && !leaving} />
    </div>
  );
}

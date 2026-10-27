"use client";

import { CircleAlert, Loader2, Save } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { FormErrorSummary } from "@/components/master/form-error-summary";
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
  TableFooter,
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
import { searchSuppliers } from "@/features/purchase-invoices/supplier-search";
import { searchCustomers } from "@/features/sales-invoices/search";
import { formatQty } from "@/features/stock/constants";
import { formatAmount } from "@/lib/format";

import { createReturn } from "./actions";
import { RETURN_KINDS, newReturnPath, returnPath } from "./constants";
import { searchInvoices } from "./search";
import type { ReturnKind, ReturnSource, ReturnSourceLine } from "./types";

const round2 = (n: number) => Math.round(n * 100) / 100;
const round3 = (n: number) => Math.round(n * 1000) / 1000;

/** Quantity still returnable on an invoice line. */
const leftOf = (line: ReturnSourceLine) => round3(line.qty - line.returnedQty);

/** The part of an invoice line's total a return of `qty` takes: the backend's
 * cumulative pro-rata, so successive returns add up to exactly the line. */
function shareOf(total: number, line: ReturnSourceLine, qty: number): number {
  const after = round3(line.returnedQty + qty);
  return round2(
    round2((total * after) / line.qty) -
      round2((total * line.returnedQty) / line.qty),
  );
}

/** Step 1: pick the invoice (by number, or narrowed to one customer or
 * supplier first). */
function InvoicePicker({ kind }: { kind: ReturnKind }) {
  const info = RETURN_KINDS[kind];
  const router = useRouter();
  const [partyId, setPartyId] = useState("");
  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle>Which {info.invoiceLabel.toLowerCase()}?</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>
            {info.partyLabel}{" "}
            <span className="text-muted-foreground font-normal">
              (optional)
            </span>
          </Label>
          <AsyncSearchableSelect
            value={partyId || null}
            onChange={(option) => setPartyId(option?.value ?? "")}
            search={kind === "sales" ? searchCustomers : searchSuppliers}
            placeholder={`Any ${info.partyLabel.toLowerCase()}`}
            searchPlaceholder="Search name or code…"
            emptyText={`No matching ${info.partyLabel.toLowerCase()}s`}
            clearLabel={`Any ${info.partyLabel.toLowerCase()}`}
          />
        </div>
        <div className="space-y-2">
          <Label>{info.invoiceLabel}</Label>
          <AsyncSearchableSelect
            key={partyId}
            value={null}
            onChange={(option) =>
              option && router.push(newReturnPath(kind, option.value))
            }
            search={searchInvoices(kind, partyId)}
            placeholder="Search by invoice number"
            searchPlaceholder={
              kind === "purchase"
                ? "Invoice or bill number…"
                : "Invoice number…"
            }
            emptyText="No matching posted invoices"
            allowClear={false}
          />
        </div>
      </CardContent>
    </Card>
  );
}

export function ReturnForm({
  kind,
  source,
  today,
  locations,
}: {
  kind: ReturnKind;
  /** null: no invoice picked yet. */
  source: ReturnSource | null;
  today: string;
  locations: StockLocation[];
}) {
  const info = RETURN_KINDS[kind];
  const { config } = info;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [date, setDate] = useState(today);
  const [locationId, setLocationId] = useState<string | null>(
    source?.locationId ?? null,
  );
  const [reason, setReason] = useState("");
  const [qtys, setQtys] = useState<Record<string, string>>({});
  const [restock, setRestock] = useState<Record<string, boolean>>({});
  const [showErrors, setShowErrors] = useState(false);
  const [serverErrors, setServerErrors] = useState<string[]>([]);
  const [dirty, setDirty] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const header = (
    <VoucherToolbar
      title={`New ${config.singular}`}
      description={
        kind === "sales"
          ? "Goods a customer sends back: the credit note reduces what they owe."
          : "Goods sent back to a supplier: the debit note reduces what you owe."
      }
      back={{ href: info.path, label: config.title }}
      actions={
        source ? (
          <>
            <Link
              href={info.path}
              className={buttonVariants({ variant: "outline" })}
            >
              Cancel
            </Link>
            <Button onClick={save} disabled={pending || !source}>
              {pending ? <Loader2 className="animate-spin" /> : <Save />}
              {pending ? "Saving…" : "Save"}
            </Button>
          </>
        ) : null
      }
    />
  );

  if (!source) {
    return (
      <div className="space-y-6">
        {header}
        <InvoicePicker kind={kind} />
      </div>
    );
  }

  const rows = source.lines.map((line) => {
    const left = leftOf(line);
    const raw = qtys[line.invoiceLineId] ?? "";
    const qty = raw === "" ? 0 : Number(raw);
    const problem =
      raw === ""
        ? null
        : !Number.isFinite(qty) || qty < 0
          ? "Enter a quantity."
          : round3(qty) !== qty
            ? "Up to 3 decimals."
            : qty > left
              ? `Only ${formatQty(left)} left to return.`
              : null;
    const valid = problem === null && qty > 0;
    const amount = valid ? shareOf(line.amount, line, qty) : 0;
    const vat = valid ? shareOf(line.vat, line, qty) : 0;
    return { line, left, raw, qty: valid ? qty : 0, problem, amount, vat };
  });
  const taxable = round2(rows.reduce((sum, row) => sum + row.amount, 0));
  const totalVat = round2(rows.reduce((sum, row) => sum + row.vat, 0));
  const net = round2(taxable + totalVat);
  const reduces = round2(Math.min(net, Math.max(source.balance, 0)));
  const onAccount = round2(net - reduces);

  const general: string[] = [...serverErrors];
  const reasonOk = reason.trim().length >= 3;
  const picked = rows.filter((row) => row.qty > 0);
  const cancelled = source.status === "cancelled";
  const problems =
    !date ||
    !locationId ||
    !reasonOk ||
    picked.length === 0 ||
    rows.some((row) => row.problem !== null);

  function touch() {
    setDirty(true);
    setServerErrors([]);
  }

  function save() {
    setShowErrors(true);
    if (!source || cancelled || problems || !locationId) return;
    startTransition(async () => {
      try {
        const result = await createReturn(kind, {
          invoiceId: source.id,
          date,
          locationId,
          reason,
          lines: picked.map((row) => ({
            invoiceLineId: row.line.invoiceLineId,
            qty: row.qty,
            restock: restock[row.line.invoiceLineId] ?? true,
          })),
        });
        if (!result) return; // Redirected to sign in.
        if (!result.ok) {
          setServerErrors(result.messages);
          return;
        }
        setLeaving(true);
        router.push(
          result.id ? `${returnPath(kind, result.id)}?saved=1` : info.path,
        );
      } catch {
        setServerErrors([
          "Couldn't reach the app. Check your connection and try again.",
        ]);
      }
    });
  }

  const required = <span className="text-destructive">*</span>;
  const fieldError = (show: boolean, message: string) =>
    showErrors && show ? (
      <p className="text-destructive flex items-center gap-1 text-xs">
        <CircleAlert className="size-3 shrink-0" /> {message}
      </p>
    ) : null;
  const cols = info.restock ? 7 : 6;

  return (
    <div className="space-y-6">
      {header}

      <FormErrorSummary messages={general} />
      {cancelled ? (
        <FormErrorSummary
          messages={[`${source.voucherNo} is cancelled and can't be returned.`]}
        />
      ) : null}
      {showErrors && picked.length === 0 ? (
        <FormErrorSummary messages={[config.copy.linesRequired]} />
      ) : null}

      <Card className="gap-4">
        <CardContent className="grid gap-4 pt-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1">
            <Label>{info.invoiceLabel}</Label>
            <p className="text-sm">
              <Link
                href={`${info.invoicesPath}/${encodeURIComponent(source.id)}`}
                className="font-mono font-medium hover:underline"
              >
                {source.voucherNo}
              </Link>{" "}
              · {source.partyName ?? "Unknown"}
            </p>
            <p className="text-muted-foreground text-xs">
              <Link
                href={`${info.path}/new`}
                className="hover:text-foreground underline"
              >
                Pick another invoice
              </Link>
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="rt-date">Return date {required}</Label>
            <Input
              id="rt-date"
              type="date"
              value={date}
              onChange={(event) => {
                setDate(event.target.value);
                touch();
              }}
            />
            {fieldError(!date, "Enter the return date.")}
          </div>
          <div className="space-y-2">
            <Label>
              {info.locationLabel} {required}
            </Label>
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
            {fieldError(!locationId, "Pick the location.")}
          </div>
          <div className="space-y-2 sm:col-span-2 lg:col-span-3">
            <Label htmlFor="rt-reason">Reason {required}</Label>
            <Textarea
              id="rt-reason"
              value={reason}
              maxLength={500}
              onChange={(event) => {
                setReason(event.target.value);
                touch();
              }}
              className="min-h-9"
            />
            {fieldError(!reasonOk, "Give a reason (at least 3 characters).")}
          </div>
        </CardContent>
      </Card>

      <Card className="gap-4">
        <CardHeader>
          <CardTitle>Products ({rows.length})</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table className="min-w-[820px]">
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">{info.movedLabel}</TableHead>
                <TableHead className="text-right">Already returned</TableHead>
                <TableHead className="w-40 text-right">Return qty</TableHead>
                {info.restock ? (
                  <TableHead className="text-center">Restock</TableHead>
                ) : null}
                <TableHead className="text-right">VAT</TableHead>
                <TableHead className="text-right">Net</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ line, left, raw, problem, amount, vat }) => {
                const id = line.invoiceLineId;
                return (
                  <TableRow key={id}>
                    <TableCell>
                      {line.name ?? (
                        <span className="text-muted-foreground italic">
                          Unknown product
                        </span>
                      )}
                      <span className="text-muted-foreground block font-mono text-xs">
                        {line.code}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {formatQty(line.qty)}{" "}
                      <span className="text-muted-foreground">{line.unit}</span>
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {formatQty(line.returnedQty)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        aria-label={`Return quantity for ${line.name ?? "product"}`}
                        type="number"
                        inputMode="decimal"
                        min={0}
                        max={left}
                        step="any"
                        value={raw}
                        disabled={left <= 0}
                        placeholder="0"
                        aria-invalid={problem !== null}
                        onChange={(event) => {
                          setQtys((prev) => ({
                            ...prev,
                            [id]: event.target.value,
                          }));
                          touch();
                        }}
                        className="ml-auto w-28 text-right font-mono"
                      />
                      <span className="text-muted-foreground mt-1 block text-xs">
                        {left <= 0
                          ? "Fully returned"
                          : `max ${formatQty(left)}`}
                      </span>
                      {problem ? (
                        <span className="text-destructive block text-xs">
                          {problem}
                        </span>
                      ) : null}
                    </TableCell>
                    {info.restock ? (
                      <TableCell className="text-center">
                        <Checkbox
                          aria-label={`Restock ${line.name ?? "product"}`}
                          checked={restock[id] ?? true}
                          disabled={left <= 0}
                          onCheckedChange={(checked) => {
                            setRestock((prev) => ({
                              ...prev,
                              [id]: checked === true,
                            }));
                            touch();
                          }}
                        />
                      </TableCell>
                    ) : null}
                    <TableCell className="text-right font-mono tabular-nums">
                      {formatAmount(vat)}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {formatAmount(round2(amount + vat))}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={cols - 1} className="text-right">
                  Taxable
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {formatAmount(taxable)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell colSpan={cols - 1} className="text-right">
                  VAT
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {formatAmount(totalVat)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell
                  colSpan={cols - 1}
                  className="text-right font-semibold"
                >
                  Net Total (AED)
                </TableCell>
                <TableCell className="text-right font-mono font-semibold tabular-nums">
                  {formatAmount(net)}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>

      <p role="status" className="bg-card rounded-lg border p-4 text-sm">
        Reduces the invoice balance by{" "}
        <span className="font-mono font-medium">
          AED {formatAmount(reduces)}
        </span>
        ;{" "}
        <span className="font-mono font-medium">
          AED {formatAmount(onAccount)}
        </span>{" "}
        stays on account.
      </p>

      <UnsavedChangesGuard when={dirty && !leaving} />
    </div>
  );
}

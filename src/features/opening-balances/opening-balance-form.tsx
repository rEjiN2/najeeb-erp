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
import type { SearchableSelectOption } from "@/components/shared/searchable-select";
import { UnsavedChangesGuard } from "@/components/shared/unsaved-changes-guard";
import { Badge } from "@/components/ui/badge";
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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { VoucherToolbar } from "@/components/voucher/voucher-toolbar";
import { ACCOUNT_TYPE_BADGES } from "@/features/vouchers/constants";
import type { AccountLookupItem } from "@/features/vouchers/types";
import { browserApi } from "@/lib/browser-api";
import { formatAmount } from "@/lib/format";
import { cn } from "@/lib/utils";

import {
  createOpeningBalance,
  updateOpeningBalance,
  validateOpeningBalanceRows,
} from "./actions";
import {
  OPENING_ACCOUNT_TYPES,
  OPENING_BALANCES_PATH,
  defaultSide,
  openingBalancePath,
} from "./constants";
import { parseOpeningBalanceCsv, type ImportRow } from "./csv";
import type { OpeningBalanceLine, ValidationResult } from "./types";

type Side = "debit" | "credit";

interface DraftLine {
  key: string;
  accountId: string;
  code: string | null;
  name: string | null;
  type: string | null;
  side: Side;
  amount: string;
}

interface AccountOption extends SearchableSelectOption {
  code: string;
  type: string;
}

const MONEY = /^\d+(\.\d{1,2})?$/;
const round2 = (value: number) => Math.round(value * 100) / 100;

let seq = 0;
const newKey = () => `line-${++seq}`;

/** Every account that can take an opening balance; no cheque accounts. */
async function searchAccounts(query: string, signal: AbortSignal) {
  const params = new URLSearchParams({
    types: OPENING_ACCOUNT_TYPES.join(","),
    limit: "30",
  });
  if (query) params.set("q", query.slice(0, 100));
  const result = await browserApi<AccountLookupItem[]>(
    `/accounts/lookup?${params.toString().replaceAll("%2C", ",")}`,
    { signal },
  );
  if (!result.ok) return result;
  return {
    ok: true as const,
    data: result.data.map((account): AccountOption => ({
      value: account.id,
      label: account.name,
      description: account.code,
      badge: ACCOUNT_TYPE_BADGES[account.type] ?? account.type,
      code: account.code,
      type: account.type,
    })),
  };
}

function lineOf(account: {
  accountId: string;
  code: string | null;
  name: string | null;
  type: string | null;
  debit?: number;
  credit?: number;
}): DraftLine {
  const side: Side =
    (account.credit ?? 0) > 0
      ? "credit"
      : (account.debit ?? 0) > 0
        ? "debit"
        : defaultSide(account.type);
  const value = side === "debit" ? account.debit : account.credit;
  return {
    key: newKey(),
    accountId: account.accountId,
    code: account.code,
    name: account.name,
    type: account.type,
    side,
    amount: value ? String(value) : "",
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

interface OpeningBalanceFormProps {
  today: string;
  /** Present when editing. */
  existing?: {
    id: string;
    voucherNo: string;
    asOfDate: string;
    comments: string;
    lines: OpeningBalanceLine[];
  };
}

export function OpeningBalanceForm({
  today,
  existing,
}: OpeningBalanceFormProps) {
  const router = useRouter();
  const [asOfDate, setAsOfDate] = useState(
    existing ? existing.asOfDate.slice(0, 10) : today,
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

  const [importRows, setImportRows] = useState<ImportRow[] | null>(null);
  const [importCheck, setImportCheck] = useState<ValidationResult | null>(null);
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

  const value = (line: DraftLine) =>
    MONEY.test(line.amount.trim()) ? Number(line.amount) : 0;
  const totalDebit = round2(
    lines.filter((l) => l.side === "debit").reduce((s, l) => s + value(l), 0),
  );
  const totalCredit = round2(
    lines.filter((l) => l.side === "credit").reduce((s, l) => s + value(l), 0),
  );
  const difference = round2(totalDebit - totalCredit);

  const { byRow, general } = rowErrorsOf(serverErrors);
  const localError = (line: DraftLine) =>
    !MONEY.test(line.amount.trim()) || !(Number(line.amount) > 0)
      ? "Enter an amount greater than 0, up to 2 decimals."
      : null;
  const hasLocalErrors = lines.some((line) => localError(line) !== null);
  const futureDate = asOfDate > today;

  function addAccount(option: AccountOption | null) {
    if (!option) return;
    if (lines.some((line) => line.accountId === option.value)) {
      toast.info(`${option.code} ${option.label} is already on a line`);
      return;
    }
    change([
      ...lines,
      lineOf({
        accountId: option.value,
        code: option.code,
        name: option.label,
        type: option.type,
      }),
    ]);
  }

  function save() {
    setShowErrors(true);
    setServerErrors([]);
    if (lines.length === 0 || hasLocalErrors || !asOfDate || futureDate) return;
    const input = {
      asOfDate,
      comments,
      lines: lines.map((line) => ({
        accountId: line.accountId,
        debit: line.side === "debit" ? value(line) : 0,
        credit: line.side === "credit" ? value(line) : 0,
      })),
    };
    startTransition(async () => {
      try {
        const result = existing
          ? await updateOpeningBalance(existing.id, input, changeNote)
          : await createOpeningBalance(input);
        if (!result) return; // Redirected to sign in.
        if (!result.ok) {
          setServerErrors(result.messages);
          return;
        }
        setLeaving(true);
        const id = result.id ?? existing?.id;
        router.push(
          id ? `${openingBalancePath(id)}?saved=1` : OPENING_BALANCES_PATH,
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
    const rows = parseOpeningBalanceCsv(await file.text());
    if (rows.length === 0) {
      setImportError("The file has no rows. Columns: code, debit, credit.");
      setImportRows([]);
      return;
    }
    setImportRows(rows);
    const sendable = rows.filter((row) => row.problem === null);
    if (sendable.length === 0) return;
    startImport(async () => {
      try {
        const result = await validateOpeningBalanceRows(
          sendable.map((row) => ({
            accountCode: row.code,
            debit: row.debit,
            credit: row.credit,
          })),
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

  // The preview: each file row with its account (when found) and why not.
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
      checked?.accountId &&
      lines.some((line) => line.accountId === checked.accountId)
    ) {
      errors.push("Already on a line in this opening balance");
    }
    return { row, checked, errors };
  });
  const loadable = preview.filter(
    (entry) => entry.errors.length === 0 && entry.checked?.accountId,
  );

  function loadRows() {
    change([
      ...lines,
      ...loadable.map(({ checked }) =>
        lineOf({
          accountId: checked!.accountId!,
          code: checked!.accountCode,
          name: checked!.accountName,
          type: checked!.accountType,
          debit: checked!.debit,
          credit: checked!.credit,
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
    ? openingBalancePath(existing.id)
    : OPENING_BALANCES_PATH;

  return (
    <div className="space-y-6">
      <VoucherToolbar
        title={
          existing
            ? `Edit Opening Balance ${existing.voucherNo}`
            : "New Opening Balance"
        }
        description="Each account's balance as of a date. The difference goes to Opening Balance Equity."
        back={
          existing
            ? { href: backHref, label: existing.voucherNo }
            : { href: OPENING_BALANCES_PATH, label: "Opening Balances" }
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
        <FormErrorSummary messages={["Add at least one account."]} />
      ) : null}

      <Card className="gap-4">
        <CardContent className="grid gap-4 pt-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="ob-date">
              As of <span className="text-destructive">*</span>
            </Label>
            <Input
              id="ob-date"
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
            <Label htmlFor="ob-comments">Comments</Label>
            <Textarea
              id="ob-comments"
              value={comments}
              onChange={(event) => {
                setComments(event.target.value);
                setDirty(true);
              }}
              placeholder="e.g. Balances from atACC as of 30 Sep"
              className="min-h-9"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="gap-4">
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle>Accounts ({lines.length})</CardTitle>
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
              onClick={() => fileInput.current?.click()}
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
                  <TableHead>Account</TableHead>
                  <TableHead className="w-36">Side</TableHead>
                  <TableHead className="w-44 text-right">Amount</TableHead>
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
                        <span className="flex flex-wrap items-center gap-2 text-sm font-medium">
                          {line.name ?? "Unknown account"}
                          {line.type ? (
                            <Badge variant="secondary" className="font-normal">
                              {ACCOUNT_TYPE_BADGES[line.type] ?? line.type}
                            </Badge>
                          ) : null}
                        </span>
                        <span className="text-muted-foreground font-mono text-xs">
                          {line.code}
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
                        <ToggleGroup
                          variant="outline"
                          size="sm"
                          value={[line.side]}
                          onValueChange={(next) => {
                            const [side] = next;
                            if (side) update(line.key, { side: side as Side });
                          }}
                        >
                          <ToggleGroupItem value="debit">Dr</ToggleGroupItem>
                          <ToggleGroupItem value="credit">Cr</ToggleGroupItem>
                        </ToggleGroup>
                      </TableCell>
                      <TableCell className="align-top">
                        <Input
                          aria-label={`Amount for ${line.name ?? "account"}`}
                          type="number"
                          inputMode="decimal"
                          min={0}
                          step="0.01"
                          value={line.amount}
                          onChange={(event) =>
                            update(line.key, { amount: event.target.value })
                          }
                          placeholder="0.00"
                          className="text-right font-mono"
                          aria-invalid={rowErrors.length > 0 ? true : undefined}
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
                      No accounts yet. Add one below, or import a CSV with
                      columns code, debit, credit.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
          <div className="max-w-sm">
            <AsyncSearchableSelect<AccountOption>
              aria-label="Add an account"
              value={null}
              onChange={addAccount}
              search={searchAccounts}
              placeholder="+ Add an account"
              searchPlaceholder="Search customers, suppliers, cash, bank…"
              emptyText="No matching accounts"
              allowClear={false}
            />
          </div>
        </CardContent>
      </Card>

      <div className="bg-card grid grid-cols-1 gap-4 rounded-lg border p-4 sm:grid-cols-3">
        <div>
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Total debit
          </p>
          <p className="font-mono text-xl font-semibold tabular-nums">
            {formatAmount(totalDebit)}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Total credit
          </p>
          <p className="font-mono text-xl font-semibold tabular-nums">
            {formatAmount(totalCredit)}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Opening Balance Equity (auto)
          </p>
          <p className="font-mono text-xl font-semibold tabular-nums">
            {difference === 0
              ? formatAmount(0)
              : `${difference > 0 ? "Cr" : "Dr"} ${formatAmount(Math.abs(difference))}`}
          </p>
          <p className="text-muted-foreground text-xs">
            {difference === 0
              ? "Debits and credits match."
              : "Balances the difference, so both sides are equal."}
          </p>
        </div>
      </div>

      {existing ? (
        <div className="bg-card space-y-2 rounded-lg border p-4">
          <Label htmlFor="ob-change-note">
            Reason for change{" "}
            <span className="text-muted-foreground font-normal">
              (optional)
            </span>
          </Label>
          <Input
            id="ob-change-note"
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
                  <TableHead>Account</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
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
                      {checked?.accountName ?? "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm tabular-nums">
                      {row.debit ? formatAmount(row.debit) : ""}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm tabular-nums">
                      {row.credit ? formatAmount(row.credit) : ""}
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

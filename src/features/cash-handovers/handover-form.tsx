"use client";

import { Loader2, Send } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";

import {
  FieldError,
  FormErrorSummary,
} from "@/components/master/form-error-summary";
import { SearchableSelect } from "@/components/shared/searchable-select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { VoucherToolbar } from "@/components/voucher/voucher-toolbar";
import {
  STAFF_TYPE_LABELS,
  type CashierLookupItem,
} from "@/features/cashiers/types";
import { ACCOUNT_TYPE_BADGES } from "@/features/vouchers/constants";
import { PaymentMethodBadge } from "@/features/vouchers/payment-method-badge";
import type { AccountLookupItem } from "@/features/vouchers/types";
import { formatCalendarDate } from "@/lib/datetime";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

import { submitCashHandover } from "./actions";
import {
  CASH_HANDOVER_CONFIG as config,
  HANDOVER_NOTES_MAX_LENGTH,
  cashHandoverPath,
} from "./constants";
import type { UnsettledReceipt, UnsettledReceipts } from "./types";

const round2 = (value: number) => Math.round(value * 100) / 100;
const sum = (rows: UnsettledReceipt[]) =>
  round2(rows.reduce((total, row) => total + row.amount, 0));
const isBank = (row: UnsettledReceipt) => row.paymentMethod === "bank";

/** The account most of the cash receipts sit in: the likely source. */
function likelySource(
  receipts: UnsettledReceipt[],
  accounts: AccountLookupItem[],
): string {
  const counts = new Map<string, number>();
  for (const row of receipts) {
    if (!isBank(row)) {
      counts.set(row.account.id, (counts.get(row.account.id) ?? 0) + 1);
    }
  }
  const best = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  return best ?? accounts[0]?.id ?? "";
}

interface HandoverFormProps {
  /** Staff who settle with the office; null when locked to the user's own. */
  staff: CashierLookupItem[] | null;
  staffId: string | null;
  /** Shown read-only for an "own"-scoped user. */
  lockedStaffLabel: string | null;
  /** Active cash and wallet accounts. */
  sourceAccounts: AccountLookupItem[];
  /** null until a staff member is picked. */
  unsettled: UnsettledReceipts | null;
  today: string;
}

export function HandoverForm({
  staff,
  staffId,
  lockedStaffLabel,
  sourceAccounts,
  unsettled,
  today,
}: HandoverFormProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isNavigating, startNavigation] = useTransition();
  const [pending, startTransition] = useTransition();
  const receipts = unsettled?.receipts ?? [];

  const [voucherDate, setVoucherDate] = useState(today);
  const [sourceAccountId, setSourceAccountId] = useState(() =>
    likelySource(receipts, sourceAccounts),
  );
  const eligible = (row: UnsettledReceipt) =>
    isBank(row) || row.account.id === sourceAccountId;
  const [selected, setSelected] = useState<Set<string>>(
    () =>
      new Set(
        receipts
          .filter((row) => isBank(row) || row.account.id === sourceAccountId)
          .map((row) => row.id),
      ),
  );
  // Follows the expected cash until the user types their own count.
  const [countedText, setCountedText] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<string[]>([]);

  const picked = receipts.filter(
    (row) => selected.has(row.id) && eligible(row),
  );
  const expectedCash = sum(picked.filter((row) => !isBank(row)));
  const bankTotal = sum(picked.filter(isBank));
  const counted = countedText === null ? expectedCash : Number(countedText);
  const countedValid =
    countedText === null ||
    (countedText.trim() !== "" && Number.isFinite(counted) && counted >= 0);
  const difference = countedValid ? round2(counted - expectedCash) : 0;

  function pickStaff(id: string | null) {
    const query = id ? `?${new URLSearchParams({ staff: id })}` : "";
    startNavigation(() => router.replace(`${pathname}${query}`));
  }

  function pickSource(id: string) {
    setSourceAccountId(id);
    // Cash receipts in another account can't go on this handover.
    setSelected(
      new Set(
        receipts
          .filter((row) => isBank(row) || row.account.id === id)
          .map((row) => row.id),
      ),
    );
  }

  function toggle(id: string, on: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const problems = [
      staff && !staffId ? config.copy.cashierRequired : null,
      !sourceAccountId ? config.copy.headerRequired : null,
      picked.length === 0 ? config.copy.linesRequired : null,
      !countedValid ? "Enter the cash you're handing over." : null,
    ].filter((problem): problem is string => problem !== null);
    if (problems.length > 0) {
      setErrors(problems);
      return;
    }
    startTransition(async () => {
      const result = await submitCashHandover({
        voucherDate,
        staffId: staff ? staffId : null,
        sourceAccountId,
        receiptIds: picked.map((row) => row.id),
        countedCash: round2(counted),
        notes,
      });
      if (!result) return; // redirected to /login
      if (!result.ok) {
        setErrors(result.messages);
        return;
      }
      if (result.message) toast.success(result.message);
      router.push(result.id ? cashHandoverPath(result.id) : config.basePath);
    });
  }

  const staffOptions = (staff ?? []).map((member) => ({
    value: member.id,
    label: member.name,
    description: member.code,
    badge: STAFF_TYPE_LABELS[member.staffType] ?? "",
  }));
  const accountOptions = sourceAccounts.map((account) => ({
    value: account.id,
    label: account.name,
    description: account.code,
    badge: ACCOUNT_TYPE_BADGES[account.type] ?? account.type,
  }));
  const accountName = (id: string) =>
    sourceAccounts.find((account) => account.id === id)?.name ?? null;

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <VoucherToolbar
        title={`New ${config.singular}`}
        description={config.copy.newDescription}
        back={{ href: config.basePath, label: config.title }}
      />

      <FormErrorSummary messages={errors} />

      <Card className="gap-4">
        <CardHeader>
          <CardTitle>Handover Details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label>
              {config.copy.cashierLabel}{" "}
              <span className="text-destructive">*</span>
            </Label>
            {staff ? (
              <SearchableSelect
                value={staffId}
                onChange={pickStaff}
                options={staffOptions}
                placeholder="Select staff"
                emptyText={
                  staffOptions.length === 0
                    ? "No active staff settle cash with the office."
                    : "No matching staff"
                }
                allowClear={false}
                disabled={pending || isNavigating}
              />
            ) : lockedStaffLabel ? (
              <Input
                aria-label={config.copy.cashierLabel}
                value={lockedStaffLabel}
                readOnly
                className="bg-muted/50"
              />
            ) : (
              <p className="text-destructive text-sm">
                Your user isn&apos;t linked to staff who settle cash with the
                office. Ask an administrator.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="handover-date">
              Date <span className="text-destructive">*</span>
            </Label>
            <Input
              id="handover-date"
              type="date"
              value={voucherDate}
              onChange={(event) => setVoucherDate(event.target.value)}
              disabled={pending}
            />
          </div>

          <div className="space-y-2">
            <Label>
              {config.copy.headerLabel}{" "}
              <span className="text-destructive">*</span>
            </Label>
            <SearchableSelect
              value={sourceAccountId || null}
              onChange={(value) => pickSource(value ?? "")}
              options={accountOptions}
              placeholder="Select account"
              emptyText="No active cash or wallet accounts."
              allowClear={false}
              disabled={pending}
            />
            <p className="text-muted-foreground text-xs">
              Where the cash receipts were received into
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="gap-4">
        <CardHeader>
          <CardTitle>Unsettled Receipts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isNavigating ? (
            <p className="text-muted-foreground flex items-center gap-2 text-sm">
              <Loader2 className="size-4 animate-spin" /> Loading receipts...
            </p>
          ) : !unsettled ? (
            <p className="text-muted-foreground text-sm">
              Pick who is handing over to see their unsettled receipts.
            </p>
          ) : receipts.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No unsettled receipts. Everything collected has been handed over.
            </p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {receipts.map((row) => {
                const ok = eligible(row);
                return (
                  <li key={row.id}>
                    <label
                      className={cn(
                        "flex cursor-pointer items-start gap-3 p-3",
                        !ok && "cursor-not-allowed opacity-60",
                      )}
                    >
                      <Checkbox
                        className="mt-0.5"
                        checked={ok && selected.has(row.id)}
                        disabled={!ok || pending}
                        onCheckedChange={(checked) =>
                          toggle(row.id, checked === true)
                        }
                      />
                      <span className="min-w-0 flex-1 space-y-0.5">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-sm font-medium">
                            {row.voucherNo}
                          </span>
                          <PaymentMethodBadge method={row.paymentMethod} />
                        </span>
                        <span className="text-muted-foreground block text-xs">
                          {formatCalendarDate(row.date)} ·{" "}
                          {row.account.name ?? "Unknown account"}
                          {ok
                            ? ""
                            : ` — not in ${accountName(sourceAccountId) ?? "the source account"}`}
                        </span>
                      </span>
                      <span className="font-mono text-sm tabular-nums">
                        {formatCurrency(row.amount)}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}

          <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-muted-foreground text-xs uppercase">
                Expected cash
              </dt>
              <dd className="font-mono text-lg font-semibold tabular-nums">
                {formatCurrency(expectedCash)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs uppercase">
                Bank (to verify)
              </dt>
              <dd className="font-mono text-lg font-semibold tabular-nums">
                {formatCurrency(bankTotal)}
              </dd>
            </div>
            <div className="col-span-2 space-y-1 sm:col-span-1">
              <Label htmlFor="handover-counted">Cash handed over</Label>
              <Input
                id="handover-counted"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={countedText ?? expectedCash.toFixed(2)}
                onChange={(event) => setCountedText(event.target.value)}
                disabled={pending}
                className="font-mono"
              />
              {countedValid && difference !== 0 ? (
                <p
                  className={cn(
                    "text-xs",
                    difference < 0 ? "text-destructive" : "text-primary",
                  )}
                >
                  {formatCurrency(Math.abs(difference))}{" "}
                  {difference < 0 ? "short" : "over"} of the expected cash
                </p>
              ) : null}
              <FieldError
                id="handover-counted-error"
                message={countedValid ? undefined : "Enter a valid amount."}
              />
            </div>
          </dl>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <Label htmlFor="handover-notes">Notes</Label>
        <Textarea
          id="handover-notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder={config.copy.commentsPlaceholder}
          maxLength={HANDOVER_NOTES_MAX_LENGTH}
          disabled={pending}
        />
      </div>

      <div className="flex justify-end">
        <Button
          type="submit"
          className="w-full sm:w-auto"
          disabled={pending || picked.length === 0}
        >
          {pending ? <Loader2 className="animate-spin" /> : <Send />}
          Submit handover
        </Button>
      </div>
    </form>
  );
}

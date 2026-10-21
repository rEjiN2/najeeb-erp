"use client";

import { Loader2, Send, Wallet } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { FormErrorSummary } from "@/components/master/form-error-summary";
import { StatePanel } from "@/components/master/state-panel";
import { SearchableSelect } from "@/components/shared/searchable-select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { VoucherToolbar } from "@/components/voucher/voucher-toolbar";
import { ACCOUNT_TYPE_BADGES } from "@/features/vouchers/constants";
import type { UserRef } from "@/features/vouchers/types";
import { formatCalendarDate } from "@/lib/datetime";
import { formatAmount } from "@/lib/format";

import { browserApi, browserUpload } from "@/lib/browser-api";

import { submitCashHandover } from "./actions";
import { HandoverSplit } from "./handover-split";
import {
  HandoverExpenses,
  expenseAmount,
  expenseProblem,
  type DraftExpense,
} from "./handover-expenses";
import {
  CASH_HANDOVERS_PATH,
  CASH_HANDOVERS_TITLE,
  HANDOVER_NOTES_MAX_LENGTH,
  cashHandoverPath,
} from "./constants";
import type { PendingAccount, PendingCash } from "./types";

const round2 = (value: number) => Math.round(value * 100) / 100;

const GROUPS = [
  {
    key: "cash",
    title: "Cash",
    match: (a: PendingAccount) => a.type !== "cheque",
  },
  {
    key: "cheque",
    title: "Cheques",
    match: (a: PendingAccount) => a.type === "cheque",
  },
] as const;

interface HandoverFormProps {
  /** null when no user is picked yet. */
  pending: PendingCash | null;
  /** Users who can hand over; null: only yourself (no vouchers:select-collector). */
  users: UserRef[] | null;
  userId: string | null;
  today: string;
}

/** Pick amounts from the user's cash, wallet and cheque accounts and submit
 * them for approval. Nothing moves until the office approves. */
export function HandoverForm({
  pending,
  users,
  userId,
  today,
}: HandoverFormProps) {
  const router = useRouter();
  const pathname = usePathname();
  const accounts = (pending?.accounts ?? []).filter((a) => a.available > 0);
  const [amounts, setAmounts] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      accounts.map((a) => [a.accountId, a.available.toFixed(2)]),
    ),
  );
  const cheques = pending?.cheques ?? [];
  // Every cheque they hold goes by default; untick one kept back.
  const [chequeIds, setChequeIds] = useState<Set<string>>(
    () => new Set(cheques.map((cheque) => cheque.id)),
  );
  const bankReceipts = pending?.bankReceipts ?? [];
  const [bankIds, setBankIds] = useState<Set<string>>(
    () => new Set(bankReceipts.map((receipt) => receipt.id)),
  );
  const [voucherDate, setVoucherDate] = useState(today);
  const [notes, setNotes] = useState("");
  const [expenses, setExpenses] = useState<DraftExpense[]>([]);
  const spentFrom = (accountId: string) =>
    round2(
      expenses
        .filter((e) => e.sourceAccountId === accountId)
        .reduce((sum, e) => sum + expenseAmount(e), 0),
    );
  /** Expenses come out of the cash: lower each cash amount so the two fit. */
  function changeExpenses(next: DraftExpense[]) {
    setExpenses(next);
    setAmounts((prev) => {
      const fitted = { ...prev };
      for (const account of accounts) {
        const spent = next
          .filter((e) => e.sourceAccountId === account.accountId)
          .reduce((sum, e) => sum + expenseAmount(e), 0);
        const room = Math.max(round2(account.available - spent), 0);
        const current = Number(prev[account.accountId] ?? "");
        if (Number.isFinite(current) && current > room) {
          fitted[account.accountId] = room.toFixed(2);
        }
      }
      return fitted;
    });
  }
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, startTransition] = useTransition();

  const rows = accounts.map((account) => {
    const text = amounts[account.accountId] ?? "";
    const value = Number(text);
    const blank = text.trim() === "";
    const valid =
      blank ||
      (Number.isFinite(value) &&
        value >= 0 &&
        round2(value + spentFrom(account.accountId)) <= account.available);
    return { account, text, value: valid && !blank ? round2(value) : 0, valid };
  });
  const chequesTotal = round2(
    cheques
      .filter((cheque) => chequeIds.has(cheque.id))
      .reduce((sum, cheque) => sum + cheque.amount, 0),
  );
  const bankTotal = round2(
    bankReceipts
      .filter((receipt) => bankIds.has(receipt.id))
      .reduce((sum, receipt) => sum + receipt.amount, 0),
  );
  const total = round2(
    rows.reduce((sum, row) => sum + row.value, 0) + chequesTotal + bankTotal,
  );
  const expensesValid = expenses.every((e) => expenseProblem(e) === null);
  // The office sees the same split: cash, cheque and bank, plus bills.
  const split = {
    cash: round2(
      rows
        .filter(
          (row) => row.account.type !== "cheque" && row.account.type !== "bank",
        )
        .reduce((sum, row) => sum + row.value, 0),
    ),
    cheque: round2(
      rows
        .filter((row) => row.account.type === "cheque")
        .reduce((sum, row) => sum + row.value, 0) + chequesTotal,
    ),
    bank: round2(
      rows
        .filter((row) => row.account.type === "bank")
        .reduce((sum, row) => sum + row.value, 0) + bankTotal,
    ),
    expenses: round2(expenses.reduce((sum, e) => sum + expenseAmount(e), 0)),
  };
  const canSubmit =
    rows.every((row) => row.valid) &&
    expensesValid &&
    (total > 0 || expenses.length > 0);

  function submit() {
    if (!canSubmit) return;
    startTransition(async () => {
      try {
        const result = await submitCashHandover({
          voucherDate,
          userId: users ? userId : null,
          lines: rows
            .filter((row) => row.value > 0)
            .map((row) => ({
              sourceAccountId: row.account.accountId,
              amount: row.value,
            })),
          chequeIds: cheques
            .filter((cheque) => chequeIds.has(cheque.id))
            .map((cheque) => cheque.id),
          bankReceiptIds: bankReceipts
            .filter((receipt) => bankIds.has(receipt.id))
            .map((receipt) => receipt.id),
          expenses: expenses.map((e) => ({
            expenseAccountId: e.expenseAccountId,
            sourceAccountId: e.sourceAccountId,
            amount: expenseAmount(e),
            description: e.description,
          })),
          notes,
        });
        if (!result) return; // Redirected to sign in.
        if (!result.ok) {
          setErrors(result.messages);
          return;
        }
        if (result.message) toast.success(result.message);
        if (result.id && expenses.some((e) => e.file)) {
          await uploadBills(result.id);
        }
        router.push(
          result.id ? cashHandoverPath(result.id) : CASH_HANDOVERS_PATH,
        );
      } catch {
        setErrors([
          "Couldn't reach the app. Check your connection and try again.",
        ]);
      }
    });
  }

  /** Bills go up once the handover exists; its expenses keep the form's order. */
  async function uploadBills(handoverId: string) {
    const saved = await browserApi<{ expenses?: { _id: string }[] }>(
      `/cash-handovers/${encodeURIComponent(handoverId)}`,
    );
    const ids = saved.ok ? (saved.data.expenses ?? []) : [];
    let failed = 0;
    for (const [index, expense] of expenses.entries()) {
      const expenseId = ids[index]?._id;
      if (!expense.file) continue;
      if (!expenseId) {
        failed += 1;
        continue;
      }
      const form = new FormData();
      form.set("file", expense.file);
      const result = await browserUpload<unknown>(
        `/cash-handovers/${encodeURIComponent(handoverId)}/expenses/${encodeURIComponent(expenseId)}/attachment`,
        form,
      );
      if (!result.ok) failed += 1;
    }
    if (failed > 0) {
      toast.error(
        `${failed} bill${failed === 1 ? "" : "s"} couldn't be uploaded`,
        { description: "The handover was submitted without them." },
      );
    }
  }

  return (
    <div className="space-y-6">
      <VoucherToolbar
        title="Hand Over"
        description="Hand the cash and cheques you hold to the office. Nothing moves until it is approved."
        back={{ href: CASH_HANDOVERS_PATH, label: CASH_HANDOVERS_TITLE }}
        actions={
          <>
            <Link
              href={CASH_HANDOVERS_PATH}
              className={buttonVariants({ variant: "outline" })}
            >
              Cancel
            </Link>
            <Button onClick={submit} disabled={saving || !canSubmit}>
              {saving ? <Loader2 className="animate-spin" /> : <Send />}
              {saving ? "Submitting…" : "Submit"}
            </Button>
          </>
        }
      />

      <FormErrorSummary messages={errors} />

      {pending ? <HandoverSplit {...split} /> : null}

      <Card className="gap-4">
        <CardContent className="grid grid-cols-1 gap-4 pt-6 sm:grid-cols-2">
          {users ? (
            <div className="space-y-2">
              <Label>Handed By</Label>
              <SearchableSelect
                value={userId}
                onChange={(value) =>
                  router.replace(value ? `${pathname}?user=${value}` : pathname)
                }
                options={users.map((user) => ({
                  value: user.id,
                  label: user.name,
                }))}
                placeholder="Select user"
                emptyText="No matching users"
                allowClear={false}
                disabled={saving}
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="handed-by">Handed By</Label>
              <Input
                id="handed-by"
                value={pending?.user.name ?? ""}
                readOnly
                className="bg-muted/50"
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="handover-date">Date</Label>
            <Input
              id="handover-date"
              type="date"
              value={voucherDate}
              onChange={(event) => setVoucherDate(event.target.value)}
              disabled={saving}
            />
          </div>
        </CardContent>
      </Card>

      {!pending ? null : accounts.length === 0 &&
        cheques.length === 0 &&
        bankReceipts.length === 0 ? (
        <StatePanel icon={Wallet} title="Nothing to hand over">
          {pending.totals.submitted > 0
            ? `${formatAmount(pending.totals.submitted)} is already on handovers awaiting approval.`
            : "There is no cash or cheque in these accounts."}
        </StatePanel>
      ) : (
        GROUPS.map((group) => {
          const groupRows = rows.filter((row) => group.match(row.account));
          if (groupRows.length === 0) return null;
          const groupTotal = round2(
            groupRows.reduce((sum, row) => sum + row.value, 0),
          );
          return (
            <Card key={group.key} className="gap-4">
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>{group.title}</CardTitle>
                <span className="font-mono text-sm font-semibold tabular-nums">
                  {formatAmount(groupTotal)}
                </span>
              </CardHeader>
              <CardContent>
                <ul className="divide-y rounded-lg border">
                  {groupRows.map(({ account, text, valid }) => (
                    <li
                      key={account.accountId}
                      className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-[minmax(0,1fr)_11rem] sm:items-center"
                    >
                      <div className="min-w-0 space-y-0.5 text-sm">
                        <span className="flex flex-wrap items-center gap-2 font-medium">
                          {account.name}
                          <Badge variant="secondary" className="font-normal">
                            {ACCOUNT_TYPE_BADGES[account.type] ?? account.type}
                          </Badge>
                        </span>
                        <span className="text-muted-foreground block text-xs">
                          {account.code} · holds {formatAmount(account.balance)}
                          {account.submitted > 0
                            ? ` · ${formatAmount(account.submitted)} pending approval`
                            : ""}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <Input
                          aria-label={`Amount from ${account.name}`}
                          type="number"
                          inputMode="decimal"
                          min={0}
                          max={account.available}
                          step="0.01"
                          value={text}
                          onChange={(event) =>
                            setAmounts((prev) => ({
                              ...prev,
                              [account.accountId]: event.target.value,
                            }))
                          }
                          disabled={saving}
                          aria-invalid={valid ? undefined : true}
                          className="text-right font-mono"
                        />
                        {!valid ? (
                          <p className="text-destructive text-xs">
                            Up to{" "}
                            {formatAmount(
                              Math.max(
                                round2(
                                  account.available -
                                    spentFrom(account.accountId),
                                ),
                                0,
                              ),
                            )}
                            {spentFrom(account.accountId) > 0
                              ? ` (${formatAmount(account.available)} held, less ${formatAmount(spentFrom(account.accountId))} of expenses)`
                              : ""}
                          </p>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })
      )}

      {pending && accounts.some((a) => a.type !== "cheque") ? (
        <HandoverExpenses
          expenses={expenses}
          onChange={changeExpenses}
          accounts={accounts.filter((a) => a.type !== "cheque")}
          disabled={saving}
        />
      ) : null}

      {cheques.length > 0 ? (
        <Card className="gap-4">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Cheques collected</CardTitle>
            <span className="font-mono text-sm font-semibold tabular-nums">
              {formatAmount(chequesTotal)}
            </span>
          </CardHeader>
          <CardContent>
            <ul className="divide-y rounded-lg border">
              {cheques.map((cheque) => (
                <li key={cheque.id}>
                  <label className="flex cursor-pointer items-start gap-3 p-3">
                    <Checkbox
                      className="mt-0.5"
                      checked={chequeIds.has(cheque.id)}
                      onCheckedChange={(checked) =>
                        setChequeIds((prev) => {
                          const next = new Set(prev);
                          if (checked === true) next.add(cheque.id);
                          else next.delete(cheque.id);
                          return next;
                        })
                      }
                      disabled={saving}
                    />
                    <span className="min-w-0 flex-1 space-y-0.5 text-sm">
                      <span className="block font-medium">
                        Cheque {cheque.chequeNumber}
                      </span>
                      <span className="text-muted-foreground block text-xs">
                        {[
                          cheque.chequeBankName,
                          cheque.chequeDate
                            ? `dated ${formatCalendarDate(cheque.chequeDate)}`
                            : null,
                          cheque.voucherNo,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </span>
                    <span className="font-mono text-sm font-medium tabular-nums">
                      {formatAmount(cheque.amount)}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {bankReceipts.length > 0 ? (
        <Card className="gap-4">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Bank transfers collected</CardTitle>
            <span className="font-mono text-sm font-semibold tabular-nums">
              {formatAmount(bankTotal)}
            </span>
          </CardHeader>
          <CardContent className="space-y-2">
            <ul className="divide-y rounded-lg border">
              {bankReceipts.map((receipt) => (
                <li key={receipt.id}>
                  <label className="flex cursor-pointer items-start gap-3 p-3">
                    <Checkbox
                      className="mt-0.5"
                      checked={bankIds.has(receipt.id)}
                      onCheckedChange={(checked) =>
                        setBankIds((prev) => {
                          const next = new Set(prev);
                          if (checked === true) next.add(receipt.id);
                          else next.delete(receipt.id);
                          return next;
                        })
                      }
                      disabled={saving}
                    />
                    <span className="min-w-0 flex-1 space-y-0.5 text-sm">
                      <span className="block font-medium">
                        {receipt.voucherNo} ·{" "}
                        {receipt.bankAccountName ?? "Bank"}
                      </span>
                      <span
                        className={
                          receipt.attachmentCount > 0
                            ? "text-muted-foreground block text-xs"
                            : "text-destructive block text-xs"
                        }
                      >
                        {receipt.attachmentCount > 0
                          ? `${receipt.attachmentCount} slip attached`
                          : "No slip attached: attach it on the receipt first"}
                      </span>
                    </span>
                    <span className="font-mono text-sm font-medium tabular-nums">
                      {formatAmount(receipt.amount)}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
            <p className="text-muted-foreground text-xs">
              Already in the bank: the office checks each slip and approves.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {pending &&
      (accounts.length > 0 || cheques.length > 0 || bankReceipts.length > 0) ? (
        <Card className="gap-4">
          <CardContent className="space-y-2 pt-6">
            <Label htmlFor="handover-notes">Notes</Label>
            <Textarea
              id="handover-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              maxLength={HANDOVER_NOTES_MAX_LENGTH}
              placeholder="Optional notes for the office"
              disabled={saving}
            />
            <p className="text-right text-sm">
              Handing over{" "}
              <span className="font-mono font-semibold tabular-nums">
                {formatAmount(total)}
              </span>
            </p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

"use client";

import { Eye, Paperclip, Plus, Trash2 } from "lucide-react";
import { useRef, useState } from "react";

import { AsyncSearchableSelect } from "@/components/shared/async-searchable-select";
import { SearchableSelect } from "@/components/shared/searchable-select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { lineAccountSearch } from "@/features/vouchers/account-search";
import {
  ATTACHMENT_ACCEPT,
  AttachmentPreview,
  attachmentProblem,
} from "@/features/vouchers/attachments";
import { formatAmount } from "@/lib/format";

import type { PendingAccount } from "./types";

/** An expense as the form edits it; the bill is uploaded after submitting. */
export interface DraftExpense {
  key: string;
  expenseAccountId: string;
  expenseAccountName: string | null;
  sourceAccountId: string;
  amount: string;
  description: string;
  file: File | null;
}

const MONEY = /^\d+(\.\d{1,2})?$/;

/** 0 for blank or invalid text. */
export function expenseAmount(expense: DraftExpense): number {
  return MONEY.test(expense.amount.trim()) ? Number(expense.amount) : 0;
}

export function expenseProblem(expense: DraftExpense): string | null {
  if (!expense.expenseAccountId) return "Pick the expense account.";
  if (!expense.sourceAccountId) return "Pick the account it was paid from.";
  if (!(expenseAmount(expense) > 0)) return "Enter an amount above 0.";
  return null;
}

let seq = 0;

/**
 * Money spent out of the collected cash (fuel, parking, ...), each with an
 * optional bill photo or PDF, reviewed before submitting. Approval posts it
 * to the expense account.
 */
export function HandoverExpenses({
  expenses,
  onChange,
  accounts,
  disabled,
}: {
  expenses: DraftExpense[];
  onChange: (expenses: DraftExpense[]) => void;
  /** The user's cash and wallet accounts with money available. */
  accounts: PendingAccount[];
  disabled: boolean;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [fileFor, setFileFor] = useState<string | null>(null);
  const [review, setReview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const update = (key: string, patch: Partial<DraftExpense>) =>
    onChange(expenses.map((e) => (e.key === key ? { ...e, ...patch } : e)));
  const reviewed = expenses.find((e) => e.key === review) ?? null;
  const total = expenses.reduce((sum, e) => sum + expenseAmount(e), 0);

  return (
    <Card className="gap-4">
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Expenses paid from this cash</CardTitle>
        <span className="font-mono text-sm font-semibold tabular-nums">
          {formatAmount(total)}
        </span>
      </CardHeader>
      <CardContent className="space-y-3">
        <input
          ref={fileInput}
          type="file"
          accept={ATTACHMENT_ACCEPT}
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file || !fileFor) return;
            const problem = attachmentProblem(file);
            setError(problem);
            if (problem) return;
            update(fileFor, { file });
            // Review straight away, before submitting.
            setReview(fileFor);
          }}
        />
        {expenses.length > 0 ? (
          <ul className="divide-y rounded-lg border">
            {expenses.map((expense) => (
              <li
                key={expense.key}
                className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_8rem_minmax(0,1fr)_auto] lg:items-center"
              >
                <AsyncSearchableSelect
                  aria-label="Expense account"
                  value={expense.expenseAccountId || null}
                  valueLabel={expense.expenseAccountName ?? "Expense"}
                  onChange={(option) =>
                    update(expense.key, {
                      expenseAccountId: option?.value ?? "",
                      expenseAccountName: option?.label ?? null,
                    })
                  }
                  search={lineAccountSearch(["expense"])}
                  placeholder="Expense (fuel, parking…)"
                  searchPlaceholder="Search expense accounts…"
                  emptyText="No matching expense accounts"
                  allowClear={false}
                />
                <SearchableSelect
                  value={expense.sourceAccountId || null}
                  onChange={(value) =>
                    update(expense.key, { sourceAccountId: value ?? "" })
                  }
                  options={accounts.map((account) => ({
                    value: account.accountId,
                    label: account.name,
                    description: `Paid from · ${formatAmount(account.available)} available`,
                  }))}
                  placeholder="Paid from"
                  emptyText="No cash accounts"
                  allowClear={false}
                  disabled={disabled}
                />
                <Input
                  aria-label="Expense amount"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.01"
                  value={expense.amount}
                  onChange={(event) =>
                    update(expense.key, { amount: event.target.value })
                  }
                  placeholder="0.00"
                  className="text-right font-mono"
                  disabled={disabled}
                />
                <Input
                  aria-label="Expense note"
                  value={expense.description}
                  onChange={(event) =>
                    update(expense.key, { description: event.target.value })
                  }
                  maxLength={200}
                  placeholder="Note (optional)"
                  disabled={disabled}
                />
                <div className="flex items-center gap-1">
                  {expense.file ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setReview(expense.key)}
                      title={expense.file.name}
                    >
                      <Eye /> Bill
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setFileFor(expense.key);
                        fileInput.current?.click();
                      }}
                      disabled={disabled}
                    >
                      <Paperclip /> Bill
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Remove expense"
                    onClick={() =>
                      onChange(expenses.filter((e) => e.key !== expense.key))
                    }
                    disabled={disabled}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-sm">
            Spent some of the cash on fuel, parking or similar? Add it here with
            its bill; it is taken off what you hand over.
          </p>
        )}
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            seq += 1;
            onChange([
              ...expenses,
              {
                key: `expense-${seq}`,
                expenseAccountId: "",
                expenseAccountName: null,
                sourceAccountId:
                  accounts.length === 1 ? (accounts[0]?.accountId ?? "") : "",
                amount: "",
                description: "",
                file: null,
              },
            ]);
          }}
          disabled={disabled || accounts.length === 0}
        >
          <Plus /> Add expense
        </Button>
        {error ? (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        ) : null}
      </CardContent>
      <AttachmentPreview
        source={reviewed?.file ?? null}
        title={reviewed?.file?.name ?? ""}
        open={reviewed?.file != null}
        onOpenChange={(open) => {
          if (!open) setReview(null);
        }}
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (reviewed) update(reviewed.key, { file: null });
                setReview(null);
              }}
            >
              Remove bill
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setFileFor(reviewed?.key ?? null);
                setReview(null);
                fileInput.current?.click();
              }}
            >
              Choose another
            </Button>
            <Button type="button" onClick={() => setReview(null)}>
              Looks good
            </Button>
          </>
        }
      />
    </Card>
  );
}

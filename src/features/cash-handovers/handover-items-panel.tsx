"use client";

import { Check, Eye, Loader2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { FormErrorSummary } from "@/components/master/form-error-summary";
import { SearchableSelect } from "@/components/shared/searchable-select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  ACCOUNT_TYPE_BADGES,
  CANCEL_REASON_MIN_LENGTH,
} from "@/features/vouchers/constants";
import {
  AttachmentPreview,
  attachmentHref,
} from "@/features/vouchers/attachments";
import type { AccountLookupItem } from "@/features/vouchers/types";
import type { MutationResult } from "@/lib/mutation";
import { formatCalendarDate } from "@/lib/datetime";
import { formatAmount } from "@/lib/format";

import { approveCashHandover, rejectCashHandover } from "./actions";
import { HandoverSplit } from "./handover-split";
import { HANDOVER_REASON_MAX_LENGTH } from "./constants";
import type {
  HandoverDoc,
  HandoverExpense,
  HandoverItem,
  HandoverWorkflow,
} from "./types";

const round2 = (value: number) => Math.round(value * 100) / 100;

/** Cheques are received into cheque accounts; cash and wallet into cash/wallet. */
const isChequeItem = (item: HandoverItem) =>
  item.sourceAccountType === "cheque";

export interface ApprovePanelData {
  /** Active company cash, wallet and cheque accounts. */
  accounts: AccountLookupItem[];
  /** Company Profile defaults. */
  defaultCashInHandAccountId: string | null;
  defaultChequesInHandAccountId: string | null;
}

/** The source accounts on a handover and, for an approver while it is
 * submitted, the approve / reject controls. */
export function HandoverItemsPanel({
  id,
  voucherNo,
  workflow,
  approve,
}: {
  id: string;
  voucherNo: string;
  workflow: HandoverWorkflow;
  /** null: no approve controls (not pending, own handover, or no permission). */
  approve: ApprovePanelData | null;
}) {
  const items = workflow.items;
  const [doc, setDoc] = useState<HandoverDoc | null>(null);
  const docButtons = (docs: HandoverDoc[]) =>
    docs.length === 0 ? (
      <span className="text-destructive text-xs">No document</span>
    ) : (
      <span className="flex flex-wrap gap-1">
        {docs.map((d) => (
          <Button
            key={d.fileId}
            variant="outline"
            size="sm"
            onClick={() => setDoc(d)}
          >
            <Eye /> {docs.length === 1 ? "View" : d.title}
          </Button>
        ))}
      </span>
    );
  const sumItems = (match: (type: string) => boolean) =>
    items
      .filter((item) => match(item.sourceAccountType))
      .reduce((sum, item) => sum + item.submittedAmount, 0);
  const sumDocs = (docs: { amount: number }[]) =>
    docs.reduce((sum, doc) => sum + doc.amount, 0);
  return (
    <>
      <HandoverSplit
        label="Handed over"
        cash={sumItems((type) => type !== "cheque" && type !== "bank")}
        cheque={
          sumItems((type) => type === "cheque") + sumDocs(workflow.cheques)
        }
        bank={
          sumItems((type) => type === "bank") + sumDocs(workflow.bankReceipts)
        }
        expenses={workflow.expensesTotal}
      />

      <Card className="gap-4">
        <CardHeader>
          <CardTitle>
            Handed over (
            {items.length +
              workflow.cheques.length +
              workflow.bankReceipts.length}
            )
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>From</TableHead>
                <TableHead className="text-right">Submitted</TableHead>
                <TableHead className="text-right">Received</TableHead>
                <TableHead>Received Into</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.sourceAccountId}>
                  <TableCell>
                    <span className="flex flex-wrap items-center gap-2">
                      {item.sourceAccountName}
                      <TypeBadge type={item.sourceAccountType} />
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {formatAmount(item.submittedAmount)}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {item.receivedAmount === null
                      ? "—"
                      : formatAmount(item.receivedAmount)}
                  </TableCell>
                  <TableCell>{item.receivedIntoAccountName ?? "—"}</TableCell>
                </TableRow>
              ))}
              {workflow.cheques.map((cheque) => (
                <TableRow key={cheque.receiptId}>
                  <TableCell>
                    <span className="flex flex-wrap items-center gap-2">
                      Cheque {cheque.chequeNumber}
                      <TypeBadge type="cheque" />
                    </span>
                    <span className="text-muted-foreground block text-xs">
                      {[
                        cheque.voucherNo,
                        cheque.chequeBankName,
                        cheque.chequeDate
                          ? `dated ${formatCalendarDate(cheque.chequeDate)}`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {formatAmount(cheque.amount)}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {workflow.receivedTotal === null
                      ? "—"
                      : formatAmount(cheque.amount)}
                  </TableCell>
                  <TableCell className="text-muted-foreground space-y-1 text-sm">
                    <span className="block">
                      Cheques in hand (pending until cleared)
                    </span>
                    {docButtons(cheque.attachments)}
                  </TableCell>
                </TableRow>
              ))}
              {workflow.bankReceipts.map((receipt) => (
                <TableRow key={receipt.receiptId}>
                  <TableCell>
                    <span className="flex flex-wrap items-center gap-2">
                      Bank transfer {receipt.voucherNo}
                      <TypeBadge type="bank" />
                    </span>
                    {receipt.reference ? (
                      <span className="text-muted-foreground block text-xs">
                        Ref {receipt.reference}
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {formatAmount(receipt.amount)}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {workflow.receivedTotal === null
                      ? "—"
                      : formatAmount(receipt.amount)}
                  </TableCell>
                  <TableCell className="text-muted-foreground space-y-1 text-sm">
                    <span className="block">
                      Already in {receipt.bankAccountName ?? "the bank"}: check
                      the slip
                    </span>
                    {docButtons(receipt.attachments)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell className="font-medium">Total</TableCell>
                <TableCell className="text-right font-mono font-semibold tabular-nums">
                  {formatAmount(workflow.submittedTotal)}
                </TableCell>
                <TableCell className="text-right font-mono font-semibold tabular-nums">
                  {workflow.receivedTotal === null
                    ? "—"
                    : formatAmount(workflow.receivedTotal)}
                </TableCell>
                <TableCell />
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>

      <AttachmentPreview
        source={
          doc
            ? { url: attachmentHref(doc.fileId), mimeType: doc.mimeType }
            : null
        }
        title={doc?.title ?? ""}
        open={doc !== null}
        onOpenChange={(open) => {
          if (!open) setDoc(null);
        }}
      />

      {workflow.expenses.length > 0 ? (
        <ExpensesCard workflow={workflow} />
      ) : null}

      {approve ? (
        <ApproveCard
          id={id}
          voucherNo={voucherNo}
          items={items}
          data={approve}
        />
      ) : null}
    </>
  );
}

/** Expenses paid from the collected cash; approval posts them. */
function ExpensesCard({ workflow }: { workflow: HandoverWorkflow }) {
  const [bill, setBill] = useState<HandoverExpense | null>(null);
  return (
    <Card className="gap-4">
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Expenses ({workflow.expenses.length})</CardTitle>
        <span className="font-mono text-sm font-semibold tabular-nums">
          {formatAmount(workflow.expensesTotal)}
        </span>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Expense</TableHead>
              <TableHead>Paid from</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Bill</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {workflow.expenses.map((expense) => (
              <TableRow key={expense.id}>
                <TableCell>
                  {expense.expenseAccountName}
                  {expense.description ? (
                    <span className="text-muted-foreground block text-xs">
                      {expense.description}
                    </span>
                  ) : null}
                </TableCell>
                <TableCell>
                  {expense.sourceAccountName}
                  {expense.paidFrom === "petty_cash" ? (
                    <span className="text-muted-foreground block text-xs">
                      Petty cash claim
                    </span>
                  ) : null}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {formatAmount(expense.amount)}
                </TableCell>
                <TableCell>
                  {expense.attachment ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setBill(expense)}
                    >
                      <Eye /> View
                    </Button>
                  ) : (
                    <span className="text-muted-foreground text-sm">None</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <p className="text-muted-foreground mt-2 text-xs">
          {workflow.receivedTotal === null
            ? "Posted to each expense account when the handover is approved."
            : "Posted to the expense accounts."}
        </p>
      </CardContent>
      <AttachmentPreview
        source={
          bill?.attachment
            ? {
                url: attachmentHref(bill.attachment.fileId),
                mimeType: bill.attachment.mimeType,
              }
            : null
        }
        title={bill?.attachment?.title ?? ""}
        open={bill !== null}
        onOpenChange={(open) => {
          if (!open) setBill(null);
        }}
      />
    </Card>
  );
}

function TypeBadge({ type }: { type: string }) {
  return (
    <Badge variant="secondary" className="font-normal">
      {ACCOUNT_TYPE_BADGES[type] ?? type}
    </Badge>
  );
}

interface LineState {
  received: string;
  intoId: string | null;
}

function ApproveCard({
  id,
  voucherNo,
  items,
  data,
}: {
  id: string;
  voucherNo: string;
  items: HandoverItem[];
  data: ApprovePanelData;
}) {
  const router = useRouter();
  const [lines, setLines] = useState<Record<string, LineState>>(() =>
    Object.fromEntries(
      items.map((item) => [
        item.sourceAccountId,
        {
          received: item.submittedAmount.toFixed(2),
          // Into the same account is fine: it was pending there, now received.
          intoId: isChequeItem(item)
            ? data.defaultChequesInHandAccountId
            : item.sourceAccountType === "bank"
              ? item.sourceAccountId
              : data.defaultCashInHandAccountId,
        },
      ]),
    ),
  );
  const [reason, setReason] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();

  const accountsFor = (item: HandoverItem) =>
    data.accounts.filter((account) =>
      isChequeItem(item)
        ? account.type === "cheque"
        : item.sourceAccountType === "bank"
          ? account.type === "bank"
          : account.type === "cash" || account.type === "wallet",
    );
  const nameOf = (accountId: string | null) =>
    data.accounts.find((account) => account.id === accountId)?.name ?? "—";

  const rows = items.map((item) => {
    const line = lines[item.sourceAccountId] ?? { received: "", intoId: null };
    const value = Number(line.received);
    const valid =
      line.received.trim() !== "" &&
      Number.isFinite(value) &&
      value >= 0 &&
      round2(value) <= item.submittedAmount;
    return { item, line, value: valid ? round2(value) : 0, valid };
  });
  const receivedTotal = round2(rows.reduce((sum, row) => sum + row.value, 0));
  const submittedTotal = round2(
    items.reduce((sum, item) => sum + item.submittedAmount, 0),
  );
  const short = rows.some(
    (row) => row.valid && row.value < row.item.submittedAmount,
  );
  const canApprove =
    rows.every((row) => row.valid && row.line.intoId) &&
    (!short || reason.trim() !== "");

  function update(sourceId: string, patch: Partial<LineState>) {
    setLines((prev) => ({
      ...prev,
      [sourceId]: {
        ...(prev[sourceId] ?? { received: "", intoId: null }),
        ...patch,
      },
    }));
  }

  function run(task: () => Promise<MutationResult>) {
    startTransition(async () => {
      try {
        const result = await task();
        if (!result) return; // Redirected to sign in.
        if (!result.ok) {
          setErrors(result.messages);
          setConfirming(false);
          return;
        }
        setErrors([]);
        setConfirming(false);
        if (result.message) toast.success(result.message);
        router.refresh();
      } catch {
        setErrors([
          "Couldn't reach the app. Check your connection and try again.",
        ]);
        setConfirming(false);
      }
    });
  }

  function approve() {
    run(() =>
      approveCashHandover(id, {
        lines: rows.map((row) => ({
          sourceAccountId: row.item.sourceAccountId,
          receivedAmount: row.value,
          receivedIntoAccountId: row.line.intoId ?? "",
        })),
        reason: short ? reason : "",
      }),
    );
  }

  function reject() {
    if (rejectReason.trim().length < CANCEL_REASON_MIN_LENGTH) {
      setErrors([
        `Give a reason of at least ${CANCEL_REASON_MIN_LENGTH} characters.`,
      ]);
      return;
    }
    run(() => rejectCashHandover(id, rejectReason));
  }

  return (
    <Card className="gap-4 print:hidden">
      <CardHeader>
        <CardTitle>Approve Handover</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormErrorSummary messages={errors} />

        <ul className="space-y-3">
          {rows.map(({ item, line, valid }) => {
            const options = accountsFor(item).map((account) => ({
              value: account.id,
              label: account.name,
              description: account.code,
              badge: ACCOUNT_TYPE_BADGES[account.type] ?? account.type,
            }));
            return (
              <li
                key={item.sourceAccountId}
                className="grid grid-cols-1 gap-3 rounded-lg border p-3 sm:grid-cols-[minmax(0,1fr)_10rem_minmax(0,1fr)] sm:items-end"
              >
                <div className="space-y-0.5 text-sm">
                  <span className="flex flex-wrap items-center gap-2 font-medium">
                    {item.sourceAccountName}
                    <TypeBadge type={item.sourceAccountType} />
                  </span>
                  <span className="text-muted-foreground block text-xs">
                    Submitted {formatAmount(item.submittedAmount)}
                  </span>
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`received-${item.sourceAccountId}`}>
                    Received
                  </Label>
                  <Input
                    id={`received-${item.sourceAccountId}`}
                    type="number"
                    inputMode="decimal"
                    min={0}
                    max={item.submittedAmount}
                    step="0.01"
                    value={line.received}
                    onChange={(event) =>
                      update(item.sourceAccountId, {
                        received: event.target.value,
                      })
                    }
                    disabled={pending}
                    aria-invalid={valid ? undefined : true}
                    className="font-mono"
                  />
                  {!valid ? (
                    <p className="text-destructive text-xs">
                      0 to {formatAmount(item.submittedAmount)}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-1">
                  <Label>Received into</Label>
                  <SearchableSelect
                    value={line.intoId}
                    onChange={(value) =>
                      update(item.sourceAccountId, { intoId: value })
                    }
                    options={options}
                    placeholder="Select account"
                    emptyText={
                      isChequeItem(item)
                        ? "No active cheque accounts. Add one under Masters → Accounts."
                        : "No active cash or wallet accounts."
                    }
                    allowClear={false}
                    disabled={pending}
                  />
                </div>
              </li>
            );
          })}
        </ul>

        {short ? (
          <div className="space-y-2">
            <Label htmlFor="short-reason">
              Reason for the shortage{" "}
              <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="short-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={HANDOVER_REASON_MAX_LENGTH}
              placeholder="The rest stays with the salesman."
              disabled={pending}
            />
          </div>
        ) : null}

        {rejecting ? (
          <div className="space-y-2">
            <Label htmlFor="reject-reason">
              Why are you rejecting it?{" "}
              <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="reject-reason"
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              maxLength={HANDOVER_REASON_MAX_LENGTH}
              placeholder="Nothing moves; the salesman can hand over again."
              disabled={pending}
            />
          </div>
        ) : null}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
          <p className="text-muted-foreground text-sm sm:mr-auto">
            Receiving{" "}
            <span className="text-foreground font-mono font-medium">
              {formatAmount(receivedTotal)}
            </span>{" "}
            of {formatAmount(submittedTotal)}
          </p>
          {rejecting ? (
            <>
              <Button
                variant="ghost"
                onClick={() => setRejecting(false)}
                disabled={pending}
              >
                Back
              </Button>
              <Button variant="destructive" onClick={reject} disabled={pending}>
                {pending ? <Loader2 className="animate-spin" /> : <X />}
                Reject handover
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                className="text-destructive hover:text-destructive"
                onClick={() => setRejecting(true)}
                disabled={pending}
              >
                <X /> Reject
              </Button>
              <Button
                onClick={() => setConfirming(true)}
                disabled={pending || !canApprove}
              >
                <Check /> Approve
              </Button>
            </>
          )}
        </div>
      </CardContent>

      <AlertDialog
        open={confirming}
        onOpenChange={(open) => {
          if (!open && !pending) setConfirming(false);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve handover {voucherNo}?</AlertDialogTitle>
            <AlertDialogDescription>
              {formatAmount(receivedTotal)} is posted out of the salesman&apos;s
              accounts and into the company accounts below.
              {short
                ? ` ${formatAmount(round2(submittedTotal - receivedTotal))} short stays with the salesman.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <ul className="divide-y rounded-lg border text-sm">
            {rows.map(({ item, line, value }) => (
              <li
                key={item.sourceAccountId}
                className="flex items-center justify-between gap-3 p-2.5"
              >
                <span className="min-w-0">
                  {item.sourceAccountName} → {nameOf(line.intoId)}
                </span>
                <span className="shrink-0 font-mono tabular-nums">
                  {formatAmount(value)}
                </span>
              </li>
            ))}
          </ul>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Back</AlertDialogCancel>
            <AlertDialogAction onClick={approve} disabled={pending}>
              {pending ? <Loader2 className="animate-spin" /> : <Check />}
              {pending ? "Approving…" : "Approve"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

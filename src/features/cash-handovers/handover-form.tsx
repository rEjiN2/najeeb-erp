"use client";

import { Loader2, Save, Wallet } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import {
  FieldError,
  FormErrorSummary,
} from "@/components/master/form-error-summary";
import {
  SearchableSelect,
  type SearchableSelectOption,
} from "@/components/shared/searchable-select";
import { UnsavedChangesGuard } from "@/components/shared/unsaved-changes-guard";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { VoucherToolbar } from "@/components/voucher/voucher-toolbar";
import type { CashierLookupItem } from "@/features/cashiers/types";
import { voucherPath } from "@/features/vouchers/config";
import {
  ACCOUNT_TYPE_BADGES,
  REASON_MAX_LENGTH,
} from "@/features/vouchers/constants";
import { parseMoney } from "@/features/vouchers/form/draft";
import { VoucherWarningsDialog } from "@/features/vouchers/form/voucher-warnings-dialog";
import type {
  AccountLookupItem,
  VoucherDetail,
  VoucherWarning,
} from "@/features/vouchers/types";
import { browserApi } from "@/lib/browser-api";
import { toDateInputValue, uaeToday } from "@/lib/datetime";
import { formatAmount } from "@/lib/format";
import { cn } from "@/lib/utils";

import {
  CASH_HANDOVER_CONFIG as config,
  HANDOVER_NOTES_MAX_LENGTH,
  HANDOVER_REFERENCE_MAX_LENGTH,
} from "./constants";
import type {
  CreateHandoverAction,
  HandoverInput,
  UpdateHandoverAction,
} from "./types";

/** The backend's answer to an edit that changes nothing. */
const NO_CHANGES = "No changes to save";

interface Draft {
  voucherDate: string;
  fromAccountId: string;
  toAccountId: string;
  amount: string;
  handedByCashierId: string;
  receivedByCashierId: string;
  reference: string;
  notes: string;
}

type DraftField = Exclude<keyof Draft, "reference" | "notes">;

function draftFromVoucher(voucher: VoucherDetail): Draft {
  const receivedBy = voucher.extraFields.find((f) => f.key === "receivedBy");
  return {
    voucherDate: toDateInputValue(voucher.voucherDate),
    fromAccountId: voucher.headerAccount.id,
    toAccountId: voucher.lines[0]?.accountId ?? "",
    amount: String(voucher.grandTotal),
    handedByCashierId: voucher.cashier.id ?? "",
    receivedByCashierId: receivedBy?.id ?? "",
    reference: voucher.paymentReference ?? "",
    notes: voucher.comments,
  };
}

function validate(draft: Draft): Partial<Record<DraftField, string>> {
  const errors: Partial<Record<DraftField, string>> = {};
  if (!draft.voucherDate) errors.voucherDate = "Pick the voucher date.";
  if (!draft.fromAccountId) errors.fromAccountId = config.copy.headerRequired;
  if (!draft.toAccountId) errors.toAccountId = config.copy.linesRequired;
  else if (draft.toAccountId === draft.fromAccountId) {
    errors.toAccountId = "Pick a different account from the one it leaves.";
  }
  const amount = parseMoney(draft.amount);
  if (Number.isNaN(amount) || amount <= 0) {
    errors.amount = "Enter an amount above 0, up to 2 decimals.";
  }
  if (!draft.handedByCashierId) {
    errors.handedByCashierId = config.copy.cashierRequired;
  }
  if (!draft.receivedByCashierId) {
    errors.receivedByCashierId = "Select the cashier receiving the money.";
  } else if (draft.receivedByCashierId === draft.handedByCashierId) {
    errors.receivedByCashierId =
      "Pick someone other than the cashier handing it over.";
  }
  return errors;
}

function toInput(draft: Draft): HandoverInput {
  return {
    voucherDate: draft.voucherDate,
    fromAccountId: draft.fromAccountId,
    toAccountId: draft.toAccountId,
    amount: parseMoney(draft.amount),
    handedByCashierId: draft.handedByCashierId,
    receivedByCashierId: draft.receivedByCashierId,
    reference: draft.reference,
    notes: draft.notes,
  };
}

/** Accounts as picker options; one no longer active stays selectable. */
function accountOptions(
  accounts: AccountLookupItem[],
  current: { id: string; name: string | null } | null,
): SearchableSelectOption[] {
  const options = accounts.map((account) => ({
    value: account.id,
    label: account.name,
    description: account.code,
    badge: ACCOUNT_TYPE_BADGES[account.type] ?? account.type,
  }));
  if (current?.id && !options.some((o) => o.value === current.id)) {
    options.unshift({
      value: current.id,
      label: current.name ?? "Unknown account",
      description: "Inactive — pick an active account to save",
      badge: "Inactive",
    });
  }
  return options;
}

function cashierOptions(
  cashiers: CashierLookupItem[],
  current: { id: string | null; name: string | null } | null,
): SearchableSelectOption[] {
  const options = cashiers.map((cashier) => ({
    value: cashier.id,
    label: cashier.name,
    description: cashier.code,
  }));
  if (current?.id && !options.some((o) => o.value === current.id)) {
    options.unshift({
      value: current.id,
      label: current.name ?? "Unknown cashier",
      description: "Inactive — kept on this handover",
    });
  }
  return options;
}

/** The cashier's cash collected but not yet handed over, from the
 * salesman collections report (all time = as of now). */
function usePendingCash(cashierId: string, enabled: boolean) {
  const [state, setState] = useState<
    | { cashierId: string; status: "loading" }
    | { cashierId: string; status: "done"; amount: number }
    | { cashierId: string; status: "failed" }
    | null
  >(null);

  useEffect(() => {
    if (!enabled || !cashierId) return;
    const controller = new AbortController();
    browserApi<{ rows: { closingPending: number }[] }>(
      `/reports/salesman-collections?${new URLSearchParams({ cashierId })}`,
      { signal: controller.signal },
    )
      .then((result) => {
        setState(
          result.ok
            ? {
                cashierId,
                status: "done",
                amount: result.data.rows[0]?.closingPending ?? 0,
              }
            : { cashierId, status: "failed" },
        );
      })
      .catch(() => {
        // Aborted: a newer cashier was picked.
      });
    return () => controller.abort();
  }, [cashierId, enabled]);

  if (!enabled || !cashierId) return null;
  // Nothing fetched yet for this cashier: still loading.
  return state?.cashierId === cashierId
    ? state
    : { cashierId, status: "loading" as const };
}

type HandoverFormProps = {
  createAction: CreateHandoverAction;
  updateAction: UpdateHandoverAction;
  /** Where money can leave from (a scoped user: their assigned accounts). */
  fromAccounts: AccountLookupItem[];
  /** Where it can go: every active cash, wallet and bank account. */
  toAccounts: AccountLookupItem[];
  /** Active cashiers. */
  cashiers: CashierLookupItem[];
  /** The signed-in user's own active cashier. */
  myCashierId: string | null;
  /** "Own"-scoped user: Handed By is locked to their cashier. */
  scoped: boolean;
  /** reports:salesman — the Handed By pending cash hint needs it. */
  canSeePending: boolean;
} & (
  | { mode: "create"; voucher?: undefined }
  | { mode: "edit"; voucher: VoucherDetail }
);

export function HandoverForm({
  createAction,
  updateAction,
  mode,
  voucher,
  fromAccounts,
  toAccounts,
  cashiers,
  myCashierId,
  scoped,
  canSeePending,
}: HandoverFormProps) {
  const router = useRouter();
  const [initial] = useState<Draft>(() =>
    voucher
      ? draftFromVoucher(voucher)
      : {
          voucherDate: uaeToday(),
          fromAccountId:
            fromAccounts.length === 1 ? (fromAccounts[0]?.id ?? "") : "",
          toAccountId: "",
          amount: "",
          // A scoped user hands over their own cash; anyone else usually
          // receives it, so Received By starts as their cashier.
          handedByCashierId: scoped ? (myCashierId ?? "") : "",
          receivedByCashierId: scoped ? "" : (myCashierId ?? ""),
          reference: "",
          notes: "",
        },
  );
  const [draft, setDraft] = useState(initial);
  const [changeNote, setChangeNote] = useState("");
  const [showErrors, setShowErrors] = useState(false);
  const [serverErrors, setServerErrors] = useState<string[]>([]);
  const [pendingWarnings, setPendingWarnings] = useState<{
    input: HandoverInput;
    warnings: VoucherWarning[];
  } | null>(null);
  const [pending, startTransition] = useTransition();
  const [leaving, setLeaving] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const errorsRef = useRef<HTMLDivElement>(null);

  const errors = validate(draft);
  const valid = Object.keys(errors).length === 0;
  const visible = showErrors ? errors : {};
  const isDirty =
    JSON.stringify(draft) !== JSON.stringify(initial) ||
    changeNote.trim() !== "";
  const backHref = voucher ? voucherPath(config, voucher.id) : config.basePath;
  const pendingCash = usePendingCash(draft.handedByCashierId, canSeePending);

  const update = (patch: Partial<Draft>) =>
    setDraft((prev) => ({ ...prev, ...patch }));

  // Ctrl/Cmd + S saves, like the other voucher screens.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        formRef.current?.requestSubmit();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function submit() {
    setShowErrors(true);
    setServerErrors([]);
    if (!valid) {
      errorsRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      return;
    }
    save(toInput(draft), false);
  }

  function save(input: HandoverInput, acknowledgeWarnings: boolean) {
    startTransition(async () => {
      try {
        const result =
          mode === "edit"
            ? await updateAction(
                voucher.id,
                input,
                changeNote,
                acknowledgeWarnings,
              )
            : await createAction(input, acknowledgeWarnings);
        if (!result) return; // Redirected to sign in.

        if (result.ok) {
          setPendingWarnings(null);
          setLeaving(true);
          const id = result.id ?? voucher?.id;
          router.push(
            id ? `${voucherPath(config, id)}?saved=1` : config.basePath,
          );
          return;
        }
        if ("warnings" in result) {
          setPendingWarnings({ input, warnings: result.warnings });
          return;
        }
        setPendingWarnings(null);
        setServerErrors(result.messages);
        errorsRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      } catch {
        setPendingWarnings(null);
        setServerErrors([
          "Couldn't reach the app. Check your connection and try again.",
        ]);
      }
    });
  }

  const fromOptions = accountOptions(
    fromAccounts,
    voucher ? voucher.headerAccount : null,
  );
  const toOptions = accountOptions(
    toAccounts,
    voucher && voucher.lines[0]
      ? { id: voucher.lines[0].accountId, name: voucher.lines[0].accountName }
      : null,
  );
  const receivedByField = voucher?.extraFields.find(
    (f) => f.key === "receivedBy",
  );
  const handedOptions = cashierOptions(cashiers, voucher?.cashier ?? null);
  const receivedOptions = cashierOptions(
    cashiers,
    receivedByField
      ? { id: receivedByField.id ?? null, name: receivedByField.value }
      : null,
  );
  const lockedHandedBy = handedOptions.find(
    (o) => o.value === draft.handedByCashierId,
  );
  const isNoChanges =
    serverErrors.length === 1 && serverErrors[0] === NO_CHANGES;

  return (
    <>
      <form
        ref={formRef}
        noValidate
        className="space-y-6"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <VoucherToolbar
          title={
            mode === "edit"
              ? `Edit ${config.singular} ${voucher.voucherNo}`
              : `New ${config.singular}`
          }
          description={
            mode === "edit"
              ? config.copy.editDescription
              : config.copy.newDescription
          }
          back={
            voucher
              ? { href: backHref, label: voucher.voucherNo }
              : { href: config.basePath, label: config.title }
          }
          actions={
            <>
              <Link
                href={backHref}
                className={buttonVariants({ variant: "outline" })}
                aria-disabled={pending}
              >
                Cancel
              </Link>
              <Button type="submit" disabled={pending}>
                {pending ? <Loader2 className="animate-spin" /> : <Save />}
                {pending
                  ? "Saving…"
                  : mode === "edit"
                    ? "Save changes"
                    : "Save"}
              </Button>
            </>
          }
        />

        <div ref={errorsRef} className="space-y-3 empty:hidden">
          {isNoChanges ? (
            <p
              role="status"
              className="bg-muted/60 rounded-lg border p-3 text-sm"
            >
              Nothing on this handover differs from the saved version.
            </p>
          ) : (
            <FormErrorSummary messages={serverErrors} />
          )}
          {showErrors && !valid ? (
            <FormErrorSummary
              title="Check the highlighted fields"
              messages={Object.values(errors)}
            />
          ) : null}
        </div>

        <Card className="gap-4">
          <CardHeader>
            <CardTitle>Handover Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {voucher ? (
              <div className="space-y-2">
                <Label htmlFor="voucher-no">Voucher No</Label>
                <Input
                  id="voucher-no"
                  value={voucher.voucherNo}
                  readOnly
                  className="bg-muted/50 font-mono"
                />
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="voucher-date">
                Voucher Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="voucher-date"
                type="date"
                value={draft.voucherDate}
                onChange={(event) =>
                  update({ voucherDate: event.target.value })
                }
                disabled={pending}
                aria-invalid={visible.voucherDate ? true : undefined}
              />
              <FieldError
                id="voucher-date-error"
                message={visible.voucherDate}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">
                Amount <span className="text-destructive">*</span>
              </Label>
              <Input
                id="amount"
                inputMode="decimal"
                value={draft.amount}
                onChange={(event) => update({ amount: event.target.value })}
                placeholder="0.00"
                disabled={pending}
                aria-invalid={visible.amount ? true : undefined}
                className="font-mono tabular-nums"
              />
              <FieldError id="amount-error" message={visible.amount} />
            </div>

            <div className="space-y-2">
              <Label>
                {config.copy.headerLabel}{" "}
                <span className="text-destructive">*</span>
              </Label>
              <div
                className={cn(
                  visible.fromAccountId &&
                    "ring-destructive/40 rounded-lg ring-2",
                )}
              >
                <SearchableSelect
                  value={draft.fromAccountId || null}
                  onChange={(value) => update({ fromAccountId: value ?? "" })}
                  options={fromOptions}
                  placeholder="Select account"
                  emptyText={
                    fromAccounts.length > 0
                      ? "No matching accounts"
                      : scoped
                        ? "No cash accounts are assigned to your user. Ask an administrator to assign one."
                        : "No active cash, wallet or bank accounts."
                  }
                  allowClear={false}
                  disabled={pending}
                />
              </div>
              <FieldError id="from-error" message={visible.fromAccountId} />
            </div>

            <div className="space-y-2">
              <Label>
                {config.copy.counterpartyLabel}{" "}
                <span className="text-destructive">*</span>
              </Label>
              <div
                className={cn(
                  visible.toAccountId &&
                    "ring-destructive/40 rounded-lg ring-2",
                )}
              >
                <SearchableSelect
                  value={draft.toAccountId || null}
                  onChange={(value) => update({ toAccountId: value ?? "" })}
                  options={toOptions}
                  placeholder="Select account"
                  emptyText="No matching accounts"
                  allowClear={false}
                  disabled={pending}
                />
              </div>
              <FieldError id="to-error" message={visible.toAccountId} />
            </div>

            <div className="space-y-2">
              <Label>
                {config.copy.cashierLabel}{" "}
                <span className="text-destructive">*</span>
              </Label>
              {scoped ? (
                lockedHandedBy ? (
                  <Input
                    aria-label={config.copy.cashierLabel}
                    value={`${lockedHandedBy.label} (${lockedHandedBy.description})`}
                    readOnly
                    className="bg-muted/50"
                  />
                ) : (
                  <p className="text-destructive text-sm">
                    Your user isn&apos;t linked to an active cashier. Ask an
                    administrator to link you to one.
                  </p>
                )
              ) : (
                <div
                  className={cn(
                    visible.handedByCashierId &&
                      "ring-destructive/40 rounded-lg ring-2",
                  )}
                >
                  <SearchableSelect
                    value={draft.handedByCashierId || null}
                    onChange={(value) =>
                      update({ handedByCashierId: value ?? "" })
                    }
                    options={handedOptions}
                    placeholder="Select cashier"
                    emptyText="No matching cashiers"
                    allowClear={false}
                    disabled={pending}
                  />
                </div>
              )}
              <FieldError
                id="handed-by-error"
                message={visible.handedByCashierId}
              />
              {pendingCash ? (
                <div className="bg-muted/40 flex flex-wrap items-center justify-between gap-2 rounded-[5px] border px-3 py-2 text-sm">
                  {pendingCash.status === "loading" ? (
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Loader2 className="size-3.5 animate-spin" /> Checking
                      pending cash…
                    </span>
                  ) : pendingCash.status === "failed" ? (
                    <span className="text-muted-foreground">
                      Couldn&apos;t look up their pending cash.
                    </span>
                  ) : (
                    <>
                      <span className="flex items-center gap-1.5">
                        <Wallet className="text-muted-foreground size-3.5" />
                        Pending cash:{" "}
                        <span className="font-mono font-medium tabular-nums">
                          {formatAmount(pendingCash.amount)}
                        </span>
                      </span>
                      {pendingCash.amount > 0 ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            update({ amount: pendingCash.amount.toFixed(2) })
                          }
                          disabled={pending}
                        >
                          Use this amount
                        </Button>
                      ) : null}
                    </>
                  )}
                </div>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label>
                Received By <span className="text-destructive">*</span>
              </Label>
              <div
                className={cn(
                  visible.receivedByCashierId &&
                    "ring-destructive/40 rounded-lg ring-2",
                )}
              >
                <SearchableSelect
                  value={draft.receivedByCashierId || null}
                  onChange={(value) =>
                    update({ receivedByCashierId: value ?? "" })
                  }
                  options={receivedOptions}
                  placeholder="Select cashier"
                  emptyText="No matching cashiers"
                  allowClear={false}
                  disabled={pending}
                />
              </div>
              <FieldError
                id="received-by-error"
                message={visible.receivedByCashierId}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reference">
                Reference{" "}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </Label>
              <Input
                id="reference"
                value={draft.reference}
                onChange={(event) => update({ reference: event.target.value })}
                maxLength={HANDOVER_REFERENCE_MAX_LENGTH}
                placeholder="Deposit slip, bag no…"
                disabled={pending}
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={draft.notes}
                onChange={(event) => update({ notes: event.target.value })}
                maxLength={HANDOVER_NOTES_MAX_LENGTH}
                placeholder={config.copy.commentsPlaceholder}
                disabled={pending}
                className="min-h-10"
              />
            </div>
          </CardContent>
        </Card>

        {mode === "edit" ? (
          <div className="bg-card space-y-2 rounded-lg border p-4">
            <Label htmlFor="change-note">
              Reason for change{" "}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </Label>
            <Input
              id="change-note"
              value={changeNote}
              onChange={(event) => setChangeNote(event.target.value)}
              maxLength={REASON_MAX_LENGTH}
              placeholder="e.g. Amount counted wrongly"
              disabled={pending}
            />
          </div>
        ) : null}

        <UnsavedChangesGuard when={isDirty && !leaving} />
      </form>

      <VoucherWarningsDialog
        warnings={pendingWarnings?.warnings ?? null}
        noun={config.noun}
        pending={pending}
        onConfirm={() => {
          if (pendingWarnings) save(pendingWarnings.input, true);
        }}
        onCancel={() => setPendingWarnings(null)}
      />
    </>
  );
}

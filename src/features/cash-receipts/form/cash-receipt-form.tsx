"use client";

import { CircleAlert, Info, Loader2, Save, UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { MasterFormSheet } from "@/components/master/master-form-sheet";

import { FormErrorSummary } from "@/components/master/form-error-summary";
import { AsyncSearchableSelect } from "@/components/shared/async-searchable-select";
import { UnsavedChangesGuard } from "@/components/shared/unsaved-changes-guard";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VoucherLineGrid } from "@/components/voucher/voucher-line-grid";
import { VoucherToolbar } from "@/components/voucher/voucher-toolbar";
import { VoucherTotalsFooter } from "@/components/voucher/voucher-totals-footer";
import { createCashier } from "@/features/cashiers/actions";
import { CashierForm, type UserOption } from "@/features/cashiers/cashier-form";
import type {
  CashierInput,
  CashierLookupItem,
} from "@/features/cashiers/types";
import type { Location } from "@/features/locations/types";
import { createParty } from "@/features/parties/actions";
import { PARTY_KIND_CONFIG } from "@/features/parties/constants";
import { PartyForm } from "@/features/parties/party-form";
import type { PartyInput } from "@/features/parties/types";
import { useVoucherDraft } from "@/hooks/use-voucher-draft";
import type { MutationResult } from "@/lib/mutation";
import { formatAmount } from "@/lib/format";

import { searchLineAccounts, type LineAccountOption } from "../account-search";
import { createCashReceipt, updateCashReceipt } from "../actions";
import {
  CASH_RECEIPTS_PATH,
  CASH_RECEIPTS_TITLE,
  REASON_MAX_LENGTH,
  cashReceiptPath,
} from "../constants";
import { editColumns } from "../receipt-columns";
import type { AccountLookupItem, CashReceiptDetail } from "../types";
import {
  blankDraft,
  draftFromReceipt,
  draftTotals,
  toInput,
  validateDraft,
  type DraftErrors,
  type DraftLine,
  type DraftVoucher,
} from "./draft";
import { ReceiptHeaderFields } from "./receipt-header-fields";

/** The backend's answer to an edit that changes nothing (cash-receipt.service.ts). */
const NO_CHANGES = "No changes to save";

const NO_ERRORS: DraftErrors = { lineAmount: {}, lineVat: {} };

let lineSeq = 0;
function newLineId(): string {
  lineSeq += 1;
  return `new-${Date.now()}-${lineSeq}`;
}

function AddLineControl({
  onAdd,
  onAddCustomer,
}: {
  onAdd: (line: DraftLine) => void;
  /** Opens the customer form; only with parties:manage. */
  onAddCustomer?: () => void;
}) {
  return (
    <div className="max-w-sm">
      <AsyncSearchableSelect<LineAccountOption>
        aria-label="Add an account line"
        value={null}
        onChange={(option) => {
          if (!option) return;
          onAdd({
            id: newLineId(),
            accountId: option.value,
            accountName: option.label,
            narration: "",
            remarks: "",
            oldBalance: option.balance,
            amount: "",
            vat: "",
          });
        }}
        search={searchLineAccounts}
        placeholder="+ Add a party to receive from"
        searchPlaceholder="Search parties by name or code..."
        emptyText={
          onAddCustomer
            ? "No matching parties. Add a customer"
            : "No matching parties. Ask someone who manages customers to add it."
        }
        allowClear={false}
        footer={
          onAddCustomer
            ? (close) => (
                <button
                  type="button"
                  onClick={() => {
                    close();
                    onAddCustomer();
                  }}
                  className="text-primary hover:bg-accent flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium"
                >
                  <UserPlus className="size-4" /> Add customer
                </button>
              )
            : undefined
        }
      />
    </div>
  );
}

/** What the "Add cashier" panel needs; null without cashiers:manage. */
export interface CashierPanelData {
  /** null when they couldn't be loaded — the panel's pickers say so. */
  users: UserOption[] | null;
  locations: Location[] | null;
}

type CashReceiptFormProps = {
  cashAccounts: AccountLookupItem[];
  /** Active cashiers for the dropdown. */
  cashiers: CashierLookupItem[];
  /** The signed-in user's own active cashier, pre-selected on a new receipt. */
  myCashierId?: string | null;
  /** /cashiers/me failed, so nothing could be pre-selected. */
  myCashierFailed?: boolean;
  cashierPanel: CashierPanelData | null;
  /** parties:manage — offers "Add customer" in the party picker. */
  canAddCustomer: boolean;
} & (
  | { mode: "create"; receipt?: undefined }
  | { mode: "edit"; receipt: CashReceiptDetail }
);

export function CashReceiptForm({
  mode,
  receipt,
  cashAccounts,
  cashiers,
  myCashierId,
  myCashierFailed = false,
  cashierPanel,
  canAddCustomer,
}: CashReceiptFormProps) {
  const router = useRouter();
  const [initial] = useState<DraftVoucher>(() =>
    receipt ? draftFromReceipt(receipt) : blankDraft(myCashierId ?? ""),
  );
  const [cashierPanelOpen, setCashierPanelOpen] = useState(false);
  const [customerPanelOpen, setCustomerPanelOpen] = useState(false);
  // Cashiers added from the side panel, until the refreshed lookup lists them.
  const [addedCashiers, setAddedCashiers] = useState<CashierLookupItem[]>([]);
  const cashierOptions = [
    ...cashiers,
    ...addedCashiers.filter(
      (added) => !cashiers.some((c) => c.id === added.id),
    ),
  ];
  const draft = useVoucherDraft<DraftVoucher, DraftLine>(initial);
  const [changeNote, setChangeNote] = useState("");
  const [showErrors, setShowErrors] = useState(false);
  const [serverErrors, setServerErrors] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();
  // Set once saved, so the guard lets the redirect to the view page through.
  const [leaving, setLeaving] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const errorsRef = useRef<HTMLDivElement>(null);

  const { errors, valid } = validateDraft(draft.voucher);
  // Errors only show once the user has tried to save.
  const visibleErrors: DraftErrors = showErrors ? errors : NO_ERRORS;
  const totals = draftTotals(draft.voucher.lines);
  const isDirty = draft.isDirty || changeNote.trim() !== "";
  const backHref = receipt ? cashReceiptPath(receipt.id) : CASH_RECEIPTS_PATH;

  // Ctrl/Cmd + S saves, like a desktop voucher screen.
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

    const input = toInput(draft.voucher);
    startTransition(async () => {
      try {
        const result =
          mode === "edit"
            ? await updateCashReceipt(receipt.id, input, changeNote)
            : await createCashReceipt(input);
        if (!result) return; // Redirected to sign in.

        if (result.ok) {
          setLeaving(true);
          const id = result.id ?? receipt?.id;
          // The view page shows the "saved" banner with print/next actions.
          router.push(
            id ? `${cashReceiptPath(id)}?saved=1` : CASH_RECEIPTS_PATH,
          );
          return;
        }
        setServerErrors(result.messages);
        errorsRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      } catch {
        setServerErrors([
          "Couldn't reach the app. Check your connection and try again.",
        ]);
      }
    });
  }

  async function addCashier(values: CashierInput): Promise<MutationResult> {
    let result: MutationResult;
    try {
      result = (await createCashier(values)) ?? { ok: true };
    } catch {
      return {
        ok: false,
        messages: [
          "Couldn't reach the app. Check your connection and try again.",
        ],
      };
    }
    if (result.ok && result.id) {
      const id = result.id;
      setAddedCashiers((prev) => [
        ...prev,
        { id, code: "New", name: values.name.trim() },
      ]);
      // Only an active cashier can be posted against.
      if (values.status === "active") draft.updateVoucher({ cashierId: id });
      setCashierPanelOpen(false);
      if (result.message) toast.success(result.message);
    }
    return result;
  }

  /** Saves the customer, then receives from it: its ledger account becomes a line. */
  async function addCustomer(
    values: PartyInput,
  ): Promise<MutationResult<unknown>> {
    let result;
    try {
      result = await createParty("customer", values);
    } catch {
      return {
        ok: false,
        messages: [
          "Couldn't reach the app. Check your connection and try again.",
        ],
      };
    }
    if (!result) return { ok: true }; // Redirected to sign in.
    if (result.ok && result.data && values.status === "inactive") {
      // Receipts post to active accounts only; saved, but not added as a line.
      setCustomerPanelOpen(false);
      toast.info(`${result.data.name} was saved as inactive`, {
        description: "Reactivate it under Customers to receive from it.",
      });
      return result;
    }
    if (result.ok && result.data) {
      const party = result.data;
      draft.addLine({
        id: newLineId(),
        accountId: party.ledgerAccountId,
        accountName: party.name,
        narration: "",
        remarks: "",
        // A new customer's ledger account starts at zero.
        oldBalance: 0,
        amount: "",
        vat: "",
      });
      setCustomerPanelOpen(false);
      if (result.message) toast.success(result.message);
    }
    return result;
  }

  const lineMessages = draft.voucher.lines.flatMap((line, index) => {
    const label = `Line ${index + 1} (${line.accountName ?? "Unknown account"})`;
    return [
      visibleErrors.lineAmount[line.id]
        ? `${label}: ${visibleErrors.lineAmount[line.id]}`
        : null,
      visibleErrors.lineVat[line.id]
        ? `${label}: ${visibleErrors.lineVat[line.id]}`
        : null,
    ].filter((message): message is string => message !== null);
  });
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
              ? `Edit Cash Receipt ${receipt.voucherNo}`
              : "New Cash Receipt"
          }
          description={
            mode === "edit"
              ? "Saving re-posts the receipt with your changes and records them in its activity."
              : "Record cash received against one or more party accounts."
          }
          back={
            receipt
              ? { href: backHref, label: receipt.voucherNo }
              : { href: CASH_RECEIPTS_PATH, label: CASH_RECEIPTS_TITLE }
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
            <div
              role="status"
              className="bg-muted/60 flex gap-2.5 rounded-lg border p-3 text-sm"
            >
              <Info className="text-muted-foreground mt-0.5 size-4 shrink-0" />
              <div className="space-y-0.5">
                <p className="font-medium">No changes to save</p>
                <p className="text-muted-foreground">
                  Nothing on this receipt differs from the saved version. Change
                  a field or a line, or go back.
                </p>
              </div>
            </div>
          ) : (
            <FormErrorSummary messages={serverErrors} />
          )}
          {showErrors && !valid ? (
            <FormErrorSummary
              title="Check the highlighted fields"
              messages={[
                ...(errors.lines ? [errors.lines] : []),
                ...lineMessages,
              ]}
            />
          ) : null}
        </div>

        {myCashierFailed ? (
          <p
            role="status"
            className="bg-muted/60 text-muted-foreground rounded-lg border px-3 py-2 text-sm"
          >
            Couldn&apos;t look up the cashier linked to your login, so none is
            pre-selected. Pick the cashier below.
          </p>
        ) : null}

        <ReceiptHeaderFields
          voucher={draft.voucher}
          onChange={draft.updateVoucher}
          voucherNo={receipt?.voucherNo ?? null}
          cashAccounts={cashAccounts}
          currentCashAccount={receipt?.cashAccount ?? null}
          cashiers={cashierOptions}
          currentCashier={receipt?.cashier ?? null}
          onAddCashier={
            cashierPanel ? () => setCashierPanelOpen(true) : undefined
          }
          errors={visibleErrors}
          disabled={pending}
        />

        <div className="space-y-2">
          <VoucherLineGrid
            columns={editColumns(visibleErrors)}
            lines={draft.voucher.lines}
            onUpdateLine={draft.updateLine}
            onRemoveLine={draft.removeLine}
            addRowControl={
              <AddLineControl
                onAdd={draft.addLine}
                onAddCustomer={
                  canAddCustomer ? () => setCustomerPanelOpen(true) : undefined
                }
              />
            }
            emptyMessage="No lines yet — add the party you received cash from below."
          />
          {showErrors && errors.lines ? (
            <p className="text-destructive flex items-center gap-1.5 text-sm">
              <CircleAlert className="size-4" /> {errors.lines}
            </p>
          ) : null}
        </div>

        <VoucherTotalsFooter
          totals={[
            { label: "Gross", value: formatAmount(totals.gross) },
            { label: "Total Tax", value: formatAmount(totals.tax) },
            {
              label: "Grand Total",
              value: formatAmount(totals.grandTotal),
              emphasize: true,
            },
          ]}
        />

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
              placeholder="e.g. Amount entered wrongly"
              disabled={pending}
            />
            <p className="text-muted-foreground text-xs">
              Shown with this edit in the receipt&apos;s activity.
            </p>
          </div>
        ) : null}

        <UnsavedChangesGuard when={isDirty && !leaving} />
      </form>

      {/* Outside the voucher <form>: React events bubble through portals, so a
        nested form's submit would also submit the receipt. */}
      {cashierPanel ? (
        <MasterFormSheet
          open={cashierPanelOpen}
          onOpenChange={setCashierPanelOpen}
          title="Add Cashier"
          description="Saved to the Cashiers master and picked on this receipt."
        >
          {cashierPanelOpen ? (
            <CashierForm
              initialValue={null}
              users={cashierPanel.users}
              locations={cashierPanel.locations}
              onSubmit={addCashier}
            />
          ) : null}
        </MasterFormSheet>
      ) : null}

      {canAddCustomer ? (
        <MasterFormSheet
          open={customerPanelOpen}
          onOpenChange={setCustomerPanelOpen}
          title="Add Customer"
          description="Saved to Customers and added to this receipt as a line."
        >
          {customerPanelOpen ? (
            <PartyForm
              config={PARTY_KIND_CONFIG.customer}
              initialValue={null}
              canManage
              onSubmit={addCustomer}
            />
          ) : null}
        </MasterFormSheet>
      ) : null}
    </>
  );
}

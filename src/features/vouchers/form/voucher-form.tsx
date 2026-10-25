"use client";

import {
  CircleAlert,
  Eye,
  Info,
  Loader2,
  Paperclip,
  Save,
  UserPlus,
  X,
} from "lucide-react";
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
import { createParty } from "@/features/parties/actions";
import { PARTY_KIND_CONFIG } from "@/features/parties/constants";
import { PartyForm } from "@/features/parties/party-form";
import type { PartyInput } from "@/features/parties/types";
import { useVoucherDraft } from "@/hooks/use-voucher-draft";
import type { MutationResult } from "@/lib/mutation";
import { formatAmount } from "@/lib/format";

import { lineAccountSearch, type LineAccountOption } from "../account-search";
import { AllocationCell, AllocationDialog } from "../allocation-dialog";
import {
  ATTACHMENT_ACCEPT,
  AttachmentPreview,
  attachmentProblem,
  uploadReceiptAttachment,
} from "../attachments";
import { voucherPath, type VoucherConfig } from "../config";
import {
  PAYMENT_METHODS,
  REASON_MAX_LENGTH,
  methodForAccountType,
} from "../constants";
import { editColumns } from "../voucher-columns";
import type {
  AccountLookupItem,
  CreateVoucherAction,
  PaymentMethod,
  UpdateVoucherAction,
  UserRef,
  VoucherDetail,
  VoucherInput,
  VoucherWarning,
} from "../types";
import {
  allocatedOf,
  blankDraft,
  draftFromVoucher,
  draftTotals,
  toInput,
  validateDraft,
  type DraftErrors,
  type DraftLine,
  type DraftVoucher,
} from "./draft";
import { VoucherHeaderFields } from "./voucher-header-fields";
import { VoucherWarningsDialog } from "./voucher-warnings-dialog";

/** The backend's answer to an edit that changes nothing (voucher-posting.service.ts). */
const NO_CHANGES = "No changes to save";

const NO_ERRORS: DraftErrors = { lineAmount: {}, lineVat: {} };

let lineSeq = 0;
function newLineId(): string {
  lineSeq += 1;
  return `new-${Date.now()}-${lineSeq}`;
}

function AddLineControl({
  config,
  onAdd,
  onAddParty,
}: {
  config: VoucherConfig;
  onAdd: (line: DraftLine) => void;
  /** Opens the customer/supplier form; only with parties:manage. */
  onAddParty?: () => void;
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
            accountType: option.type,
          });
        }}
        search={lineAccountSearch(config.lineAccountTypes)}
        placeholder={config.copy.addLinePlaceholder}
        searchPlaceholder={config.copy.addLineSearchPlaceholder}
        emptyText={
          onAddParty ? config.copy.addLineEmpty : config.copy.addLineEmptyNoAdd
        }
        allowClear={false}
        footer={
          onAddParty
            ? (close) => (
                <button
                  type="button"
                  onClick={() => {
                    close();
                    onAddParty();
                  }}
                  className="text-primary hover:bg-accent flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium"
                >
                  <UserPlus className="size-4" /> Add{" "}
                  {PARTY_KIND_CONFIG[config.addPartyKind].noun}
                </button>
              )
            : undefined
        }
      />
    </div>
  );
}

type VoucherFormProps = {
  config: VoucherConfig;
  createAction: CreateVoucherAction;
  updateAction: UpdateVoucherAction;
  /** Active cash, wallet and bank accounts for the header picker. */
  headerAccounts: AccountLookupItem[];
  /** Users who can be Collected By / Paid By. */
  collectors: UserRef[];
  /** The signed-in user, pre-selected on a new voucher. */
  me: UserRef | null;
  /** vouchers:select-collector — without it Collected By is read-only. */
  canSelectCollector: boolean;
  /** parties:manage — offers "Add customer" / "Add supplier" in the line picker. */
  canAddParty: boolean;
  /** "Own"-scoped user: header limited to their allowed accounts. */
  scoped: boolean;
  /** balances:view — without it the Old Balance column is left out. */
  showBalances: boolean;
  /** New voucher only: lines to start with (a bill's "Pay"). */
  initialLines?: DraftLine[];
} & (
  | { mode: "create"; voucher?: undefined }
  | { mode: "edit"; voucher: VoucherDetail }
);

export function VoucherForm({
  config,
  createAction,
  updateAction,
  mode,
  voucher,
  headerAccounts,
  collectors,
  me,
  canSelectCollector,
  canAddParty,
  scoped,
  showBalances,
  initialLines,
}: VoucherFormProps) {
  const router = useRouter();
  const partyKind = PARTY_KIND_CONFIG[config.addPartyKind];
  // Receipts: cash and bank when the user has such an account; a cheque
  // needs none (the backend keeps it in the company's cheques in hand).
  const methods = config.methodSelector
    ? PAYMENT_METHODS.filter(
        (method) =>
          method === "cheque" ||
          // An edited receipt keeps its own method even with no account left.
          voucher?.paymentMethod === method ||
          headerAccounts.some((a) => methodForAccountType(a.type) === method),
      )
    : [];
  const accountsFor = (method: PaymentMethod) =>
    config.methodSelector
      ? headerAccounts.filter((a) => methodForAccountType(a.type) === method)
      : headerAccounts;
  /** The one account that fits; none for a cheque (the server picks it). */
  const defaultHeaderFor = (method: PaymentMethod) => {
    if (config.methodSelector && method === "cheque") {
      return voucher?.paymentMethod === "cheque"
        ? voucher.headerAccount.id
        : "";
    }
    const fits = accountsFor(method);
    return fits.length === 1 ? (fits[0]?.id ?? "") : "";
  };
  const [initial] = useState<DraftVoucher>(() => {
    if (voucher) return draftFromVoucher(voucher);
    const method = methods[0] ?? "cash";
    return {
      ...blankDraft(me?.id ?? "", defaultHeaderFor(method), method),
      lines: initialLines ?? [],
    };
  });
  const [partyPanelOpen, setPartyPanelOpen] = useState(false);
  const [allocatingLineId, setAllocatingLineId] = useState<string | null>(null);
  // A save the backend sent back for confirmation, with what it warned about.
  const [pendingWarnings, setPendingWarnings] = useState<{
    input: VoucherInput;
    warnings: VoucherWarning[];
  } | null>(null);
  const draft = useVoucherDraft<DraftVoucher, DraftLine>(initial);
  const [changeNote, setChangeNote] = useState("");
  const [showErrors, setShowErrors] = useState(false);
  const [serverErrors, setServerErrors] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();
  // Set once saved, so the guard lets the redirect to the view page through.
  const [leaving, setLeaving] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const errorsRef = useRef<HTMLDivElement>(null);
  // Receipts by cheque or bank: a photo/slip, reviewed before Save and
  // uploaded right after the receipt is saved.
  const [attachment, setAttachment] = useState<File | null>(null);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // A cheque needs its number, date and bank.
  const headerId = draft.voucher.headerAccountId;
  const method = draft.voucher.paymentMethod;
  const isCheque = config.methodSelector
    ? method === "cheque"
    : headerAccounts.find((account) => account.id === headerId)?.type ===
        "cheque" ||
      (voucher?.headerAccount.id === headerId &&
        voucher.paymentMethod === "cheque");
  const { errors, valid } = validateDraft(draft.voucher, config.copy, isCheque);
  const canAttach = Boolean(config.methodSelector) && method !== "cash";
  // Errors only show once the user has tried to save.
  const visibleErrors: DraftErrors = showErrors ? errors : NO_ERRORS;
  const totals = draftTotals(draft.voucher.lines);
  const isDirty = draft.isDirty || changeNote.trim() !== "";
  const allocatingLine =
    draft.voucher.lines.find((line) => line.id === allocatingLineId) ?? null;
  const backHref = voucher ? voucherPath(config, voucher.id) : config.basePath;

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

    save(toInput(draft.voucher), false);
  }

  /** Sends the voucher; a 409 with warnings comes back for the user to confirm. */
  function save(input: VoucherInput, acknowledgeWarnings: boolean) {
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
          if (id && canAttach && attachment) {
            const failure = await uploadReceiptAttachment(id, attachment);
            if (failure) {
              toast.error(`${config.Noun} saved, but the attachment wasn't`, {
                description: `${failure} Attach it again from the ${config.noun}.`,
              });
            }
          }
          // The view page shows the "saved" banner with print/next actions.
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

  /** Saves the party, then adds its ledger account as a line. */
  async function addParty(
    values: PartyInput,
  ): Promise<MutationResult<unknown>> {
    let result;
    try {
      result = await createParty(config.addPartyKind, values);
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
      // Vouchers post to active accounts only; saved, but not added as a line.
      setPartyPanelOpen(false);
      toast.info(`${result.data.name} was saved as inactive`, {
        description: config.copy.inactivePartyHint,
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
        // A new party's ledger account starts at zero.
        oldBalance: showBalances ? 0 : null,
        amount: "",
        vat: "",
      });
      setPartyPanelOpen(false);
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
            <div
              role="status"
              className="bg-muted/60 flex gap-2.5 rounded-lg border p-3 text-sm"
            >
              <Info className="text-muted-foreground mt-0.5 size-4 shrink-0" />
              <div className="space-y-0.5">
                <p className="font-medium">No changes to save</p>
                <p className="text-muted-foreground">
                  Nothing on this {config.noun} differs from the saved version.
                  Change a field or a line, or go back.
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

        <VoucherHeaderFields
          config={config}
          voucher={draft.voucher}
          onChange={draft.updateVoucher}
          voucherNo={voucher?.voucherNo ?? null}
          headerAccounts={accountsFor(method)}
          currentHeaderAccount={
            voucher && voucher.paymentMethod === method
              ? voucher.headerAccount
              : null
          }
          methods={methods}
          onMethodChange={(next) =>
            draft.updateVoucher({
              paymentMethod: next,
              headerAccountId: defaultHeaderFor(next),
              ...(next === "cheque"
                ? {}
                : { chequeNumber: "", chequeDate: "", chequeBankName: "" }),
            })
          }
          collectors={collectors}
          currentCollector={voucher?.collectedBy ?? null}
          collectorLocked={!canSelectCollector}
          scoped={scoped}
          isCheque={isCheque}
          errors={visibleErrors}
          disabled={pending}
          attachSlot={
            canAttach ? (
              <div className="space-y-2 sm:col-span-2 lg:col-span-3">
                <Label htmlFor="receipt-attachment">
                  {method === "cheque" ? "Cheque photo" : "Transfer slip"}{" "}
                  <span className="text-muted-foreground font-normal">
                    (optional)
                  </span>
                </Label>
                <input
                  id="receipt-attachment"
                  ref={fileRef}
                  type="file"
                  accept={ATTACHMENT_ACCEPT}
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    if (!file) return;
                    const problem = attachmentProblem(file);
                    setAttachmentError(problem);
                    if (problem) return;
                    setAttachment(file);
                    // Review straight away, before the receipt is saved.
                    setReviewOpen(true);
                  }}
                />
                {attachment ? (
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <Paperclip className="text-muted-foreground size-4" />
                    <span className="min-w-0 truncate font-medium">
                      {attachment.name}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setReviewOpen(true)}
                      disabled={pending}
                    >
                      <Eye /> Review
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setAttachment(null)}
                      disabled={pending}
                    >
                      <X /> Remove
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileRef.current?.click()}
                    disabled={pending}
                  >
                    <Paperclip /> Attach photo or PDF
                  </Button>
                )}
                {attachmentError ? (
                  <p role="alert" className="text-destructive text-sm">
                    {attachmentError}
                  </p>
                ) : (
                  <p className="text-muted-foreground text-xs">
                    Uploaded when you save. PDF or image, up to 10 MB.
                  </p>
                )}
              </div>
            ) : null
          }
        />

        <div className="space-y-2">
          <VoucherLineGrid
            columns={editColumns(visibleErrors, {
              showOldBalance: showBalances,
              renderAllocation: config.allocatesBills
                ? (line) => (
                    <AllocationCell
                      line={line}
                      onOpen={() => setAllocatingLineId(line.id)}
                    />
                  )
                : undefined,
            })}
            lines={draft.voucher.lines}
            onUpdateLine={draft.updateLine}
            onRemoveLine={draft.removeLine}
            addRowControl={
              <AddLineControl
                config={config}
                onAdd={draft.addLine}
                onAddParty={
                  canAddParty ? () => setPartyPanelOpen(true) : undefined
                }
              />
            }
            emptyMessage={config.copy.linesEmpty}
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
            ...(config.allocatesBills
              ? (() => {
                  const allocated =
                    Math.round(
                      draft.voucher.lines.reduce(
                        (sum, line) => sum + allocatedOf(line) * 100,
                        0,
                      ),
                    ) / 100;
                  return [
                    {
                      label: "Allocated to bills",
                      value: formatAmount(allocated),
                    },
                    {
                      label: "On account",
                      value: formatAmount(totals.grandTotal - allocated),
                    },
                  ];
                })()
              : []),
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
              Shown with this edit in the {config.noun}&apos;s activity.
            </p>
          </div>
        ) : null}

        <UnsavedChangesGuard when={isDirty && !leaving} />
      </form>

      {allocatingLine ? (
        <AllocationDialog
          key={allocatingLine.id}
          line={allocatingLine}
          open
          onOpenChange={(open) => {
            if (!open) setAllocatingLineId(null);
          }}
          onApply={(allocations) => {
            const total =
              Math.round(allocations.reduce((s, a) => s + a.amount * 100, 0)) /
              100;
            draft.updateLine(allocatingLine.id, {
              allocations,
              // A blank amount fills from the allocations.
              ...(allocatingLine.amount.trim() === "" && total > 0
                ? { amount: total.toFixed(2) }
                : {}),
            });
          }}
        />
      ) : null}

      {/* Outside the voucher <form>: React events bubble through portals, so a
        nested form's submit would also submit the voucher. */}
      {canAddParty ? (
        <MasterFormSheet
          open={partyPanelOpen}
          onOpenChange={setPartyPanelOpen}
          title={`Add ${partyKind.Noun}`}
          description={`Saved to ${partyKind.title} and added to this ${config.noun} as a line.`}
        >
          {partyPanelOpen ? (
            <PartyForm
              config={partyKind}
              initialValue={null}
              canManage
              onSubmit={addParty}
            />
          ) : null}
        </MasterFormSheet>
      ) : null}

      <AttachmentPreview
        source={attachment}
        title={attachment?.name ?? ""}
        open={reviewOpen && attachment !== null}
        onOpenChange={setReviewOpen}
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setReviewOpen(false);
                fileRef.current?.click();
              }}
            >
              Choose another
            </Button>
            <Button type="button" onClick={() => setReviewOpen(false)}>
              Looks good
            </Button>
          </>
        }
      />

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

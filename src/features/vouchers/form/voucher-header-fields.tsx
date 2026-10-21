"use client";

import { Info } from "lucide-react";

import { FieldError } from "@/components/master/form-error-summary";
import { SearchableSelect } from "@/components/shared/searchable-select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { PeriodToggle } from "@/features/dashboard/components/period-toggle";
import { AllocationButton } from "@/components/voucher/allocation-button";
import { cn } from "@/lib/utils";

import type { VoucherConfig } from "../config";
import {
  ACCOUNT_TYPE_BADGES,
  CHEQUE_NUMBER_MAX_LENGTH,
  PAYMENT_REFERENCE_MAX_LENGTH,
} from "../constants";
import type {
  AccountLookupItem,
  CollectorRef,
  PaymentMethod,
  UserRef,
} from "../types";
import type { DraftErrors, DraftVoucher } from "./draft";

interface VoucherHeaderFieldsProps {
  config: VoucherConfig;
  voucher: DraftVoucher;
  onChange: (patch: Partial<Omit<DraftVoucher, "lines">>) => void;
  /** null on create: the backend issues the number on save, so the field is
   * left out entirely rather than shown empty. */
  voucherNo: string | null;
  /** Users who can be Collected By / Paid By (GET /users/lookup?for=...). */
  collectors: UserRef[];
  /** The voucher's saved collector — kept pickable if no longer eligible,
   * and shown as text on legacy vouchers whose old cashier had no login. */
  currentCollector?: CollectorRef | null;
  /** No vouchers:select-collector: Collected By is read-only text. */
  collectorLocked?: boolean;
  /** "Own"-scoped user: the header lists only their allowed accounts. */
  scoped?: boolean;
  /** A cheque: number, date and drawn-on bank required. */
  isCheque?: boolean;
  /** Receipts: the methods the user has accounts for; the selector shows
   * when there is a choice. */
  methods?: readonly PaymentMethod[];
  onMethodChange?: (method: PaymentMethod) => void;
  /** Receipts by cheque or bank: the photo/slip control, shown before Comments. */
  attachSlot?: React.ReactNode;
  headerAccounts: AccountLookupItem[];
  /** The voucher's current header account, when it's no longer in the active
   * lookup (deactivated since) — kept selectable so the form shows it. */
  currentHeaderAccount?: { id: string; name: string | null } | null;
  errors: Pick<
    DraftErrors,
    | "headerAccount"
    | "collectedBy"
    | "paymentReference"
    | "voucherDate"
    | "chequeNumber"
    | "chequeDate"
    | "chequeBankName"
  >;
  disabled: boolean;
}

const METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Cash",
  cheque: "Cheque",
  bank: "Bank",
};

const METHOD_HINTS: Record<PaymentMethod, string> = {
  cash: "Cash or wallet account",
  cheque: "",
  bank: "Bank account",
};

export function VoucherHeaderFields({
  config,
  voucher,
  onChange,
  voucherNo,
  headerAccounts,
  currentHeaderAccount,
  collectors,
  currentCollector,
  collectorLocked = false,
  scoped = false,
  isCheque = false,
  methods = [],
  onMethodChange,
  attachSlot,
  errors,
  disabled,
}: VoucherHeaderFieldsProps) {
  const collectorOptions: {
    value: string;
    label: string;
    description?: string;
  }[] = collectors.map((user) => ({ value: user.id, label: user.name }));
  if (
    currentCollector?.id &&
    !collectorOptions.some((option) => option.value === currentCollector.id)
  ) {
    // The backend lets a voucher keep its collector after deactivation.
    collectorOptions.unshift({
      value: currentCollector.id,
      label: currentCollector.name ?? "Unknown user",
      description: `Inactive — kept on this ${config.noun}`,
    });
  }
  const lockedCollector = collectorOptions.find(
    (option) => option.value === voucher.collectedById,
  );
  const legacyCollectorText =
    currentCollector && !currentCollector.id ? currentCollector.name : null;

  const options = headerAccounts.map((account) => ({
    value: account.id,
    label: account.name,
    description: account.code,
    badge: ACCOUNT_TYPE_BADGES[account.type] ?? account.type,
  }));
  if (
    currentHeaderAccount &&
    !options.some((option) => option.value === currentHeaderAccount.id)
  ) {
    options.unshift({
      value: currentHeaderAccount.id,
      label: currentHeaderAccount.name ?? "Unknown account",
      description: "Inactive — pick an active account to save",
      badge: "Inactive",
    });
  }

  return (
    <Card className="gap-4">
      <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
        <CardTitle>Voucher Details</CardTitle>
        <AllocationButton />
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {voucherNo ? (
          <div className="space-y-2">
            <Label htmlFor="voucher-no">Voucher No</Label>
            <Input
              id="voucher-no"
              value={voucherNo}
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
            value={voucher.voucherDate}
            onChange={(event) => onChange({ voucherDate: event.target.value })}
            disabled={disabled}
            aria-invalid={errors.voucherDate ? true : undefined}
            aria-describedby={
              errors.voucherDate ? "voucher-date-error" : undefined
            }
          />
          <FieldError id="voucher-date-error" message={errors.voucherDate} />
        </div>

        {methods.length > 1 && onMethodChange ? (
          <div className="space-y-2">
            <Label>Payment Method</Label>
            <PeriodToggle
              value={voucher.paymentMethod}
              onChange={onMethodChange}
              options={methods.map((method) => ({
                value: method,
                label: METHOD_LABELS[method],
              }))}
            />
          </div>
        ) : null}

        {isCheque && config.methodSelector ? null : (
          <div className="space-y-2">
            <Label>
              {config.copy.headerLabel}{" "}
              <span className="text-destructive">*</span>
            </Label>
            <div
              className={
                errors.headerAccount
                  ? "ring-destructive/40 rounded-lg ring-2"
                  : undefined
              }
            >
              <SearchableSelect
                value={voucher.headerAccountId || null}
                onChange={(value) => {
                  const next = headerAccounts.find((a) => a.id === value);
                  onChange({
                    headerAccountId: value ?? "",
                    // Only payments keep a reference off a cheque account.
                    ...(next?.type !== "cheque"
                      ? {
                          chequeNumber: "",
                          chequeDate: "",
                          chequeBankName: "",
                          ...(config.showPaymentDetails
                            ? {}
                            : { paymentReference: "" }),
                        }
                      : {}),
                  });
                }}
                options={options}
                placeholder="Select account"
                emptyText={
                  headerAccounts.length > 0
                    ? "No matching accounts"
                    : scoped
                      ? "No cash accounts are assigned to your user. Ask an administrator to assign one."
                      : "No active cash, wallet or bank accounts. Add one under Masters → Accounts."
                }
                allowClear={false}
                disabled={disabled}
              />
            </div>
            <FieldError
              id="cash-account-error"
              message={errors.headerAccount}
            />
            <p className="text-muted-foreground text-xs">
              {scoped
                ? "The cash accounts assigned to you"
                : config.methodSelector
                  ? METHOD_HINTS[voucher.paymentMethod]
                  : "Cash, wallet or bank account"}
            </p>
          </div>
        )}

        <div className="space-y-2">
          <Label>
            {config.copy.collectorLabel}{" "}
            <span className="text-destructive">*</span>
          </Label>
          {collectorLocked ? (
            <Input
              aria-label={config.copy.collectorLabel}
              value={lockedCollector?.label ?? legacyCollectorText ?? "—"}
              readOnly
              className="bg-muted/50"
            />
          ) : (
            <div
              className={cn(
                errors.collectedBy && "ring-destructive/40 rounded-lg ring-2",
              )}
            >
              <SearchableSelect
                value={voucher.collectedById || null}
                onChange={(value) => onChange({ collectedById: value ?? "" })}
                options={collectorOptions}
                placeholder="Select user"
                emptyText="No matching users"
                allowClear={false}
                disabled={disabled}
              />
            </div>
          )}
          <FieldError id="collected-by-error" message={errors.collectedBy} />
          {legacyCollectorText && !voucher.collectedById ? (
            <p className="text-muted-foreground text-xs">
              Entered as &ldquo;{legacyCollectorText}&rdquo; before logins were
              used — pick the matching user to save.
            </p>
          ) : null}
        </div>

        {config.showPaymentDetails && !isCheque ? (
          <div className="space-y-2">
            <Label htmlFor="payment-reference">
              Reference{" "}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </Label>
            <Input
              id="payment-reference"
              value={voucher.paymentReference}
              onChange={(event) =>
                onChange({ paymentReference: event.target.value })
              }
              maxLength={PAYMENT_REFERENCE_MAX_LENGTH}
              placeholder="Cheque no., transfer ref…"
              disabled={disabled}
              aria-invalid={errors.paymentReference ? true : undefined}
              aria-describedby={
                errors.paymentReference ? "payment-reference-error" : undefined
              }
            />
            <FieldError
              id="payment-reference-error"
              message={errors.paymentReference}
            />
          </div>
        ) : null}

        {isCheque ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="cheque-number">
                Cheque No <span className="text-destructive">*</span>
              </Label>
              <Input
                id="cheque-number"
                value={voucher.chequeNumber}
                onChange={(event) =>
                  onChange({ chequeNumber: event.target.value })
                }
                maxLength={CHEQUE_NUMBER_MAX_LENGTH}
                placeholder="Cheque number"
                disabled={disabled}
                aria-invalid={errors.chequeNumber ? true : undefined}
                aria-describedby={
                  errors.chequeNumber ? "cheque-number-error" : undefined
                }
              />
              <FieldError
                id="cheque-number-error"
                message={errors.chequeNumber}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cheque-date" className="flex items-center gap-2">
                <span>
                  Cheque Date <span className="text-destructive">*</span>
                </span>
                {voucher.chequeDate &&
                voucher.voucherDate &&
                voucher.chequeDate > voucher.voucherDate ? (
                  <Badge variant="secondary">Post-dated</Badge>
                ) : null}
              </Label>
              <Input
                id="cheque-date"
                type="date"
                value={voucher.chequeDate}
                onChange={(event) =>
                  onChange({ chequeDate: event.target.value })
                }
                disabled={disabled}
                aria-invalid={errors.chequeDate ? true : undefined}
                aria-describedby={
                  errors.chequeDate ? "cheque-date-error" : undefined
                }
              />
              <FieldError id="cheque-date-error" message={errors.chequeDate} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cheque-bank">
                Drawn On Bank <span className="text-destructive">*</span>
              </Label>
              <Input
                id="cheque-bank"
                value={voucher.chequeBankName}
                onChange={(event) =>
                  onChange({ chequeBankName: event.target.value })
                }
                maxLength={PAYMENT_REFERENCE_MAX_LENGTH}
                placeholder="e.g. Emirates NBD"
                disabled={disabled}
                aria-invalid={errors.chequeBankName ? true : undefined}
                aria-describedby={
                  errors.chequeBankName ? "cheque-bank-error" : undefined
                }
              />
              <FieldError
                id="cheque-bank-error"
                message={errors.chequeBankName}
              />
            </div>

            <p className="text-muted-foreground flex items-start gap-1.5 text-xs sm:col-span-2 lg:col-span-3">
              <Info className="mt-0.5 size-3.5 shrink-0" />
              No account to pick: the cheque is kept in Cheques in Hand and
              stays pending until the office clears it into the bank or cash.
            </p>
          </>
        ) : null}

        {attachSlot}

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="comments">Comments</Label>
          <Textarea
            id="comments"
            value={voucher.comments}
            onChange={(event) => onChange({ comments: event.target.value })}
            placeholder={config.copy.commentsPlaceholder}
            disabled={disabled}
            className="min-h-10"
          />
        </div>
      </CardContent>
    </Card>
  );
}

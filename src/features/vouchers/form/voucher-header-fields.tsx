"use client";

import { FieldError } from "@/components/master/form-error-summary";
import { SearchableSelect } from "@/components/shared/searchable-select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AllocationButton } from "@/components/voucher/allocation-button";
import { cn } from "@/lib/utils";

import type { VoucherConfig } from "../config";
import {
  ACCOUNT_TYPE_BADGES,
  PAYMENT_REFERENCE_MAX_LENGTH,
} from "../constants";
import type { AccountLookupItem, CollectorRef, UserRef } from "../types";
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
  /** The header is a cheque account: cheque number required, date optional. */
  isCheque?: boolean;
  headerAccounts: AccountLookupItem[];
  /** The voucher's current header account, when it's no longer in the active
   * lookup (deactivated since) — kept selectable so the form shows it. */
  currentHeaderAccount?: { id: string; name: string | null } | null;
  errors: Pick<
    DraftErrors,
    "headerAccount" | "collectedBy" | "paymentReference" | "voucherDate"
  >;
  disabled: boolean;
}

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
                        chequeDate: "",
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
          <FieldError id="cash-account-error" message={errors.headerAccount} />
          <p className="text-muted-foreground text-xs">
            {scoped
              ? "The cash accounts assigned to you"
              : config.collectorFor === "receipt"
                ? "Cash, wallet, cheque or bank account"
                : "Cash, wallet or bank account"}
          </p>
        </div>

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

        {config.showPaymentDetails || isCheque ? (
          <div className="space-y-2">
            <Label htmlFor="payment-reference">
              {isCheque ? (
                <>
                  Cheque No. <span className="text-destructive">*</span>
                </>
              ) : (
                <>
                  Reference{" "}
                  <span className="text-muted-foreground font-normal">
                    (optional)
                  </span>
                </>
              )}
            </Label>
            <Input
              id="payment-reference"
              value={voucher.paymentReference}
              onChange={(event) =>
                onChange({ paymentReference: event.target.value })
              }
              maxLength={PAYMENT_REFERENCE_MAX_LENGTH}
              placeholder={isCheque ? "Cheque number" : "Cheque no., transfer ref…"}
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
          <div className="space-y-2">
            <Label htmlFor="cheque-date">
              Cheque Date{" "}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </Label>
            <Input
              id="cheque-date"
              type="date"
              value={voucher.chequeDate}
              onChange={(event) => onChange({ chequeDate: event.target.value })}
              disabled={disabled}
            />
          </div>
        ) : null}

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

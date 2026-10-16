"use client";

import { UserPlus } from "lucide-react";

import { FieldError } from "@/components/master/form-error-summary";
import { SearchableSelect } from "@/components/shared/searchable-select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AllocationButton } from "@/components/voucher/allocation-button";
import type { CashierLookupItem } from "@/features/cashiers/types";
import { cn } from "@/lib/utils";

import type { VoucherConfig } from "../config";
import {
  ACCOUNT_TYPE_BADGES,
  PAYMENT_REFERENCE_MAX_LENGTH,
} from "../constants";
import type { AccountLookupItem, CashierRef } from "../types";
import type { DraftErrors, DraftVoucher } from "./draft";

interface VoucherHeaderFieldsProps {
  config: VoucherConfig;
  voucher: DraftVoucher;
  onChange: (patch: Partial<Omit<DraftVoucher, "lines">>) => void;
  /** null on create: the backend issues the number on save, so the field is
   * left out entirely rather than shown empty. */
  voucherNo: string | null;
  /** Active cashiers (GET /cashiers/lookup?activeOnly=true). */
  cashiers: CashierLookupItem[];
  /** The voucher's saved cashier — kept pickable if since deactivated, and
   * shown as text on legacy vouchers that never had a cashier record. */
  currentCashier?: CashierRef | null;
  /** Opens the Cashiers master in a side panel; only with cashiers:manage. */
  onAddCashier?: () => void;
  /** "Own"-scoped user: the cashier is theirs and shown read-only. */
  cashierLocked?: boolean;
  headerAccounts: AccountLookupItem[];
  /** The voucher's current header account, when it's no longer in the active
   * lookup (deactivated since) — kept selectable so the form shows it. */
  currentHeaderAccount?: { id: string; name: string | null } | null;
  errors: Pick<DraftErrors, "headerAccount" | "cashier" | "voucherDate">;
  disabled: boolean;
}

export function VoucherHeaderFields({
  config,
  voucher,
  onChange,
  voucherNo,
  headerAccounts,
  currentHeaderAccount,
  cashiers,
  currentCashier,
  onAddCashier,
  cashierLocked = false,
  errors,
  disabled,
}: VoucherHeaderFieldsProps) {
  const cashierOptions = cashiers.map((cashier) => ({
    value: cashier.id,
    label: cashier.name,
    description: cashier.code,
  }));
  if (
    currentCashier?.id &&
    !cashierOptions.some((option) => option.value === currentCashier.id)
  ) {
    // The backend lets a voucher keep its cashier after deactivation.
    cashierOptions.unshift({
      value: currentCashier.id,
      label: currentCashier.name ?? "Unknown cashier",
      description: `Inactive — kept on this ${config.noun}`,
    });
  }
  const lockedCashier = cashierOptions.find(
    (option) => option.value === voucher.cashierId,
  );
  const legacyCashierText =
    currentCashier && !currentCashier.id ? currentCashier.name : null;

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
              onChange={(value) => onChange({ headerAccountId: value ?? "" })}
              options={options}
              placeholder="Select account"
              emptyText={
                headerAccounts.length > 0
                  ? "No matching accounts"
                  : cashierLocked
                    ? "No cash accounts are assigned to your user. Ask an administrator to assign one."
                    : "No active cash, wallet or bank accounts. Add one under Masters → Accounts."
              }
              allowClear={false}
              disabled={disabled}
            />
          </div>
          <FieldError id="cash-account-error" message={errors.headerAccount} />
          <p className="text-muted-foreground text-xs">
            {cashierLocked
              ? "The cash accounts assigned to you"
              : "Cash, wallet or bank account"}
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label>
              Cashier <span className="text-destructive">*</span>
            </Label>
            {onAddCashier ? (
              <button
                type="button"
                onClick={onAddCashier}
                disabled={disabled}
                className="text-primary inline-flex items-center gap-1 text-xs font-medium hover:underline disabled:opacity-50"
              >
                <UserPlus className="size-3.5" /> Add cashier
              </button>
            ) : null}
          </div>
          {cashierLocked ? (
            lockedCashier ? (
              <Input
                aria-label="Cashier"
                value={`${lockedCashier.label} (${lockedCashier.description})`}
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
                errors.cashier && "ring-destructive/40 rounded-lg ring-2",
              )}
            >
              <SearchableSelect
                value={voucher.cashierId || null}
                onChange={(value) => onChange({ cashierId: value ?? "" })}
                options={cashierOptions}
                placeholder="Select cashier"
                emptyText={
                  cashiers.length === 0
                    ? "No active cashiers. Add one under Masters → Cashiers."
                    : "No matching cashiers"
                }
                allowClear={false}
                disabled={disabled}
              />
            </div>
          )}
          <FieldError id="cashier-error" message={errors.cashier} />
          {legacyCashierText && !voucher.cashierId ? (
            <p className="text-muted-foreground text-xs">
              Entered before cashiers were set up as &ldquo;{legacyCashierText}
              &rdquo; — pick the matching cashier to save.
            </p>
          ) : null}
        </div>

        {config.showPaymentDetails ? (
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

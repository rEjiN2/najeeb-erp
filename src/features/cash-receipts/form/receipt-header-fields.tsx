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

import type { AccountLookupItem, CashierRef } from "../types";
import type { DraftErrors, DraftVoucher } from "./draft";

const TYPE_BADGE: Record<string, string> = { cash: "Cash", wallet: "Wallet" };

interface ReceiptHeaderFieldsProps {
  voucher: DraftVoucher;
  onChange: (patch: Partial<Omit<DraftVoucher, "lines">>) => void;
  /** null on create: the backend issues the number on save, so the field is
   * left out entirely rather than shown empty. */
  voucherNo: string | null;
  /** Active cashiers (GET /cashiers/lookup?activeOnly=true). */
  cashiers: CashierLookupItem[];
  /** The receipt's saved cashier — kept pickable if since deactivated, and
   * shown as text on legacy receipts that never had a cashier record. */
  currentCashier?: CashierRef | null;
  /** Opens the Cashiers master in a side panel; only with cashiers:manage. */
  onAddCashier?: () => void;
  cashAccounts: AccountLookupItem[];
  /** The receipt's current cash account, when it's no longer in the active
   * lookup (deactivated since) — kept selectable so the form shows it. */
  currentCashAccount?: { id: string; name: string | null } | null;
  errors: Pick<DraftErrors, "cashAccount" | "cashier" | "voucherDate">;
  disabled: boolean;
}

export function ReceiptHeaderFields({
  voucher,
  onChange,
  voucherNo,
  cashAccounts,
  currentCashAccount,
  cashiers,
  currentCashier,
  onAddCashier,
  errors,
  disabled,
}: ReceiptHeaderFieldsProps) {
  const cashierOptions = cashiers.map((cashier) => ({
    value: cashier.id,
    label: cashier.name,
    description: cashier.code,
  }));
  if (
    currentCashier?.id &&
    !cashierOptions.some((option) => option.value === currentCashier.id)
  ) {
    // The backend lets a receipt keep its cashier after deactivation.
    cashierOptions.unshift({
      value: currentCashier.id,
      label: currentCashier.name ?? "Unknown cashier",
      description: "Inactive — kept on this receipt",
    });
  }
  const legacyCashierText =
    currentCashier && !currentCashier.id ? currentCashier.name : null;

  const options = cashAccounts.map((account) => ({
    value: account.id,
    label: account.name,
    description: account.code,
    badge: TYPE_BADGE[account.type] ?? account.type,
  }));
  if (
    currentCashAccount &&
    !options.some((option) => option.value === currentCashAccount.id)
  ) {
    options.unshift({
      value: currentCashAccount.id,
      label: currentCashAccount.name ?? "Unknown account",
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
            Cash Account <span className="text-destructive">*</span>
          </Label>
          <div
            className={
              errors.cashAccount
                ? "ring-destructive/40 rounded-lg ring-2"
                : undefined
            }
          >
            <SearchableSelect
              value={voucher.cashAccountId || null}
              onChange={(value) => onChange({ cashAccountId: value ?? "" })}
              options={options}
              placeholder="Select cash account"
              emptyText={
                cashAccounts.length === 0
                  ? "No active cash or wallet accounts. Add one under Masters → Accounts."
                  : "No matching accounts"
              }
              allowClear={false}
              disabled={disabled}
            />
          </div>
          <FieldError id="cash-account-error" message={errors.cashAccount} />
          <p className="text-muted-foreground text-xs">
            Bank accounts are used in Bank Receipt.
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
          <FieldError id="cashier-error" message={errors.cashier} />
          {legacyCashierText && !voucher.cashierId ? (
            <p className="text-muted-foreground text-xs">
              Entered before cashiers were set up as &ldquo;{legacyCashierText}
              &rdquo; — pick the matching cashier to save.
            </p>
          ) : null}
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="comments">Comments</Label>
          <Textarea
            id="comments"
            value={voucher.comments}
            onChange={(event) => onChange({ comments: event.target.value })}
            placeholder="Optional notes about this receipt"
            disabled={disabled}
            className="min-h-10"
          />
        </div>
      </CardContent>
    </Card>
  );
}

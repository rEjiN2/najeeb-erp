"use client";

import { Landmark } from "lucide-react";
import { useState, useTransition, type FormEvent, type ReactNode } from "react";

import {
  FieldError,
  FormErrorSummary,
} from "@/components/master/form-error-summary";
import { GeneratedCode } from "@/components/master/generated-code";
import { MasterFormFooter } from "@/components/master/master-form-footer";
import { SearchableSelect } from "@/components/shared/searchable-select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getLocationPaths } from "@/features/locations/paths";
import {
  LOCATION_TYPE_LABELS,
  type Location,
} from "@/features/locations/types";
import { groupErrors, type MutationResult } from "@/lib/mutation";

import {
  ACCOUNT_STATUS_LABELS,
  ACCOUNT_STATUSES,
  ACCOUNT_TYPE_LABELS,
  MANAGEABLE_ACCOUNT_TYPES,
  type Account,
  type AccountInput,
  type AccountLookupItem,
  type AccountStatus,
  type ManageableAccountType,
} from "./types";

type AccountField =
  | "name"
  | "type"
  | "status"
  | "locationId"
  | "bankName"
  | "accountNumber"
  | "iban"
  | "swiftCode"
  | "branchCode"
  | "bankChargeAccountId"
  | "commissionPercent";

// Backend messages → field, first match wins. Nested class-validator text
// reads "bankDetails.iban must be…", so bank fields match on their property
// names first; the duplicate-name 409 reads 'A cash account named "X"
// already exists'. Code is generated, so code errors stay form-level.
const FIELD_MATCHERS = [
  ["bankChargeAccountId", /bankChargeAccountId|charge account/i],
  ["commissionPercent", /commissionPercent/i],
  ["bankName", /bankName/i],
  ["accountNumber", /accountNumber/i],
  ["iban", /\biban\b/i],
  ["swiftCode", /swiftCode/i],
  ["branchCode", /branchCode/i],
  ["locationId", /locationId|^Location\b/i],
  ["name", /^name\b|named ".*" already exists/i],
  ["type", /^type\b/i],
  ["status", /^status\b/i],
] as const;

const cashNameFor = (location: Location) => `Cash in Hand - ${location.name}`;

interface AccountFormProps {
  initialValue: Account | null;
  locations: Location[];
  /** Active expense accounts; null when they couldn't be loaded. */
  expenseAccounts: AccountLookupItem[] | null;
  onSubmit: (values: AccountInput) => Promise<MutationResult>;
}

export function AccountForm({
  initialValue,
  locations,
  expenseAccounts,
  onSubmit,
}: AccountFormProps) {
  const isEdit = initialValue !== null;
  const bank = initialValue?.bankDetails ?? null;

  const [type, setType] = useState<ManageableAccountType>(
    (initialValue?.type as ManageableAccountType | undefined) ?? "cash",
  );
  const [name, setName] = useState(initialValue?.name ?? "");
  const [status, setStatus] = useState<AccountStatus>(
    initialValue?.status ?? "active",
  );
  const [locationId, setLocationId] = useState<string | null>(
    initialValue?.locationId ?? null,
  );
  // The name last filled in from the linked location: replaced again on the
  // next pick only while the user hasn't edited it.
  const [suggestedName, setSuggestedName] = useState<string | null>(() => {
    const linked = locations.find((l) => l.id === initialValue?.locationId);
    const suggestion = linked ? cashNameFor(linked) : null;
    return suggestion === initialValue?.name ? suggestion : null;
  });

  const [bankName, setBankName] = useState(bank?.bankName ?? "");
  const [accountNumber, setAccountNumber] = useState(bank?.accountNumber ?? "");
  const [iban, setIban] = useState(bank?.iban ?? "");
  const [swiftCode, setSwiftCode] = useState(bank?.swiftCode ?? "");
  const [branchCode, setBranchCode] = useState(bank?.branchCode ?? "");
  const [chargeAccountId, setChargeAccountId] = useState<string | null>(
    bank?.bankChargeAccountId ?? null,
  );
  const [commission, setCommission] = useState(
    bank?.commissionPercent?.toString() ?? "",
  );
  const [isMerchant, setIsMerchant] = useState(
    bank?.isMerchantAccount ?? false,
  );

  const [errors, setErrors] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();
  const { fields: fieldErrors, general: generalErrors } =
    groupErrors<AccountField>(errors, FIELD_MATCHERS);

  const paths = getLocationPaths(locations);
  const locationOptions = locations.map((location) => ({
    value: location.id,
    label: paths.get(location.id) ?? location.name,
    badge: LOCATION_TYPE_LABELS[location.type],
    description: location.code,
  }));

  const chargeOptions = (expenseAccounts ?? []).map((account) => ({
    value: account.id,
    label: account.name,
    description: account.code,
  }));
  // The saved charge account may since have been deactivated (lookup lists
  // active accounts only) — keep it visible rather than silently blank.
  if (
    chargeAccountId &&
    !chargeOptions.some((o) => o.value === chargeAccountId)
  ) {
    chargeOptions.unshift({
      value: chargeAccountId,
      label: "Current account (inactive or not found)",
      description: "Pick an active expense account to replace it",
    });
  }

  function handleLocationChange(nextId: string | null) {
    setLocationId(nextId);
    const location = locations.find((l) => l.id === nextId);
    const suggestion = location ? cashNameFor(location) : null;
    const untouched = name.trim() === "" || name === suggestedName;
    if (untouched) setName(suggestion ?? "");
    setSuggestedName(suggestion);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const commissionValue =
      commission.trim() === "" ? undefined : Number(commission);
    const values: AccountInput = {
      name: name.trim(),
      type,
      status,
      locationId: type === "cash" ? locationId : null,
      bankDetails:
        type === "bank"
          ? {
              bankName,
              accountNumber,
              iban,
              swiftCode,
              branchCode,
              bankChargeAccountId: chargeAccountId,
              commissionPercent: commissionValue,
              isMerchantAccount: isMerchant,
            }
          : null,
    };

    startTransition(async () => {
      const result = await onSubmit(values);
      setErrors(result.ok ? [] : result.messages);
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-1 flex-col overflow-hidden"
    >
      <fieldset
        disabled={pending}
        className="min-w-0 flex-1 space-y-4 overflow-y-auto p-4"
      >
        <FormErrorSummary messages={generalErrors} />

        <GeneratedCode code={initialValue?.code ?? null} />

        <div className="space-y-2">
          <Label htmlFor="account-type">Type</Label>
          {isEdit ? (
            <>
              <p
                id="account-type"
                className="bg-muted/50 text-muted-foreground rounded-md border px-2.5 py-2 text-sm"
              >
                {ACCOUNT_TYPE_LABELS[type]}
              </p>
              <p className="text-muted-foreground text-xs">
                The type is fixed once an account is created.
              </p>
            </>
          ) : (
            <Select
              value={type}
              onValueChange={(value) =>
                value && setType(value as ManageableAccountType)
              }
              items={ACCOUNT_TYPE_LABELS}
            >
              <SelectTrigger
                id="account-type"
                className="w-full"
                aria-invalid={Boolean(fieldErrors.type)}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MANAGEABLE_ACCOUNT_TYPES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {ACCOUNT_TYPE_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <FieldError id="account-type-error" message={fieldErrors.type} />
        </div>

        {type === "cash" ? (
          <div className="space-y-2">
            <Label>Linked Location</Label>
            <SearchableSelect
              value={locationId}
              onChange={handleLocationChange}
              options={locationOptions}
              placeholder="Select location (optional)"
              clearLabel="No linked location"
              emptyText={
                locationOptions.length > 0
                  ? "No matching locations"
                  : "No locations yet"
              }
              disabled={pending}
            />
            <p className="text-muted-foreground text-xs">
              Where this cash physically sits — a store, van, ...
            </p>
            <FieldError
              id="account-location-error"
              message={fieldErrors.locationId}
            />
          </div>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="account-name">Name</Label>
          <Input
            id="account-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            aria-invalid={Boolean(fieldErrors.name)}
            aria-describedby={
              fieldErrors.name ? "account-name-error" : undefined
            }
            maxLength={200}
            required
          />
          {type === "cash" && suggestedName && name === suggestedName ? (
            <p className="text-muted-foreground text-xs">
              Suggested from the linked location — edit it freely.
            </p>
          ) : null}
          <FieldError id="account-name-error" message={fieldErrors.name} />
        </div>

        {type === "bank" ? (
          <section className="space-y-4 rounded-lg border p-4">
            <h3 className="flex items-center gap-2 text-sm font-medium">
              <Landmark className="text-muted-foreground size-4" />
              Bank Details
            </h3>

            <TextField
              id="bank-name"
              label="Bank name"
              value={bankName}
              onChange={setBankName}
              maxLength={200}
              error={fieldErrors.bankName}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                id="bank-account-number"
                label="Account number"
                value={accountNumber}
                onChange={setAccountNumber}
                maxLength={50}
                error={fieldErrors.accountNumber}
                mono
              />
              <TextField
                id="bank-branch-code"
                label="Branch code"
                value={branchCode}
                onChange={setBranchCode}
                maxLength={50}
                error={fieldErrors.branchCode}
                mono
              />
            </div>
            <TextField
              id="bank-iban"
              label="IBAN"
              value={iban}
              onChange={setIban}
              maxLength={50}
              error={fieldErrors.iban}
              mono
              uppercase
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                id="bank-swift"
                label="SWIFT code"
                value={swiftCode}
                onChange={setSwiftCode}
                maxLength={20}
                error={fieldErrors.swiftCode}
                mono
                uppercase
              />
              <div className="space-y-2">
                <Label htmlFor="bank-commission">Commission %</Label>
                <Input
                  id="bank-commission"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={100}
                  step="0.0001"
                  value={commission}
                  onChange={(event) => setCommission(event.target.value)}
                  aria-invalid={Boolean(fieldErrors.commissionPercent)}
                  className="tabular-nums"
                />
                <FieldError
                  id="bank-commission-error"
                  message={fieldErrors.commissionPercent}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Bank charge account</Label>
              {expenseAccounts === null ? (
                <p className="text-destructive text-sm">
                  Couldn&apos;t load expense accounts. Close this panel and try
                  again.
                </p>
              ) : (
                <SearchableSelect
                  value={chargeAccountId}
                  onChange={setChargeAccountId}
                  options={chargeOptions}
                  placeholder="Select expense account (optional)"
                  clearLabel="No charge account"
                  emptyText={
                    chargeOptions.length > 0
                      ? "No matching accounts"
                      : "No active expense accounts yet"
                  }
                  disabled={pending}
                />
              )}
              <p className="text-muted-foreground text-xs">
                Expense account bank charges are posted to.
              </p>
              <FieldError
                id="bank-charge-error"
                message={fieldErrors.bankChargeAccountId}
              />
            </div>

            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={isMerchant}
                onCheckedChange={(checked) => setIsMerchant(checked === true)}
              />
              Merchant account (card payments settle here)
            </label>
          </section>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="account-status">Status</Label>
          <Select
            value={status}
            onValueChange={(value) =>
              value && setStatus(value as AccountStatus)
            }
            items={ACCOUNT_STATUS_LABELS}
          >
            <SelectTrigger
              id="account-status"
              className="w-full"
              aria-invalid={Boolean(fieldErrors.status)}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ACCOUNT_STATUSES.map((value) => (
                <SelectItem key={value} value={value}>
                  {ACCOUNT_STATUS_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError id="account-status-error" message={fieldErrors.status} />
        </div>
      </fieldset>

      <MasterFormFooter
        submitLabel={isEdit ? "Save changes" : "Add account"}
        pending={pending}
      />
    </form>
  );
}

function TextField({
  id,
  label,
  value,
  onChange,
  maxLength,
  error,
  mono = false,
  uppercase = false,
}: {
  id: string;
  label: ReactNode;
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
  error?: string;
  mono?: boolean;
  uppercase?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={value}
        onChange={(event) =>
          onChange(
            uppercase ? event.target.value.toUpperCase() : event.target.value,
          )
        }
        maxLength={maxLength}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className={mono ? "font-mono" : undefined}
      />
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}

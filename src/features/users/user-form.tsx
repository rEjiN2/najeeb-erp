"use client";

import { KeyRound, Loader2, UserCheck, UserX } from "lucide-react";
import { useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";

import {
  FieldError,
  FormErrorSummary,
} from "@/components/master/form-error-summary";
import { MasterFormFooter } from "@/components/master/master-form-footer";
import { SearchableSelect } from "@/components/shared/searchable-select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from "@/features/auth/constants";
import { ACCOUNT_TYPE_BADGES } from "@/features/vouchers/constants";
import { groupErrors, type MutationResult } from "@/lib/mutation";

import type { CashAccountRef, RoleLookupItem, User, UserInput } from "./types";

type UserField =
  "name" | "email" | "password" | "roleId" | "allowedCashAccountIds";

// Backend messages → field, first match wins. class-validator text starts
// with the property name; service errors read "A user with email ... already
// exists", "Role ... not found", "Ledger account ... is inactive".
const FIELD_MATCHERS = [
  ["allowedCashAccountIds", /allowedCashAccountIds|^Ledger account/i],
  ["roleId", /^roleId|^Role\b|last active admin/i],
  ["password", /^password/i],
  ["email", /^email|user with (this )?email/i],
  ["name", /^name\b/i],
] as const;

interface UserFormProps {
  initialValue: User | null;
  /** null when they couldn't be loaded — the picker says so. */
  roles: RoleLookupItem[] | null;
  cashAccounts: CashAccountRef[] | null;
  onSubmit: (values: UserInput) => Promise<MutationResult>;
  onResetPassword: (password: string) => Promise<MutationResult>;
  onToggleStatus: () => Promise<MutationResult>;
}

export function UserForm({
  initialValue,
  roles,
  cashAccounts,
  onSubmit,
  onResetPassword,
  onToggleStatus,
}: UserFormProps) {
  const isEdit = initialValue !== null;
  const [name, setName] = useState(initialValue?.name ?? "");
  const [email, setEmail] = useState(initialValue?.email ?? "");
  const [password, setPassword] = useState("");
  const [roleId, setRoleId] = useState<string | null>(
    initialValue?.role?.id ?? null,
  );
  const [allowedIds, setAllowedIds] = useState<string[]>(
    initialValue?.allowedCashAccounts.map((account) => account.id) ?? [],
  );

  const [errors, setErrors] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();
  const { fields: fieldErrors, general: generalErrors } =
    groupErrors<UserField>(errors, FIELD_MATCHERS);

  const role = roles?.find((r) => r.id === roleId) ?? null;
  const isScoped = (role?.dataScope ?? initialValue?.role?.dataScope) === "own";

  const roleOptions = (roles ?? []).map((r) => ({
    value: r.id,
    label: r.name,
    badge: r.dataScope === "own" ? "Own records" : "All records",
  }));

  // Accounts already allowed stay listed even if since deactivated.
  const accountOptions = [...(cashAccounts ?? [])];
  for (const account of initialValue?.allowedCashAccounts ?? []) {
    if (!accountOptions.some((a) => a.id === account.id)) {
      accountOptions.push(account);
    }
  }

  function toggleAccount(id: string, checked: boolean) {
    setAllowedIds((prev) =>
      checked ? [...prev, id] : prev.filter((value) => value !== id),
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const missing: string[] = [];
    if (!name.trim()) missing.push("name should not be empty");
    if (!email.trim()) missing.push("email must be an email");
    if (!isEdit && password.length < PASSWORD_MIN_LENGTH) {
      missing.push(
        `password must be at least ${PASSWORD_MIN_LENGTH} characters`,
      );
    }
    if (!roleId) missing.push("roleId: pick a role");
    if (missing.length > 0 || !roleId) {
      setErrors(missing);
      return;
    }
    const values: UserInput = {
      name,
      email,
      password,
      roleId,
      allowedCashAccountIds: allowedIds,
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
      noValidate
    >
      <fieldset
        disabled={pending}
        className="min-w-0 flex-1 space-y-4 overflow-y-auto p-4"
      >
        <FormErrorSummary messages={generalErrors} />

        <div className="space-y-2">
          <Label htmlFor="user-name">
            Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="user-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            aria-invalid={Boolean(fieldErrors.name)}
            maxLength={100}
            autoFocus={!isEdit}
            required
          />
          <FieldError id="user-name-error" message={fieldErrors.name} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="user-email">
            Email <span className="text-destructive">*</span>
          </Label>
          <Input
            id="user-email"
            type="email"
            autoComplete="off"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={Boolean(fieldErrors.email)}
            maxLength={200}
            required
          />
          <FieldError id="user-email-error" message={fieldErrors.email} />
        </div>

        {!isEdit ? (
          <div className="space-y-2">
            <Label htmlFor="user-password">
              Temporary password <span className="text-destructive">*</span>
            </Label>
            <Input
              id="user-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-invalid={Boolean(fieldErrors.password)}
              minLength={PASSWORD_MIN_LENGTH}
              maxLength={PASSWORD_MAX_LENGTH}
              required
            />
            <p className="text-muted-foreground text-xs">
              At least {PASSWORD_MIN_LENGTH} characters. They must change it
              when they first sign in.
            </p>
            <FieldError
              id="user-password-error"
              message={fieldErrors.password}
            />
          </div>
        ) : null}

        <div className="space-y-2">
          <Label>
            Role <span className="text-destructive">*</span>
          </Label>
          {roles === null ? (
            <p className="text-destructive text-sm">
              Couldn&apos;t load roles. Close this panel and try again.
            </p>
          ) : (
            <SearchableSelect
              value={roleId}
              onChange={setRoleId}
              options={roleOptions}
              placeholder="Select role"
              emptyText="No matching roles"
              allowClear={false}
              disabled={pending}
            />
          )}
          <FieldError id="user-role-error" message={fieldErrors.roleId} />
        </div>

        {isScoped ? (
          <div className="space-y-2">
            <Label>Allowed cash accounts</Label>
            <p className="text-muted-foreground text-xs">
              This role sees only its own records, and receives money into these
              accounts only.
            </p>
            {cashAccounts === null ? (
              <p className="text-destructive text-sm">
                Couldn&apos;t load cash accounts. Close this panel and try
                again.
              </p>
            ) : accountOptions.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No active cash or wallet accounts. Add one under Masters →
                Accounts.
              </p>
            ) : (
              <div
                role="group"
                aria-label="Allowed cash accounts"
                className="max-h-48 space-y-1 overflow-y-auto rounded-[5px] border p-2"
              >
                {accountOptions.map((account) => (
                  <label
                    key={account.id}
                    className="hover:bg-muted/60 flex items-center gap-2 rounded px-1.5 py-1 text-sm"
                  >
                    <Checkbox
                      checked={allowedIds.includes(account.id)}
                      onCheckedChange={(checked) =>
                        toggleAccount(account.id, checked === true)
                      }
                    />
                    <span className="min-w-0 flex-1 truncate">
                      {account.name}
                    </span>
                    <span className="text-muted-foreground font-mono text-xs">
                      {account.code}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {ACCOUNT_TYPE_BADGES[account.type] ?? account.type}
                    </span>
                  </label>
                ))}
              </div>
            )}
            <FieldError
              id="user-accounts-error"
              message={fieldErrors.allowedCashAccountIds}
            />
          </div>
        ) : null}

        {initialValue ? (
          <AccountActions
            user={initialValue}
            onResetPassword={onResetPassword}
            onToggleStatus={onToggleStatus}
            disabled={pending}
          />
        ) : null}
      </fieldset>

      <MasterFormFooter
        submitLabel={isEdit ? "Save changes" : "Add user"}
        pending={pending}
      />
    </form>
  );
}

/** Edit only: reset the password and (de)activate, each saved at once. */
function AccountActions({
  user,
  onResetPassword,
  onToggleStatus,
  disabled,
}: {
  user: User;
  onResetPassword: (password: string) => Promise<MutationResult>;
  onToggleStatus: () => Promise<MutationResult>;
  disabled: boolean;
}) {
  const [resetOpen, setResetOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, startTransition] = useTransition();
  const active = user.status === "active";

  function run(action: () => Promise<MutationResult>, onDone?: () => void) {
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        setErrors([]);
        onDone?.();
        if (result.message) toast.success(result.message);
      } else {
        setErrors(result.messages);
      }
    });
  }

  function reset() {
    if (password.length < PASSWORD_MIN_LENGTH) {
      setErrors([
        `The temporary password must be at least ${PASSWORD_MIN_LENGTH} characters.`,
      ]);
      return;
    }
    run(
      () => onResetPassword(password),
      () => {
        setPassword("");
        setResetOpen(false);
      },
    );
  }

  return (
    <section className="space-y-3 border-t pt-4">
      <h3 className="text-sm font-medium">Account</h3>
      {user.mustChangePassword ? (
        <p className="text-muted-foreground text-xs">
          Must change their password at next sign-in.
        </p>
      ) : null}
      <FormErrorSummary messages={errors} />

      {resetOpen ? (
        <div className="space-y-2">
          <Label htmlFor="reset-password">New temporary password</Label>
          <div className="flex gap-2">
            <Input
              id="reset-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={PASSWORD_MIN_LENGTH}
              maxLength={PASSWORD_MAX_LENGTH}
              disabled={disabled || busy}
              onKeyDown={(event) => {
                // Enter would submit the user form instead.
                if (event.key === "Enter") {
                  event.preventDefault();
                  reset();
                }
              }}
            />
            <Button type="button" onClick={reset} disabled={disabled || busy}>
              {busy ? <Loader2 className="animate-spin" /> : null}
              Reset
            </Button>
          </div>
          <p className="text-muted-foreground text-xs">
            They must change it when they next sign in.
          </p>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {!resetOpen ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => setResetOpen(true)}
            disabled={disabled || busy}
          >
            <KeyRound /> Reset password
          </Button>
        ) : null}
        <Button
          type="button"
          variant="outline"
          className={active ? "text-destructive hover:text-destructive" : ""}
          onClick={() => run(onToggleStatus)}
          disabled={disabled || busy}
        >
          {active ? <UserX /> : <UserCheck />}
          {active ? "Deactivate" : "Reactivate"}
        </Button>
      </div>
    </section>
  );
}

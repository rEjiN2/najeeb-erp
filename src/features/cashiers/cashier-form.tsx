"use client";

import { useState, useTransition, type FormEvent } from "react";

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
  CASHIER_STATUSES,
  CASHIER_STATUS_LABELS,
  STAFF_TYPES,
  STAFF_TYPE_LABELS,
  defaultSettlesWithOffice,
  type Cashier,
  type CashierInput,
  type CashierStatus,
  type StaffType,
} from "./types";

type CashierField =
  | "name"
  | "mobile"
  | "email"
  | "status"
  | "staffType"
  | "linkedUserId"
  | "locationId";

// Backend messages → field, first match wins. class-validator text starts
// with the property name; the service's 409s read 'An active cashier named
// "X" already exists' and 'That user is already linked to cashier ...'.
const FIELD_MATCHERS = [
  ["linkedUserId", /linkedUserId|^User .* not found|already linked/i],
  ["locationId", /locationId|^Location\b/i],
  ["mobile", /^mobile\b/i],
  ["email", /^email\b/i],
  ["status", /^status\b/i],
  ["staffType", /^staffType\b|^settlesWithOffice\b/i],
  ["name", /^name\b|cashier named|cashier with this name/i],
] as const;

/** A login user, for the "Linked Login User" picker. */
export interface UserOption {
  id: string;
  name: string;
}

interface CashierFormProps {
  initialValue: Cashier | null;
  /** null when the list couldn't be loaded — the picker says so. */
  users: UserOption[] | null;
  locations: Location[] | null;
  onSubmit: (values: CashierInput) => Promise<MutationResult>;
}

export function CashierForm({
  initialValue,
  users,
  locations,
  onSubmit,
}: CashierFormProps) {
  const isEdit = initialValue !== null;
  const [name, setName] = useState(initialValue?.name ?? "");
  const [mobile, setMobile] = useState(initialValue?.mobile ?? "");
  const [email, setEmail] = useState(initialValue?.email ?? "");
  const [status, setStatus] = useState<CashierStatus>(
    initialValue?.status ?? "active",
  );
  const [staffType, setStaffType] = useState<StaffType>(
    initialValue?.staffType ?? "cashier",
  );
  const [settlesWithOffice, setSettlesWithOffice] = useState(
    initialValue?.settlesWithOffice ?? defaultSettlesWithOffice("cashier"),
  );
  const [linkedUserId, setLinkedUserId] = useState<string | null>(
    initialValue?.linkedUserId ?? null,
  );
  const [locationId, setLocationId] = useState<string | null>(
    initialValue?.locationId ?? null,
  );

  const [errors, setErrors] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();
  const { fields: fieldErrors, general: generalErrors } =
    groupErrors<CashierField>(errors, FIELD_MATCHERS);

  const userOptions = (users ?? []).map((user) => ({
    value: user.id,
    label: user.name,
  }));
  if (linkedUserId && !userOptions.some((o) => o.value === linkedUserId)) {
    userOptions.unshift({ value: linkedUserId, label: "Unknown user" });
  }

  const paths = getLocationPaths(locations ?? []);
  const locationOptions = (locations ?? []).map((location) => ({
    value: location.id,
    label: paths.get(location.id) ?? location.name,
    badge: LOCATION_TYPE_LABELS[location.type],
    description: location.code,
  }));
  if (locationId && !locationOptions.some((o) => o.value === locationId)) {
    locationOptions.unshift({
      value: locationId,
      label: "Unknown location",
      badge: "",
      description: "No longer exists — pick another or clear it",
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    if (!name.trim()) {
      setErrors(["name should not be empty"]);
      return;
    }
    const values: CashierInput = {
      name,
      mobile,
      email,
      status,
      staffType,
      settlesWithOffice,
      linkedUserId,
      locationId,
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

        <GeneratedCode code={initialValue?.code ?? null} />

        <div className="space-y-2">
          <Label htmlFor="cashier-name">
            Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="cashier-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            aria-invalid={Boolean(fieldErrors.name)}
            aria-describedby={
              fieldErrors.name ? "cashier-name-error" : undefined
            }
            maxLength={100}
            autoFocus={!isEdit}
            required
          />
          <FieldError id="cashier-name-error" message={fieldErrors.name} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="cashier-type">
            Type <span className="text-destructive">*</span>
          </Label>
          <Select
            value={staffType}
            onValueChange={(value) => {
              if (!value) return;
              setStaffType(value as StaffType);
              setSettlesWithOffice(
                defaultSettlesWithOffice(value as StaffType),
              );
            }}
            items={STAFF_TYPE_LABELS}
          >
            <SelectTrigger
              id="cashier-type"
              className="w-full"
              aria-invalid={Boolean(fieldErrors.staffType)}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STAFF_TYPES.map((value) => (
                <SelectItem key={value} value={value}>
                  {STAFF_TYPE_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <label className="flex cursor-pointer items-center gap-2 text-sm select-none">
            <Checkbox
              checked={settlesWithOffice}
              onCheckedChange={(checked) =>
                setSettlesWithOffice(checked === true)
              }
            />
            Settles cash with office
          </label>
          <p className="text-muted-foreground text-xs">
            Holds collected cash and hands it over to the office. On by default
            for van salesmen.
          </p>
          <FieldError id="cashier-type-error" message={fieldErrors.staffType} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="cashier-mobile">Mobile</Label>
            <Input
              id="cashier-mobile"
              type="tel"
              inputMode="tel"
              value={mobile}
              onChange={(event) => setMobile(event.target.value)}
              placeholder="+971 50 123 4567"
              aria-invalid={Boolean(fieldErrors.mobile)}
              maxLength={20}
            />
            <FieldError
              id="cashier-mobile-error"
              message={fieldErrors.mobile}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cashier-email">Email</Label>
            <Input
              id="cashier-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-invalid={Boolean(fieldErrors.email)}
              maxLength={200}
            />
            <FieldError id="cashier-email-error" message={fieldErrors.email} />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Linked Login User</Label>
          {users === null ? (
            <p className="text-destructive text-sm">
              Couldn&apos;t load users. Close this panel and try again.
            </p>
          ) : (
            <SearchableSelect
              value={linkedUserId}
              onChange={setLinkedUserId}
              options={userOptions}
              placeholder="Not linked (optional)"
              clearLabel="Not linked"
              emptyText="No matching users"
              disabled={pending}
            />
          )}
          <p className="text-muted-foreground text-xs">
            Receipts this user creates pick this staff member automatically. One
            staff member per user.
          </p>
          <FieldError
            id="cashier-user-error"
            message={fieldErrors.linkedUserId}
          />
        </div>

        <div className="space-y-2">
          <Label>Home Location</Label>
          {locations === null ? (
            <p className="text-destructive text-sm">
              Couldn&apos;t load locations. Close this panel and try again.
            </p>
          ) : (
            <SearchableSelect
              value={locationId}
              onChange={setLocationId}
              options={locationOptions}
              placeholder="No home location (optional)"
              clearLabel="No home location"
              emptyText={
                locationOptions.length > 0
                  ? "No matching locations"
                  : "No locations yet"
              }
              disabled={pending}
            />
          )}
          <FieldError
            id="cashier-location-error"
            message={fieldErrors.locationId}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="cashier-status">Status</Label>
          <Select
            value={status}
            onValueChange={(value) =>
              value && setStatus(value as CashierStatus)
            }
            items={CASHIER_STATUS_LABELS}
          >
            <SelectTrigger
              id="cashier-status"
              className="w-full"
              aria-invalid={Boolean(fieldErrors.status)}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CASHIER_STATUSES.map((value) => (
                <SelectItem key={value} value={value}>
                  {CASHIER_STATUS_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-muted-foreground text-xs">
            Inactive staff can&apos;t be picked on new receipts.
          </p>
          <FieldError id="cashier-status-error" message={fieldErrors.status} />
        </div>
      </fieldset>

      <MasterFormFooter
        submitLabel={isEdit ? "Save changes" : "Add staff"}
        pending={pending}
      />
    </form>
  );
}

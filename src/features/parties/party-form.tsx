"use client";

import { Plus, Trash2 } from "lucide-react";
import {
  useState,
  useTransition,
  type ComponentProps,
  type FormEvent,
  type ReactNode,
} from "react";

import {
  FieldError,
  FormErrorSummary,
} from "@/components/master/form-error-summary";
import { GeneratedCode } from "@/components/master/generated-code";
import { MasterFormFooter } from "@/components/master/master-form-footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { groupErrors, type MutationResult } from "@/lib/mutation";

import type { PartyKindConfig } from "./constants";
import { PartyDocuments } from "./party-documents";
import {
  ADDRESS_FIELDS,
  PARTY_STATUSES,
  PARTY_STATUS_LABELS,
  type AddressField,
  type Party,
  type PartyInput,
  type PartyStatus,
  type ShippingAddressInput,
} from "./types";

type TextField =
  | "name"
  | "contactPerson"
  | "telephone"
  | "mobile"
  | "email"
  | "vatNumber"
  | "salesman"
  | AddressField;

type PartyField =
  TextField | "status" | "creditLimit" | "creditDays" | "shippingAddresses";

// Backend messages → field, first match wins. class-validator text starts with
// the property path ("shippingAddresses.0.telephone must be ...", "vatNumber
// must be 15 digits"); the service's 409s read 'An active customer named "X"
// already exists', 'TRN 1002... is already used by ...' and 'The name "X" is
// already used by ... ledger account ...'.
const FIELD_MATCHERS: ReadonlyArray<readonly [PartyField, RegExp]> = [
  ["shippingAddresses", /^shippingAddresses|shipping address/i],
  ["vatNumber", /^vatNumber\b|\bTRN\b/i],
  ["name", /^name\b|named ".*" already exists|with this name|^The name "/i],
  ["creditLimit", /^creditLimit\b/i],
  ["creditDays", /^creditDays\b/i],
  ["status", /^status\b/i],
  ["contactPerson", /^contactPerson\b/i],
  ["telephone", /^telephone\b/i],
  ["mobile", /^mobile\b/i],
  ["email", /^email\b/i],
  ["salesman", /^salesman\b/i],
  ...ADDRESS_FIELDS.map(
    (field) => [field, new RegExp(`^${field}\\b`, "i")] as const,
  ),
];

const ADDRESS_LABELS: Record<AddressField, string> = {
  address1: "Address line 1",
  address2: "Address line 2",
  address3: "Address line 3",
  city: "City",
  state: "Emirate / State",
  country: "Country",
  postalCode: "Postal code",
};

type TextValues = Record<TextField, string>;

type ShippingRow = ShippingAddressInput & { key: string };

let rowSeq = 0;
const newRowKey = () => `row-${++rowSeq}`;

function blankShipping(): ShippingRow {
  return {
    key: newRowKey(),
    label: "",
    telephone: "",
    ...(Object.fromEntries(ADDRESS_FIELDS.map((f) => [f, ""])) as Record<
      AddressField,
      string
    >),
  };
}

function textValuesOf(party: Party | null): TextValues {
  const value = (v: string | null | undefined) => v ?? "";
  return {
    name: value(party?.name),
    contactPerson: value(party?.contactPerson),
    telephone: value(party?.telephone),
    mobile: value(party?.mobile),
    email: value(party?.email),
    vatNumber: value(party?.vatNumber),
    salesman: value(party?.salesman),
    ...(Object.fromEntries(
      ADDRESS_FIELDS.map((field) => [field, value(party?.[field])]),
    ) as Record<AddressField, string>),
  };
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-lg border p-4">
      <div>
        <h3 className="text-sm font-medium">{title}</h3>
        {description ? (
          <p className="text-muted-foreground text-xs">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

interface PartyFormProps {
  config: PartyKindConfig;
  initialValue: Party | null;
  /** Documents need parties:manage to change; viewing them doesn't. */
  canManage: boolean;
  onSubmit: (values: PartyInput) => Promise<MutationResult<unknown>>;
}

export function PartyForm({
  config,
  initialValue,
  canManage,
  onSubmit,
}: PartyFormProps) {
  const isEdit = initialValue !== null;
  const [values, setValues] = useState<TextValues>(() =>
    textValuesOf(initialValue),
  );
  const [status, setStatus] = useState<PartyStatus>(
    initialValue?.status ?? "active",
  );
  const [creditLimit, setCreditLimit] = useState(
    initialValue?.creditLimit?.toString() ?? "",
  );
  const [creditDays, setCreditDays] = useState(
    initialValue?.creditDays?.toString() ?? "",
  );
  const [shipping, setShipping] = useState<ShippingRow[]>(() =>
    (initialValue?.shippingAddresses ?? []).map((address) => ({
      key: address.id,
      label: address.label,
      telephone: address.telephone ?? "",
      ...(Object.fromEntries(
        ADDRESS_FIELDS.map((field) => [field, address[field] ?? ""]),
      ) as Record<AddressField, string>),
    })),
  );

  const [errors, setErrors] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();
  const { fields: fieldErrors, general } = groupErrors<PartyField>(
    errors,
    FIELD_MATCHERS,
  );

  const set = (field: TextField, value: string) =>
    setValues((prev) => ({ ...prev, [field]: value }));

  function updateRow(key: string, patch: Partial<ShippingAddressInput>) {
    setShipping((rows) =>
      rows.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  }

  /** Catches what would only bounce off the backend; it checks the rest. */
  function validate(): string[] {
    const problems: string[] = [];
    if (!values.name.trim()) problems.push("name should not be empty");
    if (creditLimit.trim() && !/^\d+(\.\d{1,2})?$/.test(creditLimit.trim())) {
      problems.push("creditLimit must be 0 or more, with up to 2 decimals");
    }
    if (
      creditDays.trim() &&
      (!/^\d+$/.test(creditDays.trim()) || Number(creditDays) > 3650)
    ) {
      problems.push("creditDays must be a whole number from 0 to 3650");
    }
    if (config.showShipping) {
      shipping.forEach((row, index) => {
        if (!row.label.trim()) {
          problems.push(
            `shippingAddresses: address ${index + 1} needs a label`,
          );
        }
      });
    }
    return problems;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const problems = validate();
    if (problems.length > 0) {
      setErrors(problems);
      return;
    }

    const input: PartyInput = {
      ...values,
      status,
      creditLimit: creditLimit.trim() ? Number(creditLimit) : null,
      creditDays: creditDays.trim() ? Number(creditDays) : null,
      ...(config.showShipping
        ? {
            shippingAddresses: shipping.map((row) => ({
              label: row.label,
              telephone: row.telephone,
              ...(Object.fromEntries(
                ADDRESS_FIELDS.map((field) => [field, row[field]]),
              ) as Record<AddressField, string>),
            })),
          }
        : {}),
    };

    startTransition(async () => {
      const result = await onSubmit(input);
      setErrors(result.ok ? [] : result.messages);
    });
  }

  const text = (
    field: TextField,
    label: ReactNode,
    props: ComponentProps<typeof Input> = {},
  ) => {
    const id = `party-${field}`;
    return (
      <div className="space-y-2">
        <Label htmlFor={id}>{label}</Label>
        <Input
          id={id}
          value={values[field]}
          onChange={(event) => set(field, event.target.value)}
          aria-invalid={Boolean(fieldErrors[field])}
          aria-describedby={fieldErrors[field] ? `${id}-error` : undefined}
          {...props}
        />
        <FieldError id={`${id}-error`} message={fieldErrors[field]} />
      </div>
    );
  };

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="flex flex-1 flex-col overflow-hidden"
    >
      <div className="min-w-0 flex-1 space-y-4 overflow-y-auto p-4">
        <FormErrorSummary messages={general} />

        <fieldset disabled={pending} className="min-w-0 space-y-4">
          <Section title="Basic">
            <GeneratedCode code={initialValue?.code ?? null} />
            {text(
              "name",
              <>
                Name <span className="text-destructive">*</span>
              </>,
              { maxLength: 200, required: true, autoFocus: !isEdit },
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              {text("contactPerson", "Contact person", { maxLength: 100 })}
              {text("salesman", "Salesman", { maxLength: 100 })}
            </div>
            <div className="space-y-2">
              <Label htmlFor="party-status">Status</Label>
              <Select
                value={status}
                onValueChange={(value) =>
                  value && setStatus(value as PartyStatus)
                }
                items={PARTY_STATUS_LABELS}
              >
                <SelectTrigger
                  id="party-status"
                  className="w-full"
                  aria-invalid={Boolean(fieldErrors.status)}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PARTY_STATUSES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {PARTY_STATUS_LABELS[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError
                id="party-status-error"
                message={fieldErrors.status}
              />
            </div>
          </Section>

          <Section title="Contact">
            <div className="grid gap-4 sm:grid-cols-2">
              {text("mobile", "Mobile", {
                type: "tel",
                inputMode: "tel",
                maxLength: 20,
                placeholder: "+971 50 123 4567",
              })}
              {text("telephone", "Telephone", {
                type: "tel",
                inputMode: "tel",
                maxLength: 20,
              })}
            </div>
            {text("email", "Email", { type: "email", maxLength: 200 })}
          </Section>

          <Section title="Address">
            {text("address1", ADDRESS_LABELS.address1, { maxLength: 200 })}
            {text("address2", ADDRESS_LABELS.address2, { maxLength: 200 })}
            {text("address3", ADDRESS_LABELS.address3, { maxLength: 200 })}
            <div className="grid gap-4 sm:grid-cols-2">
              {text("city", ADDRESS_LABELS.city, { maxLength: 100 })}
              {text("state", ADDRESS_LABELS.state, { maxLength: 100 })}
              {text("country", ADDRESS_LABELS.country, { maxLength: 100 })}
              {text("postalCode", ADDRESS_LABELS.postalCode, { maxLength: 20 })}
            </div>
          </Section>

          <Section title="Tax & Credit">
            {text("vatNumber", "VAT number (TRN)", {
              inputMode: "numeric",
              maxLength: 25,
              placeholder: "15 digits",
              className: "font-mono",
            })}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="party-credit-limit">Credit limit (AED)</Label>
                <Input
                  id="party-credit-limit"
                  inputMode="decimal"
                  value={creditLimit}
                  onChange={(event) => setCreditLimit(event.target.value)}
                  placeholder="No limit"
                  aria-invalid={Boolean(fieldErrors.creditLimit)}
                  className="font-mono tabular-nums"
                />
                <FieldError
                  id="party-credit-limit-error"
                  message={fieldErrors.creditLimit}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="party-credit-days">Credit days</Label>
                <Input
                  id="party-credit-days"
                  inputMode="numeric"
                  value={creditDays}
                  onChange={(event) => setCreditDays(event.target.value)}
                  placeholder="0"
                  aria-invalid={Boolean(fieldErrors.creditDays)}
                  className="tabular-nums"
                />
                <FieldError
                  id="party-credit-days-error"
                  message={fieldErrors.creditDays}
                />
              </div>
            </div>
          </Section>

          {config.showShipping ? (
            <Section
              title="Shipping Addresses"
              description="Where deliveries go, if not the main address."
            >
              {shipping.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No shipping addresses.
                </p>
              ) : null}
              {shipping.map((row, index) => (
                <div
                  key={row.key}
                  className="bg-muted/30 space-y-3 rounded-md border p-3"
                >
                  <div className="flex items-end gap-2">
                    <div className="flex-1 space-y-2">
                      <Label htmlFor={`ship-${row.key}-label`}>
                        Label <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id={`ship-${row.key}-label`}
                        value={row.label}
                        onChange={(event) =>
                          updateRow(row.key, { label: event.target.value })
                        }
                        placeholder={`e.g. Warehouse ${index + 1}`}
                        maxLength={100}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove shipping address ${index + 1}`}
                      onClick={() =>
                        setShipping((rows) =>
                          rows.filter((r) => r.key !== row.key),
                        )
                      }
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {(
                      [
                        "address1",
                        "address2",
                        "city",
                        "state",
                        "country",
                        "postalCode",
                      ] as const
                    ).map((field) => (
                      <Input
                        key={field}
                        value={row[field]}
                        onChange={(event) =>
                          updateRow(row.key, { [field]: event.target.value })
                        }
                        placeholder={ADDRESS_LABELS[field]}
                        aria-label={`${ADDRESS_LABELS[field]}, shipping address ${index + 1}`}
                        maxLength={field === "postalCode" ? 20 : 200}
                      />
                    ))}
                    <Input
                      type="tel"
                      value={row.telephone}
                      onChange={(event) =>
                        updateRow(row.key, { telephone: event.target.value })
                      }
                      placeholder="Telephone"
                      aria-label={`Telephone, shipping address ${index + 1}`}
                      maxLength={20}
                    />
                  </div>
                </div>
              ))}
              <FieldError
                id="party-shipping-error"
                message={fieldErrors.shippingAddresses}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setShipping((rows) => [...rows, blankShipping()])
                }
                disabled={shipping.length >= 50}
              >
                <Plus /> Add shipping address
              </Button>
            </Section>
          ) : null}
        </fieldset>

        <Section title="Documents">
          {initialValue ? (
            <PartyDocuments
              partyId={initialValue.id}
              documents={initialValue.documents}
              canManage={canManage}
            />
          ) : (
            <p className="text-muted-foreground text-sm">
              Save the {config.noun} first, then attach trade licences,
              contracts and other documents here.
            </p>
          )}
        </Section>
      </div>

      <MasterFormFooter
        submitLabel={isEdit ? "Save changes" : `Add ${config.noun}`}
        pending={pending}
      />
    </form>
  );
}

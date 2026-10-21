"use client";

import { ImageOff, ImageUp, Loader2, Save, Trash2 } from "lucide-react";
import Image from "next/image";
import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type ComponentProps,
  type ReactNode,
} from "react";
import { toast } from "sonner";

import {
  FieldError,
  FormErrorSummary,
} from "@/components/master/form-error-summary";
import { RelativeTime } from "@/components/shared/relative-time";
import { UnsavedChangesGuard } from "@/components/shared/unsaved-changes-guard";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/shared/searchable-select";
import { Textarea } from "@/components/ui/textarea";
import { BACKEND_PROXY_PATH } from "@/features/auth/constants";
import { ACCOUNT_TYPE_BADGES } from "@/features/vouchers/constants";
import type { AccountLookupItem } from "@/features/vouchers/types";
import { describeFailure } from "@/lib/api-types";
import { browserUpload } from "@/lib/browser-api";
import { groupErrors } from "@/lib/mutation";

import { saveCompanyProfile } from "./actions";
import { LOGO_MAX_BYTES, LOGO_MIME_TYPES } from "./constants";
import {
  COMPANY_TEXT_FIELDS,
  type CompanyProfile,
  type CompanyTextField,
  type StoredFile,
} from "./types";

type LogoState =
  | { kind: "saved"; id: string }
  | { kind: "new"; file: File; previewUrl: string }
  | { kind: "none" };

type Field =
  | CompanyTextField
  | "logo"
  | "defaultCashInHandAccountId"
  | "defaultChequesInHandAccountId";

// class-validator text starts with the property name ("trn must be exactly
// 15 digits"); the logo check reads "The logo must be a PNG or JPEG image".
const FIELD_MATCHERS: ReadonlyArray<readonly [Field, RegExp]> = [
  ["logo", /logo/i],
  ["defaultCashInHandAccountId", /defaultCashInHand|cash in hand/i],
  ["defaultChequesInHandAccountId", /defaultChequesInHand|cheques in hand/i],
  ...COMPANY_TEXT_FIELDS.map(
    (field) => [field, new RegExp(`^${field}\\b`, "i")] as const,
  ),
];

function initialValues(
  profile: CompanyProfile,
): Record<CompanyTextField, string> {
  return Object.fromEntries(
    COMPANY_TEXT_FIELDS.map((field) => [field, profile[field] ?? ""]),
  ) as Record<CompanyTextField, string>;
}

function fileUrl(id: string): string {
  return `${BACKEND_PROXY_PATH}/files/${encodeURIComponent(id)}`;
}

export function CompanyProfileForm({
  profile,
  accounts,
}: {
  profile: CompanyProfile;
  /** Active company cash, wallet and cheque accounts; null if unavailable. */
  accounts: AccountLookupItem[] | null;
}) {
  const [baseline] = useState(() => initialValues(profile));
  const [values, setValues] = useState(baseline);
  const [cashInHandId, setCashInHandId] = useState(
    profile.defaultCashInHandAccountId ?? null,
  );
  const [chequesInHandId, setChequesInHandId] = useState(
    profile.defaultChequesInHandAccountId ?? null,
  );
  const [logo, setLogo] = useState<LogoState>(
    profile.logo ? { kind: "saved", id: profile.logo.id } : { kind: "none" },
  );
  const [logoBroken, setLogoBroken] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();
  const fileInput = useRef<HTMLInputElement>(null);

  // The preview's object URL is ours to free.
  const previewUrl = logo.kind === "new" ? logo.previewUrl : null;
  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const { fields: fieldErrors, general } = groupErrors<Field>(
    errors,
    FIELD_MATCHERS,
  );

  const logoChanged =
    logo.kind === "new" ||
    (logo.kind === "none"
      ? profile.logo !== null
      : logo.id !== profile.logo?.id);
  const isDirty =
    logoChanged ||
    cashInHandId !== (profile.defaultCashInHandAccountId ?? null) ||
    chequesInHandId !== (profile.defaultChequesInHandAccountId ?? null) ||
    COMPANY_TEXT_FIELDS.some((field) => values[field] !== baseline[field]);

  function set(field: CompanyTextField, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }));
  }

  function pickFile(file: File | undefined) {
    if (!file) return;
    if (!(LOGO_MIME_TYPES as readonly string[]).includes(file.type)) {
      setErrors(["The logo must be a PNG or JPEG image."]);
      return;
    }
    if (file.size > LOGO_MAX_BYTES) {
      setErrors([
        `The logo is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Use an image under 10 MB.`,
      ]);
      return;
    }
    setErrors([]);
    setLogoBroken(false);
    setLogo({ kind: "new", file, previewUrl: URL.createObjectURL(file) });
  }

  function submit() {
    if (!values.legalName.trim()) {
      setErrors(["legalName should not be empty"]);
      return;
    }
    setErrors([]);

    startTransition(async () => {
      // A new logo goes up first; the profile then points at the stored file.
      let logoFileRef: string | null = logo.kind === "saved" ? logo.id : null;
      if (logo.kind === "new") {
        const form = new FormData();
        form.set("file", logo.file);
        form.set("ownerType", "company");
        form.set("ownerId", profile.id);
        const uploaded = await browserUpload<StoredFile>("/files/upload", form);
        if (!uploaded.ok) {
          setErrors([`Logo upload failed: ${describeFailure(uploaded)}`]);
          return;
        }
        logoFileRef = uploaded.data.id;
        setLogo({ kind: "saved", id: uploaded.data.id });
      }

      try {
        const result = await saveCompanyProfile({
          ...values,
          logoFileRef,
          allowSelfApproval: profile.allowSelfApproval ?? false,
          defaultCashInHandAccountId: cashInHandId,
          defaultChequesInHandAccountId: chequesInHandId,
        });
        if (!result) return; // Redirected to sign in.
        if (result.ok) {
          if (result.message) toast.success(result.message);
        } else {
          setErrors(result.messages);
        }
      } catch {
        setErrors([
          "Couldn't reach the app. Check your connection and try again.",
        ]);
      }
    });
  }

  const text = (
    field: CompanyTextField,
    label: ReactNode,
    props: ComponentProps<typeof Input> = {},
  ) => (
    <div className="space-y-2">
      <Label htmlFor={`company-${field}`}>{label}</Label>
      <Input
        id={`company-${field}`}
        value={values[field]}
        onChange={(event) => set(field, event.target.value)}
        aria-invalid={Boolean(fieldErrors[field])}
        aria-describedby={
          fieldErrors[field] ? `company-${field}-error` : undefined
        }
        {...props}
      />
      <FieldError id={`company-${field}-error`} message={fieldErrors[field]} />
    </div>
  );

  const accountPicker = (
    field: "defaultCashInHandAccountId" | "defaultChequesInHandAccountId",
    label: string,
    types: readonly string[],
    value: string | null,
    onChange: (value: string | null) => void,
  ) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <SearchableSelect
        value={value}
        onChange={onChange}
        options={(accounts ?? [])
          .filter((account) => types.includes(account.type))
          .map((account) => ({
            value: account.id,
            label: account.name,
            description: account.code,
            badge: ACCOUNT_TYPE_BADGES[account.type] ?? account.type,
          }))}
        placeholder={accounts ? "Not set" : "Accounts unavailable"}
        clearLabel="Not set"
        emptyText="No matching active accounts"
        disabled={pending || accounts === null}
      />
      <FieldError id={`company-${field}-error`} message={fieldErrors[field]} />
    </div>
  );

  const shownLogo =
    logo.kind === "new"
      ? logo.previewUrl
      : logo.kind === "saved"
        ? fileUrl(logo.id)
        : null;

  return (
    <form
      noValidate
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <FormErrorSummary messages={general} />

      <fieldset disabled={pending} className="min-w-0 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Logo</CardTitle>
            <CardDescription>
              Printed at the top of receipts. PNG or JPEG, under 10 MB.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="bg-muted/40 relative flex h-28 w-48 shrink-0 items-center justify-center overflow-hidden rounded-lg border">
              {shownLogo && !logoBroken ? (
                <Image
                  src={shownLogo}
                  alt="Company logo preview"
                  fill
                  unoptimized
                  className="object-contain p-2"
                  onError={() => setLogoBroken(true)}
                />
              ) : (
                <div className="text-muted-foreground flex flex-col items-center gap-1 text-xs">
                  <ImageOff className="size-5" />
                  {shownLogo ? "Couldn't load the logo" : "No logo"}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <input
                ref={fileInput}
                type="file"
                accept={LOGO_MIME_TYPES.join(",")}
                className="sr-only"
                aria-label="Choose a logo image"
                onChange={(event) => {
                  pickFile(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInput.current?.click()}
                >
                  <ImageUp /> {shownLogo ? "Replace logo" : "Upload logo"}
                </Button>
                {shownLogo ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setLogo({ kind: "none" });
                      setLogoBroken(false);
                    }}
                  >
                    <Trash2 /> Remove
                  </Button>
                ) : null}
              </div>
              {logo.kind === "new" || logoChanged ? (
                <p className="text-muted-foreground text-xs">
                  {logo.kind === "new"
                    ? `${logo.file.name} — uploaded when you save.`
                    : "The logo will be removed when you save."}
                </p>
              ) : null}
              <FieldError id="company-logo-error" message={fieldErrors.logo} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Company</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {text(
              "legalName",
              <>
                Legal name <span className="text-destructive">*</span>
              </>,
              { maxLength: 200, required: true },
            )}
            {text("tradeName", "Trade name", { maxLength: 200 })}
            {text("trn", "TRN", {
              inputMode: "numeric",
              maxLength: 15,
              placeholder: "15 digits",
              className: "font-mono",
            })}
            {text("currencyCode", "Currency", {
              maxLength: 3,
              placeholder: "AED",
              className: "w-24 font-mono uppercase",
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contact &amp; address</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {text("phone", "Phone", { type: "tel", maxLength: 20 })}
            {text("email", "Email", { type: "email", maxLength: 200 })}
            {text("website", "Website", {
              maxLength: 200,
              placeholder: "www.example.ae",
            })}
            <div className="hidden sm:block" />
            {text("addressLine1", "Address line 1", { maxLength: 200 })}
            {text("addressLine2", "Address line 2", { maxLength: 200 })}
            {text("city", "City", { maxLength: 100 })}
            {text("country", "Country", { maxLength: 100 })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Receipts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Label htmlFor="company-receiptFooterText">
              Receipt footer text
            </Label>
            <Textarea
              id="company-receiptFooterText"
              value={values.receiptFooterText}
              onChange={(event) => set("receiptFooterText", event.target.value)}
              maxLength={500}
              placeholder="e.g. Thank you for your business."
              aria-invalid={Boolean(fieldErrors.receiptFooterText)}
            />
            <FieldError
              id="company-receiptFooterText-error"
              message={fieldErrors.receiptFooterText}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cash handovers</CardTitle>
            <CardDescription>
              Where handed-over money is received by default. The approver can
              change it per handover.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {accountPicker(
              "defaultCashInHandAccountId",
              "Default Cash in Hand",
              ["cash", "wallet"],
              cashInHandId,
              setCashInHandId,
            )}
            {accountPicker(
              "defaultChequesInHandAccountId",
              "Default Cheques in Hand",
              ["cheque"],
              chequesInHandId,
              setChequesInHandId,
            )}
          </CardContent>
        </Card>
      </fieldset>

      <div className="bg-card sticky bottom-0 flex flex-col-reverse gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted-foreground text-sm">
          {profile.updatedBy && profile.updatedAt ? (
            <>
              Last updated by{" "}
              <span className="text-foreground font-medium">
                {profile.updatedBy.name}
              </span>{" "}
              <RelativeTime value={profile.updatedAt} />
            </>
          ) : (
            "Not edited yet — these are the starting details."
          )}
        </p>
        <Button type="submit" disabled={pending || !isDirty}>
          {pending ? <Loader2 className="animate-spin" /> : <Save />}
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </div>

      <UnsavedChangesGuard when={isDirty && !pending} />
    </form>
  );
}

"use client";

import { ImagePlus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ComponentProps,
  type FormEvent,
  type ReactNode,
} from "react";
import { toast } from "sonner";

import {
  FieldError,
  FormErrorSummary,
} from "@/components/master/form-error-summary";
import { GeneratedCode } from "@/components/master/generated-code";
import { MasterFormFooter } from "@/components/master/master-form-footer";
import { SearchableSelect } from "@/components/shared/searchable-select";
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
import { Textarea } from "@/components/ui/textarea";
import { BACKEND_PROXY_PATH } from "@/features/auth/constants";
import { groupPathOptions } from "@/features/product-groups/group-options";
import type { ProductGroup } from "@/features/product-groups/types";
import type { Unit } from "@/features/units/types";
import { describeFailure } from "@/lib/api-types";
import { browserApi, browserUpload } from "@/lib/browser-api";
import { groupErrors, type MutationResult } from "@/lib/mutation";

import { DEFAULT_VAT_RATE } from "./constants";
import {
  PRODUCT_STATUSES,
  PRODUCT_STATUS_LABELS,
  PRODUCT_TYPES,
  PRODUCT_TYPE_LABELS,
  type Product,
  type ProductInput,
  type ProductStatus,
  type ProductType,
} from "./types";

type NumberField =
  | "salePrice"
  | "purchasePrice"
  | "vatRate"
  | "minStock"
  | "reorderLevel"
  | "maxStock";

type ProductField =
  | NumberField
  | "name"
  | "productGroupId"
  | "unitId"
  | "type"
  | "barcode"
  | "status"
  | "notes";

// Backend messages → field. class-validator text starts with the property;
// the service's own read 'A product named "X" already exists', 'Barcode X is
// already used by ...', 'Product group ... not found', 'minStock must be ...'.
const FIELD_MATCHERS: ReadonlyArray<readonly [ProductField, RegExp]> = [
  ["barcode", /^barcode\b|\bbarcode\b/i],
  ["name", /^name\b|named ".*" already exists/i],
  ["productGroupId", /^productGroupId\b|product group/i],
  ["unitId", /^unitId\b|\bunit\b/i],
  ["type", /^type\b/i],
  ["salePrice", /^salePrice\b/i],
  ["purchasePrice", /^purchasePrice\b/i],
  ["vatRate", /^vatRate\b/i],
  ["minStock", /^minStock\b/i],
  ["reorderLevel", /^reorderLevel\b/i],
  ["maxStock", /^maxStock\b/i],
  ["status", /^status\b/i],
  ["notes", /^notes\b/i],
];

const MONEY = /^\d+(\.\d{1,2})?$/;
const QUANTITY = /^\d+(\.\d{1,3})?$/;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const IMAGE_MAX_BYTES = 10 * 1024 * 1024;

const numberText = (value: number | null | undefined) =>
  value === null || value === undefined ? "" : String(value);

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3 rounded-lg border p-4">
      <h3 className="text-sm font-medium">{title}</h3>
      {children}
    </section>
  );
}

interface ProductFormProps {
  initialValue: Product | null;
  groups: ProductGroup[];
  units: Unit[];
  /** products:view-cost — otherwise Purchase Price is never shown or sent. */
  canViewCost: boolean;
  onSubmit: (values: ProductInput) => Promise<MutationResult>;
}

export function ProductForm({
  initialValue,
  groups,
  units,
  canViewCost,
  onSubmit,
}: ProductFormProps) {
  const router = useRouter();
  const isEdit = initialValue !== null;
  const [name, setName] = useState(initialValue?.name ?? "");
  const [groupId, setGroupId] = useState<string | null>(
    initialValue?.productGroupId ?? null,
  );
  const [type, setType] = useState<ProductType>(initialValue?.type ?? "stock");
  const [unitId, setUnitId] = useState<string | null>(
    initialValue?.unitId ?? null,
  );
  const [barcode, setBarcode] = useState(initialValue?.barcode ?? "");
  const [status, setStatus] = useState<ProductStatus>(
    initialValue?.status ?? "active",
  );
  const [numbers, setNumbers] = useState<Record<NumberField, string>>({
    salePrice: numberText(initialValue?.salePrice),
    purchasePrice: numberText(initialValue?.purchasePrice),
    vatRate: numberText(initialValue?.vatRate ?? DEFAULT_VAT_RATE),
    minStock: numberText(initialValue?.minStock),
    reorderLevel: numberText(initialValue?.reorderLevel),
    maxStock: numberText(initialValue?.maxStock),
  });
  const [notes, setNotes] = useState(initialValue?.notes ?? "");

  // The image has its own route: picked here, applied right after saving.
  const [image, setImage] = useState<File | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const localUrl = useMemo(
    () => (image ? URL.createObjectURL(image) : null),
    [image],
  );
  useEffect(
    () => () => {
      if (localUrl) URL.revokeObjectURL(localUrl);
    },
    [localUrl],
  );
  const savedUrl =
    initialValue?.imageUrl && !removeImage
      ? `${BACKEND_PROXY_PATH}${initialValue.imageUrl}`
      : null;
  const previewUrl = localUrl ?? savedUrl;

  const [errors, setErrors] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();
  const { fields: fieldErrors, general } = groupErrors<ProductField>(
    errors,
    FIELD_MATCHERS,
  );

  const groupOptions = useMemo(() => groupPathOptions(groups), [groups]);
  const unitOptions = units.map((unit) => ({
    value: unit.id,
    label: unit.symbol,
    description: unit.name,
  }));

  const setNumber = (field: NumberField, value: string) =>
    setNumbers((prev) => ({ ...prev, [field]: value }));

  // Inline: shown as soon as they are typed, not only on save.
  const level = (field: "minStock" | "reorderLevel" | "maxStock") => {
    const text = numbers[field].trim();
    return text && QUANTITY.test(text) ? Number(text) : null;
  };
  const min = level("minStock");
  const reorder = level("reorderLevel");
  const max = level("maxStock");
  const levelErrors: Partial<Record<NumberField, string>> = {};
  for (const field of ["minStock", "reorderLevel", "maxStock"] as const) {
    const text = numbers[field].trim();
    if (text && !QUANTITY.test(text)) {
      levelErrors[field] = "0 or more, up to 3 decimals.";
    }
  }
  if (min !== null && reorder !== null && reorder < min) {
    levelErrors.reorderLevel = "Reorder level can't be below the minimum.";
  }
  if (max !== null && reorder !== null && reorder > max) {
    levelErrors.maxStock = "Maximum can't be below the reorder level.";
  } else if (max !== null && min !== null && max < min) {
    levelErrors.maxStock = "Maximum can't be below the minimum.";
  }

  function validate(): string[] {
    const problems: string[] = [];
    if (!name.trim()) problems.push("name should not be empty");
    if (!groupId) problems.push("productGroupId: pick the product group");
    if (!unitId) problems.push("unitId: pick the unit");
    for (const field of ["salePrice", "vatRate"] as const) {
      const text = numbers[field].trim();
      if (text && !MONEY.test(text)) {
        problems.push(`${field} must be 0 or more, with up to 2 decimals`);
      }
    }
    if (Number(numbers.vatRate) > 100) {
      problems.push("vatRate must not be greater than 100");
    }
    if (canViewCost) {
      const text = numbers.purchasePrice.trim();
      if (text && !MONEY.test(text)) {
        problems.push("purchasePrice must be 0 or more, with up to 2 decimals");
      }
    }
    return problems;
  }

  function pickImage(file: File | undefined) {
    if (!file) return;
    if (!IMAGE_TYPES.includes(file.type)) {
      setImageError("Choose a JPEG, PNG, WebP or GIF image.");
      return;
    }
    if (file.size > IMAGE_MAX_BYTES) {
      setImageError("The image must be under 10 MB.");
      return;
    }
    setImageError(null);
    setRemoveImage(false);
    setImage(file);
  }

  /** After the product is saved: upload the new image or remove the old one. */
  async function applyImage(productId: string) {
    if (!image && !(removeImage && initialValue?.imageUrl)) return;
    const path = `/products/${encodeURIComponent(productId)}/image`;
    let result;
    if (image) {
      const form = new FormData();
      form.set("file", image);
      result = await browserUpload<unknown>(path, form);
    } else {
      result = await browserApi<unknown>(path, { method: "DELETE" });
    }
    if (result.ok) {
      router.refresh();
    } else {
      toast.error("Product saved, but the image wasn't", {
        description: `${describeFailure(result)} Open the product to try again.`,
      });
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const problems = validate();
    if (problems.length > 0 || Object.keys(levelErrors).length > 0) {
      setErrors(problems);
      return;
    }
    const amount = (field: NumberField) =>
      numbers[field].trim() ? Number(numbers[field]) : null;
    const input: ProductInput = {
      name,
      productGroupId: groupId!,
      type,
      unitId: unitId!,
      barcode,
      salePrice: amount("salePrice") ?? 0,
      ...(canViewCost ? { purchasePrice: amount("purchasePrice") ?? 0 } : {}),
      vatRate: amount("vatRate") ?? 0,
      minStock: min,
      reorderLevel: reorder,
      maxStock: max,
      status,
      notes,
    };
    startTransition(async () => {
      const result = await onSubmit(input);
      setErrors(result.ok ? [] : result.messages);
      const id = result.ok ? (result.id ?? initialValue?.id) : null;
      if (id) await applyImage(id);
    });
  }

  const numberInput = (
    field: NumberField,
    label: ReactNode,
    props: ComponentProps<typeof Input> = {},
  ) => {
    const id = `product-${field}`;
    const message = levelErrors[field] ?? fieldErrors[field];
    return (
      <div className="space-y-2">
        <Label htmlFor={id}>{label}</Label>
        <Input
          id={id}
          type="number"
          inputMode="decimal"
          min={0}
          value={numbers[field]}
          onChange={(event) => setNumber(field, event.target.value)}
          aria-invalid={Boolean(message)}
          aria-describedby={message ? `${id}-error` : undefined}
          className="text-right font-mono"
          {...props}
        />
        <FieldError id={`${id}-error`} message={message} />
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
            <div className="space-y-2">
              <Label htmlFor="product-name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="product-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={200}
                placeholder="Ajwa 1KG"
                aria-invalid={Boolean(fieldErrors.name)}
                autoFocus={!isEdit}
              />
              <FieldError id="product-name-error" message={fieldErrors.name} />
            </div>
            <div className="space-y-2">
              <Label>
                Group <span className="text-destructive">*</span>
              </Label>
              <SearchableSelect
                value={groupId}
                onChange={setGroupId}
                options={groupOptions}
                placeholder="Select group (e.g. Dates › Ajwa)"
                emptyText="No matching groups. Add one under Product Groups."
                allowClear={false}
                disabled={pending}
              />
              <FieldError
                id="product-group-error"
                message={fieldErrors.productGroupId}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="product-type">Type</Label>
                <Select
                  value={type}
                  onValueChange={(value) =>
                    value && setType(value as ProductType)
                  }
                  items={PRODUCT_TYPE_LABELS}
                >
                  <SelectTrigger id="product-type" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRODUCT_TYPES.map((value) => (
                      <SelectItem key={value} value={value}>
                        {PRODUCT_TYPE_LABELS[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError
                  id="product-type-error"
                  message={fieldErrors.type}
                />
              </div>
              <div className="space-y-2">
                <Label>
                  Unit <span className="text-destructive">*</span>
                </Label>
                <SearchableSelect
                  value={unitId}
                  onChange={setUnitId}
                  options={unitOptions}
                  placeholder="Select unit"
                  emptyText="No matching units. Add one under Units."
                  allowClear={false}
                  disabled={pending}
                />
                <FieldError
                  id="product-unit-error"
                  message={fieldErrors.unitId}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="product-barcode">Barcode</Label>
                <Input
                  id="product-barcode"
                  value={barcode}
                  onChange={(event) => setBarcode(event.target.value)}
                  maxLength={50}
                  className="font-mono"
                  aria-invalid={Boolean(fieldErrors.barcode)}
                />
                <FieldError
                  id="product-barcode-error"
                  message={fieldErrors.barcode}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="product-status">Status</Label>
                <Select
                  value={status}
                  onValueChange={(value) =>
                    value && setStatus(value as ProductStatus)
                  }
                  items={PRODUCT_STATUS_LABELS}
                >
                  <SelectTrigger id="product-status" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRODUCT_STATUSES.map((value) => (
                      <SelectItem key={value} value={value}>
                        {PRODUCT_STATUS_LABELS[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Section>

          <Section title="Pricing">
            <div className="grid gap-4 sm:grid-cols-3">
              {numberInput("salePrice", "Sale price (AED)", {
                step: "0.01",
                placeholder: "0.00",
              })}
              {canViewCost
                ? numberInput("purchasePrice", "Purchase price (AED)", {
                    step: "0.01",
                    placeholder: "0.00",
                  })
                : null}
              {numberInput("vatRate", "VAT %", { step: "0.01", max: 100 })}
            </div>
          </Section>

          <Section title="Stock Levels">
            <p className="text-muted-foreground text-xs">
              Optional. Minimum ≤ reorder level ≤ maximum, in{" "}
              {units.find((unit) => unit.id === unitId)?.symbol ?? "units"}.
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              {numberInput("minStock", "Minimum", { step: "0.001" })}
              {numberInput("reorderLevel", "Reorder level", { step: "0.001" })}
              {numberInput("maxStock", "Maximum", { step: "0.001" })}
            </div>
          </Section>

          <Section title="Image">
            <input
              ref={fileInput}
              type="file"
              accept={IMAGE_TYPES.join(",")}
              className="hidden"
              onChange={(event) => {
                pickImage(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
            {previewUrl ? (
              <div className="flex items-start gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element -- a local blob or our own proxied file */}
                <img
                  src={previewUrl}
                  alt={name || "Product image"}
                  className="bg-muted size-28 rounded-md border object-contain"
                />
                <div className="flex flex-col gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInput.current?.click()}
                  >
                    <ImagePlus /> Replace
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setImage(null);
                      if (initialValue?.imageUrl) setRemoveImage(true);
                    }}
                  >
                    <Trash2 /> Remove
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInput.current?.click()}
              >
                <ImagePlus /> Choose image
              </Button>
            )}
            {imageError ? (
              <p role="alert" className="text-destructive text-sm">
                {imageError}
              </p>
            ) : (
              <p className="text-muted-foreground text-xs">
                {image || removeImage
                  ? "Applied when you save."
                  : "JPEG, PNG, WebP or GIF, up to 10 MB."}
              </p>
            )}
          </Section>

          <Section title="Notes">
            <Textarea
              id="product-notes"
              aria-label="Notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              maxLength={1000}
              placeholder="Optional"
            />
            <FieldError id="product-notes-error" message={fieldErrors.notes} />
          </Section>
        </fieldset>
      </div>

      <MasterFormFooter
        submitLabel={isEdit ? "Save changes" : "Add product"}
        pending={pending}
      />
    </form>
  );
}

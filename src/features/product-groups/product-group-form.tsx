"use client";

import { useState, useTransition, type FormEvent } from "react";

import {
  FieldError,
  FormErrorSummary,
} from "@/components/master/form-error-summary";
import { GeneratedCode } from "@/components/master/generated-code";
import { MasterFormFooter } from "@/components/master/master-form-footer";
import { SearchableSelect } from "@/components/shared/searchable-select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { groupErrors, type MutationResult } from "@/lib/mutation";
import { getDescendantIds } from "@/lib/tree";

import type { ProductGroup, ProductGroupInput } from "./types";

const getParentId = (group: ProductGroup) => group.parentId;

type ProductGroupField = "name" | "parentId";

// Backend messages → field. "Parent product group … not found", "…circular
// parent reference" and class-validator's "under must be…" belong to the
// "Under" picker; class-validator text starts with the property name.
// Code is backend-generated, so any code error stays form-level.
const FIELD_MATCHERS = [
  ["parentId", /parent|circular|^under\b/i],
  ["name", /^name\b/i],
] as const;

interface ProductGroupFormProps {
  allGroups: ProductGroup[];
  initialValue: ProductGroup | null;
  onSubmit: (values: ProductGroupInput) => Promise<MutationResult>;
}

export function ProductGroupForm({
  allGroups,
  initialValue,
  onSubmit,
}: ProductGroupFormProps) {
  const [name, setName] = useState(initialValue?.name ?? "");
  const [parentId, setParentId] = useState<string | null>(
    initialValue?.parentId ?? null,
  );
  const [errors, setErrors] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();

  const { fields: fieldErrors, general: generalErrors } =
    groupErrors<ProductGroupField>(errors, FIELD_MATCHERS);

  const excludedIds = initialValue
    ? new Set([
        initialValue.id,
        ...getDescendantIds(allGroups, getParentId, initialValue.id),
      ])
    : new Set<string>();

  const parentOptions = allGroups
    .filter((group) => !excludedIds.has(group.id))
    .map((group) => ({ value: group.id, label: group.name }));

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const values: ProductGroupInput = {
      name: name.trim(),
      parentId,
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
          <Label htmlFor="product-group-name">Name</Label>
          <Input
            id="product-group-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            aria-invalid={Boolean(fieldErrors.name)}
            aria-describedby={
              fieldErrors.name ? "product-group-name-error" : undefined
            }
            required
          />
          <FieldError
            id="product-group-name-error"
            message={fieldErrors.name}
          />
        </div>

        <div className="space-y-2">
          <Label>Under</Label>
          <SearchableSelect
            value={parentId}
            onChange={setParentId}
            options={parentOptions}
            placeholder="Top-level group (no parent)"
            emptyText="No matching product groups"
            disabled={pending}
          />
          <FieldError
            id="product-group-parent-error"
            message={fieldErrors.parentId}
          />
        </div>
      </fieldset>

      <MasterFormFooter
        submitLabel={initialValue ? "Save changes" : "Add product group"}
        pending={pending}
      />
    </form>
  );
}

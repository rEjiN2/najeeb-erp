"use client";

import { useState, type FormEvent } from "react";

import { MasterFormFooter } from "@/components/master/master-form-footer";
import { SearchableSelect } from "@/components/shared/searchable-select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getDescendantIds } from "@/lib/tree";

import type { ProductGroup } from "./types";

const getParentId = (group: ProductGroup) => group.parentId;

interface ProductGroupFormProps {
  allGroups: ProductGroup[];
  initialValue: ProductGroup | null;
  onSubmit: (values: Omit<ProductGroup, "id">) => void;
}

export function ProductGroupForm({
  allGroups,
  initialValue,
  onSubmit,
}: ProductGroupFormProps) {
  const [code, setCode] = useState(initialValue?.code ?? "");
  const [name, setName] = useState(initialValue?.name ?? "");
  const [parentId, setParentId] = useState<string | null>(
    initialValue?.parentId ?? null,
  );

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
    onSubmit({ code: code.trim(), name: name.trim(), parentId });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-1 flex-col overflow-hidden"
    >
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <div className="space-y-2">
          <Label htmlFor="product-group-code">Code</Label>
          <Input
            id="product-group-code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="product-group-name">Name</Label>
          <Input
            id="product-group-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
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
          />
        </div>
      </div>

      <MasterFormFooter
        submitLabel={initialValue ? "Save changes" : "Add product group"}
      />
    </form>
  );
}

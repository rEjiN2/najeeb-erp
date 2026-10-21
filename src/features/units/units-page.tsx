"use client";

import { Ruler } from "lucide-react";
import { useState, useTransition, type FormEvent } from "react";

import { DeleteConfirmDialog } from "@/components/master/delete-confirm-dialog";
import {
  FieldError,
  FormErrorSummary,
} from "@/components/master/form-error-summary";
import { MasterFormFooter } from "@/components/master/master-form-footer";
import { MasterFormSheet } from "@/components/master/master-form-sheet";
import { MasterPageHeader } from "@/components/master/master-page-header";
import { MasterEmptyState } from "@/components/master/master-states";
import {
  MasterTable,
  type MasterColumn,
} from "@/components/master/master-table";
import { MasterToolbar } from "@/components/master/master-toolbar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMasterCrud } from "@/hooks/use-master-crud";
import { groupErrors, type MutationResult } from "@/lib/mutation";

import { createUnit, deleteUnit, updateUnit } from "./actions";
import { UNITS_DESCRIPTION, UNITS_TITLE } from "./constants";
import type { Unit, UnitInput } from "./types";

const COLUMNS: MasterColumn<Unit>[] = [
  {
    key: "symbol",
    header: "Symbol",
    render: (unit) => (
      <span className="font-mono text-sm font-medium">{unit.symbol}</span>
    ),
  },
  {
    key: "name",
    header: "Name",
    render: (unit) => <span>{unit.name}</span>,
  },
];

// "A unit named X already exists" / "symbol X ..." and class-validator text.
const FIELD_MATCHERS = [
  ["symbol", /^symbol\b|symbol "/i],
  ["name", /^name\b|named "/i],
] as const;

function UnitForm({
  initialValue,
  onSubmit,
}: {
  initialValue: Unit | null;
  onSubmit: (values: UnitInput) => Promise<MutationResult>;
}) {
  const [name, setName] = useState(initialValue?.name ?? "");
  const [symbol, setSymbol] = useState(initialValue?.symbol ?? "");
  const [errors, setErrors] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();
  const { fields, general } = groupErrors<"name" | "symbol">(
    errors,
    FIELD_MATCHERS,
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    startTransition(async () => {
      const result = await onSubmit({ name, symbol });
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
        <FormErrorSummary messages={general} />
        <div className="space-y-2">
          <Label htmlFor="unit-name">
            Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="unit-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={50}
            placeholder="Kilogram"
            aria-invalid={Boolean(fields.name)}
            required
            autoFocus
          />
          <FieldError id="unit-name-error" message={fields.name} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="unit-symbol">
            Symbol <span className="text-destructive">*</span>
          </Label>
          <Input
            id="unit-symbol"
            value={symbol}
            onChange={(event) => setSymbol(event.target.value)}
            maxLength={10}
            placeholder="KG"
            aria-invalid={Boolean(fields.symbol)}
            required
          />
          <FieldError id="unit-symbol-error" message={fields.symbol} />
        </div>
      </fieldset>
      <MasterFormFooter
        submitLabel={initialValue ? "Save changes" : "Add unit"}
        pending={pending}
      />
    </form>
  );
}

export function UnitsPage({
  units,
  canManage,
}: {
  units: Unit[];
  canManage: boolean;
}) {
  const crud = useMasterCrud<Unit, UnitInput>({
    data: units,
    onSave: (values, editing) =>
      editing ? updateUnit(editing.id, values) : createUnit(values),
    onDelete: (unit) => deleteUnit(unit.id),
    matches: (unit, query) =>
      unit.name.toLowerCase().includes(query) ||
      unit.symbol.toLowerCase().includes(query),
    pageSize: 20,
  });
  const isEmpty = crud.items.length === 0;

  return (
    <div className="space-y-6">
      <MasterPageHeader
        title={UNITS_TITLE}
        description={UNITS_DESCRIPTION}
        actionLabel={isEmpty || !canManage ? undefined : "Add Unit"}
        onAction={crud.openCreate}
      />

      {isEmpty ? (
        canManage ? (
          <MasterEmptyState
            icon={Ruler}
            title="No units yet"
            description="Add the units you sell in, like KG, PCS or BOX."
            actionLabel="Add Unit"
            onAction={crud.openCreate}
          />
        ) : (
          <div className="text-muted-foreground flex min-h-40 items-center justify-center rounded-lg border border-dashed text-sm">
            No units have been added yet.
          </div>
        )
      ) : (
        <>
          <MasterToolbar
            value={crud.query}
            onChange={crud.setQuery}
            placeholder="Search units..."
          />
          <MasterTable
            columns={COLUMNS}
            rows={crud.rows}
            getId={(unit) => unit.id}
            collapsedIds={crud.collapsedIds}
            onToggleExpand={crud.toggleExpand}
            onEdit={crud.openEdit}
            onDelete={crud.requestDelete}
            canModify={canManage}
            emptyMessage="No units match your search."
          />
        </>
      )}

      <MasterFormSheet
        open={crud.isFormOpen}
        onOpenChange={(open) => {
          if (!open) crud.closeForm();
        }}
        title={crud.editing ? `Edit Unit ${crud.editing.symbol}` : "Add Unit"}
        description="Name and the short symbol shown next to quantities."
      >
        <UnitForm
          key={crud.editing?.id ?? "new"}
          initialValue={crud.editing}
          onSubmit={crud.submit}
        />
      </MasterFormSheet>

      <DeleteConfirmDialog
        open={crud.deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) crud.cancelDelete();
        }}
        itemLabel={crud.deleteTarget?.symbol ?? "this unit"}
        onConfirm={crud.confirmDelete}
        pending={crud.isDeleting}
        errors={crud.deleteErrors}
      />
    </div>
  );
}

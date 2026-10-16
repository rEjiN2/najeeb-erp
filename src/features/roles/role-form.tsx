"use client";

import { useState, useTransition, type FormEvent } from "react";

import {
  FieldError,
  FormErrorSummary,
} from "@/components/master/form-error-summary";
import { MasterFormFooter } from "@/components/master/master-form-footer";
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
import { Textarea } from "@/components/ui/textarea";
import type { DataScope } from "@/features/auth/types";
import { groupErrors, type MutationResult } from "@/lib/mutation";

import { groupPermissions } from "./permission-groups";
import {
  DATA_SCOPES,
  DATA_SCOPE_HINTS,
  DATA_SCOPE_LABELS,
  type Role,
  type RoleInput,
} from "./types";

type RoleField = "name" | "description" | "dataScope" | "permissions";

// Backend messages → field, first match wins: class-validator text starts
// with the property name; the service's 409 reads 'A role named "X" already
// exists'.
const FIELD_MATCHERS = [
  ["permissions", /^(each value in )?permissions/i],
  ["dataScope", /^dataScope/i],
  ["description", /^description/i],
  ["name", /^name\b|role named|role with this name/i],
] as const;

interface RoleFormProps {
  initialValue: Role | null;
  /** Every permission the backend knows (GET /roles/permissions). */
  catalog: string[];
  onSubmit: (values: RoleInput) => Promise<MutationResult>;
}

export function RoleForm({ initialValue, catalog, onSubmit }: RoleFormProps) {
  const isEdit = initialValue !== null;
  const [name, setName] = useState(initialValue?.name ?? "");
  const [description, setDescription] = useState(
    initialValue?.description ?? "",
  );
  const [dataScope, setDataScope] = useState<DataScope>(
    initialValue?.dataScope ?? "all",
  );
  const [permissions, setPermissions] = useState<string[]>(
    initialValue?.permissions ?? [],
  );

  const [errors, setErrors] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();
  const { fields: fieldErrors, general: generalErrors } =
    groupErrors<RoleField>(errors, FIELD_MATCHERS);

  // A permission the role holds but the catalog no longer lists stays visible.
  const groups = groupPermissions([
    ...catalog,
    ...permissions.filter((permission) => !catalog.includes(permission)),
  ]);

  function setChecked(values: string[], checked: boolean) {
    setPermissions((prev) =>
      checked
        ? [...new Set([...prev, ...values])]
        : prev.filter((value) => !values.includes(value)),
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    if (!name.trim()) {
      setErrors(["name should not be empty"]);
      return;
    }
    const values: RoleInput = { name, description, dataScope, permissions };
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
          <Label htmlFor="role-name">
            Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="role-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            aria-invalid={Boolean(fieldErrors.name)}
            maxLength={60}
            autoFocus={!isEdit}
            required
          />
          <FieldError id="role-name-error" message={fieldErrors.name} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="role-description">Description</Label>
          <Textarea
            id="role-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={300}
            className="min-h-16"
          />
          <FieldError
            id="role-description-error"
            message={fieldErrors.description}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="role-scope">Data scope</Label>
          <Select
            value={dataScope}
            onValueChange={(value) => value && setDataScope(value as DataScope)}
            items={DATA_SCOPE_LABELS}
          >
            <SelectTrigger
              id="role-scope"
              className="w-full"
              aria-invalid={Boolean(fieldErrors.dataScope)}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DATA_SCOPES.map((scope) => (
                <SelectItem key={scope} value={scope}>
                  {DATA_SCOPE_LABELS[scope]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-muted-foreground text-xs">
            {DATA_SCOPE_HINTS[dataScope]}
          </p>
          <FieldError id="role-scope-error" message={fieldErrors.dataScope} />
        </div>

        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-2">
            <Label>Permissions</Label>
            <span className="text-muted-foreground text-xs">
              {permissions.length} of {catalog.length} selected
            </span>
          </div>
          <FieldError
            id="role-permissions-error"
            message={fieldErrors.permissions}
          />
          <div className="divide-y rounded-[5px] border">
            {groups.map((group) => {
              const values = group.items.map((item) => item.value);
              const selected = values.filter((value) =>
                permissions.includes(value),
              ).length;
              return (
                <div key={group.key} className="space-y-1.5 p-3">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <Checkbox
                      checked={selected === values.length}
                      indeterminate={selected > 0 && selected < values.length}
                      onCheckedChange={(checked) =>
                        setChecked(values, checked === true)
                      }
                      aria-label={`All ${group.label} permissions`}
                    />
                    {group.label}
                  </label>
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5 pl-6">
                    {group.items.map((item) => (
                      <label
                        key={item.value}
                        className="flex items-center gap-2 text-sm"
                        title={item.value}
                      >
                        <Checkbox
                          checked={permissions.includes(item.value)}
                          onCheckedChange={(checked) =>
                            setChecked([item.value], checked === true)
                          }
                        />
                        {item.label}
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </fieldset>

      <MasterFormFooter
        submitLabel={isEdit ? "Save changes" : "Add role"}
        pending={pending}
      />
    </form>
  );
}

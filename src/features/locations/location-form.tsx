"use client";

import { useState, type FormEvent } from "react";

import { MasterFormFooter } from "@/components/master/master-form-footer";
import { SearchableSelect } from "@/components/master/searchable-select";
import type { MasterStatus } from "@/components/master/status-badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getDescendantIds } from "@/lib/tree";

import {
  ALLOWED_PARENT_TYPES,
  LOCATION_TYPES,
  type Location,
  type LocationType,
} from "./types";

const getParentId = (location: Location) => location.parentId;

interface LocationFormProps {
  allLocations: Location[];
  initialValue: Location | null;
  onSubmit: (values: Omit<Location, "id">) => void;
}

export function LocationForm({
  allLocations,
  initialValue,
  onSubmit,
}: LocationFormProps) {
  const [code, setCode] = useState(initialValue?.code ?? "");
  const [name, setName] = useState(initialValue?.name ?? "");
  const [type, setType] = useState<LocationType>(
    initialValue?.type ?? "Branch",
  );
  const [parentId, setParentId] = useState<string | null>(
    initialValue?.parentId ?? null,
  );
  const [status, setStatus] = useState<MasterStatus>(
    initialValue?.status ?? "Active",
  );

  const allowedParentTypes = ALLOWED_PARENT_TYPES[type];
  const excludedIds = initialValue
    ? new Set([
        initialValue.id,
        ...getDescendantIds(allLocations, getParentId, initialValue.id),
      ])
    : new Set<string>();

  const parentOptions = allLocations
    .filter(
      (location) =>
        allowedParentTypes.includes(location.type) &&
        !excludedIds.has(location.id),
    )
    .map((location) => ({
      value: location.id,
      label: `${location.name} (${location.type})`,
    }));

  function handleTypeChange(value: string | null) {
    if (!value) return;
    const nextType = value as LocationType;
    setType(nextType);

    const nextAllowed = ALLOWED_PARENT_TYPES[nextType];
    const currentParent = allLocations.find((loc) => loc.id === parentId);
    if (!currentParent || !nextAllowed.includes(currentParent.type)) {
      setParentId(null);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit({
      code: code.trim(),
      name: name.trim(),
      type,
      parentId: allowedParentTypes.length > 0 ? parentId : null,
      status,
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-1 flex-col overflow-hidden"
    >
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <div className="space-y-2">
          <Label htmlFor="location-code">Code</Label>
          <Input
            id="location-code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="location-name">Name</Label>
          <Input
            id="location-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="location-type">Type</Label>
          <Select value={type} onValueChange={handleTypeChange}>
            <SelectTrigger id="location-type" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LOCATION_TYPES.map((locationType) => (
                <SelectItem key={locationType} value={locationType}>
                  {locationType}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Parent Location</Label>
          {allowedParentTypes.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Branches are top-level and don&apos;t have a parent.
            </p>
          ) : (
            <SearchableSelect
              value={parentId}
              onChange={setParentId}
              options={parentOptions}
              placeholder={`Select a ${allowedParentTypes.join(" or ")}`}
              emptyText="No matching locations"
            />
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="location-status">Status</Label>
          <Select
            value={status}
            onValueChange={(value) => value && setStatus(value as MasterStatus)}
          >
            <SelectTrigger id="location-status" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <MasterFormFooter
        submitLabel={initialValue ? "Save changes" : "Add location"}
      />
    </form>
  );
}

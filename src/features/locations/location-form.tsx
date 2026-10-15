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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { groupErrors, type MutationResult } from "@/lib/mutation";
import { flattenTree, getDescendantIds, getSubtreeHeight } from "@/lib/tree";

import {
  LOCATION_STATUS_LABELS,
  LOCATION_STATUSES,
  LOCATION_TYPE_LABELS,
  LOCATION_TYPES,
  type Location,
  type LocationInput,
  type LocationRules,
  type LocationStatus,
  type LocationType,
} from "./types";
import { getLocationPaths } from "./paths";

const getParentId = (location: Location) => location.parentId;

type LocationField = "name" | "type" | "parentId" | "status";

// Backend messages → field, first match wins. Placement errors ("A van cannot
// be placed under…", "…circular reference", "…limited to 6 levels…",
// "Parent location … not found") land on the parent picker; a type change
// blocked by a child lands on Type; a deactivate blocked by active
// sub-locations lands on Status. class-validator text starts with the
// property name. Code is backend-generated, so code errors stay form-level.
const FIELD_MATCHERS = [
  ["type", /^Cannot change \S+ to a/i],
  ["status", /deactivate|^status\b/i],
  [
    "parentId",
    /parent|circular|cannot be placed|hierarchy is limited|^Cannot (add|move)\b/i,
  ],
  ["name", /^name\b/i],
  ["type", /^type\b/i],
] as const;

/** What the backend's rules allow above a location of `type`. */
function placementFor(rules: LocationRules, type: LocationType) {
  const allowed = rules.allowedParentTypes[type] ?? [];
  return {
    parentTypes: allowed.filter((t): t is LocationType => t !== null),
    topLevelAllowed: allowed.includes(null),
  };
}

interface LocationFormProps {
  allLocations: Location[];
  /** From GET /locations/rules — the only source of parent rules. */
  rules: LocationRules;
  initialValue: Location | null;
  onSubmit: (values: LocationInput) => Promise<MutationResult>;
}

export function LocationForm({
  allLocations,
  rules,
  initialValue,
  onSubmit,
}: LocationFormProps) {
  const [name, setName] = useState(initialValue?.name ?? "");
  const [type, setType] = useState<LocationType>(
    initialValue?.type ?? "branch",
  );
  const [parentId, setParentId] = useState<string | null>(
    initialValue?.parentId ?? null,
  );
  const [status, setStatus] = useState<LocationStatus>(
    initialValue?.status ?? "active",
  );
  const [errors, setErrors] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();

  const { fields: fieldErrors, general: generalErrors } =
    groupErrors<LocationField>(errors, FIELD_MATCHERS);

  const { parentTypes, topLevelAllowed } = placementFor(rules, type);
  // "Branch, Warehouse or Van"
  const parentTypeNames = new Intl.ListFormat("en", {
    type: "disjunction",
  }).format(parentTypes.map((t) => LOCATION_TYPE_LABELS[t]));

  const byId = new Map(allLocations.map((location) => [location.id, location]));
  const paths = getLocationPaths(allLocations);
  // Depths from the parentId chain itself, so the picker agrees with the
  // tree on screen.
  const depthById = new Map(
    flattenTree(allLocations, getParentId).map((row) => [
      row.item.id,
      row.depth,
    ]),
  );

  // Editing: the record and everything under it can't become its parent
  // (that would be circular), and its whole sub-tree moves with it.
  const excludedIds = initialValue
    ? new Set([
        initialValue.id,
        ...getDescendantIds(allLocations, getParentId, initialValue.id),
      ])
    : new Set<string>();
  const subtreeHeight = initialValue
    ? getSubtreeHeight(allLocations, getParentId, initialValue.id)
    : 0;

  const parentOptions = allLocations
    .filter(
      (location) =>
        parentTypes.includes(location.type) && !excludedIds.has(location.id),
    )
    .map((location) => {
      // Deepest level this move would create, counted the backend's way
      // (top-level = level 1): parent's level, +1 for this record, + its
      // sub-tree.
      const levels = (depthById.get(location.id) ?? 0) + 2 + subtreeHeight;

      return {
        value: location.id,
        // Full path — tells apart similarly named locations.
        label: paths.get(location.id) ?? location.name,
        badge: LOCATION_TYPE_LABELS[location.type],
        description: location.code,
        disabledReason:
          levels > rules.maxLevels
            ? `Too deep: would reach ${levels} levels (limit ${rules.maxLevels})`
            : undefined,
      };
    });

  function handleTypeChange(value: string | null) {
    if (!value) return;
    const nextType = value as LocationType;
    setType(nextType);

    const next = placementFor(rules, nextType);
    const currentParent = parentId ? byId.get(parentId) : undefined;
    if (!currentParent || !next.parentTypes.includes(currentParent.type)) {
      setParentId(null);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const values: LocationInput = {
      name: name.trim(),
      type,
      parentId: parentTypes.length > 0 ? parentId : null,
      status,
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
          <Label htmlFor="location-name">Name</Label>
          <Input
            id="location-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            aria-invalid={Boolean(fieldErrors.name)}
            aria-describedby={
              fieldErrors.name ? "location-name-error" : undefined
            }
            required
          />
          <FieldError id="location-name-error" message={fieldErrors.name} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="location-type">Type</Label>
          <Select
            value={type}
            onValueChange={handleTypeChange}
            items={LOCATION_TYPE_LABELS}
          >
            <SelectTrigger
              id="location-type"
              className="w-full"
              aria-invalid={Boolean(fieldErrors.type)}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LOCATION_TYPES.map((locationType) => (
                <SelectItem key={locationType} value={locationType}>
                  {LOCATION_TYPE_LABELS[locationType]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError id="location-type-error" message={fieldErrors.type} />
        </div>

        <div className="space-y-2">
          <Label>Parent Location</Label>
          {parentTypes.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              {topLevelAllowed
                ? `A ${LOCATION_TYPE_LABELS[type]} is always top-level and doesn't have a parent.`
                : `The current rules don't allow a ${LOCATION_TYPE_LABELS[type]} anywhere.`}
            </p>
          ) : (
            <>
              <SearchableSelect
                value={parentId}
                onChange={setParentId}
                options={parentOptions}
                placeholder={
                  topLevelAllowed
                    ? "Select parent location (optional)"
                    : "Select parent location"
                }
                allowClear={topLevelAllowed}
                clearLabel="Top level (no parent)"
                emptyText={
                  parentOptions.length > 0
                    ? "No matching locations"
                    : `No ${parentTypeNames} available`
                }
                disabled={pending}
              />
              <p className="text-muted-foreground text-xs">
                {topLevelAllowed
                  ? `Optional — can sit under a ${parentTypeNames}.`
                  : `Required — must sit under a ${parentTypeNames}.`}{" "}
                Up to {rules.maxLevels} levels deep.
              </p>
            </>
          )}
          <FieldError
            id="location-parent-error"
            message={fieldErrors.parentId}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="location-status">Status</Label>
          <Select
            value={status}
            onValueChange={(value) =>
              value && setStatus(value as LocationStatus)
            }
            items={LOCATION_STATUS_LABELS}
          >
            <SelectTrigger
              id="location-status"
              className="w-full"
              aria-invalid={Boolean(fieldErrors.status)}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LOCATION_STATUSES.map((value) => (
                <SelectItem key={value} value={value}>
                  {LOCATION_STATUS_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError id="location-status-error" message={fieldErrors.status} />
        </div>
      </fieldset>

      <MasterFormFooter
        submitLabel={initialValue ? "Save changes" : "Add location"}
        pending={pending}
      />
    </form>
  );
}

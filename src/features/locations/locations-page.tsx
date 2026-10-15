"use client";

import { ChevronsDownUp, ChevronsUpDown, MapPin } from "lucide-react";
import { useState } from "react";

import { DeleteConfirmDialog } from "@/components/master/delete-confirm-dialog";
import { MasterFormSheet } from "@/components/master/master-form-sheet";
import { MasterPageHeader } from "@/components/master/master-page-header";
import { MasterEmptyState } from "@/components/master/master-states";
import {
  MasterTable,
  type MasterColumn,
} from "@/components/master/master-table";
import { MasterToolbar } from "@/components/master/master-toolbar";
import { StatusBadge } from "@/components/master/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMasterCrud } from "@/hooks/use-master-crud";

import { createLocation, deleteLocation, updateLocation } from "./actions";
import { LOCATIONS_DESCRIPTION, LOCATIONS_TITLE } from "./constants";
import { LocationForm } from "./location-form";
import {
  LOCATION_STATUS_LABELS,
  LOCATION_TYPE_LABELS,
  LOCATION_TYPES,
  type Location,
  type LocationInput,
  type LocationRules,
  type LocationType,
} from "./types";

const TYPE_FILTER_ITEMS: Record<LocationType | "all", string> = {
  all: "All types",
  ...LOCATION_TYPE_LABELS,
};

const COLUMNS: MasterColumn<Location>[] = [
  {
    key: "name",
    header: "Name",
    render: (location) => <span className="font-medium">{location.name}</span>,
  },
  {
    key: "code",
    header: "Code",
    render: (location) => (
      <span className="text-muted-foreground font-mono text-sm">
        {location.code}
      </span>
    ),
  },
  {
    key: "type",
    header: "Type",
    render: (location) => (
      <Badge variant="secondary">{LOCATION_TYPE_LABELS[location.type]}</Badge>
    ),
  },
  {
    key: "status",
    header: "Status",
    render: (location) => (
      <StatusBadge status={LOCATION_STATUS_LABELS[location.status]} />
    ),
  },
];

function matchesQuery(location: Location, query: string) {
  return (
    location.name.toLowerCase().includes(query) ||
    location.code.toLowerCase().includes(query) ||
    location.type.includes(query)
  );
}

export function LocationsPage({
  locations,
  rules,
}: {
  locations: Location[];
  rules: LocationRules;
}) {
  const [typeFilter, setTypeFilter] = useState<LocationType | "all">("all");

  const crud = useMasterCrud<Location, LocationInput>({
    data: locations,
    onSave: (values, editing) =>
      editing ? updateLocation(editing.id, values) : createLocation(values),
    onDelete: (location) => deleteLocation(location.id),
    matches: matchesQuery,
    filter:
      typeFilter === "all"
        ? undefined
        : (location) => location.type === typeFilter,
    getParentId: (location) => location.parentId,
  });

  const isEmpty = crud.items.length === 0;
  const isNarrowed = crud.query.trim() !== "" || typeFilter !== "all";

  return (
    <div className="space-y-6">
      <MasterPageHeader
        title={LOCATIONS_TITLE}
        description={LOCATIONS_DESCRIPTION}
        actionLabel={isEmpty ? undefined : "Add Location"}
        onAction={crud.openCreate}
      />

      {isEmpty ? (
        <MasterEmptyState
          icon={MapPin}
          title="No locations yet"
          description="Start with a Branch, then add the warehouses, stores and vans under it."
          actionLabel="Add Location"
          onAction={crud.openCreate}
        />
      ) : (
        <>
          <MasterToolbar
            value={crud.query}
            onChange={crud.setQuery}
            placeholder="Search locations..."
          >
            {/* A search or type filter shows every match's full path, so the
                tree is forced open — collapsing would have no effect then. */}
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={crud.expandAll}
                disabled={isNarrowed}
              >
                <ChevronsUpDown /> Expand all
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={crud.collapseAll}
                disabled={isNarrowed}
              >
                <ChevronsDownUp /> Collapse all
              </Button>
            </div>
            <Select
              value={typeFilter}
              onValueChange={(value) =>
                value && setTypeFilter(value as LocationType | "all")
              }
              items={TYPE_FILTER_ITEMS}
            >
              <SelectTrigger
                className="ml-auto w-[160px]"
                aria-label="Filter by type"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {LOCATION_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {LOCATION_TYPE_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </MasterToolbar>

          <MasterTable
            columns={COLUMNS}
            rows={crud.rows}
            getId={(location) => location.id}
            collapsedIds={crud.collapsedIds}
            onToggleExpand={crud.toggleExpand}
            onEdit={crud.openEdit}
            onDelete={crud.requestDelete}
            deleteDisabledReason={(_location, hasChildren) =>
              hasChildren ? "Remove or reassign child locations first." : null
            }
            emptyMessage="No locations match your search."
          />
        </>
      )}

      <MasterFormSheet
        open={crud.isFormOpen}
        onOpenChange={(open) => {
          if (!open) crud.closeForm();
        }}
        title={crud.editing ? "Edit Location" : "Add Location"}
        description="Locations form the branch → warehouse → store/van tree."
      >
        <LocationForm
          key={crud.editing?.id ?? "new"}
          allLocations={crud.items}
          rules={rules}
          initialValue={crud.editing}
          onSubmit={crud.submit}
        />
      </MasterFormSheet>

      <DeleteConfirmDialog
        open={crud.deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) crud.cancelDelete();
        }}
        itemLabel={crud.deleteTarget?.name ?? "this location"}
        onConfirm={crud.confirmDelete}
        pending={crud.isDeleting}
        errors={crud.deleteErrors}
      />
    </div>
  );
}

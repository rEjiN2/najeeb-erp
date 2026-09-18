"use client";

import { useState } from "react";

import { DeleteConfirmDialog } from "@/components/master/delete-confirm-dialog";
import { MasterFormSheet } from "@/components/master/master-form-sheet";
import { MasterPageHeader } from "@/components/master/master-page-header";
import {
  MasterTable,
  type MasterColumn,
} from "@/components/master/master-table";
import { MasterToolbar } from "@/components/master/master-toolbar";
import { StatusBadge } from "@/components/master/status-badge";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMasterCrud } from "@/hooks/use-master-crud";

import { LocationForm } from "./location-form";
import { MOCK_LOCATIONS } from "./mock-data";
import { LOCATION_TYPES, type Location, type LocationType } from "./types";

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
    render: (location) => <Badge variant="secondary">{location.type}</Badge>,
  },
  {
    key: "status",
    header: "Status",
    render: (location) => <StatusBadge status={location.status} />,
  },
];

function matchesQuery(location: Location, query: string) {
  return (
    location.name.toLowerCase().includes(query) ||
    location.code.toLowerCase().includes(query) ||
    location.type.toLowerCase().includes(query)
  );
}

export function LocationsPage() {
  const [typeFilter, setTypeFilter] = useState<LocationType | "all">("all");

  const crud = useMasterCrud<Location>({
    data: MOCK_LOCATIONS,
    matches: matchesQuery,
    filter:
      typeFilter === "all"
        ? undefined
        : (location) => location.type === typeFilter,
    getParentId: (location) => location.parentId,
  });

  return (
    <div className="space-y-6">
      <MasterPageHeader
        title="Locations"
        description="Branches, warehouses, stores and vans — where stock actually sits."
        actionLabel="Add Location"
        onAction={crud.openCreate}
      />

      <MasterToolbar
        value={crud.query}
        onChange={crud.setQuery}
        placeholder="Search locations..."
      >
        <Select
          value={typeFilter}
          onValueChange={(value) =>
            value && setTypeFilter(value as LocationType | "all")
          }
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
                {type}
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
      />
    </div>
  );
}

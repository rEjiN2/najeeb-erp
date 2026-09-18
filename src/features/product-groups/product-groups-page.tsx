"use client";

import { DeleteConfirmDialog } from "@/components/master/delete-confirm-dialog";
import { MasterFormSheet } from "@/components/master/master-form-sheet";
import { MasterPageHeader } from "@/components/master/master-page-header";
import {
  MasterTable,
  type MasterColumn,
} from "@/components/master/master-table";
import { MasterToolbar } from "@/components/master/master-toolbar";
import { useMasterCrud } from "@/hooks/use-master-crud";

import { MOCK_PRODUCT_GROUPS } from "./mock-data";
import { ProductGroupForm } from "./product-group-form";
import type { ProductGroup } from "./types";

const COLUMNS: MasterColumn<ProductGroup>[] = [
  {
    key: "name",
    header: "Name",
    render: (group) => <span className="font-medium">{group.name}</span>,
  },
  {
    key: "code",
    header: "Code",
    render: (group) => (
      <span className="text-muted-foreground font-mono text-sm">
        {group.code}
      </span>
    ),
  },
];

function matchesQuery(group: ProductGroup, query: string) {
  return (
    group.name.toLowerCase().includes(query) ||
    group.code.toLowerCase().includes(query)
  );
}

export function ProductGroupsPage() {
  const crud = useMasterCrud<ProductGroup>({
    data: MOCK_PRODUCT_GROUPS,
    matches: matchesQuery,
    getParentId: (group) => group.parentId,
  });

  return (
    <div className="space-y-6">
      <MasterPageHeader
        title="Product Groups"
        description="How products are grouped and nested — e.g. Dates > Ajwa Dates."
        actionLabel="Add Product Group"
        onAction={crud.openCreate}
      />

      <MasterToolbar
        value={crud.query}
        onChange={crud.setQuery}
        placeholder="Search product groups..."
      />

      <MasterTable
        columns={COLUMNS}
        rows={crud.rows}
        getId={(group) => group.id}
        collapsedIds={crud.collapsedIds}
        onToggleExpand={crud.toggleExpand}
        onEdit={crud.openEdit}
        onDelete={crud.requestDelete}
        deleteDisabledReason={(_group, hasChildren) =>
          hasChildren ? "Move or remove its child groups first." : null
        }
        emptyMessage="No product groups match your search."
      />

      <MasterFormSheet
        open={crud.isFormOpen}
        onOpenChange={(open) => {
          if (!open) crud.closeForm();
        }}
        title={crud.editing ? "Edit Product Group" : "Add Product Group"}
        description="Group products into a category tree, e.g. for bundling."
      >
        <ProductGroupForm
          key={crud.editing?.id ?? "new"}
          allGroups={crud.items}
          initialValue={crud.editing}
          onSubmit={crud.submit}
        />
      </MasterFormSheet>

      <DeleteConfirmDialog
        open={crud.deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) crud.cancelDelete();
        }}
        itemLabel={crud.deleteTarget?.name ?? "this product group"}
        onConfirm={crud.confirmDelete}
      />
    </div>
  );
}

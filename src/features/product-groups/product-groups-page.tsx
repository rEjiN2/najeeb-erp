"use client";

import { FolderTree } from "lucide-react";

import { DeleteConfirmDialog } from "@/components/master/delete-confirm-dialog";
import { MasterFormSheet } from "@/components/master/master-form-sheet";
import { MasterPageHeader } from "@/components/master/master-page-header";
import { MasterEmptyState } from "@/components/master/master-states";
import {
  MasterTable,
  type MasterColumn,
} from "@/components/master/master-table";
import { MasterToolbar } from "@/components/master/master-toolbar";
import { useMasterCrud } from "@/hooks/use-master-crud";

import {
  createProductGroup,
  deleteProductGroup,
  updateProductGroup,
} from "./actions";
import { PRODUCT_GROUPS_DESCRIPTION, PRODUCT_GROUPS_TITLE } from "./constants";
import { ProductGroupForm } from "./product-group-form";
import type { ProductGroup, ProductGroupInput } from "./types";

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

export function ProductGroupsPage({
  productGroups,
}: {
  productGroups: ProductGroup[];
}) {
  const crud = useMasterCrud<ProductGroup, ProductGroupInput>({
    data: productGroups,
    onSave: (values, editing) =>
      editing
        ? updateProductGroup(editing.id, values)
        : createProductGroup(values),
    onDelete: (group) => deleteProductGroup(group.id),
    matches: matchesQuery,
    getParentId: (group) => group.parentId,
  });

  const isEmpty = crud.items.length === 0;

  return (
    <div className="space-y-6">
      <MasterPageHeader
        title={PRODUCT_GROUPS_TITLE}
        description={PRODUCT_GROUPS_DESCRIPTION}
        actionLabel={isEmpty ? undefined : "Add Product Group"}
        onAction={crud.openCreate}
      />

      {isEmpty ? (
        <MasterEmptyState
          icon={FolderTree}
          title="No product groups yet"
          description="Create a top-level group like “Dates”, then nest varieties and gift packs under it."
          actionLabel="Add Product Group"
          onAction={crud.openCreate}
        />
      ) : (
        <>
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
        </>
      )}

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
        pending={crud.isDeleting}
        errors={crud.deleteErrors}
      />
    </div>
  );
}

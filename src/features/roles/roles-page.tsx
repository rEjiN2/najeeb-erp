"use client";

import { ShieldCheck } from "lucide-react";

import { DeleteConfirmDialog } from "@/components/master/delete-confirm-dialog";
import { MasterFormSheet } from "@/components/master/master-form-sheet";
import { MasterPageHeader } from "@/components/master/master-page-header";
import { MasterPagination } from "@/components/master/master-pagination";
import { MasterEmptyState } from "@/components/master/master-states";
import {
  MasterTable,
  type MasterColumn,
} from "@/components/master/master-table";
import { MasterToolbar } from "@/components/master/master-toolbar";
import { Badge } from "@/components/ui/badge";
import { useMasterCrud } from "@/hooks/use-master-crud";

import { createRole, deleteRole, updateRole } from "./actions";
import { ROLES_DESCRIPTION, ROLES_TITLE } from "./constants";
import { RoleForm } from "./role-form";
import { DATA_SCOPE_LABELS, type Role, type RoleInput } from "./types";

interface RolesPageProps {
  roles: Role[];
  /** Every permission the backend knows. */
  catalog: string[];
}

export function RolesPage({ roles, catalog }: RolesPageProps) {
  const crud = useMasterCrud<Role, RoleInput>({
    data: roles,
    onSave: (values, editing) =>
      editing ? updateRole(editing.id, values) : createRole(values),
    onDelete: (role) => deleteRole(role.id),
    matches: (role, query) =>
      role.name.toLowerCase().includes(query) ||
      (role.description ?? "").toLowerCase().includes(query),
    pageSize: 20,
  });

  const columns: MasterColumn<Role>[] = [
    {
      key: "name",
      header: "Name",
      render: (role) => (
        <div className="text-sm leading-tight">
          <p className="flex items-center gap-1.5 font-medium">
            {role.name}
            {role.isSystem ? (
              <Badge variant="outline" className="font-normal">
                System
              </Badge>
            ) : null}
          </p>
          {role.description ? (
            <p className="text-muted-foreground">{role.description}</p>
          ) : null}
        </div>
      ),
    },
    {
      key: "scope",
      header: "Data Scope",
      render: (role) => (
        <span className="text-sm">{DATA_SCOPE_LABELS[role.dataScope]}</span>
      ),
    },
    {
      key: "permissions",
      header: "Permissions",
      className: "text-right",
      render: (role) => (
        <span className="text-sm tabular-nums">
          {role.permissions.length} of {catalog.length}
        </span>
      ),
    },
    {
      key: "users",
      header: "Users",
      className: "text-right",
      render: (role) => (
        <span className="text-sm tabular-nums">{role.userCount}</span>
      ),
    },
  ];

  const target = crud.deleteTarget;

  return (
    <div className="space-y-6">
      <MasterPageHeader
        title={ROLES_TITLE}
        description={ROLES_DESCRIPTION}
        actionLabel={roles.length === 0 ? undefined : "Add Role"}
        onAction={crud.openCreate}
      />

      {roles.length === 0 ? (
        <MasterEmptyState
          icon={ShieldCheck}
          title="No roles yet"
          description="Add a role for each kind of user, then give users a role."
          actionLabel="Add Role"
          onAction={crud.openCreate}
        />
      ) : (
        <>
          <MasterToolbar
            value={crud.query}
            onChange={crud.setQuery}
            placeholder="Search roles..."
          />

          <MasterTable
            columns={columns}
            rows={crud.rows}
            getId={(role) => role.id}
            collapsedIds={crud.collapsedIds}
            onToggleExpand={crud.toggleExpand}
            onEdit={crud.openEdit}
            onDelete={crud.requestDelete}
            readOnlyNote={(role) =>
              role.isSystem ? "Managed by the system" : null
            }
            deleteDisabledReason={(role) =>
              role.userCount > 0
                ? `Held by ${role.userCount} user${role.userCount === 1 ? "" : "s"}. Move them to another role first.`
                : null
            }
            emptyMessage="No roles match your search."
          />

          {crud.totalCount > crud.pageSize ? (
            <MasterPagination
              page={crud.page}
              pageCount={crud.pageCount}
              totalItems={crud.totalCount}
              pageSize={crud.pageSize}
              onPageChange={crud.setPage}
            />
          ) : null}
        </>
      )}

      <MasterFormSheet
        open={crud.isFormOpen}
        onOpenChange={(open) => {
          if (!open) crud.closeForm();
        }}
        title={crud.editing ? "Edit Role" : "Add Role"}
        description="Changes apply to its users on their next request."
      >
        <RoleForm
          key={crud.editing?.id ?? "new"}
          initialValue={crud.editing}
          catalog={catalog}
          onSubmit={crud.submit}
        />
      </MasterFormSheet>

      <DeleteConfirmDialog
        open={target !== null}
        onOpenChange={(open) => {
          if (!open) crud.cancelDelete();
        }}
        itemLabel={target ? `the ${target.name} role` : "this role"}
        onConfirm={crud.confirmDelete}
        pending={crud.isDeleting}
        errors={crud.deleteErrors}
      />
    </div>
  );
}

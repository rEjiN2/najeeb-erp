"use client";

import { Loader2, Users } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

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
import type { MutationResult } from "@/lib/mutation";

import {
  createUser,
  deactivateUser,
  deleteUser,
  reactivateUser,
  resetUserPassword,
  updateUser,
} from "./actions";
import { USERS_DESCRIPTION, USERS_TITLE } from "./constants";
import {
  USER_STATUS_LABELS,
  type CashAccountRef,
  type RoleLookupItem,
  type User,
  type UserFilters,
  type UserInput,
  type UserPage,
} from "./types";
import { UserForm } from "./user-form";

const STATUS_FILTER_ITEMS: Record<UserFilters["status"], string> = {
  all: "All statuses",
  active: "Active",
  inactive: "Inactive",
};

const ALL_ROLES = "all";
const SEARCH_DEBOUNCE_MS = 300;
const UNREACHABLE: MutationResult = {
  ok: false,
  messages: ["Couldn't reach the app. Check your connection and try again."],
};

function toSearch(filters: UserFilters): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.status !== "all") params.set("status", filters.status);
  if (filters.roleId) params.set("roleId", filters.roleId);
  if (filters.page > 1) params.set("page", String(filters.page));
  const search = params.toString();
  return search ? `?${search}` : "";
}

/** A Server Action that redirected (to /login) resolves without a value. */
async function settle(
  action: () => Promise<MutationResult>,
): Promise<MutationResult> {
  try {
    return (await action()) ?? { ok: true };
  } catch {
    return UNREACHABLE;
  }
}

interface UsersPageProps {
  page: UserPage;
  filters: UserFilters;
  /** null when they couldn't be loaded: the pickers say why. */
  roles: RoleLookupItem[] | null;
  cashAccounts: CashAccountRef[] | null;
}

export function UsersPage({
  page,
  filters,
  roles,
  cashAccounts,
}: UsersPageProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isNavigating, startNavigation] = useTransition();
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(searchTimer.current), []);

  function navigate(next: Partial<UserFilters>) {
    const url = `${pathname}${toSearch({ ...filters, page: 1, ...next })}`;
    startNavigation(() => router.replace(url, { scroll: false }));
  }

  const crud = useMasterCrud<User, UserInput>({
    data: page.items,
    onSave: (values, editing) =>
      editing ? updateUser(editing, values) : createUser(values),
    onDelete: (user) => deleteUser(user.id),
    server: {
      page: page.page,
      pageSize: page.limit,
      totalCount: page.total,
      onPageChange: (next) => navigate({ page: next }),
      query: filters.q,
      onQueryChange: (q) => {
        clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(
          () => navigate({ q: q.trim() }),
          SEARCH_DEBOUNCE_MS,
        );
      },
    },
  });

  const roleFilterItems: Record<string, string> = {
    [ALL_ROLES]: "All roles",
    ...Object.fromEntries((roles ?? []).map((role) => [role.id, role.name])),
  };

  const columns: MasterColumn<User>[] = [
    {
      key: "name",
      header: "Name",
      render: (user) => (
        <div className="text-sm leading-tight">
          <p className="font-medium">{user.name}</p>
          <p className="text-muted-foreground">{user.email}</p>
        </div>
      ),
    },
    {
      key: "role",
      header: "Role",
      render: (user) =>
        user.role ? (
          <span className="flex items-center gap-1.5 text-sm">
            {user.role.name}
            {user.role.dataScope === "own" ? (
              <Badge variant="outline" className="font-normal">
                Own records
              </Badge>
            ) : null}
          </span>
        ) : (
          <span className="text-muted-foreground text-sm italic">No role</span>
        ),
    },
    {
      key: "accounts",
      header: "Cash Accounts",
      render: (user) =>
        user.role?.dataScope !== "own" ? (
          <span className="text-muted-foreground text-sm">Any</span>
        ) : user.allowedCashAccounts.length > 0 ? (
          <span className="text-sm">
            {user.allowedCashAccounts.map((account) => account.name).join(", ")}
          </span>
        ) : (
          <span className="text-destructive text-sm">None assigned</span>
        ),
    },
    {
      key: "status",
      header: "Status",
      render: (user) => (
        <span className="flex flex-col items-start gap-1">
          <StatusBadge status={USER_STATUS_LABELS[user.status]} />
          {user.mustChangePassword ? (
            <span className="text-muted-foreground text-xs">
              Password change pending
            </span>
          ) : null}
        </span>
      ),
    },
  ];

  /** Saved at once; the panel closes so it never shows a stale status. */
  async function toggleStatus(user: User): Promise<MutationResult> {
    const result = await settle(() =>
      user.status === "active"
        ? deactivateUser(user.id)
        : reactivateUser(user.id),
    );
    if (result.ok) crud.closeForm();
    return result;
  }

  // "Deactivate instead" — offered when the backend refuses a delete because
  // the user has recorded activity (409).
  const [isDeactivating, startDeactivate] = useTransition();
  const [deactivateErrors, setDeactivateErrors] = useState<string[]>([]);
  const target = crud.deleteTarget;
  const canDeactivateInstead =
    crud.deleteErrorStatus === 409 && target?.status === "active";

  function deactivateInstead() {
    if (!target) return;
    startDeactivate(async () => {
      const result = await settle(() => deactivateUser(target.id));
      if (result.ok) {
        setDeactivateErrors([]);
        crud.cancelDelete();
        if (result.message) toast.success(result.message);
      } else {
        setDeactivateErrors(result.messages);
      }
    });
  }

  const isFiltered =
    filters.q !== "" || filters.status !== "all" || filters.roleId !== "";
  const isEmpty = page.total === 0 && !isFiltered;

  return (
    <div className="space-y-6">
      <MasterPageHeader
        title={USERS_TITLE}
        description={USERS_DESCRIPTION}
        actionLabel={isEmpty ? undefined : "Add User"}
        onAction={crud.openCreate}
      />

      {isEmpty ? (
        <MasterEmptyState
          icon={Users}
          title="No users yet"
          description="Add the people who sign in, and give each a role."
          actionLabel="Add User"
          onAction={crud.openCreate}
        />
      ) : (
        <>
          <MasterToolbar
            value={crud.query}
            onChange={crud.setQuery}
            placeholder="Search name or email..."
          >
            {isNavigating ? (
              <Loader2
                className="text-muted-foreground size-4 animate-spin"
                aria-label="Loading"
              />
            ) : null}
            <div className="flex flex-wrap gap-2 sm:ml-auto">
              <Select
                value={filters.roleId || ALL_ROLES}
                onValueChange={(value) =>
                  value &&
                  navigate({ roleId: value === ALL_ROLES ? "" : value })
                }
                items={roleFilterItems}
                disabled={roles === null}
              >
                <SelectTrigger
                  className="w-[160px]"
                  aria-label="Filter by role"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(roleFilterItems).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={filters.status}
                onValueChange={(value) =>
                  value && navigate({ status: value as UserFilters["status"] })
                }
                items={STATUS_FILTER_ITEMS}
              >
                <SelectTrigger
                  className="w-[150px]"
                  aria-label="Filter by status"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_FILTER_ITEMS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </MasterToolbar>

          <MasterTable
            columns={columns}
            rows={crud.rows}
            getId={(user) => user.id}
            collapsedIds={crud.collapsedIds}
            onToggleExpand={crud.toggleExpand}
            onEdit={crud.openEdit}
            onDelete={crud.requestDelete}
            busy={isNavigating}
            emptyMessage="No users match these filters."
          />

          {page.total > 0 ? (
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
        title={crud.editing ? "Edit User" : "Add User"}
        description="Their role decides what they see and can do."
      >
        <UserForm
          key={crud.editing?.id ?? "new"}
          initialValue={crud.editing}
          roles={roles}
          cashAccounts={cashAccounts}
          onSubmit={crud.submit}
          onResetPassword={(password) =>
            crud.editing
              ? settle(() => resetUserPassword(crud.editing!.id, password))
              : Promise.resolve(UNREACHABLE)
          }
          onToggleStatus={() =>
            crud.editing
              ? toggleStatus(crud.editing)
              : Promise.resolve(UNREACHABLE)
          }
        />
      </MasterFormSheet>

      <DeleteConfirmDialog
        open={target !== null}
        onOpenChange={(open) => {
          if (!open && !isDeactivating) {
            setDeactivateErrors([]);
            crud.cancelDelete();
          }
        }}
        itemLabel={target ? `${target.name} (${target.email})` : "this user"}
        onConfirm={crud.confirmDelete}
        pending={crud.isDeleting || isDeactivating}
        errors={[...crud.deleteErrors, ...deactivateErrors]}
        extraAction={
          canDeactivateInstead ? (
            <Button
              variant="outline"
              onClick={deactivateInstead}
              disabled={isDeactivating}
            >
              {isDeactivating ? <Loader2 className="animate-spin" /> : null}
              Deactivate instead
            </Button>
          ) : null
        }
      />
    </div>
  );
}

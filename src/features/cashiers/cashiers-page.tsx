"use client";

import { IdCard, Loader2 } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getLocationPaths } from "@/features/locations/paths";
import type { Location } from "@/features/locations/types";
import { useMasterCrud } from "@/hooks/use-master-crud";

import {
  createCashier,
  deactivateCashier,
  deleteCashier,
  updateCashier,
} from "./actions";
import { CashierForm, type UserOption } from "./cashier-form";
import { CASHIERS_DESCRIPTION, CASHIERS_TITLE } from "./constants";
import { StaffTypeBadge } from "./staff-type-badge";
import {
  CASHIER_STATUS_LABELS,
  STAFF_TYPE_LABELS,
  type Cashier,
  type CashierFilters,
  type CashierInput,
  type CashierPage,
} from "./types";

const STATUS_FILTER_ITEMS: Record<CashierFilters["status"], string> = {
  all: "All statuses",
  active: "Active",
  inactive: "Inactive",
};

const TYPE_FILTER_ITEMS: Record<CashierFilters["staffType"], string> = {
  all: "All types",
  ...STAFF_TYPE_LABELS,
};

const SETTLES_FILTER_ITEMS: Record<CashierFilters["settles"], string> = {
  all: "Any settlement",
  yes: "Settles with office",
  no: "Doesn't settle",
};

const SEARCH_DEBOUNCE_MS = 300;

function toSearch(filters: CashierFilters): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.status !== "all") params.set("status", filters.status);
  if (filters.staffType !== "all") params.set("type", filters.staffType);
  if (filters.settles !== "all") params.set("settles", filters.settles);
  if (filters.page > 1) params.set("page", String(filters.page));
  const search = params.toString();
  return search ? `?${search}` : "";
}

const muted = <span className="text-muted-foreground">—</span>;

interface CashiersPageProps {
  page: CashierPage;
  filters: CashierFilters;
  canManage: boolean;
  /** null when they couldn't be loaded: names show as unknown, pickers say why. */
  users: UserOption[] | null;
  locations: Location[] | null;
}

export function CashiersPage({
  page,
  filters,
  canManage,
  users,
  locations,
}: CashiersPageProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isNavigating, startNavigation] = useTransition();
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(searchTimer.current), []);

  function navigate(next: Partial<CashierFilters>) {
    const url = `${pathname}${toSearch({ ...filters, page: 1, ...next })}`;
    startNavigation(() => router.replace(url, { scroll: false }));
  }

  const crud = useMasterCrud<Cashier, CashierInput>({
    data: page.items,
    onSave: (values, editing) =>
      editing ? updateCashier(editing.id, values) : createCashier(values),
    onDelete: (cashier) => deleteCashier(cashier.id),
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

  const userNames = new Map((users ?? []).map((user) => [user.id, user.name]));
  const locationPaths = getLocationPaths(locations ?? []);

  const columns: MasterColumn<Cashier>[] = [
    {
      key: "code",
      header: "Code",
      render: (cashier) => (
        <span className="text-muted-foreground font-mono text-sm">
          {cashier.code}
        </span>
      ),
    },
    {
      key: "name",
      header: "Name",
      render: (cashier) => <span className="font-medium">{cashier.name}</span>,
    },
    {
      key: "type",
      header: "Type",
      render: (cashier) => <StaffTypeBadge type={cashier.staffType} />,
    },
    {
      key: "settles",
      header: "Settles With Office",
      render: (cashier) =>
        cashier.settlesWithOffice ? (
          <span className="text-sm">Yes</span>
        ) : (
          muted
        ),
    },
    {
      key: "contact",
      header: "Contact",
      render: (cashier) =>
        cashier.mobile || cashier.email ? (
          <div className="text-sm leading-tight">
            {cashier.mobile ? <p>{cashier.mobile}</p> : null}
            {cashier.email ? (
              <p className="text-muted-foreground">{cashier.email}</p>
            ) : null}
          </div>
        ) : (
          muted
        ),
    },
    {
      key: "user",
      header: "Login User",
      render: (cashier) =>
        cashier.linkedUserId ? (
          <span className="text-sm">
            {userNames.get(cashier.linkedUserId) ?? (
              <span className="text-muted-foreground italic">
                {users === null ? "Users unavailable" : "Unknown user"}
              </span>
            )}
          </span>
        ) : (
          muted
        ),
    },
    {
      key: "location",
      header: "Home Location",
      render: (cashier) =>
        cashier.locationId ? (
          <span className="text-sm">
            {locationPaths.get(cashier.locationId) ?? (
              <span className="text-muted-foreground italic">
                {locations === null
                  ? "Locations unavailable"
                  : "Unknown location"}
              </span>
            )}
          </span>
        ) : (
          muted
        ),
    },
    {
      key: "status",
      header: "Status",
      render: (cashier) => (
        <StatusBadge status={CASHIER_STATUS_LABELS[cashier.status]} />
      ),
    },
  ];

  // "Deactivate instead" — offered when the backend refuses a delete because
  // receipts were posted against the cashier (409).
  const [isDeactivating, startDeactivate] = useTransition();
  const [deactivateErrors, setDeactivateErrors] = useState<string[]>([]);
  const target = crud.deleteTarget;
  const canDeactivateInstead =
    crud.deleteErrorStatus === 409 && target?.status === "active";

  function deactivateInstead() {
    if (!target) return;
    startDeactivate(async () => {
      try {
        const result = await deactivateCashier(target.id);
        if (!result) return; // redirected to /login
        if (result.ok) {
          setDeactivateErrors([]);
          crud.cancelDelete();
          if (result.message) toast.success(result.message);
        } else {
          setDeactivateErrors(result.messages);
        }
      } catch {
        setDeactivateErrors([
          "Couldn't reach the app. Check your connection and try again.",
        ]);
      }
    });
  }

  const isFiltered =
    filters.q !== "" ||
    filters.status !== "all" ||
    filters.staffType !== "all" ||
    filters.settles !== "all";
  const isEmpty = page.total === 0 && !isFiltered;

  return (
    <div className="space-y-6">
      <MasterPageHeader
        title={CASHIERS_TITLE}
        description={CASHIERS_DESCRIPTION}
        actionLabel={isEmpty || !canManage ? undefined : "Add Staff"}
        onAction={crud.openCreate}
      />

      {isEmpty ? (
        canManage ? (
          <MasterEmptyState
            icon={IdCard}
            title="No staff yet"
            description="Add the people who collect or pay out money. Link one to a login so their receipts pick them automatically."
            actionLabel="Add Staff"
            onAction={crud.openCreate}
          />
        ) : (
          <div className="text-muted-foreground flex min-h-40 items-center justify-center rounded-lg border border-dashed text-sm">
            No staff have been set up yet.
          </div>
        )
      ) : (
        <>
          <MasterToolbar
            value={crud.query}
            onChange={crud.setQuery}
            placeholder="Search code, name, mobile or email..."
          >
            {isNavigating ? (
              <Loader2
                className="text-muted-foreground size-4 animate-spin"
                aria-label="Loading"
              />
            ) : null}
            <div className="flex flex-wrap gap-2 sm:ml-auto">
              <Select
                value={filters.staffType}
                onValueChange={(value) =>
                  value &&
                  navigate({ staffType: value as CashierFilters["staffType"] })
                }
                items={TYPE_FILTER_ITEMS}
              >
                <SelectTrigger className="w-[150px]" aria-label="Filter by type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPE_FILTER_ITEMS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={filters.settles}
                onValueChange={(value) =>
                  value &&
                  navigate({ settles: value as CashierFilters["settles"] })
                }
                items={SETTLES_FILTER_ITEMS}
              >
                <SelectTrigger
                  className="w-[180px]"
                  aria-label="Filter by cash settlement"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SETTLES_FILTER_ITEMS).map(
                    ([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
              <Select
                value={filters.status}
                onValueChange={(value) =>
                  value &&
                  navigate({ status: value as CashierFilters["status"] })
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
            getId={(cashier) => cashier.id}
            collapsedIds={crud.collapsedIds}
            onToggleExpand={crud.toggleExpand}
            onEdit={crud.openEdit}
            onDelete={crud.requestDelete}
            readOnlyNote={canManage ? undefined : () => "View only"}
            busy={isNavigating}
            emptyMessage="No staff match these filters."
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
        title={crud.editing ? "Edit Staff" : "Add Staff"}
        description="Receipts and payments name a staff member."
      >
        <CashierForm
          key={crud.editing?.id ?? "new"}
          initialValue={crud.editing}
          users={users}
          locations={locations}
          onSubmit={crud.submit}
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
        itemLabel={target ? `${target.code} ${target.name}` : "this staff member"}
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

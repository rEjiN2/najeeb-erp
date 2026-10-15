"use client";

import { Loader2, Wallet } from "lucide-react";
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
import { getLocationPaths } from "@/features/locations/paths";
import type { Location } from "@/features/locations/types";
import { useMasterCrud } from "@/hooks/use-master-crud";
import { formatAmount } from "@/lib/format";
import { cn } from "@/lib/utils";

import { AccountForm } from "./account-form";
import {
  createAccount,
  deactivateAccount,
  deleteAccount,
  updateAccount,
} from "./actions";
import { ACCOUNTS_DESCRIPTION, ACCOUNTS_TITLE } from "./constants";
import {
  ACCOUNT_STATUS_LABELS,
  ACCOUNT_TYPE_LABELS,
  MANAGEABLE_ACCOUNT_TYPES,
  type Account,
  type AccountFilters,
  type AccountInput,
  type AccountLookupItem,
  type AccountPage,
} from "./types";

const TYPE_FILTER_ITEMS: Record<AccountFilters["type"], string> = {
  all: "All types",
  cash: "Cash",
  bank: "Bank",
  wallet: "Wallet",
  income: "Income",
  expense: "Expense",
  other: "Other",
};

const STATUS_FILTER_ITEMS: Record<AccountFilters["status"], string> = {
  all: "All statuses",
  active: "Active",
  inactive: "Inactive",
};

const SEARCH_DEBOUNCE_MS = 300;

/** Filters → query string, leaving defaults out so URLs stay short. */
function toSearch(filters: AccountFilters): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.type !== "all") params.set("type", filters.type);
  if (filters.status !== "all") params.set("status", filters.status);
  if (filters.page > 1) params.set("page", String(filters.page));
  const search = params.toString();
  return search ? `?${search}` : "";
}

interface AccountsPageProps {
  page: AccountPage;
  filters: AccountFilters;
  locations: Location[];
  expenseAccounts: AccountLookupItem[] | null;
}

export function AccountsPage({
  page,
  filters,
  locations,
  expenseAccounts,
}: AccountsPageProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isNavigating, startNavigation] = useTransition();
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(searchTimer.current), []);

  // Filters live in the URL: the server component re-fetches the page for
  // them, and a filtered view can be shared or reloaded.
  function navigate(next: Partial<AccountFilters>) {
    const url = `${pathname}${toSearch({ ...filters, page: 1, ...next })}`;
    startNavigation(() => router.replace(url, { scroll: false }));
  }

  const crud = useMasterCrud<Account, AccountInput>({
    data: page.items,
    onSave: (values, editing) =>
      editing ? updateAccount(editing.id, values) : createAccount(values),
    onDelete: (account) => deleteAccount(account.id),
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

  const locationPaths = getLocationPaths(locations);

  const columns: MasterColumn<Account>[] = [
    {
      key: "code",
      header: "Code",
      render: (account) => (
        <span className="text-muted-foreground font-mono text-sm">
          {account.code}
        </span>
      ),
    },
    {
      key: "name",
      header: "Name",
      render: (account) => <span className="font-medium">{account.name}</span>,
    },
    {
      key: "type",
      header: "Type",
      render: (account) => (
        <Badge variant="secondary">{ACCOUNT_TYPE_LABELS[account.type]}</Badge>
      ),
    },
    {
      key: "location",
      header: "Linked Location",
      render: (account) =>
        account.locationId ? (
          <span className="text-sm">
            {locationPaths.get(account.locationId) ?? (
              <span className="text-muted-foreground">Unknown location</span>
            )}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "status",
      header: "Status",
      render: (account) => (
        <StatusBadge status={ACCOUNT_STATUS_LABELS[account.status]} />
      ),
    },
    {
      key: "balance",
      header: "Balance",
      className: "text-right",
      render: (account) => (
        <span
          className={cn(
            "font-mono text-sm tabular-nums",
            account.balance < 0 && "text-destructive",
          )}
        >
          {formatAmount(account.balance)}
        </span>
      ),
    },
  ];

  // "Deactivate instead" — offered when the backend refuses a delete (409:
  // non-zero balance, or the account is in use).
  const [isDeactivating, startDeactivate] = useTransition();
  const [deactivateErrors, setDeactivateErrors] = useState<string[]>([]);
  const target = crud.deleteTarget;
  const canDeactivateInstead =
    crud.deleteErrorStatus === 409 && target?.status === "active";

  function deactivateInstead() {
    if (!target) return;
    startDeactivate(async () => {
      try {
        const result = await deactivateAccount(target.id);
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
    filters.q !== "" || filters.type !== "all" || filters.status !== "all";
  const isEmpty = page.total === 0 && !isFiltered;

  return (
    <div className="space-y-6">
      <MasterPageHeader
        title={ACCOUNTS_TITLE}
        description={ACCOUNTS_DESCRIPTION}
        actionLabel={isEmpty ? undefined : "Add Account"}
        onAction={crud.openCreate}
      />

      {isEmpty ? (
        <MasterEmptyState
          icon={Wallet}
          title="No accounts yet"
          description="Add your cash counters, bank accounts and wallets, plus the income and expense heads you post to."
          actionLabel="Add Account"
          onAction={crud.openCreate}
        />
      ) : (
        <>
          <MasterToolbar
            value={crud.query}
            onChange={crud.setQuery}
            placeholder="Search code or name..."
          >
            {isNavigating ? (
              <Loader2
                className="text-muted-foreground size-4 animate-spin"
                aria-label="Loading"
              />
            ) : null}
            <div className="flex gap-2 sm:ml-auto">
              <Select
                value={filters.type}
                onValueChange={(value) =>
                  value && navigate({ type: value as AccountFilters["type"] })
                }
                items={TYPE_FILTER_ITEMS}
              >
                <SelectTrigger
                  className="w-[150px]"
                  aria-label="Filter by type"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {MANAGEABLE_ACCOUNT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {ACCOUNT_TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={filters.status}
                onValueChange={(value) =>
                  value &&
                  navigate({ status: value as AccountFilters["status"] })
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
            getId={(account) => account.id}
            collapsedIds={crud.collapsedIds}
            onToggleExpand={crud.toggleExpand}
            onEdit={crud.openEdit}
            onDelete={crud.requestDelete}
            readOnlyNote={(account) =>
              account.isSystemManaged ? "Managed in Customers/Suppliers" : null
            }
            busy={isNavigating}
            emptyMessage="No accounts match these filters."
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
        title={crud.editing ? "Edit Account" : "Add Account"}
        description="Balances move only through posted vouchers."
      >
        <AccountForm
          key={crud.editing?.id ?? "new"}
          initialValue={crud.editing}
          locations={locations}
          expenseAccounts={expenseAccounts}
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
        itemLabel={target ? `${target.code} ${target.name}` : "this account"}
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

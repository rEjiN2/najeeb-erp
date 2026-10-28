"use client";

import {
  Building2,
  History,
  Loader2,
  PowerOff,
  RotateCcw,
  Truck,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { ActivitySheet } from "@/components/activity/activity-sheet";
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
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/features/auth/auth-context";
import { PERMISSIONS } from "@/features/auth/permissions";
import { ACCOUNTING_REPORTS } from "@/features/reports/accounting/constants";
import { useMasterCrud } from "@/hooks/use-master-crud";
import { formatAmount } from "@/lib/format";
import type { MutationResult } from "@/lib/mutation";
import { cn } from "@/lib/utils";

import {
  createParty,
  deleteParty,
  setPartyStatus,
  updateParty,
} from "./actions";
import { PARTY_ENTITY_TYPE, type PartyKindConfig } from "./constants";
import { PartyForm } from "./party-form";
import {
  PARTY_STATUS_LABELS,
  type PartyFilters,
  type PartyInput,
  type PartyPage,
  type PartyRow,
} from "./types";

const STATUS_FILTER_ITEMS: Record<PartyFilters["status"], string> = {
  all: "All statuses",
  active: "Active",
  inactive: "Inactive",
};

const SEARCH_DEBOUNCE_MS = 300;

function toSearch(filters: PartyFilters): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.status !== "all") params.set("status", filters.status);
  if (filters.page > 1) params.set("page", String(filters.page));
  const search = params.toString();
  return search ? `?${search}` : "";
}

/** A 15-digit TRN, grouped in threes for reading: "100 123 456 789 003". */
function formatTrn(trn: string): string {
  return trn.replace(/(\d{3})(?=\d)/g, "$1 ");
}

const muted = <span className="text-muted-foreground">—</span>;

interface PartiesPageProps {
  config: PartyKindConfig;
  page: PartyPage;
  filters: PartyFilters;
  canManage: boolean;
}

/** Customers and Suppliers — one screen, configured by `config.kind`. */
export function PartiesPage({
  config,
  page,
  filters,
  canManage,
}: PartiesPageProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isNavigating, startNavigation] = useTransition();
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(searchTimer.current), []);
  const [activityTarget, setActivityTarget] = useState<{
    entityId: string;
    title: string;
  } | null>(null);
  const [statusPending, startStatusChange] = useTransition();

  function navigate(next: Partial<PartyFilters>) {
    const url = `${pathname}${toSearch({ ...filters, page: 1, ...next })}`;
    startNavigation(() => router.replace(url, { scroll: false }));
  }

  const crud = useMasterCrud<PartyRow, PartyInput>({
    data: page.items,
    onSave: (values, editing) =>
      (editing
        ? updateParty(config.kind, editing.id, values)
        : createParty(config.kind, values)) as Promise<MutationResult>,
    onDelete: (party) => deleteParty(config.kind, party.id),
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

  function changeStatus(party: PartyRow, status: PartyRow["status"]) {
    startStatusChange(async () => {
      try {
        const result = await setPartyStatus(config.kind, party.id, status);
        if (!result) return; // redirected to /login
        if (result.ok) {
          if (result.message) toast.success(result.message);
        } else {
          toast.error(`Couldn't update ${party.code}`, {
            description: result.messages.join(" "),
          });
        }
      } catch {
        toast.error(
          "Couldn't reach the app. Check your connection and try again.",
        );
      }
    });
  }

  const { session } = useAuth();
  const canViewLedger =
    session?.user.permissions.includes(PERMISSIONS.REPORTS_ACCOUNTING) ?? false;

  const columns: MasterColumn<PartyRow>[] = [
    {
      key: "code",
      header: "Code",
      render: (party) => (
        <span className="text-muted-foreground font-mono text-sm">
          {party.code}
        </span>
      ),
    },
    {
      key: "name",
      header: "Name",
      render: (party) => (
        <div className="min-w-0 leading-tight">
          {canViewLedger ? (
            <Link
              href={`${ACCOUNTING_REPORTS.ledger.path}?account=${party.ledgerAccountId}`}
              className="font-medium hover:underline"
              title="Open statement"
            >
              {party.name}
            </Link>
          ) : (
            <p className="font-medium">{party.name}</p>
          )}
          {party.contactPerson ? (
            <p className="text-muted-foreground text-xs">
              {party.contactPerson}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      key: "mobile",
      header: "Mobile",
      render: (party) =>
        party.mobile || party.telephone ? (
          <span className="text-sm">{party.mobile ?? party.telephone}</span>
        ) : (
          muted
        ),
    },
    {
      key: "vat",
      header: "VAT number",
      render: (party) =>
        party.vatNumber ? (
          <span className="font-mono text-sm">
            {formatTrn(party.vatNumber)}
          </span>
        ) : (
          muted
        ),
    },
    {
      key: "status",
      header: "Status",
      render: (party) => (
        <StatusBadge status={PARTY_STATUS_LABELS[party.status]} />
      ),
    },
    {
      key: "balance",
      header: "Balance",
      className: "text-right",
      render: (party) =>
        party.balance === null ? (
          <span
            className="text-muted-foreground text-xs italic"
            title="The ledger account couldn't be read"
          >
            Unavailable
          </span>
        ) : (
          <span
            className={cn(
              "font-mono text-sm tabular-nums",
              party.balance < 0 && "text-destructive",
            )}
          >
            {formatAmount(party.balance)}
          </span>
        ),
    },
  ];

  // "Deactivate instead" — offered when the backend refuses a delete (409:
  // non-zero balance, or the ledger account has postings).
  const [isDeactivating, startDeactivate] = useTransition();
  const [deactivateErrors, setDeactivateErrors] = useState<string[]>([]);
  const target = crud.deleteTarget;
  const canDeactivateInstead =
    crud.deleteErrorStatus === 409 && target?.status === "active";

  function deactivateInstead() {
    if (!target) return;
    startDeactivate(async () => {
      try {
        const result = await setPartyStatus(config.kind, target.id, "inactive");
        if (!result) return;
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

  const isFiltered = filters.q !== "" || filters.status !== "all";
  const isEmpty = page.total === 0 && !isFiltered;
  const Icon = config.kind === "customer" ? Building2 : Truck;
  const openActivity = (party: PartyRow) =>
    setActivityTarget({
      entityId: party.id,
      title: `Activity · ${party.code} ${party.name}`,
    });

  return (
    <div className="space-y-6">
      <MasterPageHeader
        title={config.title}
        description={config.description}
        actionLabel={isEmpty || !canManage ? undefined : `Add ${config.Noun}`}
        onAction={crud.openCreate}
      />

      {isEmpty ? (
        canManage ? (
          <MasterEmptyState
            icon={Icon}
            title={`No ${config.noun}s yet`}
            description={config.emptyDescription}
            actionLabel={`Add ${config.Noun}`}
            onAction={crud.openCreate}
          />
        ) : (
          <div className="text-muted-foreground flex min-h-40 items-center justify-center rounded-lg border border-dashed text-sm">
            No {config.noun}s have been added yet.
          </div>
        )
      ) : (
        <>
          <MasterToolbar
            value={crud.query}
            onChange={crud.setQuery}
            placeholder="Search name, code or phone..."
          >
            {isNavigating || statusPending ? (
              <Loader2
                className="text-muted-foreground size-4 animate-spin"
                aria-label="Loading"
              />
            ) : null}
            <div className="flex gap-2 sm:ml-auto">
              <Select
                value={filters.status}
                onValueChange={(value) =>
                  value && navigate({ status: value as PartyFilters["status"] })
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
            getId={(party) => party.id}
            collapsedIds={crud.collapsedIds}
            onToggleExpand={crud.toggleExpand}
            onEdit={crud.openEdit}
            onDelete={crud.requestDelete}
            extraActions={(party) => (
              <>
                <DropdownMenuItem onClick={() => openActivity(party)}>
                  <History /> Activity &amp; Comments
                </DropdownMenuItem>
                {!canManage ? null : party.status === "active" ? (
                  <DropdownMenuItem
                    onClick={() => changeStatus(party, "inactive")}
                    disabled={statusPending}
                  >
                    <PowerOff /> Deactivate
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    onClick={() => changeStatus(party, "active")}
                    disabled={statusPending}
                  >
                    <RotateCcw /> Reactivate
                  </DropdownMenuItem>
                )}
              </>
            )}
            canModify={canManage}
            busy={isNavigating}
            emptyMessage={`No ${config.noun}s match these filters.`}
          />

          {!canManage && page.items.length > 0 ? (
            <p className="text-muted-foreground text-xs">
              You can view {config.noun}s. Changing them needs the &ldquo;Manage
              parties&rdquo; permission.
            </p>
          ) : null}

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
        title={
          crud.editing
            ? `Edit ${config.Noun} ${crud.editing.code}`
            : `Add ${config.Noun}`
        }
        description="A ledger account with the same code and name is kept in step."
      >
        <PartyForm
          key={crud.editing?.id ?? "new"}
          config={config}
          initialValue={crud.editing}
          canManage={canManage}
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
        itemLabel={
          target ? `${target.code} ${target.name}` : `this ${config.noun}`
        }
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

      <ActivitySheet
        target={activityTarget}
        onClose={() => setActivityTarget(null)}
        entityType={PARTY_ENTITY_TYPE}
        subjectLabel={config.noun}
      />
    </div>
  );
}

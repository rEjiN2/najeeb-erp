"use client";

import { History, Loader2, Package, PowerOff, RotateCcw } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
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
import { SearchableSelect } from "@/components/shared/searchable-select";
import { Button } from "@/components/ui/button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { groupPathOptions } from "@/features/product-groups/group-options";
import type { ProductGroup } from "@/features/product-groups/types";
import type { Unit } from "@/features/units/types";
import { useMasterCrud } from "@/hooks/use-master-crud";
import { formatAmount } from "@/lib/format";

import {
  createProduct,
  deleteProduct,
  setProductStatus,
  updateProduct,
} from "./actions";
import {
  PRODUCT_ENTITY_TYPE,
  PRODUCTS_DESCRIPTION,
  PRODUCTS_TITLE,
} from "./constants";
import { ProductForm } from "./product-form";
import {
  PRODUCT_STATUS_LABELS,
  PRODUCT_TYPE_LABELS,
  type Product,
  type ProductFilters,
  type ProductInput,
} from "./types";

const SEARCH_DEBOUNCE_MS = 300;

const TYPE_FILTER_ITEMS: Record<ProductFilters["type"], string> = {
  all: "All types",
  ...PRODUCT_TYPE_LABELS,
};

const STATUS_FILTER_ITEMS: Record<ProductFilters["status"], string> = {
  all: "All statuses",
  ...PRODUCT_STATUS_LABELS,
};

function toSearch(filters: ProductFilters): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.groupId) params.set("group", filters.groupId);
  if (filters.type !== "all") params.set("type", filters.type);
  if (filters.status !== "all") params.set("status", filters.status);
  if (filters.page > 1) params.set("page", String(filters.page));
  const search = params.toString();
  return search ? `?${search}` : "";
}

const money = (value: number | undefined) => (
  <span className="font-mono text-sm tabular-nums">
    {formatAmount(value ?? 0)}
  </span>
);

interface ProductsPageProps {
  page: { items: Product[]; total: number; page: number; limit: number };
  filters: ProductFilters;
  groups: ProductGroup[];
  units: Unit[];
  canManage: boolean;
  /** products:view-cost: the Purchase Price column and field. */
  canViewCost: boolean;
  /** bundles:manage: the recipe of a bundle product. */
  canManageRecipe: boolean;
}

export function ProductsPage({
  page,
  filters,
  groups,
  units,
  canManage,
  canViewCost,
  canManageRecipe,
}: ProductsPageProps) {
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
  const groupOptions = useMemo(() => groupPathOptions(groups), [groups]);

  function navigate(next: Partial<ProductFilters>) {
    const url = `${pathname}${toSearch({ ...filters, page: 1, ...next })}`;
    startNavigation(() => router.replace(url, { scroll: false }));
  }

  const crud = useMasterCrud<Product, ProductInput>({
    data: page.items,
    onSave: (values, editing) =>
      editing ? updateProduct(editing.id, values) : createProduct(values),
    onDelete: (product) => deleteProduct(product.id),
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

  function changeStatus(product: Product, status: Product["status"]) {
    startStatusChange(async () => {
      try {
        const result = await setProductStatus(product.id, status);
        if (!result) return; // redirected to /login
        if (result.ok) {
          if (result.message) toast.success(result.message);
        } else {
          toast.error(`Couldn't update ${product.code}`, {
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

  const columns: MasterColumn<Product>[] = [
    {
      key: "code",
      header: "Code",
      render: (product) => (
        <span className="text-muted-foreground font-mono text-sm">
          {product.code}
        </span>
      ),
    },
    {
      key: "name",
      header: "Name",
      render: (product) => (
        <div className="min-w-0 leading-tight">
          <p className="font-medium">{product.name}</p>
          {product.barcode ? (
            <p className="text-muted-foreground font-mono text-xs">
              {product.barcode}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      key: "group",
      header: "Group",
      render: (product) => (
        <span className="text-sm">{product.productGroup?.name ?? "—"}</span>
      ),
    },
    {
      key: "unit",
      header: "Unit",
      render: (product) => (
        <span className="font-mono text-sm">{product.unit?.symbol ?? "—"}</span>
      ),
    },
    {
      key: "salePrice",
      header: "Sale Price",
      className: "text-right",
      render: (product) => money(product.salePrice),
    },
    ...(canViewCost
      ? [
          {
            key: "purchasePrice",
            header: "Purchase Price",
            className: "text-right",
            render: (product: Product) => money(product.purchasePrice),
          },
        ]
      : []),
    {
      key: "status",
      header: "Status",
      render: (product) => (
        <StatusBadge status={PRODUCT_STATUS_LABELS[product.status]} />
      ),
    },
  ];

  // "Deactivate instead" when the backend refuses a delete (409: in use).
  const [isDeactivating, startDeactivate] = useTransition();
  const [deactivateErrors, setDeactivateErrors] = useState<string[]>([]);
  const target = crud.deleteTarget;
  const canDeactivateInstead =
    crud.deleteErrorStatus === 409 && target?.status === "active";

  function deactivateInstead() {
    if (!target) return;
    startDeactivate(async () => {
      try {
        const result = await setProductStatus(target.id, "inactive");
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

  const isFiltered =
    filters.q !== "" ||
    filters.groupId !== "" ||
    filters.type !== "all" ||
    filters.status !== "all";
  const isEmpty = page.total === 0 && !isFiltered;

  return (
    <div className="space-y-6">
      <MasterPageHeader
        title={PRODUCTS_TITLE}
        description={PRODUCTS_DESCRIPTION}
        actionLabel={isEmpty || !canManage ? undefined : "Add Product"}
        onAction={crud.openCreate}
      />

      {isEmpty ? (
        canManage ? (
          <MasterEmptyState
            icon={Package}
            title="No products yet"
            description="Add products like “Ajwa 1KG” under a group, with a unit, prices and VAT."
            actionLabel="Add Product"
            onAction={crud.openCreate}
          />
        ) : (
          <div className="text-muted-foreground flex min-h-40 items-center justify-center rounded-lg border border-dashed text-sm">
            No products have been added yet.
          </div>
        )
      ) : (
        <>
          <MasterToolbar
            value={crud.query}
            onChange={crud.setQuery}
            placeholder="Search name, code or barcode..."
          >
            {isNavigating || statusPending ? (
              <Loader2
                className="text-muted-foreground size-4 animate-spin"
                aria-label="Loading"
              />
            ) : null}
            <div className="flex flex-col gap-2 sm:ml-auto sm:flex-row">
              <div className="sm:w-64" title="Includes every group under it">
                <SearchableSelect
                  value={filters.groupId || null}
                  onChange={(value) => navigate({ groupId: value ?? "" })}
                  options={groupOptions}
                  placeholder="All groups"
                  emptyText="No matching groups"
                  clearLabel="All groups"
                />
              </div>
              <Select
                value={filters.type}
                onValueChange={(value) =>
                  value && navigate({ type: value as ProductFilters["type"] })
                }
                items={TYPE_FILTER_ITEMS}
              >
                <SelectTrigger className="sm:w-44" aria-label="Filter by type">
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
                value={filters.status}
                onValueChange={(value) =>
                  value &&
                  navigate({ status: value as ProductFilters["status"] })
                }
                items={STATUS_FILTER_ITEMS}
              >
                <SelectTrigger
                  className="sm:w-36"
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
            getId={(product) => product.id}
            collapsedIds={crud.collapsedIds}
            onToggleExpand={crud.toggleExpand}
            onEdit={crud.openEdit}
            onDelete={crud.requestDelete}
            extraActions={(product) => (
              <>
                <DropdownMenuItem
                  onClick={() =>
                    setActivityTarget({
                      entityId: product.id,
                      title: `Activity · ${product.code} ${product.name}`,
                    })
                  }
                >
                  <History /> Activity &amp; Comments
                </DropdownMenuItem>
                {!canManage ? null : product.status === "active" ? (
                  <DropdownMenuItem
                    onClick={() => changeStatus(product, "inactive")}
                    disabled={statusPending}
                  >
                    <PowerOff /> Deactivate
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    onClick={() => changeStatus(product, "active")}
                    disabled={statusPending}
                  >
                    <RotateCcw /> Reactivate
                  </DropdownMenuItem>
                )}
              </>
            )}
            canModify={canManage}
            busy={isNavigating}
            emptyMessage="No products match these filters."
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
        title={
          crud.editing ? `Edit Product ${crud.editing.code}` : "Add Product"
        }
        description="The code is generated when you save."
      >
        <ProductForm
          key={crud.editing?.id ?? "new"}
          initialValue={crud.editing}
          groups={groups}
          units={units}
          canViewCost={canViewCost}
          canManageRecipe={canManageRecipe}
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
        itemLabel={target ? `${target.code} ${target.name}` : "this product"}
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
        entityType={PRODUCT_ENTITY_TYPE}
        subjectLabel="product"
      />
    </div>
  );
}

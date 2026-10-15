"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";

import type { MutationResult } from "@/lib/mutation";
import { flattenTree, getAncestorIds, type FlattenedNode } from "@/lib/tree";

/**
 * `V` is what the form submits — by default every field but `id`, narrower
 * when the backend owns some fields (e.g. generated codes).
 */
/**
 * Server-paginated list: the backend has already searched, filtered and
 * paged `data`, so the hook shows it as-is and reports these numbers. The
 * caller owns where page/search live (typically the URL).
 */
export interface ServerPaging {
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  /** Search text the list was fetched with — seeds the search box. */
  query: string;
  /** Called on every keystroke; debounce on the caller's side. */
  onQueryChange: (query: string) => void;
}

interface UseMasterCrudOptions<T extends { id: string }, V = Omit<T, "id">> {
  /**
   * Current records, straight from the server. The hook never copies or
   * mutates them — after a successful save/delete the Server Action refreshes
   * the route and fresh `data` flows back in.
   */
  data: T[];
  /** Persist a create (`editing` null) or an edit. */
  onSave: (values: V, editing: T | null) => Promise<MutationResult>;
  onDelete: (item: T) => Promise<MutationResult>;
  /** Does `item` match the (already-lowercased, trimmed) search query?
   * Unused with `server` paging. */
  matches?: (item: T, query: string) => boolean;
  /**
   * A hard filter (a Type dropdown, a Status toggle, ...) — unlike the
   * search box, this always applies, query or not. Composes with search
   * using AND. Recompute this on every render (e.g. from a `useCallback`
   * closing over filter state); identity changes are what tell the hook
   * to recompute.
   */
  filter?: (item: T) => boolean;
  /**
   * Presence of this accessor switches the hook into hierarchy mode: rows
   * come from `flattenTree` instead of a paginated flat list. Search and
   * the hard filter both auto-include ancestors of any surviving item, so
   * a match's path up the tree stays visible.
   */
  getParentId?: (item: T) => string | null;
  pageSize?: number;
  /** Switches to server pagination (flat lists only); see ServerPaging. */
  server?: ServerPaging;
}

export interface MasterCrud<T extends { id: string }, V = Omit<T, "id">> {
  items: T[];
  query: string;
  setQuery: (value: string) => void;
  isHierarchical: boolean;
  rows: FlattenedNode<T>[];
  collapsedIds: ReadonlySet<string>;
  toggleExpand: (id: string) => void;
  expandAll: () => void;
  /** Collapses every node that has children, leaving only top-level rows. */
  collapseAll: () => void;
  page: number;
  pageCount: number;
  totalCount: number;
  pageSize: number;
  setPage: (page: number) => void;
  isFormOpen: boolean;
  editing: T | null;
  openCreate: () => void;
  openEdit: (item: T) => void;
  closeForm: () => void;
  /** Resolves with the backend's verdict; the form stays open on failure. */
  submit: (values: V) => Promise<MutationResult>;
  deleteTarget: T | null;
  isDeleting: boolean;
  /** Backend messages from the last failed delete, shown in the dialog. */
  deleteErrors: string[];
  /** HTTP status of the last failed delete, if the backend answered. */
  deleteErrorStatus: number | undefined;
  requestDelete: (item: T) => void;
  cancelDelete: () => void;
  confirmDelete: () => Promise<void>;
  hasChildren: (id: string) => boolean;
}

const UNREACHABLE: MutationResult = {
  ok: false,
  messages: ["Couldn't reach the app. Check your connection and try again."],
};

/**
 * Server Actions throw only when the request itself fails; one that ends in
 * redirect() (e.g. to /login) resolves without a value while the router
 * navigates — treat that as done so nothing flashes an error on the way out.
 */
async function settle(
  action: () => Promise<MutationResult>,
): Promise<MutationResult> {
  try {
    return (await action()) ?? { ok: true };
  } catch {
    return UNREACHABLE;
  }
}

/**
 * Generic CRUD + list state for a Master screen: search + an optional hard
 * filter, pagination (flat masters) or tree flatten/expand (hierarchical
 * masters), add/edit sheet state, and delete-confirm state. Persistence
 * is the caller's (`onSave` / `onDelete`); the hook only tracks UI state.
 */
export function useMasterCrud<T extends { id: string }, V = Omit<T, "id">>({
  data: items,
  onSave,
  onDelete,
  matches,
  filter,
  getParentId,
  pageSize: clientPageSize = 8,
  server,
}: UseMasterCrudOptions<T, V>): MasterCrud<T, V> {
  const [query, setQueryState] = useState(server?.query ?? "");
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<T | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteErrors, setDeleteErrors] = useState<string[]>([]);
  const [deleteErrorStatus, setDeleteErrorStatus] = useState<number>();

  const isHierarchical = Boolean(getParentId);
  const normalizedQuery = query.trim().toLowerCase();
  const hasActiveQuery = normalizedQuery.length > 0;
  const hasActiveFilter = Boolean(filter);

  const isIncluded = useMemo(() => {
    return (item: T) =>
      (!hasActiveQuery || !matches || matches(item, normalizedQuery)) &&
      (!filter || filter(item));
  }, [hasActiveQuery, normalizedQuery, matches, filter]);

  const childCounts = useMemo(() => {
    const counts = new Map<string, number>();
    if (!getParentId) return counts;
    for (const item of items) {
      const parentId = getParentId(item);
      if (parentId) counts.set(parentId, (counts.get(parentId) ?? 0) + 1);
    }
    return counts;
  }, [items, getParentId]);

  const treeRows = useMemo<FlattenedNode<T>[]>(() => {
    if (!getParentId) return [];

    if (!hasActiveQuery && !hasActiveFilter) {
      return flattenTree(items, getParentId, collapsedIds);
    }

    const matchedIds = items.filter(isIncluded).map((item) => item.id);
    if (matchedIds.length === 0) return [];

    const visibleIds = new Set(matchedIds);
    for (const id of matchedIds) {
      for (const ancestorId of getAncestorIds(items, getParentId, id)) {
        visibleIds.add(ancestorId);
      }
    }
    const visibleItems = items.filter((item) => visibleIds.has(item.id));
    // Fully expanded while a search or filter narrows the tree, so every
    // match's path stays visible.
    return flattenTree(visibleItems, getParentId, new Set());
  }, [
    items,
    getParentId,
    hasActiveQuery,
    hasActiveFilter,
    isIncluded,
    collapsedIds,
  ]);

  const flatFiltered = useMemo(() => {
    if (getParentId || server) return [];
    return hasActiveQuery || hasActiveFilter ? items.filter(isIncluded) : items;
  }, [items, getParentId, server, hasActiveQuery, hasActiveFilter, isIncluded]);

  const pageSize = server?.pageSize ?? clientPageSize;
  const totalCount = server?.totalCount ?? flatFiltered.length;
  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(server?.page ?? page, pageCount);

  const pagedRows = useMemo<FlattenedNode<T>[]>(() => {
    if (getParentId) return [];
    const pageItems = server
      ? items
      : flatFiltered.slice((safePage - 1) * pageSize, safePage * pageSize);
    return pageItems.map((item) => ({
      item,
      depth: 0,
      hasChildren: false,
      childCount: 0,
    }));
  }, [items, server, flatFiltered, safePage, pageSize, getParentId]);

  function toggleExpand(id: string) {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function expandAll() {
    setCollapsedIds(new Set());
  }

  function collapseAll() {
    setCollapsedIds(new Set(childCounts.keys()));
  }

  function openCreate() {
    setEditing(null);
    setIsFormOpen(true);
  }

  function openEdit(item: T) {
    setEditing(item);
    setIsFormOpen(true);
  }

  function closeForm() {
    setIsFormOpen(false);
    setEditing(null);
  }

  async function submit(values: V) {
    const result = await settle(() => onSave(values, editing));
    if (result.ok) {
      closeForm();
      if (result.message) toast.success(result.message);
    }
    return result;
  }

  function requestDelete(item: T) {
    setDeleteErrors([]);
    setDeleteErrorStatus(undefined);
    setDeleteTarget(item);
  }

  function cancelDelete() {
    if (isDeleting) return;
    setDeleteTarget(null);
    setDeleteErrors([]);
    setDeleteErrorStatus(undefined);
  }

  async function confirmDelete() {
    if (!deleteTarget || isDeleting) return;
    setIsDeleting(true);
    setDeleteErrors([]);
    const target = deleteTarget;
    const result = await settle(() => onDelete(target));
    setIsDeleting(false);
    if (result.ok) {
      setDeleteTarget(null);
      if (result.message) toast.success(result.message);
    } else {
      setDeleteErrors(result.messages);
      setDeleteErrorStatus(result.status);
    }
  }

  function hasChildren(id: string) {
    return (childCounts.get(id) ?? 0) > 0;
  }

  return {
    items,
    query,
    setQuery: (value: string) => {
      setQueryState(value);
      if (server) server.onQueryChange(value);
      else setPage(1);
    },
    isHierarchical,
    rows: isHierarchical ? treeRows : pagedRows,
    collapsedIds,
    toggleExpand,
    expandAll,
    collapseAll,
    page: safePage,
    pageCount,
    totalCount,
    pageSize,
    setPage: server?.onPageChange ?? setPage,
    isFormOpen,
    editing,
    openCreate,
    openEdit,
    closeForm,
    submit,
    deleteTarget,
    isDeleting,
    deleteErrors,
    deleteErrorStatus,
    requestDelete,
    cancelDelete,
    confirmDelete,
    hasChildren,
  };
}

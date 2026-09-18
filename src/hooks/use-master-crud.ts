"use client";

import { useMemo, useState } from "react";

import { flattenTree, getAncestorIds, type FlattenedNode } from "@/lib/tree";

interface UseMasterCrudOptions<T extends { id: string }> {
  /** Seed data. The hook owns its own copy — mutations never touch this array. */
  data: T[];
  /** Does `item` match the (already-lowercased, trimmed) search query? */
  matches: (item: T, query: string) => boolean;
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
}

export interface MasterCrud<T extends { id: string }> {
  items: T[];
  query: string;
  setQuery: (value: string) => void;
  isHierarchical: boolean;
  rows: FlattenedNode<T>[];
  collapsedIds: ReadonlySet<string>;
  toggleExpand: (id: string) => void;
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
  submit: (values: Omit<T, "id">) => void;
  deleteTarget: T | null;
  requestDelete: (item: T) => void;
  cancelDelete: () => void;
  confirmDelete: () => void;
  hasChildren: (id: string) => boolean;
}

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Generic CRUD + list state for a Master screen: search + an optional hard
 * filter, pagination (flat masters) or tree flatten/expand (hierarchical
 * masters), add/edit sheet state, and delete-confirm state. In-memory
 * only — no backend yet, but the shape (items/submit/delete) is what a
 * real API-backed version would keep.
 */
export function useMasterCrud<T extends { id: string }>({
  data,
  matches,
  filter,
  getParentId,
  pageSize = 8,
}: UseMasterCrudOptions<T>): MasterCrud<T> {
  const [items, setItems] = useState<T[]>(data);
  const [query, setQueryState] = useState("");
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<T | null>(null);

  const isHierarchical = Boolean(getParentId);
  const normalizedQuery = query.trim().toLowerCase();
  const hasActiveQuery = normalizedQuery.length > 0;
  const hasActiveFilter = Boolean(filter);

  const isIncluded = useMemo(() => {
    return (item: T) =>
      (!hasActiveQuery || matches(item, normalizedQuery)) &&
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
    if (getParentId) return [];
    return hasActiveQuery || hasActiveFilter ? items.filter(isIncluded) : items;
  }, [items, getParentId, hasActiveQuery, hasActiveFilter, isIncluded]);

  const pageCount = Math.max(1, Math.ceil(flatFiltered.length / pageSize));
  const safePage = Math.min(page, pageCount);

  const pagedRows = useMemo<FlattenedNode<T>[]>(() => {
    if (getParentId) return [];
    return flatFiltered
      .slice((safePage - 1) * pageSize, safePage * pageSize)
      .map((item) => ({ item, depth: 0, hasChildren: false }));
  }, [flatFiltered, safePage, pageSize, getParentId]);

  function toggleExpand(id: string) {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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

  function submit(values: Omit<T, "id">) {
    if (editing) {
      const editingId = editing.id;
      setItems((prev) =>
        prev.map((item) =>
          item.id === editingId ? ({ ...item, ...values } as T) : item,
        ),
      );
    } else {
      setItems((prev) => [...prev, { id: createId(), ...values } as T]);
    }
    closeForm();
  }

  function requestDelete(item: T) {
    setDeleteTarget(item);
  }

  function cancelDelete() {
    setDeleteTarget(null);
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    if (isHierarchical && (childCounts.get(deleteTarget.id) ?? 0) > 0) {
      // Defense in depth — the UI already disables delete on parent rows.
      setDeleteTarget(null);
      return;
    }
    const targetId = deleteTarget.id;
    setItems((prev) => prev.filter((item) => item.id !== targetId));
    setDeleteTarget(null);
  }

  function hasChildren(id: string) {
    return (childCounts.get(id) ?? 0) > 0;
  }

  return {
    items,
    query,
    setQuery: (value: string) => {
      setQueryState(value);
      setPage(1);
    },
    isHierarchical,
    rows: isHierarchical ? treeRows : pagedRows,
    collapsedIds,
    toggleExpand,
    page: safePage,
    pageCount,
    totalCount: flatFiltered.length,
    pageSize,
    setPage,
    isFormOpen,
    editing,
    openCreate,
    openEdit,
    closeForm,
    submit,
    deleteTarget,
    requestDelete,
    cancelDelete,
    confirmDelete,
    hasChildren,
  };
}

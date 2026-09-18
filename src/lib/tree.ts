/**
 * Generic parent/child tree helpers. Shape-agnostic — callers supply a
 * `getParentId` accessor rather than a fixed `parentId` field name, so any
 * self-referencing master record (Location, Product Group, ...) can reuse
 * these without adapting its type.
 */

export interface FlattenedNode<T> {
  item: T;
  depth: number;
  hasChildren: boolean;
}

function groupByParent<T extends { id: string }>(
  items: T[],
  getParentId: (item: T) => string | null,
): Map<string | null, T[]> {
  const map = new Map<string | null, T[]>();
  for (const item of items) {
    const key = getParentId(item);
    const list = map.get(key);
    if (list) list.push(item);
    else map.set(key, [item]);
  }
  return map;
}

/**
 * Flattens a tree into display order — each parent immediately followed by
 * its children — annotated with depth for indentation. Descendants of any
 * id in `collapsedIds` are omitted.
 */
export function flattenTree<T extends { id: string }>(
  items: T[],
  getParentId: (item: T) => string | null,
  collapsedIds: ReadonlySet<string> = new Set(),
): FlattenedNode<T>[] {
  const childrenByParent = groupByParent(items, getParentId);
  const result: FlattenedNode<T>[] = [];

  function visit(parentId: string | null, depth: number) {
    for (const item of childrenByParent.get(parentId) ?? []) {
      const hasChildren = (childrenByParent.get(item.id)?.length ?? 0) > 0;
      result.push({ item, depth, hasChildren });
      if (hasChildren && !collapsedIds.has(item.id)) {
        visit(item.id, depth + 1);
      }
    }
  }

  visit(null, 0);
  return result;
}

/** All descendant ids of `id` (not including itself) — use this to stop a
 * node from being assigned as its own descendant's parent (a cycle). */
export function getDescendantIds<T extends { id: string }>(
  items: T[],
  getParentId: (item: T) => string | null,
  id: string,
): Set<string> {
  const childrenByParent = groupByParent(items, getParentId);
  const descendants = new Set<string>();

  function visit(parentId: string) {
    for (const child of childrenByParent.get(parentId) ?? []) {
      if (!descendants.has(child.id)) {
        descendants.add(child.id);
        visit(child.id);
      }
    }
  }

  visit(id);
  return descendants;
}

/** All ancestor ids of `id`, nearest first — used to keep a search match's
 * path visible (and auto-expanded) in a filtered tree view. */
export function getAncestorIds<T extends { id: string }>(
  items: T[],
  getParentId: (item: T) => string | null,
  id: string,
): Set<string> {
  const byId = new Map(items.map((item) => [item.id, item]));
  const ancestors = new Set<string>();

  let current = byId.get(id);
  let parentId = current ? getParentId(current) : null;
  while (parentId) {
    ancestors.add(parentId);
    current = byId.get(parentId);
    parentId = current ? getParentId(current) : null;
  }

  return ancestors;
}

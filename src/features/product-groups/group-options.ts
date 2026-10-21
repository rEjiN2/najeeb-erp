import type { ProductGroup } from "./types";

/**
 * Product groups as picker options labelled with their full path
 * ("Dates › Ajwa"), in tree order, so a nested group is never ambiguous.
 */
export function groupPathOptions(
  groups: ProductGroup[],
): { value: string; label: string; description?: string }[] {
  const byId = new Map(groups.map((group) => [group.id, group]));
  const pathOf = (group: ProductGroup): string[] => {
    const names: string[] = [];
    const seen = new Set<string>();
    for (
      let node: ProductGroup | undefined = group;
      node && !seen.has(node.id);
      node = node.parentId ? byId.get(node.parentId) : undefined
    ) {
      seen.add(node.id);
      names.unshift(node.name);
    }
    return names;
  };
  return groups
    .map((group) => ({ group, path: pathOf(group) }))
    .sort((a, b) => a.path.join("\u0000").localeCompare(b.path.join("\u0000")))
    .map(({ group, path }) => ({
      value: group.id,
      label: path.join(" › "),
      description: group.code,
    }));
}

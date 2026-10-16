/** A section of the role form: one resource and the actions on it. */
export interface PermissionGroup {
  /** e.g. "cash-receipts". */
  key: string;
  /** e.g. "Cash receipts". */
  label: string;
  items: { value: string; label: string }[];
}

// Display words only; which permissions exist always comes from the backend.
const ACTION_LABELS: Record<string, string> = {
  read: "View",
  view: "View",
  create: "Create",
  edit: "Edit",
  cancel: "Cancel",
  manage: "Manage",
};

const ACTION_ORDER = ["read", "view", "create", "edit", "cancel", "manage"];

function sentenceCase(text: string): string {
  const words = text.replace(/[-_]+/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** "cash-receipts:create" → group "Cash receipts", item "Create". */
export function groupPermissions(permissions: string[]): PermissionGroup[] {
  const groups = new Map<string, PermissionGroup>();
  for (const value of new Set(permissions)) {
    const [resource = value, action = ""] = value.split(":");
    let group = groups.get(resource);
    if (!group) {
      group = { key: resource, label: sentenceCase(resource), items: [] };
      groups.set(resource, group);
    }
    group.items.push({
      value,
      label: ACTION_LABELS[action] ?? sentenceCase(action || value),
    });
  }
  const rank = (item: { value: string }) => {
    const index = ACTION_ORDER.indexOf(item.value.split(":")[1] ?? "");
    return index === -1 ? ACTION_ORDER.length : index;
  };
  for (const group of groups.values()) {
    group.items.sort((a, b) => rank(a) - rank(b));
  }
  return [...groups.values()];
}

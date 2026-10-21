import type { DataScope } from "@/features/auth/types";

// Mirrors the backend's roles module (roles.service.ts RoleView,
// dto/role.dto.ts). Values are the wire values.

export const DATA_SCOPES = ["all", "own"] as const satisfies DataScope[];

export const DATA_SCOPE_LABELS: Record<DataScope, string> = {
  all: "All records",
  own: "Own records only",
};

export const DATA_SCOPE_HINTS: Record<DataScope, string> = {
  all: "Sees every voucher, whoever entered it.",
  own: "Sees only vouchers they entered or collected, and posts only as themselves into their allowed cash accounts.",
};

/** GET /roles item and GET /roles/:id. */
export interface Role {
  id: string;
  name: string;
  description: string | null;
  permissions: string[];
  dataScope: DataScope;
  /** Managed by the system (the seeded admin): can't be edited or deleted. */
  isSystem: boolean;
  /** Users holding this role, inactive ones included. */
  userCount: number;
}

/** What the form submits. */
export interface RoleInput {
  name: string;
  description: string;
  dataScope: DataScope;
  permissions: string[];
}

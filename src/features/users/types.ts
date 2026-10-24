import type { MasterStatus } from "@/components/master/status-badge";
import type { DataScope } from "@/features/auth/types";

// Mirrors the backend's users module (user-management.service.ts UserView,
// dto/user.dto.ts). Values are the wire values.

export const USER_STATUSES = ["active", "inactive"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const USER_STATUS_LABELS: Record<UserStatus, MasterStatus> = {
  active: "Active",
  inactive: "Inactive",
};

export interface CashAccountRef {
  id: string;
  code: string;
  name: string;
  type: string;
}

/** GET /users item and GET /users/:id. */
export interface User {
  id: string;
  name: string;
  email: string;
  /** null when the role was deleted underneath the user. */
  role: { id: string; name: string; dataScope: DataScope } | null;
  status: UserStatus;
  mustChangePassword: boolean;
  allowedCashAccounts: CashAccountRef[];
  /** Stock locations an "own"-scoped user sees stock for. */
  allowedLocationIds?: string[];
  createdAt?: string;
  updatedAt?: string;
}

/** GET /users response. */
export interface UserPage {
  items: User[];
  total: number;
  page: number;
  limit: number;
}

/** GET /roles/lookup item — the user form's role dropdown. */
export interface RoleLookupItem {
  id: string;
  name: string;
  dataScope: DataScope;
}

/** What the form submits. `password` only on create (edit resets it apart). */
export interface UserInput {
  name: string;
  email: string;
  password: string;
  roleId: string;
  allowedCashAccountIds: string[];
  allowedLocationIds: string[];
}

export interface UserFilters {
  q: string;
  status: UserStatus | "all";
  roleId: string;
  page: number;
}

import "server-only";

import { getServerSession } from "@/features/auth/session";
import { PERMISSIONS } from "@/features/auth/permissions";

import type { VoucherAccess, VoucherConfig } from "./config";

/** Only decides what the UI offers — the backend checks each permission too. */
export async function getVoucherAccess(
  config: VoucherConfig,
): Promise<VoucherAccess> {
  const session = await getServerSession();
  const permissions = session?.user.permissions ?? [];
  const has = (action: string) =>
    permissions.includes(`${config.permissionPrefix}:${action}`);
  return {
    canCreate: has("create"),
    canEdit: has("edit"),
    canCancel: has("cancel"),
    canViewBalances: permissions.includes(PERMISSIONS.BALANCES_VIEW),
  };
}

import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AppShell } from "@/components/shell/app-shell";
import { PERMISSIONS } from "@/features/auth/permissions";
import { getServerSession } from "@/features/auth/session";
import { countPendingApprovals } from "@/features/cash-handovers/api";
import { CASH_HANDOVERS_PATH } from "@/features/cash-handovers/constants";
import { getChequeSummary } from "@/features/cheques/api";
import { CHEQUES_PATH } from "@/features/cheques/constants";

export default async function ProtectedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getServerSession();

  if (!session) {
    redirect("/login");
  }
  // The backend refuses everything else until the password is changed.
  if (session.user.mustChangePassword) {
    redirect("/change-password");
  }

  // Pending-approvals badge on Cash Handovers, for those who approve them.
  // Cheques due within the week, on Cheques.
  const permissions = session.user.permissions;
  const [pending, cheques] = await Promise.all([
    permissions.includes(PERMISSIONS.CASH_HANDOVERS_APPROVE)
      ? countPendingApprovals()
      : null,
    permissions.includes(PERMISSIONS.CHEQUES_READ) ? getChequeSummary() : null,
  ]);
  const dueSoon = cheques?.ok ? cheques.data.dueSoon.count : 0;

  return (
    <AppShell
      navBadges={{
        ...(pending ? { [CASH_HANDOVERS_PATH]: pending } : {}),
        ...(dueSoon ? { [CHEQUES_PATH]: dueSoon } : {}),
      }}
    >
      {children}
    </AppShell>
  );
}

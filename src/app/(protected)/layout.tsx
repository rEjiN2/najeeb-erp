import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AppShell } from "@/components/shell/app-shell";
import { getServerSession } from "@/features/auth/session";

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

  return <AppShell>{children}</AppShell>;
}

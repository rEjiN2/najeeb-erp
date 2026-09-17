import type { Metadata } from "next";

import { getServerSession } from "@/features/auth/session";

export const metadata: Metadata = {
  title: "Dashboard | ALA Dates",
};

export default async function DashboardPage() {
  const session = await getServerSession();

  return (
    <div className="space-y-1">
      <h1 className="font-heading text-2xl font-semibold">
        Welcome back{session ? `, ${session.user.name}` : ""}
      </h1>
      <p className="text-muted-foreground text-sm">
        Dashboard widgets land here next.
      </p>
    </div>
  );
}

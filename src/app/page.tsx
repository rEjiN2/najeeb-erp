import { redirect } from "next/navigation";

import { homePath } from "@/config/nav";
import { getServerSession } from "@/features/auth/session";

export default async function RootPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");
  if (session.user.mustChangePassword) redirect("/change-password");
  redirect(homePath(session.user.permissions));
}

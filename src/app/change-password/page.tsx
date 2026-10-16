import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ChangePasswordForm } from "@/features/auth/change-password-form";
import { getServerSession } from "@/features/auth/session";

export const metadata: Metadata = {
  title: "Change your password | ALA Dates",
};

/** Same rule as the login page: only a same-app relative path. */
function resolveRedirectTo(from: string | undefined) {
  if (from && from.startsWith("/") && !from.startsWith("//")) return from;
  return "/";
}

export default async function ChangePasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;
  const session = await getServerSession();

  if (!session) {
    redirect(`/login?${new URLSearchParams({ from: "/change-password" })}`);
  }
  if (!session.user.mustChangePassword) {
    redirect(resolveRedirectTo(from));
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1">
          <h1 className="font-heading text-2xl font-semibold">
            Change your password
          </h1>
          <p className="text-muted-foreground text-sm">
            Hi {session.user.name}, choose a new password before you continue.
            You signed in with a temporary one.
          </p>
        </div>
        <ChangePasswordForm redirectTo={resolveRedirectTo(from)} />
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";

import { LoginForm } from "@/features/auth/login-form";
import { getServerSession } from "@/features/auth/session";

export const metadata: Metadata = {
  title: "Sign in | ALA Dates",
};

function resolveRedirectTo(from: string | undefined) {
  // `from` is attacker-controllable (query string) — only ever follow it if
  // it's a same-app relative path, never an absolute or protocol-relative
  // URL, to avoid an open redirect.
  if (from && from.startsWith("/") && !from.startsWith("//")) {
    return from;
  }
  return "/dashboard";
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;
  const redirectTo = resolveRedirectTo(from);

  if (await getServerSession()) {
    redirect(redirectTo);
  }

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden p-10 lg:flex">
        <Image
          src="/auth-banner.jpg"
          alt=""
          fill
          priority
          sizes="50vw"
          className="object-cover"
        />
        <div className="from-sidebar via-sidebar/75 to-sidebar/30 absolute inset-0 bg-gradient-to-t" />

        <span className="font-heading text-sidebar-foreground relative text-lg font-semibold">
          ALA Dates
        </span>

        <div className="relative space-y-3">
          <p className="font-heading text-sidebar-foreground text-2xl leading-snug">
            Premium dates, precisely tracked.
          </p>
          <p className="text-sidebar-foreground/80 text-sm">
            From warehouse to van to sale — one system for the whole business.
          </p>
        </div>

        <p className="text-sidebar-foreground/60 relative text-xs">
          © {new Date().getFullYear()} ALA Dates Trading
        </p>
      </div>

      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6">
          <div className="space-y-1 text-center lg:text-left">
            <h1 className="font-heading text-2xl font-semibold">
              Welcome back
            </h1>
            <p className="text-muted-foreground text-sm">
              Sign in to your ALA Dates account.
            </p>
          </div>
          <LoginForm redirectTo={redirectTo} />
        </div>
      </div>
    </div>
  );
}

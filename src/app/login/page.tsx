import type { Metadata } from "next";

import { LoginForm } from "@/features/auth/login-form";

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

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="bg-primary text-primary-foreground relative hidden flex-col justify-between p-10 lg:flex">
        <span className="font-heading text-lg font-semibold">ALA Dates</span>

        <div className="space-y-3">
          <p className="font-heading text-2xl leading-snug">
            One system for every branch, warehouse, van and sale.
          </p>
          <p className="text-primary-foreground/80 text-sm">
            Dates trading, rebuilt for how the business actually runs.
          </p>
        </div>

        <p className="text-primary-foreground/60 text-xs">
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

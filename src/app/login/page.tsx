import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";

import { BrandLogo } from "@/components/shared/brand-logo";
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
  // The root page picks the first screen this user may open.
  return "/";
}

const HIGHLIGHTS = [
  "Cash receipts, payments and handovers",
  "Customers, suppliers and accounts in one place",
  "Branches, warehouses, stores and vans",
];

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
    <div className="grid min-h-svh lg:grid-cols-[1.1fr_1fr]">
      {/* Brand panel — black-and-gold, same chrome as the app sidebar. */}
      <div className="bg-sidebar text-sidebar-foreground relative hidden flex-col justify-between overflow-hidden p-12 lg:flex">
        <Image
          src="/auth-banner.png"
          alt=""
          fill
          priority
          sizes="55vw"
          className="object-cover opacity-70"
        />
        <div className="from-sidebar via-sidebar/80 to-sidebar/20 absolute inset-0 bg-gradient-to-t" />
        <div className="from-sidebar/70 absolute inset-x-0 top-0 h-40 bg-gradient-to-b to-transparent" />

        <div className="relative flex items-center gap-3">
          <BrandLogo size={48} priority className="ring-sidebar-primary/50 ring-1" />
          <div className="leading-tight">
            <p className="font-heading text-lg font-bold tracking-wide">
              ALA DATES
            </p>
            <p className="text-sidebar-primary text-[11px] font-medium tracking-[0.2em] uppercase">
              Trading ERP
            </p>
          </div>
        </div>

        <div className="relative max-w-md space-y-6">
          <div className="space-y-3">
            <div className="bg-sidebar-primary h-1 w-12 rounded-full" />
            <h2 className="font-heading text-4xl leading-tight font-semibold">
              Premium dates,
              <br />
              <span className="text-sidebar-primary">precisely tracked.</span>
            </h2>
            <p className="text-sidebar-foreground/75 text-sm leading-relaxed">
              From warehouse to van to sale — one system for the whole
              business.
            </p>
          </div>
          <ul className="space-y-2.5">
            {HIGHLIGHTS.map((text) => (
              <li
                key={text}
                className="text-sidebar-foreground/85 flex items-center gap-3 text-sm"
              >
                <span className="bg-sidebar-primary size-1.5 shrink-0 rounded-full" />
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-sidebar-foreground/50 relative text-xs">
          © {new Date().getFullYear()} ALA Dates L.L.C
        </p>
      </div>

      {/* Sign-in panel */}
      <div className="bg-muted/30 flex flex-col items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center text-center">
            <BrandLogo size={88} priority className="mb-5 shadow-sm" />
            <h1 className="font-heading text-2xl font-semibold">
              Welcome back
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Sign in to your ALA Dates account.
            </p>
          </div>

          <div className="bg-card rounded-xl border p-6 shadow-sm">
            <LoginForm redirectTo={redirectTo} />
          </div>

          <p className="text-muted-foreground mt-6 text-center text-xs">
            Having trouble signing in? Contact your administrator.
          </p>
        </div>
      </div>
    </div>
  );
}

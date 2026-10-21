import { HandCoins, Headset, UsersRound, Warehouse } from "lucide-react";
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
  { icon: HandCoins, text: "Cash receipts and payments" },
  { icon: UsersRound, text: "Customers, suppliers and accounts in one place" },
  { icon: Warehouse, text: "Branches, warehouses, stores and vans" },
];

function Wordmark() {
  return (
    <div className="leading-tight">
      <p className="font-heading text-base font-bold tracking-[0.08em]">
        ALA DATES
      </p>
      <p className="text-sidebar-primary text-[10px] font-medium tracking-[0.28em] uppercase">
        Trading ERP
      </p>
    </div>
  );
}

/** Faint arch linework — a quiet nod to Arabian architecture. */
function ArchLines() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 240 360"
      fill="none"
      className="text-sidebar-primary pointer-events-none absolute right-10 bottom-0 hidden h-[62%] opacity-[0.09] lg:block"
    >
      <path
        d="M10 360V150C10 70 70 18 120 6c50 12 110 64 110 144v210"
        stroke="currentColor"
        strokeWidth="1"
      />
      <path
        d="M34 360V158c0-64 46-108 86-120 40 12 86 56 86 120v202"
        stroke="currentColor"
        strokeWidth="1"
      />
      <path d="M120 6v32" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
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
    <div className="bg-auth-canvas grid min-h-svh grid-rows-[auto_1fr] md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:grid-rows-1 lg:grid-cols-[minmax(0,54fr)_minmax(0,46fr)]">
      {/* Mobile: compact branded header instead of the full brand panel. */}
      <header className="bg-sidebar text-sidebar-foreground flex items-center gap-3 px-4 py-3 md:hidden">
        <BrandLogo
          size={36}
          priority
          className="ring-sidebar-primary/40 ring-1"
        />
        <Wordmark />
      </header>

      {/* Brand panel — black-and-gold, same chrome as the app sidebar. */}
      <aside className="bg-sidebar text-sidebar-foreground relative hidden flex-col overflow-hidden md:flex md:p-10 xl:p-14">
        <Image
          src="/auth-banner.png"
          alt=""
          fill
          priority
          sizes="(min-width: 1024px) 54vw, 50vw"
          className="object-cover object-[70%_center] opacity-80 saturate-[0.85]"
        />
        {/* Layered overlays: overall dim, darker behind the copy (left),
            and a deep fade into the footer. */}
        <div className="bg-sidebar/40 absolute inset-0" />
        <div className="from-sidebar/95 via-sidebar/65 to-sidebar/15 absolute inset-0 bg-gradient-to-r" />
        <div className="from-sidebar via-sidebar/50 absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t to-transparent" />
        <div className="from-sidebar/80 absolute inset-x-0 top-0 h-40 bg-gradient-to-b to-transparent" />
        <ArchLines />

        <div className="relative flex items-center gap-3">
          <BrandLogo
            size={44}
            priority
            className="ring-sidebar-primary/50 ring-1"
          />
          <Wordmark />
        </div>

        <div className="relative my-auto max-w-[30rem] py-12">
          <div className="bg-sidebar-primary mb-6 h-px w-14" />
          <h2 className="font-heading text-[clamp(2rem,3.1vw,3.25rem)] leading-[1.08] font-semibold tracking-tight">
            <span className="text-white/95">Premium dates,</span>
            <br />
            <span className="from-sidebar-accent-foreground to-sidebar-primary bg-gradient-to-r bg-clip-text text-transparent">
              precisely tracked.
            </span>
          </h2>
          <p className="text-sidebar-foreground/80 mt-5 max-w-[26rem] text-[15px] leading-relaxed">
            From warehouse to van to sale — one system for the whole business.
          </p>

          <ul className="border-sidebar-border mt-9 space-y-3.5 border-t pt-7">
            {HIGHLIGHTS.map(({ icon: Icon, text }) => (
              <li
                key={text}
                className="text-sidebar-foreground/90 flex items-center gap-3 text-sm"
              >
                <span className="border-sidebar-primary/35 text-sidebar-primary flex size-7 shrink-0 items-center justify-center rounded-full border">
                  <Icon className="size-3.5" strokeWidth={1.75} aria-hidden />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-sidebar-foreground/60 relative text-xs tracking-wide">
          © {new Date().getFullYear()} ALA Dates L.L.C.
        </p>
      </aside>

      {/* Sign-in panel */}
      <main className="relative flex flex-col items-center justify-center overflow-hidden px-4 py-10 sm:px-8 md:py-12">
        {/* Quiet depth: warm gold glows and a dot grid that fades out
            behind the form. Purely decorative. */}
        <div
          aria-hidden
          className="bg-sidebar-primary/15 pointer-events-none absolute -top-48 -right-40 size-[560px] rounded-full blur-3xl"
        />
        <div
          aria-hidden
          className="bg-primary/10 pointer-events-none absolute -bottom-56 -left-48 size-[520px] rounded-full blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(var(--input)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_at_center,transparent_35%,black_85%)] [background-size:22px_22px] opacity-60"
        />

        <div className="relative w-full max-w-[460px]">
          <div className="mb-9 flex flex-col items-center text-center">
            <BrandLogo
              size={104}
              priority
              className="ring-sidebar-primary/45 ring-offset-auth-canvas mb-6 hidden shadow-[0_10px_30px_-12px_rgb(0_0_0/0.35)] ring-2 ring-offset-4 md:block"
            />
            <p className="text-primary mb-3 text-[11px] font-semibold tracking-[0.3em] uppercase">
              ALA Dates · Trading ERP
            </p>
            <h1 className="font-heading text-[clamp(2rem,2.6vw,2.5rem)] leading-tight font-semibold tracking-tight">
              Welcome back
            </h1>
            <p className="text-muted-foreground mt-2 text-[15px]">
              Sign in to your ALA Dates account.
            </p>
          </div>

          <div className="bg-card border-border/80 relative overflow-hidden rounded-xl border p-6 shadow-[0_1px_2px_rgb(0_0_0/0.04),0_24px_48px_-24px_rgb(0_0_0/0.22)] sm:p-9">
            {/* Gold hairline across the top edge. */}
            <div
              aria-hidden
              className="via-sidebar-primary absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-transparent to-transparent"
            />
            <LoginForm redirectTo={redirectTo} />
          </div>

          <p className="text-muted-foreground mt-7 flex items-center justify-center gap-2 text-center text-[13px]">
            <Headset className="size-4 shrink-0" aria-hidden />
            Having trouble signing in? Contact your administrator.
          </p>
          <p className="text-muted-foreground/80 mt-8 text-center text-xs md:hidden">
            © {new Date().getFullYear()} ALA Dates L.L.C.
          </p>
        </div>
      </main>
    </div>
  );
}

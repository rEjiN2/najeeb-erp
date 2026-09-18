"use client";

import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

import { TooltipProvider } from "@/components/ui/tooltip";

import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

// Tailwind's `lg` breakpoint — read only inside the click handler, never
// during render, so there's no SSR/hydration mismatch risk.
const LG_BREAKPOINT = 1024;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [desktopExpanded, setDesktopExpanded] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close the mobile drawer whenever the route changes. Adjusted during
  // render (React's documented way to reset state on a prop change) rather
  // than in an effect — an effect here would fire an extra render after
  // every navigation for no benefit.
  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setMobileOpen(false);
  }

  function toggleSidebar() {
    const isMobile =
      typeof window !== "undefined" && window.innerWidth < LG_BREAKPOINT;
    if (isMobile) {
      setMobileOpen((value) => !value);
    } else {
      setDesktopExpanded((value) => !value);
    }
  }

  return (
    <TooltipProvider>
      <div className="flex h-svh">
        {mobileOpen ? (
          <button
            type="button"
            aria-label="Close sidebar"
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          />
        ) : null}

        <Sidebar
          // The mobile drawer is always shown in full (never icon-only) —
          // only fall back to the desktop rail state when it's not open.
          collapsed={mobileOpen ? false : !desktopExpanded}
          mobileOpen={mobileOpen}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar onToggleSidebar={toggleSidebar} />
          <main className="bg-muted/30 flex-1 overflow-y-auto p-4 sm:p-6">
            {children}
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}

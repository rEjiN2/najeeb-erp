"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { BrandLogo } from "@/components/shared/brand-logo";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  NAV_ITEMS,
  flattenNav,
  isActivePath,
  isNavGroup,
  visibleNavItems,
} from "@/config/nav";
import { useAuth } from "@/features/auth/auth-context";
import { useFavourites } from "@/hooks/use-favourites";
import { cn } from "@/lib/utils";

import { SidebarLeafLink } from "./sidebar-leaf-link";
import { SidebarNavGroup } from "./sidebar-nav-group";
import { SidebarSectionLabel } from "./sidebar-section-label";

export function Sidebar({
  collapsed,
  mobileOpen,
}: {
  collapsed: boolean;
  mobileOpen: boolean;
}) {
  const pathname = usePathname();
  const { favourites, toggleFavourite, isFavourite } = useFavourites();
  const { session } = useAuth();
  const navItems = visibleNavItems(NAV_ITEMS, session?.user.permissions ?? []);

  const favouriteItems = flattenNav(navItems).filter((item) =>
    favourites.includes(item.href),
  );

  return (
    <aside
      className={cn(
        // Mobile: an off-canvas drawer, always full width, slid in/out.
        "border-sidebar-border bg-sidebar text-sidebar-foreground fixed inset-y-0 left-0 z-40 flex h-svh w-64 shrink-0 flex-col border-r transition-transform duration-200 print:hidden",
        mobileOpen ? "translate-x-0" : "-translate-x-full",
        // Desktop: back in normal flow, always visible, width toggles
        // between the full sidebar and an icon-only rail.
        "lg:static lg:z-auto lg:translate-x-0 lg:transition-[width]",
        collapsed ? "lg:w-16" : "lg:w-64",
      )}
    >
      {/* Brand header — same 56px height as the topbar so the rules line up. */}
      <Link
        href="/"
        className={cn(
          "border-sidebar-border flex h-14 shrink-0 items-center gap-3 border-b",
          collapsed ? "justify-center px-2" : "px-4",
        )}
      >
        <BrandLogo
          size={collapsed ? 34 : 36}
          priority
          className="ring-sidebar-primary/40 ring-1"
        />
        {!collapsed ? (
          <div className="min-w-0 leading-tight">
            <p className="font-heading truncate text-[15px] text-sidebar-foreground font-bold tracking-wide">
              ALA DATES
            </p>
            <p className="text-sidebar-primary truncate text-[10px] font-medium tracking-[0.18em] uppercase">
              Trading ERP
            </p>
          </div>
        ) : null}
      </Link>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-5 px-2 py-4">
          {favouriteItems.length > 0 ? (
            <div>
              <SidebarSectionLabel collapsed={collapsed}>
                Favourites
              </SidebarSectionLabel>
              <nav className="space-y-0.5">
                {favouriteItems.map((item) => (
                  <SidebarLeafLink
                    key={item.href}
                    item={item}
                    collapsed={collapsed}
                    active={isActivePath(item.href, pathname)}
                    pinned
                    onTogglePin={() => toggleFavourite(item.href)}
                  />
                ))}
              </nav>
            </div>
          ) : null}

          <div>
            {favouriteItems.length > 0 ? (
              <SidebarSectionLabel collapsed={collapsed}>Menu</SidebarSectionLabel>
            ) : null}
            <nav className="space-y-0.5">
              {navItems.map((entry) =>
                isNavGroup(entry) ? (
                  <SidebarNavGroup
                    key={entry.title}
                    group={entry}
                    collapsed={collapsed}
                    pathname={pathname}
                    isFavourite={isFavourite}
                    onTogglePin={toggleFavourite}
                  />
                ) : (
                  <SidebarLeafLink
                    key={entry.href}
                    item={entry}
                    collapsed={collapsed}
                    active={isActivePath(entry.href, pathname)}
                    pinned={isFavourite(entry.href)}
                    onTogglePin={() => toggleFavourite(entry.href)}
                  />
                ),
              )}
            </nav>
          </div>
        </div>
      </ScrollArea>

      {!collapsed ? (
        <div className="border-sidebar-border text-sidebar-foreground/40 shrink-0 border-t px-4 py-3 text-[11px]">
          ALA Dates L.L.C · UAE
        </div>
      ) : null}
    </aside>
  );
}

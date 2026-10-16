"use client";

import { Sprout } from "lucide-react";
import { usePathname } from "next/navigation";

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
      <div className="border-sidebar-border flex h-14 items-center gap-2 border-b px-4">
        <Sprout className="text-primary size-5 shrink-0" />
        {!collapsed ? (
          <span className="font-heading truncate text-sm font-semibold">
            ALA Dates
          </span>
        ) : null}
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-4 px-2 py-3">
          {favouriteItems.length > 0 ? (
            <div>
              <SidebarSectionLabel collapsed={collapsed}>
                Favourites
              </SidebarSectionLabel>
              <nav className="divide-sidebar-border divide-y">
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

          <nav className="divide-sidebar-border divide-y">
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
      </ScrollArea>
    </aside>
  );
}

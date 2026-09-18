"use client";

import { Sprout } from "lucide-react";
import { usePathname } from "next/navigation";

import { ScrollArea } from "@/components/ui/scroll-area";
import { FLAT_NAV_ITEMS, NAV_ITEMS, isNavGroup } from "@/config/nav";
import { useFavourites } from "@/hooks/use-favourites";
import { cn } from "@/lib/utils";

import { SidebarLeafLink } from "./sidebar-leaf-link";
import { SidebarNavGroup } from "./sidebar-nav-group";
import { SidebarSectionLabel } from "./sidebar-section-label";

export function Sidebar({ collapsed }: { collapsed: boolean }) {
  const pathname = usePathname();
  const { favourites, toggleFavourite, isFavourite } = useFavourites();

  const favouriteItems = FLAT_NAV_ITEMS.filter((item) =>
    favourites.includes(item.href),
  );

  return (
    <aside
      className={cn(
        "border-sidebar-border bg-sidebar text-sidebar-foreground flex h-svh shrink-0 flex-col border-r transition-[width] duration-200",
        collapsed ? "w-16" : "w-64",
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
                    active={pathname === item.href}
                    pinned
                    onTogglePin={() => toggleFavourite(item.href)}
                  />
                ))}
              </nav>
            </div>
          ) : null}

          <nav className="divide-sidebar-border divide-y">
            {NAV_ITEMS.map((entry) =>
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
                  active={pathname === entry.href}
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

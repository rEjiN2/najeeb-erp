"use client";

import { Star } from "lucide-react";
import Link from "next/link";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { NavLeaf } from "@/config/nav";
import { cn } from "@/lib/utils";

interface SidebarLeafLinkProps {
  item: NavLeaf;
  collapsed: boolean;
  active: boolean;
  pinned: boolean;
  onTogglePin: () => void;
  /** Nested under a group: the active marker sits on the group's tree line. */
  nested?: boolean;
}

export function SidebarLeafLink({
  item,
  collapsed,
  active,
  pinned,
  onTogglePin,
  nested = false,
}: SidebarLeafLinkProps) {
  const Icon = item.icon;

  const link = (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group/nav-item relative flex items-center gap-2.5 rounded-md text-sm transition-colors",
        collapsed ? "justify-center px-2 py-2.5" : "px-2.5 py-2",
        active
          ? "bg-sidebar-primary/12 text-sidebar-primary font-medium"
          : "text-sidebar-foreground/75 hover:text-sidebar-foreground hover:bg-white/5",
        // Gold marker: on the tree line for nested items, on the sidebar
        // edge for top-level ones.
        active &&
          (nested
            ? "before:bg-sidebar-primary before:absolute before:top-1/2 before:-left-[9px] before:h-5 before:w-0.5 before:-translate-y-1/2 before:rounded-full"
            : "before:bg-sidebar-primary before:absolute before:top-1/2 before:-left-2 before:h-5 before:w-1 before:-translate-y-1/2 before:rounded-r-full"),
      )}
    >
      <Icon
        className={cn(
          "size-4 shrink-0",
          active ? "text-sidebar-primary" : "text-sidebar-foreground/55",
          "group-hover/nav-item:text-current",
        )}
      />
      {!collapsed ? (
        <span className="min-w-0 flex-1 truncate">{item.title}</span>
      ) : null}
      {!collapsed ? (
        <button
          type="button"
          aria-label={pinned ? "Remove from favourites" : "Add to favourites"}
          onClick={(event) => {
            event.preventDefault();
            onTogglePin();
          }}
          className={cn(
            "hover:text-sidebar-primary shrink-0",
            pinned
              ? "text-sidebar-primary"
              : "text-sidebar-foreground/40 opacity-0 group-hover/nav-item:opacity-100",
          )}
        >
          <Star className={cn("size-3.5", pinned && "fill-current")} />
        </button>
      ) : null}
    </Link>
  );

  if (!collapsed) return link;

  return (
    <Tooltip>
      <TooltipTrigger render={link} />
      <TooltipContent side="right">{item.title}</TooltipContent>
    </Tooltip>
  );
}

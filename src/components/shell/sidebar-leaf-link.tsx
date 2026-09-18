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
  /** Nesting depth (0 = top level). Each level indents a bit further. */
  level?: number;
}

export function SidebarLeafLink({
  item,
  collapsed,
  active,
  pinned,
  onTogglePin,
  level = 0,
}: SidebarLeafLinkProps) {
  const Icon = item.icon;

  const link = (
    <Link
      href={item.href}
      style={
        level > 0 && !collapsed
          ? { marginLeft: `${level * 1.1}rem` }
          : undefined
      }
      className={cn(
        "group/nav-item flex items-center gap-2 rounded-md px-2 py-2.5 text-sm transition-colors",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
      )}
    >
      <Icon className="size-4 shrink-0" />
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
            "text-muted-foreground/60 hover:text-primary shrink-0",
            pinned
              ? "text-primary"
              : "opacity-0 group-hover/nav-item:opacity-100",
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

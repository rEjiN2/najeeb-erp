"use client";

import { ChevronRight } from "lucide-react";
import { useState } from "react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { containsActivePath, isNavGroup, type NavGroup } from "@/config/nav";
import { cn } from "@/lib/utils";

import { SidebarLeafLink } from "./sidebar-leaf-link";

interface SidebarNavGroupProps {
  group: NavGroup;
  collapsed: boolean;
  pathname: string;
  isFavourite: (href: string) => boolean;
  onTogglePin: (href: string) => void;
  /** Nesting depth (0 = top level). Each level indents a bit further. */
  level?: number;
}

export function SidebarNavGroup({
  group,
  collapsed,
  pathname,
  isFavourite,
  onTogglePin,
  level = 0,
}: SidebarNavGroupProps) {
  const [open, setOpen] = useState(() =>
    containsActivePath(group.children, pathname),
  );
  const Icon = group.icon;

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <div className="text-sidebar-foreground/80 flex items-center justify-center rounded-md px-2 py-2.5">
              <Icon className="size-4" />
            </div>
          }
        />
        <TooltipContent side="right">{group.title}</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger
        style={
          level > 0 ? { paddingLeft: `${0.5 + level * 1.1}rem` } : undefined
        }
        className={cn(
          "text-sidebar-foreground/80 flex w-full items-center gap-2 rounded-md px-2 py-2.5 text-sm",
          "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        )}
      >
        <Icon className="size-4 shrink-0" />
        <span className="min-w-0 flex-1 truncate text-left">{group.title}</span>
        <ChevronRight
          className={cn(
            "size-4 shrink-0 transition-transform",
            open && "rotate-90",
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="divide-sidebar-border divide-y">
        {group.children.map((child) =>
          isNavGroup(child) ? (
            <SidebarNavGroup
              key={child.title}
              group={child}
              collapsed={false}
              pathname={pathname}
              isFavourite={isFavourite}
              onTogglePin={onTogglePin}
              level={level + 1}
            />
          ) : (
            <SidebarLeafLink
              key={child.href}
              item={child}
              collapsed={false}
              active={pathname === child.href}
              pinned={isFavourite(child.href)}
              onTogglePin={() => onTogglePin(child.href)}
              level={level + 1}
            />
          ),
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

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
import {
  containsActivePath,
  isActivePath,
  isNavGroup,
  type NavGroup,
} from "@/config/nav";
import { cn } from "@/lib/utils";

import { SidebarLeafLink } from "./sidebar-leaf-link";

interface SidebarNavGroupProps {
  group: NavGroup;
  collapsed: boolean;
  pathname: string;
  isFavourite: (href: string) => boolean;
  onTogglePin: (href: string) => void;
}

export function SidebarNavGroup({
  group,
  collapsed,
  pathname,
  isFavourite,
  onTogglePin,
}: SidebarNavGroupProps) {
  const hasActive = containsActivePath(group.children, pathname);
  const [open, setOpen] = useState(hasActive);
  const Icon = group.icon;

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <div
              className={cn(
                "flex items-center justify-center rounded-md px-2 py-2.5",
                hasActive
                  ? "bg-sidebar-primary/12 text-sidebar-primary"
                  : "text-sidebar-foreground/60",
              )}
            >
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
        className={cn(
          "group/nav-group flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
          "hover:text-sidebar-foreground hover:bg-white/5",
          hasActive || open
            ? "text-sidebar-foreground font-medium"
            : "text-sidebar-foreground/75",
        )}
      >
        <Icon
          className={cn(
            "size-4 shrink-0",
            hasActive ? "text-sidebar-primary" : "text-sidebar-foreground/55",
          )}
        />
        <span className="min-w-0 flex-1 truncate text-left">{group.title}</span>
        <ChevronRight
          className={cn(
            "text-sidebar-foreground/40 size-3.5 shrink-0 transition-transform duration-200",
            open && "rotate-90",
          )}
        />
      </CollapsibleTrigger>
      {/* Children hang off a thin tree line under the group's icon. */}
      <CollapsibleContent className="border-sidebar-border mt-0.5 ml-[1.05rem] space-y-0.5 border-l pl-2">
        {group.children.map((child) =>
          isNavGroup(child) ? (
            <SidebarNavGroup
              key={child.title}
              group={child}
              collapsed={false}
              pathname={pathname}
              isFavourite={isFavourite}
              onTogglePin={onTogglePin}
            />
          ) : (
            <SidebarLeafLink
              key={child.href}
              item={child}
              collapsed={false}
              active={isActivePath(child.href, pathname)}
              pinned={isFavourite(child.href)}
              onTogglePin={() => onTogglePin(child.href)}
              nested
            />
          ),
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

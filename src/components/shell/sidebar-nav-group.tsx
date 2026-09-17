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
import type { NavGroup } from "@/config/nav";
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
  const [open, setOpen] = useState(() =>
    group.children.some((child) => pathname === child.href),
  );
  const Icon = group.icon;

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <div className="text-sidebar-foreground/80 flex items-center justify-center rounded-md px-2 py-1.5">
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
          "text-sidebar-foreground/80 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm",
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
      <CollapsibleContent className="space-y-0.5 pt-0.5">
        {group.children.map((child) => (
          <SidebarLeafLink
            key={child.href}
            item={child}
            collapsed={false}
            active={pathname === child.href}
            pinned={isFavourite(child.href)}
            onTogglePin={() => onTogglePin(child.href)}
            indent
          />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

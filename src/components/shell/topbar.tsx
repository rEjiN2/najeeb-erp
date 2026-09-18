"use client";

import { Menu, Search } from "lucide-react";

import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { NotificationsMenu } from "./notifications-menu";
import { UserMenu } from "./user-menu";

export function Topbar({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  return (
    <header className="border-border bg-background flex h-14 shrink-0 items-center gap-3 border-b px-4">
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggleSidebar}
        aria-label="Toggle sidebar"
      >
        <Menu className="size-4" />
      </Button>

      <div className="relative hidden w-full max-w-sm sm:block">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
        <Input placeholder="Search..." className="pl-8" />
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="sm:hidden"
        aria-label="Search"
      >
        <Search className="size-4" />
      </Button>

      <div className="ml-auto flex items-center gap-1">
        <ThemeToggle />
        <NotificationsMenu />
        <UserMenu />
      </div>
    </header>
  );
}

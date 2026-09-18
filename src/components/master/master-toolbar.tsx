"use client";

import { Search } from "lucide-react";
import type { ReactNode } from "react";

import { Input } from "@/components/ui/input";

interface MasterToolbarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Extra filter controls (a Select, ToggleGroup, ...), right-aligned. */
  children?: ReactNode;
}

export function MasterToolbar({
  value,
  onChange,
  placeholder = "Search...",
  children,
}: MasterToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative w-full max-w-xs">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="pl-8"
        />
      </div>
      {children}
    </div>
  );
}

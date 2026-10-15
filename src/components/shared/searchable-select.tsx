"use client";

import { Check, ChevronsUpDown } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface SearchableSelectOption {
  value: string;
  label: string;
  /** Secondary line (e.g. a record's code); also searchable. */
  description?: string;
  /** Short tag shown beside the label (e.g. a record type); also searchable. */
  badge?: string;
  /** When set, the option is shown but can't be picked, with this as why. */
  disabledReason?: string;
}

interface SearchableSelectProps {
  value: string | null;
  onChange: (value: string | null) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  emptyText?: string;
  disabled?: boolean;
  /** Offer a "no selection" item. Off when a value is required. */
  allowClear?: boolean;
  /** Text for the "no selection" item, e.g. "Top level (no parent)". */
  clearLabel?: string;
}

// Match on what the user can see (label, description, badge) — never on the
// raw option value, which is often an opaque id. Every word typed must appear
// somewhere, so "main ajman" finds "Main Branch > Ajman Warehouse".
function filterByKeywords(_value: string, search: string, keywords?: string[]) {
  const terms = search.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return 1;
  const haystack = (keywords ?? []).join(" ").toLowerCase();
  return terms.every((term) => haystack.includes(term)) ? 1 : 0;
}

function OptionBadge({ children }: { children: string }) {
  return (
    <Badge variant="outline" className="shrink-0 font-normal">
      {children}
    </Badge>
  );
}

/**
 * A searchable single-select combobox — used wherever a master needs to
 * pick a parent record from a potentially long list (Location's Parent
 * Location, Product Group's Under, and any future self-referencing master).
 */
export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = "Select...",
  emptyText = "No results.",
  disabled,
  allowClear = true,
  clearLabel = "Clear selection",
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value) ?? null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className="w-full justify-between font-normal"
          >
            <span
              className={cn(
                "min-w-0 flex-1 truncate text-left",
                !selected && "text-muted-foreground",
              )}
              title={selected?.label}
            >
              {selected ? selected.label : placeholder}
            </span>
            {selected?.badge ? (
              <OptionBadge>{selected.badge}</OptionBadge>
            ) : null}
            <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
          </Button>
        }
      />
      <PopoverContent className="w-(--anchor-width) p-0" align="start">
        <Command filter={filterByKeywords}>
          <CommandInput placeholder="Search..." />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {allowClear && value ? (
                <CommandItem
                  value="__clear__"
                  keywords={[clearLabel]}
                  onSelect={() => {
                    onChange(null);
                    setOpen(false);
                  }}
                  className="text-muted-foreground"
                >
                  {clearLabel}
                </CommandItem>
              ) : null}
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  keywords={[
                    option.label,
                    option.description ?? "",
                    option.badge ?? "",
                  ]}
                  disabled={Boolean(option.disabledReason)}
                  title={option.disabledReason}
                  onSelect={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mt-0.5 mr-2 size-4 self-start",
                      value === option.value ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start gap-2">
                      {/* Wraps instead of truncating: for paths the end (the
                          option's own name) is the part that matters. */}
                      <span className="min-w-0 flex-1 break-words">
                        {option.label}
                      </span>
                      {option.badge ? (
                        <OptionBadge>{option.badge}</OptionBadge>
                      ) : null}
                    </span>
                    {option.description || option.disabledReason ? (
                      <span className="text-muted-foreground block truncate text-xs">
                        {option.disabledReason ?? option.description}
                      </span>
                    ) : null}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

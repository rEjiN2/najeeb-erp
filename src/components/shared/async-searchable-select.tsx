"use client";

import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

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
import { describeFailure, type ApiResult } from "@/lib/api-types";
import { cn } from "@/lib/utils";

import type { SearchableSelectOption } from "./searchable-select";

const DEBOUNCE_MS = 250;

type SearchState<O> =
  | { key: string; status: "ready"; options: O[] }
  | { key: string; status: "failed"; message: string };

interface AsyncSearchableSelectProps<O extends SearchableSelectOption> {
  value: string | null;
  /** Label for the current value — the options list may not contain it. */
  valueLabel?: string | null;
  onChange: (option: O | null) => void;
  /** Backend search; called with the typed text (debounced). */
  search: (query: string, signal: AbortSignal) => Promise<ApiResult<O[]>>;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  allowClear?: boolean;
  clearLabel?: string;
  disabled?: boolean;
  className?: string;
  /** Pinned under the results (e.g. an "Add customer" link); `close` shuts the list. */
  footer?: (close: () => void) => ReactNode;
  "aria-label"?: string;
}

/**
 * Like SearchableSelect, but the backend does the searching — for lists too
 * long to load up front (customer accounts, ...).
 */
export function AsyncSearchableSelect<O extends SearchableSelectOption>({
  value,
  valueLabel,
  onChange,
  search,
  placeholder = "Select...",
  searchPlaceholder = "Type to search...",
  emptyText = "No matches.",
  allowClear = true,
  clearLabel = "Clear selection",
  disabled,
  className,
  footer,
  "aria-label": ariaLabel,
}: AsyncSearchableSelectProps<O>) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [state, setState] = useState<SearchState<O> | null>(null);

  const key = query.trim();
  const current = open && state?.key === key ? state : null;

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      search(key, controller.signal)
        .then((result) =>
          setState(
            result.ok
              ? { key, status: "ready", options: result.data }
              : { key, status: "failed", message: describeFailure(result) },
          ),
        )
        .catch(() => {
          // Aborted by a newer keystroke or closing the list.
        });
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [open, key, search]);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setQuery("");
          // Don't flash the last results on reopen; always re-ask the backend
          // so an account created meanwhile shows up.
          setState(null);
        }
      }}
    >
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-label={ariaLabel}
            disabled={disabled}
            className={cn("w-full justify-between font-normal", className)}
          >
            <span
              className={cn(
                "min-w-0 flex-1 truncate text-left",
                !value && "text-muted-foreground",
              )}
              title={valueLabel ?? undefined}
            >
              {value ? (valueLabel ?? "Selected account") : placeholder}
            </span>
            <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
          </Button>
        }
      />
      <PopoverContent className="w-(--anchor-width) min-w-72 p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder={searchPlaceholder}
          />
          <CommandList>
            {current === null ? (
              <div className="text-muted-foreground flex items-center justify-center gap-2 py-6 text-sm">
                <Loader2 className="size-4 animate-spin" /> Searching…
              </div>
            ) : current.status === "failed" ? (
              <div
                role="alert"
                className="text-destructive px-3 py-6 text-center text-sm"
              >
                {current.message}
              </div>
            ) : (
              <>
                <CommandEmpty>{emptyText}</CommandEmpty>
                <CommandGroup>
                  {allowClear && value ? (
                    <CommandItem
                      value="__clear__"
                      onSelect={() => {
                        onChange(null);
                        setOpen(false);
                      }}
                      className="text-muted-foreground"
                    >
                      {clearLabel}
                    </CommandItem>
                  ) : null}
                  {current.options.map((option) => (
                    <CommandItem
                      key={option.value}
                      value={option.value}
                      disabled={Boolean(option.disabledReason)}
                      title={option.disabledReason}
                      onSelect={() => {
                        onChange(option);
                        setOpen(false);
                        setQuery("");
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
                          <span className="min-w-0 flex-1 break-words">
                            {option.label}
                          </span>
                          {option.badge ? (
                            <Badge
                              variant="outline"
                              className="shrink-0 font-normal"
                            >
                              {option.badge}
                            </Badge>
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
              </>
            )}
          </CommandList>
          {footer ? (
            <div className="border-t p-1">
              {footer(() => {
                setOpen(false);
                setQuery("");
              })}
            </div>
          ) : null}
        </Command>
      </PopoverContent>
    </Popover>
  );
}

"use client";

import { Loader2, Search, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { AsyncSearchableSelect } from "@/components/shared/async-searchable-select";
import { SearchableSelect } from "@/components/shared/searchable-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { startOfMonth, uaeToday } from "@/lib/datetime";

import { lineAccountSearch } from "../account-search";
import type { VoucherConfig } from "../config";
import { ACCOUNT_TYPE_BADGES } from "../constants";
import {
  DATE_PRESETS,
  DATE_PRESET_LABELS,
  DEFAULT_STATUS_FILTERS,
  METHOD_FILTERS,
  METHOD_FILTER_LABELS,
  STATUS_FILTER_LABELS,
  hasActiveFilters,
  type DatePreset,
  type MethodFilter,
  type StatusFilter,
  type VoucherFilters,
} from "../filters";
import type { AccountLookupItem, UserRef } from "../types";

const SEARCH_DEBOUNCE_MS = 300;

/** A lookup the filter needs, or why it couldn't load. */
export type Loadable<T> =
  { ok: true; data: T } | { ok: false; message: string };

interface VoucherFilterBarProps {
  config: VoucherConfig;
  filters: VoucherFilters;
  onChange: (next: Partial<VoucherFilters>) => void;
  onClear: () => void;
  busy: boolean;
  headerAccounts: Loadable<AccountLookupItem[]>;
  /** Every user, inactive ones too — for Created By and Collected By.
   * null hides those filters ("own"-scoped user). */
  users: Loadable<UserRef[]> | null;
  /** Name of the account in the "Account / party" filter, resolved server-side. */
  selectedAccountName: string | null;
}

export function VoucherFilterBar({
  config,
  filters,
  onChange,
  onClear,
  busy,
  headerAccounts,
  users,
  selectedAccountName,
}: VoucherFilterBarProps) {
  return (
    <div className="bg-card space-y-3 rounded-lg border p-3 sm:p-4">
      {config.methodSelector ? (
        <Tabs
          value={filters.method}
          onValueChange={(value) => onChange({ method: value as MethodFilter })}
        >
          <TabsList className="w-full overflow-x-auto sm:w-fit">
            {METHOD_FILTERS.map((method) => (
              <TabsTrigger key={method} value={method}>
                {method === "all" ? "All" : METHOD_FILTER_LABELS[method]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      ) : null}
      {config.statusFilters ? (
        <Tabs
          value={filters.status}
          onValueChange={(value) => onChange({ status: value as StatusFilter })}
        >
          <TabsList className="w-full overflow-x-auto sm:w-fit">
            {config.statusFilters.map((status) => (
              <TabsTrigger key={status} value={status}>
                {STATUS_FILTER_LABELS[status]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      ) : null}
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <SearchBox
          value={filters.q}
          onSearch={(q) => onChange({ q })}
          busy={busy}
          placeholder={config.copy.searchPlaceholder}
          label={`Search ${config.nounPlural}`}
        />
        <DateRangeControl filters={filters} onChange={onChange} />
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-center">
        {config.statusFilters ? null : (
          <Select
            value={filters.status}
            onValueChange={(value) =>
              value && onChange({ status: value as StatusFilter })
            }
            items={STATUS_FILTER_LABELS}
          >
            <SelectTrigger className="w-full lg:w-40" aria-label="Status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DEFAULT_STATUS_FILTERS.map((status) => (
                <SelectItem key={status} value={status}>
                  {STATUS_FILTER_LABELS[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {config.showPaymentDetails ? (
          <Select
            value={filters.method}
            onValueChange={(value) =>
              value && onChange({ method: value as MethodFilter })
            }
            items={METHOD_FILTER_LABELS}
          >
            <SelectTrigger className="w-full lg:w-36" aria-label="Method">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {METHOD_FILTERS.map((method) => (
                <SelectItem key={method} value={method}>
                  {METHOD_FILTER_LABELS[method]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}

        <div
          className="lg:w-56"
          title={headerAccounts.ok ? undefined : headerAccounts.message}
        >
          <SearchableSelect
            value={filters.headerAccountId || null}
            onChange={(value) => onChange({ headerAccountId: value ?? "" })}
            options={
              headerAccounts.ok
                ? headerAccounts.data.map((account) => ({
                    value: account.id,
                    label: account.name,
                    description: account.code,
                    badge: ACCOUNT_TYPE_BADGES[account.type] ?? account.type,
                  }))
                : []
            }
            placeholder={
              headerAccounts.ok
                ? config.copy.headerFilterAny
                : "Accounts unavailable"
            }
            emptyText="No matching accounts"
            clearLabel={config.copy.headerFilterAny}
            disabled={!headerAccounts.ok}
          />
        </div>

        <div className="lg:w-56">
          <AsyncSearchableSelect
            aria-label="Account or party"
            value={filters.accountId || null}
            valueLabel={selectedAccountName ?? "Unknown account"}
            onChange={(option) => onChange({ accountId: option?.value ?? "" })}
            search={lineAccountSearch(config.lineAccountTypes)}
            placeholder={config.copy.accountFilterPlaceholder}
            searchPlaceholder={config.copy.accountFilterSearchPlaceholder}
            emptyText={config.copy.accountFilterEmpty}
            clearLabel={config.copy.accountFilterPlaceholder}
          />
        </div>

        {users ? (
          <div className="lg:w-48" title={users.ok ? undefined : users.message}>
            <SearchableSelect
              value={filters.collectedBy || null}
              onChange={(value) => onChange({ collectedBy: value ?? "" })}
              options={
                users.ok
                  ? users.data.map((user) => ({
                      value: user.id,
                      label: user.name,
                    }))
                  : []
              }
              placeholder={
                users.ok
                  ? `${config.copy.collectorLabel}: any`
                  : "Users unavailable"
              }
              emptyText="No matching users"
              clearLabel={`${config.copy.collectorLabel}: any`}
              disabled={!users.ok}
            />
          </div>
        ) : null}

        {users ? (
          <div className="lg:w-48" title={users.ok ? undefined : users.message}>
            <SearchableSelect
              value={filters.createdBy || null}
              onChange={(value) => onChange({ createdBy: value ?? "" })}
              options={
                users.ok
                  ? users.data.map((user) => ({
                      value: user.id,
                      label: user.name,
                    }))
                  : []
              }
              placeholder={users.ok ? "Anyone" : "Users unavailable"}
              emptyText="No matching users"
              clearLabel="Created by anyone"
              disabled={!users.ok}
            />
          </div>
        ) : null}

        <MoreFilters filters={filters} onChange={onChange} />

        {hasActiveFilters(filters) ? (
          <Button variant="ghost" onClick={onClear} className="lg:ml-auto">
            <X /> Clear filters
          </Button>
        ) : null}
      </div>

      {!headerAccounts.ok || users?.ok === false ? (
        <p className="text-muted-foreground text-xs">
          {[
            !headerAccounts.ok
              ? `${config.copy.headerLabel} filter: ${headerAccounts.message}`
              : null,
            users && !users.ok ? `User filters: ${users.message}` : null,
          ]
            .filter(Boolean)
            .join(" ")}
        </p>
      ) : null}
    </div>
  );
}

function SearchBox({
  value,
  onSearch,
  busy,
  placeholder,
  label,
}: {
  value: string;
  onSearch: (q: string) => void;
  busy: boolean;
  placeholder: string;
  label: string;
}) {
  const [text, setText] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  // Follow the URL when it changes underneath (Clear filters, back button).
  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    setLastValue(value);
    setText(value);
  }

  return (
    <div className="relative w-full lg:max-w-sm">
      <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
      <Input
        type="search"
        value={text}
        onChange={(event) => {
          const next = event.target.value;
          setText(next);
          clearTimeout(timer.current);
          timer.current = setTimeout(
            () => onSearch(next.trim()),
            SEARCH_DEBOUNCE_MS,
          );
        }}
        placeholder={placeholder}
        aria-label={label}
        maxLength={100}
        className="pr-8 pl-8"
      />
      {busy ? (
        <Loader2
          className="text-muted-foreground absolute top-1/2 right-2.5 size-4 -translate-y-1/2 animate-spin"
          aria-label="Loading"
        />
      ) : null}
    </div>
  );
}

/** Preset or custom range; the report screens use it too. */
export function DateRangeControl({
  filters,
  onChange,
}: {
  filters: Pick<VoucherFilters, "range" | "from" | "to">;
  onChange: (next: Pick<VoucherFilters, "range" | "from" | "to">) => void;
}) {
  const [error, setError] = useState<string | null>(null);

  function setCustom(from: string, to: string) {
    if (from && to && from > to) {
      setError("Start date must be on or before the end date.");
      return;
    }
    setError(null);
    onChange({ range: "custom", from, to });
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start lg:ml-auto">
      <Select
        value={filters.range}
        onValueChange={(value) => {
          if (!value) return;
          const range = value as DatePreset;
          setError(null);
          if (range === "custom") {
            const today = uaeToday();
            onChange({ range, from: startOfMonth(today), to: today });
          } else {
            onChange({ range, from: "", to: "" });
          }
        }}
        items={DATE_PRESET_LABELS}
      >
        <SelectTrigger className="w-full sm:w-40" aria-label="Date range">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {DATE_PRESETS.map((preset) => (
            <SelectItem key={preset} value={preset}>
              {DATE_PRESET_LABELS[preset]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {filters.range === "custom" ? (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Input
              type="date"
              aria-label="From date"
              value={filters.from}
              max={filters.to || undefined}
              onChange={(event) => setCustom(event.target.value, filters.to)}
              className="w-full sm:w-38"
            />
            <span className="text-muted-foreground text-sm">to</span>
            <Input
              type="date"
              aria-label="To date"
              value={filters.to}
              min={filters.from || undefined}
              onChange={(event) => setCustom(filters.from, event.target.value)}
              className="w-full sm:w-38"
            />
          </div>
          {error ? (
            <p role="alert" className="text-destructive text-xs">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function MoreFilters({
  filters,
  onChange,
}: {
  filters: VoucherFilters;
  onChange: (next: Partial<VoucherFilters>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");
  const [error, setError] = useState<string | null>(null);
  const activeCount =
    (filters.amountMin !== null ? 1 : 0) + (filters.amountMax !== null ? 1 : 0);

  function parse(raw: string): number | null | "invalid" {
    if (raw.trim() === "") return null;
    const value = Number(raw);
    return Number.isFinite(value) && value >= 0 ? value : "invalid";
  }

  function apply() {
    const amountMin = parse(min);
    const amountMax = parse(max);
    if (amountMin === "invalid" || amountMax === "invalid") {
      setError("Amounts must be zero or more.");
      return;
    }
    if (amountMin !== null && amountMax !== null && amountMin > amountMax) {
      setError("Minimum can't be more than maximum.");
      return;
    }
    setError(null);
    setOpen(false);
    onChange({ amountMin, amountMax });
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          // Start from what's applied, not from a half-typed earlier attempt.
          setMin(filters.amountMin?.toString() ?? "");
          setMax(filters.amountMax?.toString() ?? "");
          setError(null);
        }
      }}
    >
      <PopoverTrigger
        render={
          <Button variant="outline" className="w-full lg:w-auto">
            <SlidersHorizontal /> More filters
            {activeCount > 0 ? (
              <Badge variant="secondary" className="ml-1 tabular-nums">
                {activeCount}
              </Badge>
            ) : null}
          </Button>
        }
      />
      <PopoverContent align="start" className="w-72 space-y-3">
        <p className="text-sm font-medium">Amount (AED)</p>
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            apply();
          }}
        >
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="amount-min">Minimum</Label>
              <Input
                id="amount-min"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={min}
                onChange={(event) => setMin(event.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="amount-max">Maximum</Label>
              <Input
                id="amount-max"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={max}
                onChange={(event) => setMax(event.target.value)}
                placeholder="Any"
              />
            </div>
          </div>
          {error ? (
            <p role="alert" className="text-destructive text-xs">
              {error}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setOpen(false);
                onChange({ amountMin: null, amountMax: null });
              }}
              disabled={activeCount === 0}
            >
              Reset
            </Button>
            <Button type="submit" size="sm">
              Apply
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}

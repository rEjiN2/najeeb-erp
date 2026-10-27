"use client";

import { Loader2, Save } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { FormErrorSummary } from "@/components/master/form-error-summary";
import { SearchableSelect } from "@/components/shared/searchable-select";
import { UnsavedChangesGuard } from "@/components/shared/unsaved-changes-guard";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { VoucherToolbar } from "@/components/voucher/voucher-toolbar";
import {
  LOCATION_TYPE_LABELS,
  type StockLocation,
} from "@/features/locations/types";
import { formatQty } from "@/features/stock/constants";
import { formatAmount } from "@/lib/format";
import { cn } from "@/lib/utils";

import { createBundling, previewBundle } from "./actions";
import {
  BUNDLING_MODE_LABELS,
  BUNDLING_PATH,
  bundlingPath,
  type BundlingMode,
} from "./constants";
import type { BundleOption, BundlePreview } from "./types";

const WHOLE = /^[1-9]\d*$/;

export function BundlingForm({
  today,
  locations,
  bundles,
  lockLocation,
}: {
  today: string;
  /** Active warehouses, stores and vans the user may bundle at. */
  locations: StockLocation[];
  /** Bundle products that have a recipe. */
  bundles: BundleOption[];
  /** Scoped users with a single location can't change it. */
  lockLocation: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<BundlingMode>("bundle");
  const [locationId, setLocationId] = useState<string | null>(
    locations.length === 1 ? locations[0]!.id : null,
  );
  const [bundleId, setBundleId] = useState<string | null>(null);
  const [qtyText, setQtyText] = useState("1");
  const [date, setDate] = useState(today);
  const [remarks, setRemarks] = useState("");
  const [updatePrice, setUpdatePrice] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();

  // The parts table for one bundle, location and quantity; `key` says which.
  const [result, setResult] = useState<{
    key: string;
    data: BundlePreview | null;
    errors: string[];
  } | null>(null);

  const qty = WHOLE.test(qtyText.trim()) ? Number(qtyText) : null;
  const bundle = bundles.find((option) => option.id === bundleId) ?? null;
  const futureDate = date > today;

  const key = `${bundleId}|${locationId}|${qty}`;
  const active = Boolean(bundleId && locationId && qty !== null);
  const loaded = result?.key === key;
  const checking = active && !loaded;
  const preview = active && loaded ? result.data : null;
  const previewError = active && loaded ? result.errors : [];

  // The parts table follows the bundle, location and quantity.
  useEffect(() => {
    if (!bundleId || !locationId || qty === null) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      previewBundle(bundleId, locationId, qty)
        .then((next) => {
          if (cancelled) return;
          setResult(
            next.ok
              ? { key, data: next.data, errors: [] }
              : { key, data: null, errors: next.messages },
          );
        })
        .catch(() => {
          if (cancelled) return;
          setResult({
            key,
            data: null,
            errors: [
              "Couldn't reach the app. Check your connection and try again.",
            ],
          });
        });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [bundleId, locationId, qty, key]);

  const shortParts = preview?.parts.filter((part) => part.short > 0) ?? [];
  const blocked = mode === "bundle" && shortParts.length > 0;
  const partsCost = preview?.parts.every((part) => part.unitCost !== undefined)
    ? preview.parts.reduce(
        (sum, part) => sum + part.requiredPerUnit * (part.unitCost ?? 0),
        0,
      )
    : null;
  const costPerBundle =
    partsCost !== null && preview?.extraCostPerUnit !== undefined
      ? partsCost + preview.extraCostPerUnit
      : null;

  function save() {
    setShowErrors(true);
    setErrors([]);
    if (
      !locationId ||
      !bundleId ||
      qty === null ||
      !date ||
      futureDate ||
      blocked ||
      checking
    ) {
      return;
    }
    startTransition(async () => {
      try {
        const result = await createBundling({
          date,
          locationId,
          mode,
          bundleProductId: bundleId,
          qty,
          updateBundlePurchasePrice: updatePrice,
          remarks,
        });
        if (!result) return; // Redirected to sign in.
        if (!result.ok) {
          setErrors(result.messages);
          return;
        }
        setLeaving(true);
        router.push(
          result.id ? `${bundlingPath(result.id)}?saved=1` : BUNDLING_PATH,
        );
      } catch {
        setErrors([
          "Couldn't reach the app. Check your connection and try again.",
        ]);
      }
    });
  }

  const touch = () => setDirty(true);

  return (
    <div className="space-y-6">
      <VoucherToolbar
        title="New Bundling"
        description="Pack parts into bundles, or break bundles back into parts."
        back={{ href: BUNDLING_PATH, label: "Bundling" }}
        actions={
          <>
            <Link
              href={BUNDLING_PATH}
              className={buttonVariants({ variant: "outline" })}
            >
              Cancel
            </Link>
            <Button onClick={save} disabled={pending || blocked || checking}>
              {pending ? <Loader2 className="animate-spin" /> : <Save />}
              {pending ? "Saving…" : "Save"}
            </Button>
          </>
        }
      />

      <FormErrorSummary messages={errors} />

      <Card className="gap-4">
        <CardContent className="grid gap-4 pt-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2 sm:col-span-2 lg:col-span-3">
            <Label>Mode</Label>
            <ToggleGroup
              value={[mode]}
              onValueChange={(value) => {
                const next = value[0] as BundlingMode | undefined;
                if (next) {
                  setMode(next);
                  touch();
                }
              }}
              variant="outline"
              aria-label="Mode"
            >
              {(["bundle", "unbundle"] as const).map((value) => (
                <ToggleGroupItem key={value} value={value}>
                  {BUNDLING_MODE_LABELS[value]}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <p className="text-muted-foreground text-xs">
              {mode === "bundle"
                ? "Takes the parts out of stock and puts the bundles in."
                : "Takes the bundles out of stock and puts the parts back."}
            </p>
          </div>
          <div className="space-y-2">
            <Label>
              Location <span className="text-destructive">*</span>
            </Label>
            <SearchableSelect
              value={locationId}
              onChange={(value) => {
                setLocationId(value);
                touch();
              }}
              options={locations.map((location) => ({
                value: location.id,
                label: location.name,
                description: location.code,
                badge: LOCATION_TYPE_LABELS[location.type],
              }))}
              placeholder="Pick a warehouse, store or van"
              emptyText="No matching locations"
              allowClear={false}
              disabled={lockLocation}
            />
            {showErrors && !locationId ? (
              <p className="text-destructive text-sm">Pick a location.</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label>
              Bundle product <span className="text-destructive">*</span>
            </Label>
            <SearchableSelect
              value={bundleId}
              onChange={(value) => {
                setBundleId(value);
                touch();
              }}
              options={bundles.map((option) => ({
                value: option.id,
                label: option.name,
                description: option.code,
                badge: option.unit ?? undefined,
              }))}
              placeholder="Pick a bundle"
              emptyText="No bundle has a recipe yet. Define one on the product."
              allowClear={false}
            />
            {showErrors && !bundleId ? (
              <p className="text-destructive text-sm">Pick a bundle.</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="bd-qty">
              Quantity <span className="text-destructive">*</span>
            </Label>
            <Input
              id="bd-qty"
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              value={qtyText}
              onChange={(event) => {
                setQtyText(event.target.value);
                touch();
              }}
              className="text-right font-mono"
              aria-invalid={showErrors && qty === null ? true : undefined}
            />
            {showErrors && qty === null ? (
              <p className="text-destructive text-sm">
                Enter a whole number of bundles, 1 or more.
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="bd-date">
              Date <span className="text-destructive">*</span>
            </Label>
            <Input
              id="bd-date"
              type="date"
              value={date}
              max={today}
              onChange={(event) => {
                setDate(event.target.value);
                touch();
              }}
              aria-invalid={showErrors && futureDate ? true : undefined}
            />
            {showErrors && futureDate ? (
              <p className="text-destructive text-sm">
                The date can&apos;t be in the future.
              </p>
            ) : null}
          </div>
          <div className="space-y-2 lg:col-span-2">
            <Label htmlFor="bd-remarks">Remarks</Label>
            <Textarea
              id="bd-remarks"
              value={remarks}
              onChange={(event) => {
                setRemarks(event.target.value);
                touch();
              }}
              placeholder="Optional"
              className="min-h-9"
            />
          </div>
          {mode === "bundle" ? (
            <Label className="flex items-center gap-2 font-normal sm:col-span-2 lg:col-span-3">
              <Checkbox
                checked={updatePrice}
                onCheckedChange={(checked) => {
                  setUpdatePrice(checked === true);
                  touch();
                }}
              />
              Update the bundle&apos;s purchase price to the cost per bundle
            </Label>
          ) : null}
        </CardContent>
      </Card>

      <Card className="gap-4">
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle>
            Parts{bundle ? ` of ${bundle.name}` : ""}
            {checking ? (
              <Loader2 className="text-muted-foreground ml-2 inline size-4 animate-spin" />
            ) : null}
          </CardTitle>
          {preview && mode === "bundle" ? (
            <p className="text-sm">
              You can make up to{" "}
              <span className="font-mono font-semibold tabular-nums">
                {formatQty(preview.maxBundles)}
              </span>
            </p>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-3">
          <FormErrorSummary messages={previewError} />
          {blocked ? (
            <p
              role="alert"
              className="border-destructive/30 bg-destructive/5 text-destructive rounded-lg border p-3 text-sm"
            >
              Not enough parts to make {qty}.{" "}
              {shortParts.map((part) => part.name).join(", ")} short. Lower the
              quantity to {formatQty(preview?.maxBundles)} or less, or bring in
              more parts.
            </p>
          ) : null}
          <div className="overflow-x-auto rounded-lg border">
            <Table className="min-w-[560px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Part</TableHead>
                  <TableHead className="text-right">Per bundle</TableHead>
                  <TableHead className="text-right">
                    {mode === "bundle" ? "Required" : "Returned"}
                  </TableHead>
                  {mode === "bundle" ? (
                    <>
                      <TableHead className="text-right">Available</TableHead>
                      <TableHead className="text-right">Short</TableHead>
                    </>
                  ) : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview?.parts.map((part) => (
                  <TableRow
                    key={part.productId}
                    className={cn(
                      mode === "bundle" && part.short > 0 && "bg-destructive/5",
                    )}
                  >
                    <TableCell>
                      <span className="text-sm font-medium">
                        {part.name ?? "Unknown product"}
                      </span>
                      <span className="text-muted-foreground block font-mono text-xs">
                        {part.code}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm tabular-nums">
                      {formatQty(part.requiredPerUnit)}{" "}
                      <span className="text-muted-foreground">{part.unit}</span>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm tabular-nums">
                      {formatQty(part.requiredTotal)}{" "}
                      <span className="text-muted-foreground">{part.unit}</span>
                    </TableCell>
                    {mode === "bundle" ? (
                      <>
                        <TableCell className="text-right font-mono text-sm tabular-nums">
                          {formatQty(part.available)}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-right font-mono text-sm tabular-nums",
                            part.short > 0 && "text-destructive font-semibold",
                          )}
                        >
                          {part.short > 0 ? formatQty(part.short) : "—"}
                        </TableCell>
                      </>
                    ) : null}
                  </TableRow>
                ))}
                {!preview ? (
                  <TableRow>
                    <TableCell
                      colSpan={mode === "bundle" ? 5 : 3}
                      className="text-muted-foreground py-8 text-center text-sm"
                    >
                      Pick a location, a bundle and a quantity to see its parts.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
          {costPerBundle !== null ? (
            <p className="text-sm">
              Parts{" "}
              <span className="font-mono tabular-nums">
                {formatAmount(partsCost ?? 0)}
              </span>{" "}
              + extra{" "}
              <span className="font-mono tabular-nums">
                {formatAmount(preview?.extraCostPerUnit ?? 0)}
              </span>{" "}
              = cost per bundle{" "}
              <span className="font-mono font-semibold tabular-nums">
                AED {formatAmount(costPerBundle)}
              </span>
              {qty !== null && qty > 1 ? (
                <span className="text-muted-foreground">
                  {" "}
                  · AED {formatAmount(costPerBundle * qty)} for {qty}
                </span>
              ) : null}
            </p>
          ) : null}
          {mode === "unbundle" ? (
            <p className="text-muted-foreground text-xs">
              The bundles must be in stock at the location; the system refuses
              if there aren&apos;t enough.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <UnsavedChangesGuard when={dirty && !leaving} />
    </div>
  );
}

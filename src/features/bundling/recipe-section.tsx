"use client";

import { Loader2, Save, Trash2 } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { FormErrorSummary } from "@/components/master/form-error-summary";
import { AsyncSearchableSelect } from "@/components/shared/async-searchable-select";
import { Button } from "@/components/ui/button";
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
import {
  toProductOption,
  type ProductOption,
} from "@/features/stock/product-search";
import type { ProductLookupItem } from "@/features/stock/types";
import { browserApi } from "@/lib/browser-api";
import { formatAmount } from "@/lib/format";

import { getPartInfo, loadRecipe, saveRecipe } from "./actions";

interface Row {
  key: string;
  productId: string;
  code: string | null;
  name: string | null;
  unit: string | null;
  qty: string;
  unitCost?: number;
}

const QTY = /^\d+(\.\d{1,3})?$/;
const MONEY = /^\d+(\.\d{1,2})?$/;

let seq = 0;
const newKey = () => `part-${++seq}`;

/** Stock products only: a bundle can't hold bundles or services. */
async function searchStockProducts(query: string, signal: AbortSignal) {
  const params = new URLSearchParams({ limit: "30", type: "stock" });
  if (query) params.set("q", query.slice(0, 100));
  const result = await browserApi<ProductLookupItem[]>(
    `/products/lookup?${params}`,
    { signal },
  );
  if (!result.ok) return result;
  return { ok: true as const, data: result.data.map(toProductOption) };
}

/**
 * A bundle's recipe: the parts and quantities that make one unit, plus an
 * extra cost per bundle. It saves on its own (PUT /products/:id/recipe,
 * bundles:manage), not with the product's Save.
 */
export function RecipeSection({
  productId,
  canManage,
  canViewCost,
}: {
  productId: string;
  /** bundles:manage */
  canManage: boolean;
  /** products:view-cost — the cost line is hidden without it. */
  canViewCost: boolean;
}) {
  const [state, setState] = useState<"loading" | "ready" | "failed">("loading");
  const [rows, setRows] = useState<Row[]>([]);
  const [extra, setExtra] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    void loadRecipe(productId).then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        setErrors(result.messages);
        setState("failed");
        return;
      }
      setRows(
        (result.recipe?.components ?? []).map((part) => ({
          key: newKey(),
          productId: part.productId,
          code: part.code,
          name: part.name,
          unit: part.unit,
          qty: String(part.qty),
          unitCost: part.unitCost,
        })),
      );
      setExtra(result.recipe ? String(result.recipe.extraCostPerUnit) : "");
      setState("ready");
    });
    return () => {
      cancelled = true;
    };
  }, [productId]);

  const edit = canManage && !pending;
  const update = (key: string, patch: Partial<Row>) =>
    setRows((prev) =>
      prev.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );

  async function addPart(option: ProductOption | null) {
    if (!option) return;
    if (option.value === productId) {
      toast.info("A bundle can't contain itself");
      return;
    }
    if (rows.some((row) => row.productId === option.value)) {
      toast.info(`${option.code} ${option.label} is already a part`);
      return;
    }
    const key = newKey();
    setRows((prev) => [
      ...prev,
      {
        key,
        productId: option.value,
        code: option.code,
        name: option.label,
        unit: option.unit,
        qty: "",
      },
    ]);
    const info = await getPartInfo(option.value);
    update(key, { unitCost: info.unitCost });
  }

  const qtyOf = (row: Row) => (QTY.test(row.qty.trim()) ? Number(row.qty) : 0);
  const extraCost = MONEY.test(extra.trim()) ? Number(extra) : 0;
  const partsCost = rows.reduce(
    (sum, row) => sum + qtyOf(row) * (row.unitCost ?? 0),
    0,
  );

  function save() {
    const problems: string[] = [];
    if (rows.length === 0) problems.push("Add at least one part.");
    if (rows.some((row) => !(qtyOf(row) > 0))) {
      problems.push("Every part needs a quantity above 0, up to 3 decimals.");
    }
    if (extra.trim() !== "" && !MONEY.test(extra.trim())) {
      problems.push("Extra cost must be 0 or more, up to 2 decimals.");
    }
    setErrors(problems);
    if (problems.length > 0) return;
    startTransition(async () => {
      try {
        const result = await saveRecipe(
          productId,
          rows.map((row) => ({ productId: row.productId, qty: qtyOf(row) })),
          extraCost,
        );
        if (!result) return; // Redirected to sign in.
        if (result.ok) {
          if (result.message) toast.success(result.message);
          setErrors([]);
        } else {
          setErrors(result.messages);
        }
      } catch {
        setErrors([
          "Couldn't reach the app. Check your connection and try again.",
        ]);
      }
    });
  }

  return (
    <section className="space-y-3 rounded-lg border p-4">
      <h3 className="text-sm font-medium">Recipe</h3>
      <p className="text-muted-foreground text-xs">
        The parts that make one bundle. Bundling at a location takes these out
        of stock and puts the bundles in.
      </p>
      {state === "loading" ? (
        <p className="text-muted-foreground flex items-center gap-2 text-sm">
          <Loader2 className="size-4 animate-spin" /> Loading the recipe…
        </p>
      ) : state === "failed" ? (
        <FormErrorSummary messages={errors} title="Couldn't load the recipe" />
      ) : (
        <>
          <FormErrorSummary messages={errors} />
          <div className="overflow-x-auto rounded-lg border">
            <Table className="min-w-[420px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Part</TableHead>
                  <TableHead className="w-36 text-right">
                    Qty per bundle
                  </TableHead>
                  <TableHead className="w-10">
                    <span className="sr-only">Remove</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.key}>
                    <TableCell className="align-top">
                      <span className="text-sm font-medium">
                        {row.name ?? "Unknown product"}
                      </span>
                      <span className="text-muted-foreground block font-mono text-xs">
                        {row.code}
                      </span>
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="flex items-center gap-2">
                        <Input
                          aria-label={`Quantity of ${row.name ?? "part"} per bundle`}
                          type="number"
                          inputMode="decimal"
                          min={0}
                          step="0.001"
                          value={row.qty}
                          onChange={(event) =>
                            update(row.key, { qty: event.target.value })
                          }
                          disabled={!edit}
                          placeholder="0"
                          className="text-right font-mono"
                        />
                        <span className="text-muted-foreground w-8 text-xs">
                          {row.unit}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="align-top">
                      {canManage ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Remove ${row.name ?? "part"}`}
                          disabled={!edit}
                          onClick={() =>
                            setRows((prev) =>
                              prev.filter((p) => p.key !== row.key),
                            )
                          }
                        >
                          <Trash2 />
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="text-muted-foreground py-6 text-center text-sm"
                    >
                      No recipe yet.
                      {canManage ? " Add the parts below." : ""}
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
          {canManage ? (
            <div className="max-w-sm">
              <AsyncSearchableSelect<ProductOption>
                aria-label="Add a part"
                value={null}
                onChange={(option) => void addPart(option)}
                search={searchStockProducts}
                placeholder="+ Add a part"
                searchPlaceholder="Search name, code or barcode…"
                emptyText="No matching stock products"
                allowClear={false}
                disabled={!edit}
              />
            </div>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="recipe-extra">
              Extra cost per bundle (AED){" "}
              <span className="text-muted-foreground font-normal">
                labour, packaging
              </span>
            </Label>
            <Input
              id="recipe-extra"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={extra}
              onChange={(event) => setExtra(event.target.value)}
              disabled={!edit}
              placeholder="0.00"
              className="max-w-40 text-right font-mono"
            />
          </div>
          {canViewCost ? (
            <p className="text-sm">
              Parts{" "}
              <span className="font-mono font-medium tabular-nums">
                {formatAmount(partsCost)}
              </span>{" "}
              + extra{" "}
              <span className="font-mono font-medium tabular-nums">
                {formatAmount(extraCost)}
              </span>{" "}
              ={" "}
              <span className="font-mono font-semibold tabular-nums">
                {formatAmount(partsCost + extraCost)}
              </span>{" "}
              per bundle
            </p>
          ) : null}
          {canManage ? (
            <Button type="button" onClick={save} disabled={pending}>
              {pending ? <Loader2 className="animate-spin" /> : <Save />}
              Save recipe
            </Button>
          ) : null}
        </>
      )}
    </section>
  );
}

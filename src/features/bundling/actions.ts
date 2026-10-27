"use server";

import { apiGet, apiSend } from "@/lib/api";
import type { MutationResult } from "@/lib/mutation";
import { runMutation } from "@/lib/run-mutation";

import { BUNDLING_PATH, bundlingPath } from "./constants";
import type {
  BundlePreview,
  BundlingInput,
  Recipe,
  RecipeComponent,
} from "./types";

// Server Actions are public endpoints: the backend checks the bundling and
// bundles:manage permissions and every rule. Its messages (not enough parts,
// "Cannot undo ...: the stock was already used or sold") are passed through.

interface Saved {
  id: string;
  voucherNo: string;
}

const FORBIDDEN = "You don't have permission to do that with bundling.";

export async function createBundling(
  input: BundlingInput,
): Promise<MutationResult> {
  const remarks = input.remarks.trim();
  return runMutation(
    apiSend<Saved>("POST", "/bundlings", {
      date: input.date,
      locationId: input.locationId,
      mode: input.mode,
      bundleProductId: input.bundleProductId,
      qty: input.qty,
      ...(input.mode === "bundle"
        ? { updateBundlePurchasePrice: input.updateBundlePurchasePrice }
        : {}),
      ...(remarks ? { remarks } : {}),
    }),
    {
      returnTo: `${BUNDLING_PATH}/new`,
      forbiddenMessage: FORBIDDEN,
      successMessage: (saved) => `Bundling ${saved.voucherNo} saved`,
      getId: (saved) => saved.id,
    },
  );
}

/** Undo: reverses the stock entries; the bundling stays, marked cancelled. */
export async function cancelBundling(
  id: string,
  reason: string,
): Promise<MutationResult> {
  return runMutation(
    apiSend<Saved>("POST", `/bundlings/${encodeURIComponent(id)}/cancel`, {
      reason: reason.trim(),
    }),
    {
      returnTo: bundlingPath(id),
      forbiddenMessage: FORBIDDEN,
      successMessage: (saved) => `Bundling ${saved.voucherNo} undone`,
    },
  );
}

interface ProductBrief {
  unit: { symbol: string } | null;
  purchasePrice?: number;
}

/** A part's unit and (with products:view-cost) purchase price; blank when
 * the product can't be read. */
export async function getPartInfo(
  productId: string,
): Promise<{ unit: string | null; unitCost?: number }> {
  const result = await apiGet<ProductBrief>(
    `/products/${encodeURIComponent(productId)}`,
  );
  if (!result.ok) return { unit: null };
  return {
    unit: result.data.unit?.symbol ?? null,
    ...(result.data.purchasePrice !== undefined
      ? { unitCost: result.data.purchasePrice }
      : {}),
  };
}

type PreviewResult =
  { ok: true; data: BundlePreview } | { ok: false; messages: string[] };

/** What packing `qty` bundles needs at the location: per part, required,
 * available and short, how many can be made, and the cost inputs. */
export async function previewBundle(
  bundleProductId: string,
  locationId: string,
  qty: number,
): Promise<PreviewResult> {
  const query = new URLSearchParams({ locationId, qty: String(qty) });
  const [availability, recipe] = await Promise.all([
    apiGet<{
      maxBundles: number;
      components: {
        productId: string;
        productCode: string | null;
        productName: string | null;
        requiredPerUnit: number;
        requiredTotal: number;
        available: number;
        short: number;
      }[];
    }>(`/bundles/${encodeURIComponent(bundleProductId)}/availability?${query}`),
    apiGet<{ extraCostPerUnit: number }>(
      `/products/${encodeURIComponent(bundleProductId)}/recipe`,
    ),
  ]);
  if (!availability.ok) {
    return {
      ok: false,
      messages:
        availability.reason === "forbidden"
          ? [FORBIDDEN]
          : availability.messages.length > 0
            ? availability.messages
            : ["Couldn't check the parts. Try again in a moment."],
    };
  }
  const info = await Promise.all(
    availability.data.components.map((part) => getPartInfo(part.productId)),
  );
  const hasCost = info.some((part) => part.unitCost !== undefined);
  return {
    ok: true,
    data: {
      maxBundles: availability.data.maxBundles,
      ...(hasCost && recipe.ok
        ? { extraCostPerUnit: recipe.data.extraCostPerUnit }
        : {}),
      parts: availability.data.components.map((part, index) => ({
        productId: part.productId,
        code: part.productCode,
        name: part.productName,
        unit: info[index]!.unit,
        requiredPerUnit: part.requiredPerUnit,
        requiredTotal: part.requiredTotal,
        available: part.available,
        short: part.short,
        ...(info[index]!.unitCost !== undefined
          ? { unitCost: info[index]!.unitCost }
          : {}),
      })),
    },
  };
}

/** The bundle's recipe with units and costs; null when it has none yet. */
export async function loadRecipe(
  productId: string,
): Promise<
  { ok: true; recipe: Recipe | null } | { ok: false; messages: string[] }
> {
  const result = await apiGet<{
    extraCostPerUnit: number;
    components: {
      productId: string;
      productCode: string | null;
      productName: string | null;
      qty: number;
    }[];
  }>(`/products/${encodeURIComponent(productId)}/recipe`);
  if (!result.ok) {
    if (result.reason === "error" && result.status === 404) {
      return { ok: true, recipe: null };
    }
    return {
      ok: false,
      messages:
        result.messages.length > 0
          ? result.messages
          : ["Couldn't load the recipe."],
    };
  }
  const info = await Promise.all(
    result.data.components.map((part) => getPartInfo(part.productId)),
  );
  const components: RecipeComponent[] = result.data.components.map(
    (part, index) => ({
      productId: part.productId,
      code: part.productCode,
      name: part.productName,
      qty: part.qty,
      ...info[index]!,
    }),
  );
  return {
    ok: true,
    recipe: { extraCostPerUnit: result.data.extraCostPerUnit, components },
  };
}

/** PUT /products/:id/recipe (bundles:manage). Replaces the whole recipe. */
export async function saveRecipe(
  productId: string,
  components: { productId: string; qty: number }[],
  extraCostPerUnit: number,
): Promise<MutationResult> {
  return runMutation(
    apiSend("PUT", `/products/${encodeURIComponent(productId)}/recipe`, {
      components,
      extraCostPerUnit,
    }),
    {
      returnTo: "/accounting-inventory/masters/products",
      forbiddenMessage: "You don't have permission to change bundle recipes.",
      successMessage: () => "Recipe saved",
    },
  );
}

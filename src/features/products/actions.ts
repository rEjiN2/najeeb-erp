"use server";

import { apiSend } from "@/lib/api";
import type { MutationResult } from "@/lib/mutation";
import { runMutation } from "@/lib/run-mutation";

import { PRODUCTS_PATH } from "./constants";
import type { Product, ProductInput, ProductStatus } from "./types";

// Server Actions are public endpoints: the backend checks products:manage and
// validates every field. Bodies are rebuilt field by field because it rejects
// unknown properties (code and image are its own).

const OPTIONS = {
  returnTo: PRODUCTS_PATH,
  forbiddenMessage: "You don't have permission to manage products.",
};

const describe = (product: Product) =>
  `Product ${product.code} ${product.name}`;

/** Blank text goes as null so clearing a field is an edit. */
function toBody(input: ProductInput) {
  return {
    name: input.name.trim(),
    productGroupId: input.productGroupId,
    type: input.type,
    unitId: input.unitId,
    barcode: input.barcode.trim() || null,
    salePrice: input.salePrice,
    ...(input.purchasePrice !== undefined
      ? { purchasePrice: input.purchasePrice }
      : {}),
    vatRate: input.vatRate,
    minStock: input.minStock,
    reorderLevel: input.reorderLevel,
    maxStock: input.maxStock,
    status: input.status,
    notes: input.notes.trim() || null,
  };
}

export async function createProduct(
  input: ProductInput,
): Promise<MutationResult> {
  return runMutation(apiSend<Product>("POST", "/products", toBody(input)), {
    ...OPTIONS,
    successMessage: (saved) => `${describe(saved)} added`,
    getId: (saved) => saved.id,
  });
}

export async function updateProduct(
  id: string,
  input: ProductInput,
): Promise<MutationResult> {
  return runMutation(
    apiSend<Product>(
      "PATCH",
      `/products/${encodeURIComponent(id)}`,
      toBody(input),
    ),
    {
      ...OPTIONS,
      successMessage: (saved) => `${describe(saved)} updated`,
      getId: (saved) => saved.id,
    },
  );
}

/** Deactivate (the way out of a blocked delete) or reactivate. */
export async function setProductStatus(
  id: string,
  status: ProductStatus,
): Promise<MutationResult> {
  return runMutation(
    apiSend<Product>("PATCH", `/products/${encodeURIComponent(id)}`, {
      status,
    }),
    {
      ...OPTIONS,
      successMessage: (saved) =>
        `${describe(saved)} ${status === "inactive" ? "deactivated" : "reactivated"}`,
    },
  );
}

export async function deleteProduct(id: string): Promise<MutationResult> {
  return runMutation(
    apiSend("DELETE", `/products/${encodeURIComponent(id)}`),
    OPTIONS,
  );
}

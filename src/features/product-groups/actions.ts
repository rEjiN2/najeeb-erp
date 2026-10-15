"use server";

import { apiSend } from "@/lib/api";
import type { MutationResult } from "@/lib/mutation";
import { runMutation } from "@/lib/run-mutation";

import { PRODUCT_GROUPS_PATH } from "./constants";
import type { ProductGroupInput, SavedProductGroup } from "./types";

// Server Actions are public endpoints: the backend authenticates the forwarded
// cookie and validates every field, so these only shape the request. The body
// is rebuilt field by field because the backend rejects unknown properties.

const OPTIONS = {
  returnTo: PRODUCT_GROUPS_PATH,
  forbiddenMessage: "You don't have permission to manage product groups.",
};

/** CreateProductGroupDto names the parent `under`. Never sends `code` — the
 * backend generates it. */
function toBody(input: ProductGroupInput) {
  return { name: input.name, under: input.parentId };
}

export async function createProductGroup(
  input: ProductGroupInput,
): Promise<MutationResult> {
  return runMutation(
    apiSend<SavedProductGroup>("POST", "/product-groups", toBody(input)),
    {
      ...OPTIONS,
      successMessage: ({ code }) => `Product group ${code} created`,
    },
  );
}

export async function updateProductGroup(
  id: string,
  input: ProductGroupInput,
): Promise<MutationResult> {
  return runMutation(
    apiSend<SavedProductGroup>(
      "PATCH",
      `/product-groups/${encodeURIComponent(id)}`,
      toBody(input),
    ),
    {
      ...OPTIONS,
      successMessage: ({ code }) => `Product group ${code} updated`,
    },
  );
}

export async function deleteProductGroup(id: string): Promise<MutationResult> {
  return runMutation(
    apiSend("DELETE", `/product-groups/${encodeURIComponent(id)}`),
    OPTIONS,
  );
}

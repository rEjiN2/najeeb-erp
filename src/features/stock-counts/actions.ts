"use server";

import { apiSend } from "@/lib/api";
import type { MutationResult } from "@/lib/mutation";
import { runMutation } from "@/lib/run-mutation";

import { STOCK_COUNTS_PATH, stockCountPath } from "./constants";
import type { CountValidationResult, StockCountInput } from "./types";

// Server Actions are public endpoints: the backend checks the stock-counts
// permissions and every rule. Its messages ("Line 3: ...", "Stock moved since
// the count for ...") are passed through for the screen to show.

interface Saved {
  id: string;
  voucherNo: string;
}

const FORBIDDEN = "You don't have permission to do that with stock counts.";

function body(input: StockCountInput) {
  const comments = input.comments.trim();
  return {
    date: input.date,
    locationId: input.locationId,
    ...(comments ? { comments } : {}),
    lines: input.lines.map((line) => ({
      productId: line.productId,
      ...(line.countedQty !== null ? { countedQty: line.countedQty } : {}),
      ...(line.reason.trim() ? { reason: line.reason.trim() } : {}),
    })),
  };
}

/** Creates the draft (id null) or saves the existing one. */
export async function saveStockCount(
  id: string | null,
  input: StockCountInput,
): Promise<MutationResult> {
  return runMutation(
    id
      ? apiSend<Saved>("PATCH", `/stock-counts/${encodeURIComponent(id)}`, {
          ...body(input),
          comments: input.comments.trim(),
        })
      : apiSend<Saved>("POST", "/stock-counts", body(input)),
    {
      returnTo: id ? stockCountPath(id) : `${STOCK_COUNTS_PATH}/new`,
      forbiddenMessage: FORBIDDEN,
      getId: (saved) => saved.id,
    },
  );
}

/** Adds every active stock product (optionally one group, only those
 * holding stock) not yet on the count. */
export async function loadStockCountProducts(
  id: string,
  options: { groupId: string | null; onlyWithStock: boolean },
): Promise<MutationResult> {
  return runMutation(
    apiSend<Saved>("POST", `/stock-counts/${encodeURIComponent(id)}/load`, {
      ...(options.groupId ? { groupId: options.groupId } : {}),
      ...(options.onlyWithStock ? { onlyWithStock: true } : {}),
    }),
    {
      returnTo: stockCountPath(id),
      forbiddenMessage: FORBIDDEN,
      getId: (saved) => saved.id,
    },
  );
}

export async function submitStockCount(id: string): Promise<MutationResult> {
  return runMutation(
    apiSend<Saved>("POST", `/stock-counts/${encodeURIComponent(id)}/submit`),
    {
      returnTo: stockCountPath(id),
      forbiddenMessage: FORBIDDEN,
      successMessage: (saved) => `Stock count ${saved.voucherNo} submitted`,
      getId: (saved) => saved.id,
    },
  );
}

export async function approveStockCount(
  id: string,
  acknowledgeMoved: boolean,
): Promise<MutationResult> {
  return runMutation(
    apiSend<Saved>("POST", `/stock-counts/${encodeURIComponent(id)}/approve`, {
      ...(acknowledgeMoved ? { acknowledgeMoved: true } : {}),
    }),
    {
      returnTo: stockCountPath(id),
      forbiddenMessage: FORBIDDEN,
      successMessage: (saved) => `Stock count ${saved.voucherNo} approved`,
    },
  );
}

export async function rejectStockCount(
  id: string,
  reason: string,
): Promise<MutationResult> {
  return runMutation(
    apiSend<Saved>("POST", `/stock-counts/${encodeURIComponent(id)}/reject`, {
      reason: reason.trim(),
    }),
    {
      returnTo: stockCountPath(id),
      forbiddenMessage: FORBIDDEN,
      successMessage: (saved) => `Stock count ${saved.voucherNo} rejected`,
    },
  );
}

export async function cancelStockCount(
  id: string,
  reason: string,
): Promise<MutationResult> {
  return runMutation(
    apiSend<Saved>("POST", `/stock-counts/${encodeURIComponent(id)}/cancel`, {
      reason: reason.trim(),
    }),
    {
      returnTo: stockCountPath(id),
      forbiddenMessage: FORBIDDEN,
      successMessage: (saved) => `Stock count ${saved.voucherNo} cancelled`,
    },
  );
}

/** Checks imported rows by product code; saves nothing. */
export async function validateStockCountRows(
  rows: { productCode: string; countedQty: number }[],
  locationId: string,
): Promise<
  { ok: true; data: CountValidationResult } | { ok: false; messages: string[] }
> {
  const result = await apiSend<CountValidationResult>(
    "POST",
    "/stock-counts/validate",
    { locationId, lines: rows },
  );
  if (result.ok) return result;
  return {
    ok: false,
    messages:
      result.reason === "forbidden"
        ? [FORBIDDEN]
        : result.messages.length > 0
          ? result.messages
          : ["Couldn't check the file. Try again in a moment."],
  };
}

"use server";

import { apiSend } from "@/lib/api";
import type { MutationResult } from "@/lib/mutation";
import { runMutation } from "@/lib/run-mutation";

import { OPENING_STOCK_PATH, openingStockPath } from "./constants";
import type { OpeningStockInput, StockValidationResult } from "./types";

// Server Actions are public endpoints: the backend checks the opening-stock
// permissions and validates every line. A refused save says
// "Line 3: ...; Line 7: ..." — the form puts each next to its row.

interface Saved {
  _id: string;
  voucherNo: string;
}

const FORBIDDEN = "You don't have permission to do that with opening stock.";

/** A blank unit cost is left out rather than sent as null. */
function toLines(input: OpeningStockInput) {
  return input.lines.map((line) => ({
    productId: line.productId,
    qty: line.qty,
    ...(line.unitCost !== null ? { unitCost: line.unitCost } : {}),
  }));
}

export async function createOpeningStock(
  input: OpeningStockInput,
): Promise<MutationResult> {
  const comments = input.comments.trim();
  return runMutation(
    apiSend<Saved>("POST", "/opening-stock", {
      asOfDate: input.asOfDate,
      locationId: input.locationId,
      ...(comments ? { comments } : {}),
      lines: toLines(input),
    }),
    {
      returnTo: `${OPENING_STOCK_PATH}/new`,
      forbiddenMessage: FORBIDDEN,
      successMessage: (saved) => `Opening stock ${saved.voucherNo} saved`,
      getId: (saved) => saved._id,
    },
  );
}

export async function updateOpeningStock(
  id: string,
  input: OpeningStockInput,
  changeNote: string,
): Promise<MutationResult> {
  const note = changeNote.trim();
  return runMutation(
    apiSend<Saved>("PATCH", `/opening-stock/${encodeURIComponent(id)}`, {
      asOfDate: input.asOfDate,
      locationId: input.locationId,
      comments: input.comments.trim(),
      lines: toLines(input),
      ...(note ? { changeNote: note } : {}),
    }),
    {
      returnTo: openingStockPath(id),
      forbiddenMessage: FORBIDDEN,
      successMessage: (saved) => `Opening stock ${saved.voucherNo} saved`,
      getId: (saved) => saved._id,
    },
  );
}

/** Takes the quantities back out; the voucher stays, marked cancelled. */
export async function cancelOpeningStock(
  id: string,
  reason: string,
): Promise<MutationResult> {
  return runMutation(
    apiSend<Saved>("POST", `/opening-stock/${encodeURIComponent(id)}/cancel`, {
      reason: reason.trim(),
    }),
    {
      returnTo: openingStockPath(id),
      forbiddenMessage: FORBIDDEN,
      successMessage: (saved) => `Opening stock ${saved.voucherNo} cancelled`,
    },
  );
}

/** Checks imported rows by product code; posts nothing. */
export async function validateOpeningStockRows(
  rows: { productCode: string; qty: number; unitCost: number | null }[],
  locationId: string | null,
  voucherId: string | null,
): Promise<
  { ok: true; data: StockValidationResult } | { ok: false; messages: string[] }
> {
  const result = await apiSend<StockValidationResult>(
    "POST",
    "/opening-stock/validate",
    {
      ...(locationId ? { locationId } : {}),
      ...(voucherId ? { voucherId } : {}),
      lines: rows.map((row) => ({
        productCode: row.productCode,
        qty: row.qty,
        ...(row.unitCost !== null ? { unitCost: row.unitCost } : {}),
      })),
    },
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

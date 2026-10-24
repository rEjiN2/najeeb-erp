"use server";

import { apiSend } from "@/lib/api";
import type { MutationResult } from "@/lib/mutation";
import { runMutation } from "@/lib/run-mutation";

import { OPENING_BALANCES_PATH, openingBalancePath } from "./constants";
import type { OpeningBalanceInput, ValidationResult } from "./types";

// Server Actions are public endpoints: the backend checks the
// opening-balances permissions and validates every line. A refused save says
// "Line 3: ...; Line 7: ..." — the form puts each next to its row.

interface Saved {
  _id: string;
  voucherNo: string;
}

const FORBIDDEN = "You don't have permission to do that with opening balances.";

/** Each amount goes on its own side only: the backend refuses both. */
function toLines(input: OpeningBalanceInput) {
  return input.lines.map((line) => ({
    accountId: line.accountId,
    ...(line.debit > 0 ? { debit: line.debit } : { credit: line.credit }),
  }));
}

export async function createOpeningBalance(
  input: OpeningBalanceInput,
): Promise<MutationResult> {
  const comments = input.comments.trim();
  return runMutation(
    apiSend<Saved>("POST", "/opening-balances", {
      asOfDate: input.asOfDate,
      ...(comments ? { comments } : {}),
      lines: toLines(input),
    }),
    {
      returnTo: `${OPENING_BALANCES_PATH}/new`,
      forbiddenMessage: FORBIDDEN,
      successMessage: (saved) => `Opening balance ${saved.voucherNo} saved`,
      getId: (saved) => saved._id,
    },
  );
}

export async function updateOpeningBalance(
  id: string,
  input: OpeningBalanceInput,
  changeNote: string,
): Promise<MutationResult> {
  const note = changeNote.trim();
  return runMutation(
    apiSend<Saved>("PATCH", `/opening-balances/${encodeURIComponent(id)}`, {
      asOfDate: input.asOfDate,
      comments: input.comments.trim(),
      lines: toLines(input),
      ...(note ? { changeNote: note } : {}),
    }),
    {
      returnTo: openingBalancePath(id),
      forbiddenMessage: FORBIDDEN,
      successMessage: (saved) => `Opening balance ${saved.voucherNo} saved`,
      getId: (saved) => saved._id,
    },
  );
}

/** Reverses the posting; the voucher stays, marked cancelled. */
export async function cancelOpeningBalance(
  id: string,
  reason: string,
): Promise<MutationResult> {
  return runMutation(
    apiSend<Saved>(
      "POST",
      `/opening-balances/${encodeURIComponent(id)}/cancel`,
      { reason: reason.trim() },
    ),
    {
      returnTo: openingBalancePath(id),
      forbiddenMessage: FORBIDDEN,
      successMessage: (saved) => `Opening balance ${saved.voucherNo} cancelled`,
    },
  );
}

/** Checks imported rows by account code; posts nothing. */
export async function validateOpeningBalanceRows(
  rows: { accountCode: string; debit: number; credit: number }[],
  voucherId: string | null,
): Promise<
  { ok: true; data: ValidationResult } | { ok: false; messages: string[] }
> {
  const result = await apiSend<ValidationResult>(
    "POST",
    "/opening-balances/validate",
    { ...(voucherId ? { voucherId } : {}), lines: rows },
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

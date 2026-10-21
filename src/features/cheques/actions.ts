"use server";

import { apiSend } from "@/lib/api";
import type { MutationResult } from "@/lib/mutation";
import { runMutation } from "@/lib/run-mutation";

import { getCheques, toChequeQuery } from "./api";
import { CHEQUES_PATH } from "./constants";
import { parseChequeFilters } from "./filters";
import type { ChequeRow } from "./types";

// Server Actions are public endpoints: the backend checks each cheques:*
// permission, the data scope and every date rule; these only shape requests.

interface SavedReceipt {
  _id: string;
  voucherNo: string;
  chequeNumber?: string | null;
}

/** 403s that explain themselves (undo is admin only) are shown as sent. */
async function step(
  id: string,
  action: "deposit" | "clear" | "return" | "undo",
  body: Record<string, unknown>,
  done: string,
): Promise<MutationResult> {
  const result = await apiSend<SavedReceipt>(
    "POST",
    `/cheques/${encodeURIComponent(id)}/${action}`,
    body,
  );
  return runMutation(Promise.resolve(result), {
    returnTo: CHEQUES_PATH,
    forbiddenMessage:
      !result.ok &&
      result.reason === "forbidden" &&
      result.messages.length > 0 &&
      result.messages[0] !== "Insufficient permissions"
        ? result.messages.join(" ")
        : `You don't have permission to ${action} cheques.`,
    successMessage: (saved) =>
      `Cheque ${saved.chequeNumber ?? ""} (${saved.voucherNo}) ${done}`,
  });
}

export async function depositCheque(
  id: string,
  input: { bankAccountId: string; date: string },
): Promise<MutationResult> {
  return step(
    id,
    "deposit",
    { bankAccountId: input.bankAccountId, date: input.date },
    "deposited",
  );
}

export async function clearCheque(
  id: string,
  input: { date: string; destinationAccountId: string },
): Promise<MutationResult> {
  return step(
    id,
    "clear",
    {
      date: input.date,
      ...(input.destinationAccountId
        ? { destinationAccountId: input.destinationAccountId }
        : {}),
    },
    "cleared",
  );
}

export async function returnCheque(
  id: string,
  input: { date: string; reason: string },
): Promise<MutationResult> {
  return step(
    id,
    "return",
    { date: input.date, reason: input.reason.trim() },
    "returned",
  );
}

export async function undoChequeStep(
  id: string,
  input: { reason: string },
): Promise<MutationResult> {
  return step(id, "undo", { reason: input.reason.trim() }, "step undone");
}

const EXPORT_PAGE_SIZE = 100;
const EXPORT_MAX_PAGES = 50;

/** Every cheque the register's current view matches, for the CSV. */
export async function exportCheques(
  search: string,
): Promise<{ ok: true; rows: ChequeRow[] } | { ok: false; message: string }> {
  const filters = parseChequeFilters(
    Object.fromEntries(new URLSearchParams(search)),
  );
  const rows: ChequeRow[] = [];
  for (let page = 1; page <= EXPORT_MAX_PAGES; page += 1) {
    const result = await getCheques(
      toChequeQuery(filters, { page, pageSize: EXPORT_PAGE_SIZE }),
    );
    if (!result.ok) {
      return {
        ok: false,
        message:
          result.reason === "forbidden"
            ? "You don't have permission to view cheques."
            : "Couldn't load the cheques. Try again in a moment.",
      };
    }
    rows.push(...result.data.items);
    if (result.data.items.length < EXPORT_PAGE_SIZE) break;
  }
  return { ok: true, rows };
}

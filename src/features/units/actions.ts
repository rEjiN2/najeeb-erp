"use server";

import { apiSend } from "@/lib/api";
import type { MutationResult } from "@/lib/mutation";
import { runMutation } from "@/lib/run-mutation";

import { UNITS_PATH } from "./constants";
import type { UnitInput } from "./types";

// The backend checks units:manage and validates; it rejects unknown fields.

interface SavedUnit {
  _id: string;
  name: string;
  symbol: string;
}

const OPTIONS = {
  returnTo: UNITS_PATH,
  forbiddenMessage: "You don't have permission to manage units.",
};

const body = (input: UnitInput) => ({
  name: input.name.trim(),
  symbol: input.symbol.trim(),
});

export async function createUnit(input: UnitInput): Promise<MutationResult> {
  return runMutation(apiSend<SavedUnit>("POST", "/units", body(input)), {
    ...OPTIONS,
    successMessage: (saved) => `Unit ${saved.symbol} added`,
  });
}

export async function updateUnit(
  id: string,
  input: UnitInput,
): Promise<MutationResult> {
  return runMutation(
    apiSend<SavedUnit>(
      "PATCH",
      `/units/${encodeURIComponent(id)}`,
      body(input),
    ),
    { ...OPTIONS, successMessage: (saved) => `Unit ${saved.symbol} updated` },
  );
}

/** Refused (409) while any product uses the unit. */
export async function deleteUnit(id: string): Promise<MutationResult> {
  return runMutation(
    apiSend("DELETE", `/units/${encodeURIComponent(id)}`),
    OPTIONS,
  );
}

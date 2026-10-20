"use server";

import { apiSend } from "@/lib/api";
import type { MutationResult } from "@/lib/mutation";
import { runMutation } from "@/lib/run-mutation";

import { CASHIERS_PATH } from "./constants";
import type { CashierInput, RawCashier } from "./types";

// Server Actions are public endpoints: the backend authenticates the forwarded
// cookie, checks cashiers:manage and validates every field. Bodies are rebuilt
// field by field because the backend rejects unknown properties (incl. code).

const OPTIONS = {
  returnTo: CASHIERS_PATH,
  forbiddenMessage: "You don't have permission to manage staff.",
};

const describe = (saved: RawCashier) => `Staff ${saved.code} ${saved.name}`;

/** "" for mobile/email is sent as is: the backend reads blank as "clear". */
function toBody(input: CashierInput) {
  return {
    name: input.name.trim(),
    mobile: input.mobile.trim(),
    email: input.email.trim(),
    status: input.status,
    staffType: input.staffType,
    settlesWithOffice: input.settlesWithOffice,
    linkedUserId: input.linkedUserId,
    locationId: input.locationId,
  };
}

export async function createCashier(
  input: CashierInput,
): Promise<MutationResult> {
  return runMutation(apiSend<RawCashier>("POST", "/cashiers", toBody(input)), {
    ...OPTIONS,
    successMessage: (saved) => `${describe(saved)} added`,
    getId: (saved) => saved._id,
  });
}

export async function updateCashier(
  id: string,
  input: CashierInput,
): Promise<MutationResult> {
  return runMutation(
    apiSend<RawCashier>(
      "PATCH",
      `/cashiers/${encodeURIComponent(id)}`,
      toBody(input),
    ),
    {
      ...OPTIONS,
      successMessage: (saved) => `${describe(saved)} updated`,
      getId: (saved) => saved._id,
    },
  );
}

/** The way out of a blocked delete: keeps the cashier and its receipts. */
export async function deactivateCashier(id: string): Promise<MutationResult> {
  return runMutation(
    apiSend<RawCashier>("PATCH", `/cashiers/${encodeURIComponent(id)}`, {
      status: "inactive",
    }),
    { ...OPTIONS, successMessage: (saved) => `${describe(saved)} deactivated` },
  );
}

export async function deleteCashier(id: string): Promise<MutationResult> {
  return runMutation(
    apiSend("DELETE", `/cashiers/${encodeURIComponent(id)}`),
    OPTIONS,
  );
}

"use server";

import { apiSend } from "@/lib/api";
import type { MutationResult } from "@/lib/mutation";
import { runMutation } from "@/lib/run-mutation";

import { ACCOUNTS_PATH } from "./constants";
import {
  ACCOUNT_TYPE_LABELS,
  type AccountInput,
  type BankDetails,
  type SavedAccount,
} from "./types";

// Server Actions are public endpoints: the backend authenticates the forwarded
// cookie and validates every field, so these only shape the request. Bodies
// are rebuilt field by field because the backend rejects unknown properties —
// including `code` and `balance`, which it owns.

const OPTIONS = {
  returnTo: ACCOUNTS_PATH,
  forbiddenMessage: "You don't have permission to manage accounts.",
};

/** Blank text fields are left out rather than saved as "". */
function cleanBankDetails(details: BankDetails): BankDetails {
  const text = (value: string | undefined) => value?.trim() || undefined;
  return {
    bankName: text(details.bankName),
    accountNumber: text(details.accountNumber),
    iban: text(details.iban),
    swiftCode: text(details.swiftCode),
    branchCode: text(details.branchCode),
    bankChargeAccountId: details.bankChargeAccountId ?? null,
    commissionPercent: details.commissionPercent,
    isMerchantAccount: details.isMerchantAccount ?? false,
  };
}

/** Only the fields the account's type allows: locationId on cash, bankDetails
 * on bank. `type` is added by create only. */
function toBody(input: AccountInput) {
  return {
    name: input.name,
    status: input.status,
    ...(input.type === "cash" ? { locationId: input.locationId } : {}),
    ...(input.type === "bank" && input.bankDetails
      ? { bankDetails: cleanBankDetails(input.bankDetails) }
      : {}),
  };
}

const describe = ({ type, code }: SavedAccount) =>
  `${ACCOUNT_TYPE_LABELS[type]} account ${code}`;

export async function createAccount(
  input: AccountInput,
): Promise<MutationResult> {
  return runMutation(
    apiSend<SavedAccount>("POST", "/accounts", {
      ...toBody(input),
      type: input.type,
    }),
    { ...OPTIONS, successMessage: (saved) => `${describe(saved)} created` },
  );
}

export async function updateAccount(
  id: string,
  input: AccountInput,
): Promise<MutationResult> {
  return runMutation(
    apiSend<SavedAccount>(
      "PATCH",
      `/accounts/${encodeURIComponent(id)}`,
      toBody(input),
    ),
    { ...OPTIONS, successMessage: (saved) => `${describe(saved)} updated` },
  );
}

/** The way out of a blocked delete: keeps the account and its history. */
export async function deactivateAccount(id: string): Promise<MutationResult> {
  return runMutation(
    apiSend<SavedAccount>("PATCH", `/accounts/${encodeURIComponent(id)}`, {
      status: "inactive",
    }),
    { ...OPTIONS, successMessage: (saved) => `${describe(saved)} deactivated` },
  );
}

export async function deleteAccount(id: string): Promise<MutationResult> {
  return runMutation(
    apiSend("DELETE", `/accounts/${encodeURIComponent(id)}`),
    OPTIONS,
  );
}

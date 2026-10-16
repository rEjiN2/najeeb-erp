"use server";

import { apiSend } from "@/lib/api";
import type { MutationResult } from "@/lib/mutation";
import { runMutation } from "@/lib/run-mutation";

import { PARTY_KIND_CONFIG } from "./constants";
import {
  ADDRESS_FIELDS,
  type Party,
  type PartyInput,
  type PartyKind,
  type PartyStatus,
  type SavedPartySummary,
} from "./types";

// Server Actions are public endpoints: the backend authenticates the forwarded
// cookie, checks parties:manage and validates every field. Bodies are rebuilt
// field by field because the backend rejects unknown properties — code,
// balance and ledger account are its own.

function options(kind: PartyKind) {
  return {
    returnTo: PARTY_KIND_CONFIG[kind].path,
    forbiddenMessage: `You don't have permission to manage ${PARTY_KIND_CONFIG[kind].noun}s.`,
  };
}

const describe = (party: Party) =>
  `${PARTY_KIND_CONFIG[party.kind].Noun} ${party.code} ${party.name}`;

const summary = (party: Party): SavedPartySummary => ({
  id: party.id,
  code: party.code,
  name: party.name,
  ledgerAccountId: party.ledgerAccountId,
});

/** Strings go as typed ("" clears); suppliers never send shipping addresses. */
function toBody(kind: PartyKind, input: PartyInput) {
  return {
    name: input.name.trim(),
    status: input.status,
    contactPerson: input.contactPerson,
    telephone: input.telephone,
    mobile: input.mobile,
    email: input.email,
    ...Object.fromEntries(ADDRESS_FIELDS.map((field) => [field, input[field]])),
    vatNumber: input.vatNumber,
    creditLimit: input.creditLimit,
    creditDays: input.creditDays,
    salesman: input.salesman,
    ...(kind === "customer"
      ? {
          shippingAddresses: (input.shippingAddresses ?? []).map((address) => ({
            label: address.label.trim(),
            telephone: address.telephone,
            ...Object.fromEntries(
              ADDRESS_FIELDS.map((field) => [field, address[field]]),
            ),
          })),
        }
      : {}),
  };
}

export async function createParty(
  kind: PartyKind,
  input: PartyInput,
): Promise<MutationResult<SavedPartySummary>> {
  return runMutation(
    apiSend<Party>("POST", "/parties", { kind, ...toBody(kind, input) }),
    {
      ...options(kind),
      successMessage: (saved) => `${describe(saved)} added`,
      getId: (saved) => saved.id,
      select: summary,
    },
  );
}

export async function updateParty(
  kind: PartyKind,
  id: string,
  input: PartyInput,
): Promise<MutationResult<SavedPartySummary>> {
  return runMutation(
    apiSend<Party>(
      "PATCH",
      `/parties/${encodeURIComponent(id)}`,
      toBody(kind, input),
    ),
    {
      ...options(kind),
      successMessage: (saved) => `${describe(saved)} updated`,
      getId: (saved) => saved.id,
      select: summary,
    },
  );
}

/** Deactivate (the way out of a blocked delete) or reactivate. */
export async function setPartyStatus(
  kind: PartyKind,
  id: string,
  status: PartyStatus,
): Promise<MutationResult> {
  return runMutation(
    apiSend<Party>("PATCH", `/parties/${encodeURIComponent(id)}`, { status }),
    {
      ...options(kind),
      successMessage: (saved) =>
        `${describe(saved)} ${status === "inactive" ? "deactivated" : "reactivated"}`,
    },
  );
}

export async function deleteParty(
  kind: PartyKind,
  id: string,
): Promise<MutationResult> {
  return runMutation(
    apiSend("DELETE", `/parties/${encodeURIComponent(id)}`),
    options(kind),
  );
}

"use server";

import { apiSend } from "@/lib/api";
import type { MutationResult } from "@/lib/mutation";
import { runMutation } from "@/lib/run-mutation";

import { LOCATIONS_PATH } from "./constants";
import {
  LOCATION_TYPE_LABELS,
  type LocationInput,
  type SavedLocation,
} from "./types";

// Server Actions are public endpoints: the backend authenticates the forwarded
// cookie and validates every field, so these only shape the request. The body
// is rebuilt field by field because the backend rejects unknown properties.

const OPTIONS = {
  returnTo: LOCATIONS_PATH,
  forbiddenMessage: "You don't have permission to manage locations.",
};

// Never sends `code` — the backend generates it.
function toBody(input: LocationInput) {
  return {
    name: input.name,
    type: input.type,
    parentId: input.parentId,
    status: input.status,
  };
}

export async function createLocation(
  input: LocationInput,
): Promise<MutationResult> {
  return runMutation(
    apiSend<SavedLocation>("POST", "/locations", toBody(input)),
    {
      ...OPTIONS,
      successMessage: ({ type, code }) =>
        `${LOCATION_TYPE_LABELS[type]} ${code} created`,
    },
  );
}

export async function updateLocation(
  id: string,
  input: LocationInput,
): Promise<MutationResult> {
  return runMutation(
    apiSend<SavedLocation>(
      "PATCH",
      `/locations/${encodeURIComponent(id)}`,
      toBody(input),
    ),
    {
      ...OPTIONS,
      successMessage: ({ type, code }) =>
        `${LOCATION_TYPE_LABELS[type]} ${code} updated`,
    },
  );
}

export async function deleteLocation(id: string): Promise<MutationResult> {
  return runMutation(
    apiSend("DELETE", `/locations/${encodeURIComponent(id)}`),
    OPTIONS,
  );
}

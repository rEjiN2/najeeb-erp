"use server";

import { apiSend } from "@/lib/api";
import type { MutationResult } from "@/lib/mutation";
import { runMutation } from "@/lib/run-mutation";

import { ROLES_PATH } from "./constants";
import type { Role, RoleInput } from "./types";

// Server Actions are public endpoints: the backend authenticates the forwarded
// cookie, checks roles:manage and validates every field (permissions must be
// in its catalog). Bodies are rebuilt field by field.

const OPTIONS = {
  returnTo: ROLES_PATH,
  forbiddenMessage: "You don't have permission to manage roles.",
};

/** "" clears the description: the backend reads blank as null. */
function toBody(input: RoleInput) {
  return {
    name: input.name.trim(),
    description: input.description.trim(),
    dataScope: input.dataScope,
    permissions: input.permissions,
  };
}

export async function createRole(input: RoleInput): Promise<MutationResult> {
  return runMutation(apiSend<Role>("POST", "/roles", toBody(input)), {
    ...OPTIONS,
    successMessage: (saved) => `Role ${saved.name} added`,
  });
}

export async function updateRole(
  id: string,
  input: RoleInput,
): Promise<MutationResult> {
  return runMutation(
    apiSend<Role>("PATCH", `/roles/${encodeURIComponent(id)}`, toBody(input)),
    {
      ...OPTIONS,
      successMessage: (saved) =>
        `Role ${saved.name} updated. Its users get the change on their next request.`,
    },
  );
}

export async function deleteRole(id: string): Promise<MutationResult> {
  return runMutation(
    apiSend("DELETE", `/roles/${encodeURIComponent(id)}`),
    OPTIONS,
  );
}

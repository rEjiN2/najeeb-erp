"use server";

import { apiSend } from "@/lib/api";
import type { MutationResult } from "@/lib/mutation";
import { runMutation } from "@/lib/run-mutation";

import { USERS_PATH } from "./constants";
import type { User, UserInput } from "./types";

// Server Actions are public endpoints: the backend authenticates the forwarded
// cookie, checks users:manage and
// validates every field. Bodies are rebuilt field by field because the
// backend rejects unknown properties.

const OPTIONS = {
  returnTo: USERS_PATH,
  forbiddenMessage: "You don't have permission to manage users.",
};

const describe = (saved: User) => `User ${saved.name}`;

export async function createUser(input: UserInput): Promise<MutationResult> {
  return runMutation(
    apiSend<User>("POST", "/users", {
      name: input.name.trim(),
      email: input.email.trim(),
      password: input.password,
      roleId: input.roleId,
      allowedCashAccountIds: input.allowedCashAccountIds,
    }),
    {
      ...OPTIONS,
      successMessage: (u) => `${describe(u)} added`,
      getId: (user) => user.id,
    },
  );
}

export async function updateUser(
  user: User,
  input: UserInput,
): Promise<MutationResult> {
  return runMutation(
    apiSend<User>("PATCH", `/users/${encodeURIComponent(user.id)}`, {
      name: input.name.trim(),
      email: input.email.trim(),
      roleId: input.roleId,
      allowedCashAccountIds: input.allowedCashAccountIds,
    }),
    { ...OPTIONS, successMessage: (u) => `${describe(u)} updated` },
  );
}

export async function deactivateUser(id: string): Promise<MutationResult> {
  return runMutation(
    apiSend<User>("POST", `/users/${encodeURIComponent(id)}/deactivate`),
    { ...OPTIONS, successMessage: (u) => `${describe(u)} deactivated` },
  );
}

export async function reactivateUser(id: string): Promise<MutationResult> {
  return runMutation(
    apiSend<User>("PATCH", `/users/${encodeURIComponent(id)}`, {
      status: "active",
    }),
    { ...OPTIONS, successMessage: (u) => `${describe(u)} reactivated` },
  );
}

/** Sets a temporary password; the user must change it at their next login. */
export async function resetUserPassword(
  id: string,
  password: string,
): Promise<MutationResult> {
  return runMutation(
    apiSend("POST", `/users/${encodeURIComponent(id)}/reset-password`, {
      password,
    }),
    {
      ...OPTIONS,
      successMessage: () =>
        "Password reset. They must change it when they next sign in.",
    },
  );
}

export async function deleteUser(id: string): Promise<MutationResult> {
  return runMutation(
    apiSend("DELETE", `/users/${encodeURIComponent(id)}`),
    OPTIONS,
  );
}

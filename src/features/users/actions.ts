"use server";

import { apiSend } from "@/lib/api";
import type { MutationResult } from "@/lib/mutation";
import { runMutation } from "@/lib/run-mutation";

import { USERS_PATH } from "./constants";
import type { User, UserInput } from "./types";

// Server Actions are public endpoints: the backend authenticates the forwarded
// cookie, checks users:manage (cashiers:manage for the cashier link) and
// validates every field. Bodies are rebuilt field by field because the
// backend rejects unknown properties.

const OPTIONS = {
  returnTo: USERS_PATH,
  forbiddenMessage: "You don't have permission to manage users.",
};

const CASHIER_OPTIONS = {
  returnTo: USERS_PATH,
  forbiddenMessage:
    "You don't have permission to manage cashiers, so the cashier link wasn't changed.",
};

const describe = (saved: User) => `User ${saved.name}`;

/**
 * The cashier link lives on the cashier (linkedUserId, one cashier per user):
 * unlink the old one first, then link the new one.
 */
async function relinkCashier(
  userId: string,
  from: string | null,
  to: string | null,
): Promise<MutationResult> {
  if (from === to) return { ok: true };
  if (from) {
    const unlinked = await runMutation(
      apiSend("PATCH", `/cashiers/${encodeURIComponent(from)}`, {
        linkedUserId: null,
      }),
      CASHIER_OPTIONS,
    );
    if (!unlinked.ok) return unlinked;
  }
  if (to) {
    return runMutation(
      apiSend("PATCH", `/cashiers/${encodeURIComponent(to)}`, {
        linkedUserId: userId,
      }),
      CASHIER_OPTIONS,
    );
  }
  return { ok: true };
}

export async function createUser(input: UserInput): Promise<MutationResult> {
  const saved = await runMutation(
    apiSend<User>("POST", "/users", {
      name: input.name.trim(),
      email: input.email.trim(),
      password: input.password,
      roleId: input.roleId,
      allowedCashAccountIds: input.allowedCashAccountIds,
    }),
    { ...OPTIONS, successMessage: describe, getId: (user) => user.id },
  );
  if (!saved.ok || !saved.id) return saved;

  const linked = await relinkCashier(saved.id, null, input.linkedCashierId);
  // The user exists now, so the form must not offer to create it again.
  return linked.ok
    ? { ...saved, message: `${saved.message} added` }
    : {
        ...saved,
        message: `${saved.message} added, but the cashier wasn't linked: ${linked.messages.join(" ")}`,
      };
}

export async function updateUser(
  user: User,
  input: UserInput,
): Promise<MutationResult> {
  const saved = await runMutation(
    apiSend<User>("PATCH", `/users/${encodeURIComponent(user.id)}`, {
      name: input.name.trim(),
      email: input.email.trim(),
      roleId: input.roleId,
      allowedCashAccountIds: input.allowedCashAccountIds,
    }),
    { ...OPTIONS, successMessage: (u) => `${describe(u)} updated` },
  );
  const linkChanged =
    (user.linkedCashier?.id ?? null) !== input.linkedCashierId;
  // Only the cashier link changed: the backend answers "No changes to save".
  const nothingElse =
    !saved.ok &&
    saved.messages.length === 1 &&
    saved.messages[0] === "No changes to save";
  if (!saved.ok && !(nothingElse && linkChanged)) return saved;

  const linked = await relinkCashier(
    user.id,
    user.linkedCashier?.id ?? null,
    input.linkedCashierId,
  );
  if (!linked.ok) return linked;
  return saved.ok
    ? saved
    : { ok: true, message: `${user.name}'s cashier link updated` };
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

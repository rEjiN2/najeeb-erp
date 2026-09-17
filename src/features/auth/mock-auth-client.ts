import type { AuthClient, LoginCredentials, Session } from "./types";

/**
 * Fetch-based implementation of AuthClient, talking to the mock /api/auth
 * routes. To move to a real backend, either change what those routes do, or
 * write a new file implementing AuthClient and swap the import in
 * auth-context.tsx — nothing else in the app needs to change.
 */
async function login(credentials: LoginCredentials): Promise<Session> {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    const body = (await response.json()) as { message?: string };
    throw new Error(body.message ?? "Unable to sign in.");
  }

  const { user } = (await response.json()) as { user: Session["user"] };
  return { user };
}

async function logout(): Promise<void> {
  await fetch("/api/auth/logout", { method: "POST" });
}

async function getSession(): Promise<Session | null> {
  const response = await fetch("/api/auth/session");
  if (!response.ok) return null;

  const { session } = (await response.json()) as { session: Session | null };
  return session;
}

export const mockAuthClient: AuthClient = { login, logout, getSession };

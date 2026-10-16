import { BACKEND_PROXY_PATH } from "./constants";
import type {
  AuthClient,
  AuthUser,
  ChangePasswordInput,
  LoginCredentials,
  Session,
} from "./types";

/**
 * Browser-side AuthClient. The session lives entirely in the httpOnly cookies
 * the backend sets — this file never sees, stores, or forwards a token.
 *
 * Requests go to the same-origin proxy (see next.config.ts), not the backend's
 * own URL, so those cookies are set on this site's domain where the auth gate
 * and server-side session check can read them.
 */

function getApiBaseUrl(): string {
  return BACKEND_PROXY_PATH;
}

/** Backend error envelope: `message` is a string, or a list for validation errors. */
async function readErrorMessage(
  response: Response,
  fallback: string,
): Promise<string> {
  try {
    const body = (await response.json()) as { message?: string | string[] };
    if (Array.isArray(body.message)) return body.message[0] ?? fallback;
    return body.message ?? fallback;
  } catch {
    return fallback;
  }
}

async function login({ email, password }: LoginCredentials): Promise<Session> {
  let response: Response;
  try {
    response = await fetch(`${getApiBaseUrl()}/auth/login`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), password }),
    });
  } catch {
    throw new Error(
      "Can't reach the server. Check your connection and try again.",
    );
  }

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Unable to sign in."));
  }

  const user = (await response.json()) as AuthUser;
  return { user };
}

async function logout(): Promise<void> {
  // Best effort: the caller sends the user to /login either way, and a failed
  // call (e.g. access token already expired) leaves no usable session behind.
  try {
    await fetch(`${getApiBaseUrl()}/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
  } catch {
    // Network failure — nothing more the client can do.
  }
}

/**
 * The cookies are httpOnly, so the browser can't inspect them; ask our own
 * route handler, which resolves the session server-side via GET /auth/me.
 */
async function getSession(): Promise<Session | null> {
  const response = await fetch("/api/auth/session", { cache: "no-store" });
  if (!response.ok) return null;

  const { session } = (await response.json()) as { session: Session | null };
  return session;
}

/**
 * Goes through the proxy like login: the backend answers with fresh cookies
 * (the old refresh token stops working), which must land in the browser.
 */
async function changePassword({
  currentPassword,
  newPassword,
}: ChangePasswordInput): Promise<Session> {
  let response: Response;
  try {
    response = await fetch(`${getApiBaseUrl()}/auth/change-password`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  } catch {
    throw new Error(
      "Can't reach the server. Check your connection and try again.",
    );
  }

  if (!response.ok) {
    throw new Error(
      await readErrorMessage(response, "Couldn't change your password."),
    );
  }

  const user = (await response.json()) as AuthUser;
  return { user };
}

export const backendAuthClient: AuthClient = {
  login,
  logout,
  getSession,
  changePassword,
};

import "server-only";

import { cookies } from "next/headers";

import {
  MOCK_SESSION_TOKEN,
  MOCK_USER,
  SESSION_COOKIE_NAME,
} from "./constants";
import type { Session } from "./types";

const THIRTY_DAYS_SECONDS = 60 * 60 * 24 * 30;

/**
 * Server-side session read. This is the one place that knows how a session
 * is represented on the wire (today: a static token cookie) — replacing the
 * mock with real backend-issued sessions means changing this file only.
 */
export async function getServerSession(): Promise<Session | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;

  if (token !== MOCK_SESSION_TOKEN) {
    return null;
  }

  return { user: MOCK_USER };
}

export async function createServerSession(rememberMe: boolean) {
  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, MOCK_SESSION_TOKEN, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    ...(rememberMe ? { maxAge: THIRTY_DAYS_SECONDS } : {}),
  });
}

export async function destroyServerSession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE_NAME);
}

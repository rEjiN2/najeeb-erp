import type { AuthUser } from "./types";

export const SESSION_COOKIE_NAME = "ala_session";

// Mock-only. Swap for real credential verification against a backend when
// one exists — nothing outside session.ts and the /api/auth routes needs to
// know how a session gets validated.
export const MOCK_CREDENTIALS = {
  email: "admin@aladates.ae",
  password: "password123",
};

export const MOCK_SESSION_TOKEN = "mock-session-token";

export const MOCK_USER: AuthUser = {
  id: "usr_1",
  name: "Admin User",
  email: MOCK_CREDENTIALS.email,
};

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

export interface Session {
  user: AuthUser;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

/**
 * Provider-agnostic auth boundary. A client component or server helper only
 * ever talks to this shape — swapping the mock implementation for a real
 * backend later is a one-file change (see mock-auth-client.ts), not a
 * rewrite of every call site.
 */
export interface AuthClient {
  login(credentials: LoginCredentials): Promise<Session>;
  logout(): Promise<void>;
  getSession(): Promise<Session | null>;
}

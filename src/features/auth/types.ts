export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: {
    id: string;
    name: string;
  };
  permissions: string[];
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
 * ever talks to this shape — the implementation behind it (backend-auth-client.ts)
 * can change without touching any call site.
 */
export interface AuthClient {
  login(credentials: LoginCredentials): Promise<Session>;
  logout(): Promise<void>;
  getSession(): Promise<Session | null>;
}

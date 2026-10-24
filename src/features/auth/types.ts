export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: {
    id: string;
    name: string;
  };
  permissions: string[];
  /** "own": sees and posts only their own vouchers (backend data-scope.ts). */
  dataScope: DataScope;
  /** Set after first login or an admin reset: only /change-password works. */
  mustChangePassword: boolean;
  settlesWithOffice: boolean;
  /** Cash/wallet accounts an "own"-scoped user may receive money into. */
  allowedCashAccounts: {
    id: string;
    code: string;
    name: string;
    type: string;
  }[];
  /** Stock locations an "own"-scoped user sees stock for. */
  allowedLocationIds?: string[];
}

export type DataScope = "own" | "all";

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
  changePassword(input: ChangePasswordInput): Promise<Session>;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

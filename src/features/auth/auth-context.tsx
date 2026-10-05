"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { backendAuthClient } from "./backend-auth-client";
import type { AuthClient, LoginCredentials, Session } from "./types";

// The single place that picks which AuthClient implementation backs the app.
const authClient: AuthClient = backendAuthClient;

interface AuthContextValue {
  session: Session | null;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<Session>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  children,
  initialSession,
}: {
  children: ReactNode;
  initialSession: Session | null;
}) {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(initialSession);
  const [isLoading, setIsLoading] = useState(false);

  const login = useCallback(async (credentials: LoginCredentials) => {
    setIsLoading(true);
    try {
      const nextSession = await authClient.login(credentials);
      setSession(nextSession);
      return nextSession;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await authClient.logout();
    setSession(null);
    router.push("/login");
    router.refresh();
  }, [router]);

  const value = useMemo<AuthContextValue>(
    () => ({ session, isLoading, login, logout }),
    [session, isLoading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

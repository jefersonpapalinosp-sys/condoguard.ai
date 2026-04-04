import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { subscribeUnauthorized } from '../../../services/authEvents';
import { clearAccessToken, setAccessToken } from '../../../services/authTokenStore';

export type AuthRole = 'admin' | 'sindico' | 'morador';

export type AuthSession = {
  token: string;
  role: AuthRole;
  expiresAt: number;
};

type LoginOptions = Partial<AuthSession>;

type AuthContextValue = {
  isAuthenticated: boolean;
  role: AuthRole | null;
  sessionExpired: boolean;
  login: (options?: LoginOptions) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  children,
  initialSession = null,
}: {
  children: ReactNode;
  initialSession?: AuthSession | null;
}) {
  const [session, setSession] = useState<AuthSession | null>(initialSession);

  const sessionExpired = Boolean(session && session.expiresAt <= Date.now());
  const tokenValid = Boolean(session && session.token.trim().length >= 16);
  const isAuthenticated = Boolean(session && !sessionExpired && tokenValid);

  useEffect(() => {
    if (initialSession?.token) {
      setAccessToken(initialSession.token);
    }

    return subscribeUnauthorized(() => {
      clearAccessToken();
      setSession(null);
    });
  }, [initialSession?.token]);

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated,
      role: session?.role ?? null,
      sessionExpired,
      login: (options) =>
        setSession(() => {
          const token = options?.token ?? `mock-token-${Date.now()}-condoguard`;
          setAccessToken(token);
          return {
            token,
            role: options?.role ?? 'admin',
            expiresAt: options?.expiresAt ?? Date.now() + 3600_000,
          };
        }),
      logout: () => {
        clearAccessToken();
        setSession(null);
      },
    }),
    [isAuthenticated, session?.role, sessionExpired],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}

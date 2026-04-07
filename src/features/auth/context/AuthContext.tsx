import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { subscribeUnauthorized } from '../../../services/authEvents';
import { clearAccessToken, persistSession, restoreSession } from '../../../services/authTokenStore';

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

const EXPIRY_CHECK_INTERVAL_MS = 60_000;
// Warn when token will expire within this window
const EXPIRY_WARN_BEFORE_MS = 5 * 60_000;

export function AuthProvider({
  children,
  initialSession = null,
}: {
  children: ReactNode;
  initialSession?: AuthSession | null;
}) {
  const [session, setSession] = useState<AuthSession | null>(() => {
    if (initialSession) return initialSession;
    const saved = restoreSession();
    if (!saved) return null;
    return { token: saved.token, expiresAt: saved.expiresAt, role: saved.role as AuthRole };
  });

  const sessionExpired = Boolean(session && session.expiresAt <= Date.now());
  const tokenValid = Boolean(session && session.token.trim().length >= 16);
  const isAuthenticated = Boolean(session && !sessionExpired && tokenValid);

  // Proactively check token expiry every minute and log out when expired
  useEffect(() => {
    if (!session) return;
    const interval = setInterval(() => {
      if (session.expiresAt <= Date.now()) {
        clearAccessToken();
        setSession(null);
      }
    }, EXPIRY_CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [session]);

  useEffect(() => {
    if (initialSession?.token) {
      persistSession(initialSession.token, initialSession.expiresAt, initialSession.role);
    }

    return subscribeUnauthorized(() => {
      clearAccessToken();
      setSession(null);
    });
  }, [initialSession?.token, initialSession?.expiresAt, initialSession?.role]);

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated,
      role: session?.role ?? null,
      sessionExpired,
      login: (options) =>
        setSession(() => {
          const token = options?.token ?? `dev-session-${Date.now()}-condoguard`;
          const expiresAt = options?.expiresAt ?? Date.now() + 3600_000;
          const role: AuthRole = options?.role ?? 'morador';
          persistSession(token, expiresAt, role);
          return { token, role, expiresAt };
        }),
      logout: () => {
        clearAccessToken();
        setSession(null);
      },
    }),
    [isAuthenticated, session?.role, sessionExpired],
  );

  // Warn user EXPIRY_WARN_BEFORE_MS before session expires
  useEffect(() => {
    if (!session || !isAuthenticated) return;
    const msUntilExpiry = session.expiresAt - Date.now();
    const msUntilWarn = msUntilExpiry - EXPIRY_WARN_BEFORE_MS;
    if (msUntilWarn <= 0) return;
    const timer = setTimeout(() => {
      // Dispatch a custom event that UI components can listen to for showing a toast
      window.dispatchEvent(new CustomEvent('cg:session-expiring-soon'));
    }, msUntilWarn);
    return () => clearTimeout(timer);
  }, [session, isAuthenticated]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}

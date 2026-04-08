import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { subscribeUnauthorized } from '../../../services/authEvents';
import { clearAccessToken, persistSession, restoreSession } from '../../../services/authTokenStore';

export type AuthRole = 'admin' | 'sindico' | 'morador';

export type AuthSession = {
  token: string;
  role: AuthRole;
  expiresAt: number;
  userName?: string | null;
};

type LoginOptions = Partial<AuthSession>;
type ResolvedAuthSession = Omit<AuthSession, 'userName'> & { userName: string };

type AuthContextValue = {
  isAuthenticated: boolean;
  role: AuthRole | null;
  userName: string;
  sessionExpired: boolean;
  login: (options?: LoginOptions) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const EXPIRY_CHECK_INTERVAL_MS = 60_000;
// Warn when token will expire within this window
const EXPIRY_WARN_BEFORE_MS = 5 * 60_000;
const DEFAULT_USER_NAME = 'Usuario logado';

function normalizeName(value: string | null | undefined) {
  const normalized = String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
  return normalized || null;
}

function deriveNameFromEmail(email: string | null | undefined) {
  const localPart = String(email ?? '')
    .split('@')[0]
    ?.replace(/[._-]+/g, ' ')
    .replace(/\d+/g, ' ')
    .trim();
  if (!localPart) return null;
  return localPart
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    if (typeof atob !== 'function') return null;
    const payload = token.split('.')[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    return JSON.parse(atob(padded)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function resolveUserName(token: string, explicitName?: string | null) {
  const preferredName = normalizeName(explicitName);
  if (preferredName) {
    return preferredName.includes('@') ? deriveNameFromEmail(preferredName) ?? DEFAULT_USER_NAME : preferredName;
  }

  const payload = decodeJwtPayload(token);
  const tokenName = normalizeName(
    typeof payload?.userName === 'string'
      ? payload.userName
      : typeof payload?.name === 'string'
        ? payload.name
        : typeof payload?.nome === 'string'
          ? payload.nome
          : null,
  );
  if (tokenName) return tokenName;

  const tokenSubject = normalizeName(typeof payload?.sub === 'string' ? payload.sub : null);
  if (tokenSubject?.includes('@')) {
    return deriveNameFromEmail(tokenSubject) ?? DEFAULT_USER_NAME;
  }

  return DEFAULT_USER_NAME;
}

export function AuthProvider({
  children,
  initialSession = null,
}: {
  children: ReactNode;
  initialSession?: AuthSession | null;
}) {
  const [session, setSession] = useState<ResolvedAuthSession | null>(() => {
    if (initialSession) {
      return {
        token: initialSession.token,
        role: initialSession.role,
        expiresAt: initialSession.expiresAt,
        userName: resolveUserName(initialSession.token, initialSession.userName),
      };
    }

    const saved = restoreSession();
    if (!saved) return null;
    return {
      token: saved.token,
      expiresAt: saved.expiresAt,
      role: saved.role as AuthRole,
      userName: resolveUserName(saved.token, saved.userName),
    };
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
      const userName = resolveUserName(initialSession.token, initialSession.userName);
      persistSession(initialSession.token, initialSession.expiresAt, initialSession.role, userName);
    }

    return subscribeUnauthorized(() => {
      clearAccessToken();
      setSession(null);
    });
  }, [initialSession?.token, initialSession?.expiresAt, initialSession?.role, initialSession?.userName]);

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated,
      role: session?.role ?? null,
      userName: session?.userName ?? DEFAULT_USER_NAME,
      sessionExpired,
      login: (options) =>
        setSession(() => {
          const token = options?.token ?? `dev-session-${Date.now()}-condoguard`;
          const expiresAt = options?.expiresAt ?? Date.now() + 3600_000;
          const role: AuthRole = options?.role ?? 'morador';
          const userName = resolveUserName(token, options?.userName);
          persistSession(token, expiresAt, role, userName);
          return { token, role, expiresAt, userName };
        }),
      logout: () => {
        clearAccessToken();
        setSession(null);
      },
    }),
    [isAuthenticated, session?.role, session?.userName, sessionExpired],
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

const SESSION_KEY = 'cg_session';

let accessToken: string | null = null;

export type StoredSession = {
  token: string;
  expiresAt: number;
  role: string;
  userName?: string;
};

function safeReadStoredSession(): StoredSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredSession;
  } catch {
    return null;
  }
}

export function getAccessToken() {
  return accessToken;
}

export function setAccessToken(token: string) {
  accessToken = token;
}

export function clearAccessToken() {
  accessToken = null;
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // sessionStorage not available (e.g. SSR or private browsing restrictions)
  }
}

export function persistSession(token: string, expiresAt: number, role: string, userName?: string) {
  setAccessToken(token);
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ token, expiresAt, role, userName }));
  } catch {
    // sessionStorage not available
  }
}

export function readStoredSession(): StoredSession | null {
  const data = safeReadStoredSession();
  if (!data?.token || !data?.expiresAt) {
    return null;
  }
  return data;
}

export function isStoredSessionExpired(session: StoredSession | null = readStoredSession()) {
  return Boolean(session?.expiresAt && session.expiresAt <= Date.now());
}

export function restoreSession(): StoredSession | null {
  const data = readStoredSession();
  if (!data) {
    return null;
  }
  if (isStoredSessionExpired(data)) {
    clearAccessToken();
    return null;
  }
  setAccessToken(data.token);
  return data;
}

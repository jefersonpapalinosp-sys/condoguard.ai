const SESSION_KEY = 'cg_session';

let accessToken: string | null = null;

export type StoredSession = {
  token: string;
  expiresAt: number;
  role: string;
  userName?: string;
};

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

export function restoreSession(): StoredSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as StoredSession;
    if (!data.token || !data.expiresAt || data.expiresAt <= Date.now()) {
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
    setAccessToken(data.token);
    return data;
  } catch {
    return null;
  }
}

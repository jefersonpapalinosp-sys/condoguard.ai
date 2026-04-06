function parseBoolean(value: string | undefined): boolean | null {
  if (!value) {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }
  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }
  return null;
}

export function isMockFallbackEnabled() {
  const explicit = parseBoolean(import.meta.env.VITE_ENABLE_MOCK_FALLBACK);
  if (explicit !== null) {
    return explicit;
  }

  const runtimeEnv = String(import.meta.env.VITE_APP_ENV ?? import.meta.env.MODE ?? 'dev').toLowerCase();
  return !['hml', 'prod', 'production'].includes(runtimeEnv);
}

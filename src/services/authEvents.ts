const UNAUTHORIZED_EVENT = 'condoguard:auth-unauthorized';

export type UnauthorizedReason = 'expired' | 'missing' | 'invalid' | 'unauthorized';

export type UnauthorizedDetail = {
  status?: number;
  code?: string;
  traceId?: string;
  message?: string;
  reason?: UnauthorizedReason;
};

export function notifyUnauthorized(detail: UnauthorizedDetail = {}) {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new CustomEvent<UnauthorizedDetail>(UNAUTHORIZED_EVENT, { detail }));
}

export function subscribeUnauthorized(listener: (detail: UnauthorizedDetail) => void) {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handler = (event: Event) => {
    const customEvent = event as CustomEvent<UnauthorizedDetail>;
    listener(customEvent.detail ?? {});
  };
  window.addEventListener(UNAUTHORIZED_EVENT, handler);
  return () => window.removeEventListener(UNAUTHORIZED_EVENT, handler);
}

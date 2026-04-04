const UNAUTHORIZED_EVENT = 'condoguard:auth-unauthorized';

export function notifyUnauthorized() {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT));
}

export function subscribeUnauthorized(listener: () => void) {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handler = () => listener();
  window.addEventListener(UNAUTHORIZED_EVENT, handler);
  return () => window.removeEventListener(UNAUTHORIZED_EVENT, handler);
}


export type ApiFallbackDetail = {
  module: string;
  message: string;
};

export type DataSourceType = 'api' | 'mock' | 'unknown';

const FALLBACK_EVENT = 'atlasgrid:api-fallback';
const SOURCE_EVENT = 'atlasgrid:data-source';

const sourceByModule = new Map<string, DataSourceType>();

export function notifyApiFallback(detail: ApiFallbackDetail) {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new CustomEvent<ApiFallbackDetail>(FALLBACK_EVENT, { detail }));
}

export function subscribeApiFallback(listener: (detail: ApiFallbackDetail) => void) {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handler = (event: Event) => {
    const customEvent = event as CustomEvent<ApiFallbackDetail>;
    listener(customEvent.detail);
  };

  window.addEventListener(FALLBACK_EVENT, handler);
  return () => window.removeEventListener(FALLBACK_EVENT, handler);
}

export function setModuleDataSource(module: string, source: DataSourceType) {
  sourceByModule.set(module, source);

  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new CustomEvent<{ module: string; source: DataSourceType }>(SOURCE_EVENT, {
    detail: { module, source },
  }));
}

export function getModuleDataSource(module: string): DataSourceType {
  return sourceByModule.get(module) ?? 'unknown';
}

export function subscribeModuleDataSource(module: string, listener: (source: DataSourceType) => void) {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handler = (event: Event) => {
    const customEvent = event as CustomEvent<{ module: string; source: DataSourceType }>;
    if (customEvent.detail.module === module) {
      listener(customEvent.detail.source);
    }
  };

  window.addEventListener(SOURCE_EVENT, handler);
  return () => window.removeEventListener(SOURCE_EVENT, handler);
}

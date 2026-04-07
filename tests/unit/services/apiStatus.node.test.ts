// @vitest-environment node
import {
  getModuleDataSource,
  notifyApiFallback,
  setModuleDataSource,
  subscribeApiFallback,
  subscribeModuleDataSource,
} from '../../../src/services/apiStatus';

describe('apiStatus in non-browser environment', () => {
  it('handles no-window branches safely', () => {
    const unsubFallback = subscribeApiFallback(() => {});
    const unsubSource = subscribeModuleDataSource('invoices', () => {});

    expect(typeof unsubFallback).toBe('function');
    expect(typeof unsubSource).toBe('function');

    expect(() => notifyApiFallback({ module: 'Test', message: 'No window' })).not.toThrow();

    setModuleDataSource('invoices', 'mock');
    expect(getModuleDataSource('invoices')).toBe('mock');

    expect(() => unsubFallback()).not.toThrow();
    expect(() => unsubSource()).not.toThrow();
  });
});


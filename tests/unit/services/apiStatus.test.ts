import {
  getModuleDataSource,
  notifyApiFallback,
  setModuleDataSource,
  subscribeApiFallback,
  subscribeModuleDataSource,
} from '../../../src/services/apiStatus';

describe('apiStatus', () => {
  it('dispatches fallback event to subscribers', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeApiFallback(listener);

    notifyApiFallback({ module: 'Faturas', message: 'API indisponivel' });

    expect(listener).toHaveBeenCalledWith({
      module: 'Faturas',
      message: 'API indisponivel',
    });

    unsubscribe();
  });

  it('stores and publishes module data source', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeModuleDataSource('invoices', listener);

    setModuleDataSource('invoices', 'api');
    expect(getModuleDataSource('invoices')).toBe('api');
    expect(listener).toHaveBeenCalledWith('api');

    unsubscribe();
  });
});


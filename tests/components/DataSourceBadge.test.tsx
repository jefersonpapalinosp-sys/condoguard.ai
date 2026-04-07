import { render, screen, waitFor } from '@testing-library/react';
import { DataSourceBadge } from '../../src/shared/ui/DataSourceBadge';
import { setModuleDataSource } from '../../src/services/apiStatus';

describe('DataSourceBadge', () => {
  it('shows unknown by default and updates when source changes', async () => {
    render(<DataSourceBadge module="invoices" />);

    expect(screen.getByText('Fonte: indefinida')).toBeInTheDocument();

    setModuleDataSource('invoices', 'api');
    await waitFor(() => {
      expect(screen.getByText('Fonte: API real')).toBeInTheDocument();
    });

    setModuleDataSource('invoices', 'mock');
    await waitFor(() => {
      expect(screen.getByText('Fonte: fallback mock')).toBeInTheDocument();
    });
  });
});


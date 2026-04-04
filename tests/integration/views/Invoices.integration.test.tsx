import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Invoices from '../../../src/views/Invoices';
import { setModuleDataSource } from '../../../src/services/apiStatus';
import { makeInvoice } from '../../factories/invoiceFactory';

vi.mock('../../../src/services/invoicesService', () => ({
  fetchInvoicesData: vi.fn(),
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('Invoices view', () => {
  it('handles loading -> success and register payment flow', async () => {
    const { fetchInvoicesData } = await import('../../../src/services/invoicesService');
    const dataPromise = deferred<{ items: Array<{ id: string; unit: string; resident: string; reference: string; dueDate: string; amount: number; status: 'pending' | 'paid' | 'overdue' }> }>();
    vi.mocked(fetchInvoicesData).mockReturnValue(dataPromise.promise);
    setModuleDataSource('invoices', 'api');

    render(<Invoices />);
    expect(screen.getByText(/Carregando modulo de faturas/i)).toBeInTheDocument();

    dataPromise.resolve({
      items: [
        makeInvoice({ id: 'inv-1', resident: 'Mariana', amount: 100 }),
      ],
    });

    expect(await screen.findByText('Faturas')).toBeInTheDocument();
    expect(screen.getByText('Fonte: API real')).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Registrar pagamento/i }));
    await waitFor(() => {
      expect(screen.getByText('Quitada')).toBeInTheDocument();
    });
  });

  it('shows empty state', async () => {
    const { fetchInvoicesData } = await import('../../../src/services/invoicesService');
    vi.mocked(fetchInvoicesData).mockResolvedValue({ items: [] });

    render(<Invoices />);

    expect(await screen.findByText('Nenhuma fatura disponivel.')).toBeInTheDocument();
  });

  it('shows error state when loader fails', async () => {
    const { fetchInvoicesData } = await import('../../../src/services/invoicesService');
    vi.mocked(fetchInvoicesData).mockRejectedValue(new Error('boom'));

    render(<Invoices />);

    expect(await screen.findByText('Falha ao carregar faturas.')).toBeInTheDocument();
  });
});

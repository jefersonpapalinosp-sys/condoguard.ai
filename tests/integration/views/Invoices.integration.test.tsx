import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Invoices from '../../../src/views/Invoices';
import { setModuleDataSource } from '../../../src/services/apiStatus';
import { makeInvoice } from '../../factories/invoiceFactory';

vi.mock('../../../src/services/invoicesService', () => ({
  fetchInvoicesData: vi.fn(),
  markInvoiceAsPaid: vi.fn(),
}));

describe('Invoices view', () => {
  it('handles loading -> success and register payment flow', async () => {
    const { fetchInvoicesData, markInvoiceAsPaid } = await import('../../../src/services/invoicesService');
    const pendingItem = makeInvoice({ id: 'inv-1', resident: 'Mariana', amount: 100, status: 'pending' });
    const paidItem = makeInvoice({ id: 'inv-1', resident: 'Mariana', amount: 100, status: 'paid' });
    let reloadAfterPay = false;

    vi.mocked(fetchInvoicesData).mockImplementation(async () => ({
      items: [reloadAfterPay ? paidItem : pendingItem],
    }));
    vi.mocked(markInvoiceAsPaid).mockImplementation(async () => {
      reloadAfterPay = true;
      return { item: paidItem };
    });
    setModuleDataSource('invoices', 'api');

    render(<Invoices />);
    expect(await screen.findByText('Faturas')).toBeInTheDocument();
    expect(screen.getByText('Fonte: API real')).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Registrar pagamento/i }));
    await waitFor(() => {
      expect(markInvoiceAsPaid).toHaveBeenCalledWith('inv-1');
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

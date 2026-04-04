import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Alerts from '../../../src/views/Alerts';

vi.mock('../../../src/services/alertsService', () => ({
  fetchAlertsData: vi.fn(),
}));

describe('Alerts view', () => {
  it('renders success state and filters by severity', async () => {
    const { fetchAlertsData } = await import('../../../src/services/alertsService');
    vi.mocked(fetchAlertsData).mockResolvedValue({
      activeCount: 2,
      items: [
        { id: 'a1', severity: 'critical', title: 'Critico', description: 'desc', time: 'agora' },
        { id: 'a2', severity: 'info', title: 'Info', description: 'desc', time: 'agora' },
      ],
    });

    render(<Alerts />);

    expect(await screen.findByText('Central de alertas')).toBeInTheDocument();
    expect(screen.getAllByText('Critico').length).toBeGreaterThan(0);
    expect(screen.getByText('Info')).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Informativo' }));
    expect(screen.queryByRole('heading', { name: 'Critico' })).not.toBeInTheDocument();
    expect(screen.getByText('Info')).toBeInTheDocument();
  });

  it('shows error state', async () => {
    const { fetchAlertsData } = await import('../../../src/services/alertsService');
    vi.mocked(fetchAlertsData).mockRejectedValue(new Error('nope'));

    render(<Alerts />);

    expect(await screen.findByText('Falha ao carregar alertas.')).toBeInTheDocument();
  });
});

import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Dashboard from '../../../src/views/Dashboard';

vi.mock('../../../src/services/mockApi', () => ({
  getDashboardData: vi.fn(),
}));

describe('Dashboard view', () => {
  it('shows forbidden message when redirected without permission', async () => {
    const { getDashboardData } = await import('../../../src/services/mockApi');
    vi.mocked(getDashboardData).mockResolvedValue({
      metrics: {
        activeAlerts: 1,
        monthlySavings: 'R$ 1.200',
        currentConsumption: '85%',
        pendingContracts: 2,
      },
      recentAlerts: [
        { id: 'a1', level: 'critical', title: 'Alerta', subtitle: 'Sub', time: 'agora' },
      ],
    });

    render(
      <MemoryRouter initialEntries={[{ pathname: '/dashboard', state: { forbidden: true } }]}>
        <Dashboard />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Acesso restrito por perfil')).toBeInTheDocument();
  });
});

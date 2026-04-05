import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Observability from '../../../src/views/Observability';

vi.mock('../../../src/services/observabilityService', () => ({
  fetchObservabilityMetrics: vi.fn(),
}));

describe('Observability view', () => {
  it('loads metrics and allows changing limits with manual reload', async () => {
    const { fetchObservabilityMetrics } = await import('../../../src/services/observabilityService');
    vi.mocked(fetchObservabilityMetrics).mockResolvedValue({
      generatedAt: '2026-04-05T12:00:00.000Z',
      startedAt: '2026-04-05T11:00:00.000Z',
      counters: {
        totalRequests: 12,
        totalErrors: 1,
        errorRatePct: 8.33,
      },
      latency: {
        avgMs: 90.12,
        p95Ms: 210.31,
        maxMs: 320.77,
        samples: 12,
      },
      statusClasses: {
        '2xx': 10,
        '3xx': 0,
        '4xx': 1,
        '5xx': 1,
        other: 0,
      },
      topRoutes: [{ route: '/api/alerts', requests: 5, errors: 1, avgLatencyMs: 100.1, maxLatencyMs: 200.2 }],
      errorCodes: [{ code: 'FORBIDDEN', count: 1 }],
    });

    render(<Observability />);
    expect(await screen.findByText('Observabilidade')).toBeInTheDocument();
    expect(fetchObservabilityMetrics).toHaveBeenCalledWith(10, 10);

    const user = userEvent.setup();
    await user.selectOptions(screen.getByLabelText('Limite de rotas'), '20');
    await waitFor(() => {
      expect(fetchObservabilityMetrics).toHaveBeenLastCalledWith(20, 10);
    });

    await user.selectOptions(screen.getByLabelText('Limite de codigos'), '5');
    await waitFor(() => {
      expect(fetchObservabilityMetrics).toHaveBeenLastCalledWith(20, 5);
    });

    const callsBeforeReload = vi.mocked(fetchObservabilityMetrics).mock.calls.length;
    await user.click(screen.getByRole('button', { name: 'Recarregar' }));
    await waitFor(() => {
      expect(vi.mocked(fetchObservabilityMetrics).mock.calls.length).toBeGreaterThan(callsBeforeReload);
    });
  });
});

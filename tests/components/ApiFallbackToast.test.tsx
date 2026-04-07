import { render, screen } from '@testing-library/react';
import { act } from 'react';
import { ApiFallbackToast } from '../../src/shared/ui/ApiFallbackToast';
import { notifyApiFallback } from '../../src/services/apiStatus';

describe('ApiFallbackToast', () => {
  it('shows toast when fallback event is emitted and auto-hides', async () => {
    vi.useFakeTimers();
    render(<ApiFallbackToast />);

    act(() => {
      notifyApiFallback({ module: 'Faturas', message: 'API indisponivel' });
    });

    expect(screen.getByText('Aviso de conectividade')).toBeInTheDocument();
    expect(screen.getByText(/Faturas: API indisponivel/i)).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3600);
    });
    expect(screen.queryByText('Aviso de conectividade')).not.toBeInTheDocument();
    vi.useRealTimers();
  });
});

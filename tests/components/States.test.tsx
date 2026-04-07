import { render, screen } from '@testing-library/react';
import { LoadingState } from '../../src/shared/ui/states/LoadingState';
import { ErrorState } from '../../src/shared/ui/states/ErrorState';
import { EmptyState } from '../../src/shared/ui/states/EmptyState';

describe('UI states', () => {
  it('renders loading, error and empty messages', () => {
    const { rerender } = render(<LoadingState message="Carregando teste..." />);
    expect(screen.getByText('Carregando teste...')).toBeInTheDocument();

    rerender(<ErrorState message="Erro customizado." />);
    expect(screen.getByText('Erro')).toBeInTheDocument();
    expect(screen.getByText('Erro customizado.')).toBeInTheDocument();

    rerender(<EmptyState message="Sem dados." />);
    expect(screen.getByText('Sem dados.')).toBeInTheDocument();
  });
});


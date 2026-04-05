import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider, type AuthSession } from '../../../src/features/auth/context/AuthContext';
import { AppLayout } from '../../../src/features/layout/components/AppLayout';

vi.mock('../../../src/shared/ui/ChatbotWidget', () => ({
  ChatbotWidget: () => <div data-testid="chatbot-widget" />,
}));

vi.mock('../../../src/shared/ui/ApiFallbackToast', () => ({
  ApiFallbackToast: () => <div data-testid="api-fallback-toast" />,
}));

function renderLayout(initialSession: AuthSession) {
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <AuthProvider initialSession={initialSession}>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route path="dashboard" element={<div>DASHBOARD CONTENT</div>} />
          </Route>
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('AppLayout role-based navigation', () => {
  it('hides invoices and management for morador', async () => {
    renderLayout({
      token: 'valid-token-condoguard',
      role: 'morador',
      expiresAt: Date.now() + 60_000,
    });

    expect(await screen.findByText('Dashboard')).toBeInTheDocument();
    expect(screen.queryByText('Faturas')).not.toBeInTheDocument();
    expect(screen.queryByText('Gestao')).not.toBeInTheDocument();
    expect(screen.getByText('Alertas')).toBeInTheDocument();
  });

  it('shows invoices and management for admin', async () => {
    renderLayout({
      token: 'valid-token-condoguard',
      role: 'admin',
      expiresAt: Date.now() + 60_000,
    });

    expect(await screen.findByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Faturas')).toBeInTheDocument();
    expect(screen.getByText('Gestao')).toBeInTheDocument();
  });
});

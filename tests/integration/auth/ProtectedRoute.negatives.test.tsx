import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider, type AuthSession } from '../../../src/features/auth/context/AuthContext';
import { ProtectedRoute } from '../../../src/features/auth/components/ProtectedRoute';

function renderProtected({
  initialSession,
  requiredRoles,
}: {
  initialSession: AuthSession | null;
  requiredRoles?: Array<'admin' | 'sindico' | 'morador'>;
}) {
  return render(
    <MemoryRouter initialEntries={['/restricted']}>
      <AuthProvider initialSession={initialSession}>
        <Routes>
          <Route path="/login" element={<div>LOGIN PAGE</div>} />
          <Route path="/dashboard" element={<div>DASHBOARD PAGE</div>} />
          <Route
            path="/restricted"
            element={
              <ProtectedRoute requiredRoles={requiredRoles}>
                <div>RESTRICTED CONTENT</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('ProtectedRoute negative scenarios', () => {
  it('redirects to login when token is invalid', async () => {
    renderProtected({
      initialSession: {
        token: 'short-token',
        role: 'admin',
        expiresAt: Date.now() + 60_000,
      },
    });

    expect(await screen.findByText('LOGIN PAGE')).toBeInTheDocument();
  });

  it('redirects to login when session is expired', async () => {
    renderProtected({
      initialSession: {
        token: 'valid-token-condoguard',
        role: 'admin',
        expiresAt: Date.now() - 1_000,
      },
    });

    expect(await screen.findByText('LOGIN PAGE')).toBeInTheDocument();
  });

  it('redirects to dashboard when user has no permission', async () => {
    renderProtected({
      initialSession: {
        token: 'valid-token-condoguard',
        role: 'morador',
        expiresAt: Date.now() + 60_000,
      },
      requiredRoles: ['admin'],
    });

    expect(await screen.findByText('DASHBOARD PAGE')).toBeInTheDocument();
  });
});


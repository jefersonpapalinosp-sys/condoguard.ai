import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from '../../../src/features/auth/context/AuthContext';
import { notifyUnauthorized } from '../../../src/services/authEvents';

function AuthConsumer() {
  const { isAuthenticated, sessionExpired, login, logout } = useAuth();
  return (
    <div>
      <span data-testid="auth-state">{String(isAuthenticated)}</span>
      <span data-testid="expired-state">{String(sessionExpired)}</span>
      <button onClick={() => login()}>login</button>
      <button onClick={logout}>logout</button>
    </div>
  );
}

describe('AuthContext', () => {
  it('toggles authenticated state', async () => {
    const user = userEvent.setup();
    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    );

    expect(screen.getByTestId('auth-state')).toHaveTextContent('false');
    expect(screen.getByTestId('expired-state')).toHaveTextContent('false');
    await user.click(screen.getByText('login'));
    expect(screen.getByTestId('auth-state')).toHaveTextContent('true');
    await user.click(screen.getByText('logout'));
    expect(screen.getByTestId('auth-state')).toHaveTextContent('false');
    expect(screen.getByTestId('expired-state')).toHaveTextContent('false');
  });

  it('throws when useAuth is used outside provider', () => {
    expect(() => render(<AuthConsumer />)).toThrow(/useAuth must be used inside AuthProvider/i);
  });

  it('forces logout when API unauthorized event is emitted (401 flow)', async () => {
    const user = userEvent.setup();
    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    );

    await user.click(screen.getByText('login'));
    expect(screen.getByTestId('auth-state')).toHaveTextContent('true');

    notifyUnauthorized();
    expect(await screen.findByTestId('auth-state')).toHaveTextContent('false');
  });

  it('marks session as expired when unauthorized event indicates expired token', async () => {
    const user = userEvent.setup();
    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    );

    await user.click(screen.getByText('login'));
    expect(screen.getByTestId('auth-state')).toHaveTextContent('true');

    notifyUnauthorized({ reason: 'expired', code: 'INVALID_TOKEN' });
    expect(await screen.findByTestId('auth-state')).toHaveTextContent('false');
    expect(screen.getByTestId('expired-state')).toHaveTextContent('true');
  });
});

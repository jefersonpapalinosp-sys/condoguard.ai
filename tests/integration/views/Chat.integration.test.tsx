import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Chat from '../../../src/views/Chat';
import { AuthProvider } from '../../../src/features/auth/context/AuthContext';

vi.mock('../../../src/services/chatService', () => ({
  fetchChatBootstrap: vi.fn(),
  fetchChatTelemetry: vi.fn(),
  postChatMessage: vi.fn(),
  sendChatFeedback: vi.fn(),
}));

function renderChat() {
  return render(
    <AuthProvider
      initialSession={{
        token: 'test-token-1234567890',
        role: 'admin',
        expiresAt: Date.now() + 60_000,
      }}
    >
      <Chat />
    </AuthProvider>,
  );
}

describe('Chat view', () => {
  beforeEach(() => {
    Object.defineProperty(window.HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    });
  });

  it('renders bootstrap and sends user message', async () => {
    const { fetchChatBootstrap, fetchChatTelemetry, postChatMessage } = await import('../../../src/services/chatService');
    vi.mocked(fetchChatBootstrap).mockResolvedValue({
      welcomeMessage: 'Bem-vinda!',
      suggestions: [{ id: 's1', label: 'Resumo', prompt: 'Resumo do dia' }],
    });
    vi.mocked(fetchChatTelemetry).mockResolvedValue(null);
    vi.mocked(postChatMessage).mockResolvedValue({
      id: 'assistant-1',
      role: 'assistant',
      text: 'Resposta do bot',
      time: '10:00',
    });

    renderChat();

    expect(await screen.findByRole('heading', { name: /Atlas Assist/i })).toBeInTheDocument();
    expect(screen.getAllByText('Atlas Assist').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Resumo' })).toBeInTheDocument();

    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText(/Digite uma pergunta/i), 'Quais alertas?');
    await user.click(screen.getByRole('button', { name: 'Enviar' }));

    await waitFor(() => {
      expect(screen.getByText('Quais alertas?')).toBeInTheDocument();
      expect(screen.getByText('Resposta do bot')).toBeInTheDocument();
    });
  }, 15000);

  it('shows error state when bootstrap fails', async () => {
    const { fetchChatBootstrap, fetchChatTelemetry } = await import('../../../src/services/chatService');
    vi.mocked(fetchChatBootstrap).mockRejectedValue(new Error('boom'));
    vi.mocked(fetchChatTelemetry).mockResolvedValue(null);

    renderChat();

    expect(await screen.findByText('Falha ao carregar assistente de chat.')).toBeInTheDocument();
  });
});

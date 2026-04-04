import { FormEvent, useEffect, useMemo, useState } from 'react';
import { fetchChatBootstrap, postChatMessage } from '../../services/chatService';
import type { ChatMessage } from '../../services/mockApi';

function nowTime() {
  return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

type ChatbotWidgetProps = {
  hidden?: boolean;
};

export function ChatbotWidget({ hidden = false }: ChatbotWidgetProps) {
  const [expanded, setExpanded] = useState(true);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    let active = true;

    async function loadBootstrap() {
      try {
        setLoading(true);
        const bootstrap = await fetchChatBootstrap();
        if (!active) {
          return;
        }
        setMessages([
          {
            id: `welcome-${Date.now()}`,
            role: 'assistant',
            text: bootstrap.welcomeMessage,
            time: nowTime(),
          },
        ]);
        setError(null);
      } catch {
        if (active) {
          setError('Falha ao inicializar o assistente.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadBootstrap();

    return () => {
      active = false;
    };
  }, []);

  const canSend = useMemo(() => text.trim().length > 0 && !sending, [sending, text]);
  const totalMessages = messages.length;

  async function handleSend(content: string) {
    const message = content.trim();
    if (!message || sending) {
      return;
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: message,
      time: nowTime(),
    };

    setMessages((current) => [...current, userMessage]);
    setText('');
    setSending(true);

    try {
      const reply = await postChatMessage(message);
      setMessages((current) => [...current, reply]);
    } finally {
      setSending(false);
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void handleSend(text);
  }

  if (hidden) {
    return null;
  }

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="fixed bottom-4 right-4 z-40 flex h-12 w-[240px] items-center justify-between rounded-full monolith-gradient px-4 text-white shadow-xl"
        aria-label="Abrir chat"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface text-on-surface">
            <span className="material-symbols-outlined text-[16px]">smart_toy</span>
          </div>
          <span className="text-sm font-semibold">CondoGuard.ia</span>
        </div>
        <div className="flex items-center gap-1 text-on-primary/90">
          <span className="material-symbols-outlined text-[18px]">expand_less</span>
          <span className="material-symbols-outlined text-[18px]">expand_less</span>
        </div>
      </button>
    );
  }

  return (
    <section className="fixed bottom-4 right-4 z-40 w-[calc(100vw-1rem)] max-w-[360px] overflow-hidden rounded-3xl border border-outline-variant/40 bg-surface shadow-2xl">
      <header className="flex items-center justify-between monolith-gradient px-3 py-3 text-on-primary">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface text-on-surface">
            <span className="material-symbols-outlined text-[18px]">smart_toy</span>
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">CondoGuard.ia</p>
            <p className="text-[11px] text-on-primary/80">Online - CondoGuard</p>
          </div>
          <span className="ml-1 shrink-0 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold text-on-primary/90">
            {totalMessages} mensagens
          </span>
        </div>

        <div className="ml-2 flex items-center gap-1">
          <button
            aria-label="Minimizar chat"
            className="rounded-full p-1 hover:bg-white/15"
            onClick={() => setExpanded(false)}
          >
            <span className="material-symbols-outlined text-[17px]">expand_more</span>
          </button>
          <button
            aria-label="Expandir"
            className="rounded-full p-1 hover:bg-white/15"
            onClick={() => setExpanded(false)}
          >
            <span className="material-symbols-outlined text-[17px]">open_in_full</span>
          </button>
          <button
            aria-label="Fechar"
            className="rounded-full p-1 hover:bg-white/15"
            onClick={() => setExpanded(false)}
          >
            <span className="material-symbols-outlined text-[17px]">close</span>
          </button>
        </div>
      </header>

      <div className="h-[330px] overflow-y-auto bg-surface-container-low px-3 py-3">
        {loading ? <p className="text-xs text-on-surface-variant">Inicializando assistente...</p> : null}
        {error ? <p className="text-xs text-red-600">{error}</p> : null}

        <div className="space-y-3">
          {messages.map((message) => (
            <article
              key={message.id}
              className={`max-w-[92%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                message.role === 'assistant'
                  ? 'bg-surface text-on-surface shadow-sm'
                  : 'ml-auto bg-primary text-on-primary'
              }`}
            >
              <p>{message.text}</p>
              <span
                className={`mt-1 block text-[10px] ${
                  message.role === 'assistant' ? 'text-on-surface-variant' : 'text-on-primary/80'
                }`}
              >
                {message.time}
              </span>
            </article>
          ))}
          {sending ? <p className="text-[11px] text-on-surface-variant">Assistente digitando...</p> : null}
        </div>
      </div>

      <form onSubmit={onSubmit} className="border-t border-outline-variant/40 bg-surface-container-low px-3 py-3">
        <div className="rounded-2xl border border-outline-variant/50 bg-surface-container p-2">
          <div className="mb-2 flex items-center gap-3 text-on-surface-variant">
            <span className="material-symbols-outlined text-[17px]">attach_file</span>
            <span className="material-symbols-outlined text-[17px]">note_add</span>
            <span className="material-symbols-outlined text-[17px]">mic</span>
          </div>

          <div className="flex items-center gap-2">
            <input
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Digite sua mensagem..."
              className="h-11 flex-1 rounded-2xl border border-outline-variant/50 bg-surface px-3 text-sm outline-none focus:border-primary-fixed"
            />
            <button
              type="submit"
              disabled={!canSend}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-fixed text-on-primary-fixed disabled:opacity-40"
              aria-label="Enviar mensagem"
            >
              <span className="material-symbols-outlined text-[18px]">send</span>
            </button>
          </div>

          <p className="mt-2 text-[10px] text-on-surface-variant">Enter envia - Shift + Enter quebra linha</p>
        </div>
      </form>
    </section>
  );
}

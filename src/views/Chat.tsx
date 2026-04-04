import { FormEvent, useEffect, useMemo, useState } from 'react';
import { fetchChatBootstrap, postChatMessage } from '../services/chatService';
import type { ChatMessage, ChatSuggestion } from '../services/mockApi';
import { DataSourceBadge } from '../shared/ui/DataSourceBadge';
import { EmptyState } from '../shared/ui/states/EmptyState';
import { ErrorState } from '../shared/ui/states/ErrorState';
import { LoadingState } from '../shared/ui/states/LoadingState';

function nowTime() {
  return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export default function Chat() {
  const [suggestions, setSuggestions] = useState<ChatSuggestion[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        const response = await fetchChatBootstrap();
        if (active) {
          setSuggestions(response.suggestions);
          setMessages([
            {
              id: 'welcome-1',
              role: 'assistant',
              text: response.welcomeMessage,
              time: nowTime(),
            },
          ]);
          setError(null);
        }
      } catch {
        if (active) {
          setError('Falha ao carregar assistente de chat.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, []);

  const canSend = useMemo(() => text.trim().length > 0 && !sending, [sending, text]);

  async function submitMessage(content: string) {
    const prompt = content.trim();
    if (!prompt || sending) {
      return;
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: prompt,
      time: nowTime(),
    };

    setMessages((current) => [...current, userMessage]);
    setText('');
    setSending(true);

    try {
      const assistantMessage = await postChatMessage(prompt);
      setMessages((current) => [...current, assistantMessage]);
    } finally {
      setSending(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitMessage(text);
  }

  if (loading) {
    return <LoadingState message="Carregando chat copiloto..." />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  if (messages.length === 0) {
    return <EmptyState message="Sem mensagens no momento." />;
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto h-full flex flex-col gap-6">
      <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-headline text-2xl md:text-4xl font-extrabold tracking-tight">Chat copiloto</h2>
          <p className="text-on-surface-variant mt-2">Interaja com o assistente para acelerar operacoes do condominio.</p>
        </div>
        <DataSourceBadge module="chat" />
      </section>

      <section className="flex flex-wrap gap-2">
        {suggestions.map((item) => (
          <button
            key={item.id}
            onClick={() => void submitMessage(item.prompt)}
            className="px-4 py-2 rounded-full text-xs font-bold bg-surface-container-highest"
          >
            {item.label}
          </button>
        ))}
      </section>

      <section className="flex-1 min-h-0 bg-surface-container-low rounded-xl p-4 overflow-y-auto space-y-3">
        {messages.map((message) => (
          <article
            key={message.id}
            className={`max-w-[85%] rounded-xl p-4 ${
              message.role === 'assistant'
                ? 'bg-surface-container-highest text-on-surface'
                : 'ml-auto bg-primary text-on-primary'
            }`}
          >
            <p className="text-sm leading-relaxed">{message.text}</p>
            <span className="text-[10px] opacity-70 mt-2 block">{message.time}</span>
          </article>
        ))}
        {sending ? <p className="text-xs text-on-surface-variant">Copiloto digitando...</p> : null}
      </section>

      <form onSubmit={handleSubmit} className="flex gap-3">
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Digite uma pergunta sobre alertas, consumo ou faturas..."
          className="flex-1 bg-surface-container-highest rounded-xl px-4 py-3 outline-none"
        />
        <button
          disabled={!canSend}
          className="px-5 py-3 rounded-xl bg-primary text-on-primary text-sm font-bold disabled:opacity-40"
          type="submit"
        >
          Enviar
        </button>
      </form>
    </div>
  );
}

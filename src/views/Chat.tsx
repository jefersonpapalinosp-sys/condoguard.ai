import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  fetchChatBootstrap,
  fetchChatTelemetry,
  postChatMessage,
  resumeChatPendingAction,
  sendChatFeedback,
  type ChatTelemetrySnapshot,
} from '../services/chatService';
import type { ChatMessage, ChatSuggestion } from '../services/mockApi';
import { useAuth } from '../features/auth/context/AuthContext';
import { DataSourceBadge } from '../shared/ui/DataSourceBadge';
import { EmptyState } from '../shared/ui/states/EmptyState';
import { ErrorState } from '../shared/ui/states/ErrorState';
import { LoadingState } from '../shared/ui/states/LoadingState';

function nowTime() {
  return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function formatTelemetryEvent(event: NonNullable<ChatTelemetrySnapshot['recentEvents']>[number]) {
  if (event.type === 'feedback') {
    return `Feedback ${event.rating === 'up' ? 'positivo' : 'negativo'} (${event.messageId || 'sem id'})`;
  }

  if (event.type === 'error') {
    return `Erro de chat: ${event.errorCode || 'UNKNOWN_ERROR'}`;
  }

  const guardrailLabel = event.guardrailBlocked
    ? `bloqueada (${event.guardrailReason || 'UNKNOWN'})`
    : 'respondida';

  return `Mensagem ${guardrailLabel} - intent ${event.intentId || 'n/a'} - confianca ${event.confidence || 'n/a'}`;
}

export default function Chat() {
  const { role } = useAuth();
  const [suggestions, setSuggestions] = useState<ChatSuggestion[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedbackByMessage, setFeedbackByMessage] = useState<Record<string, 'up' | 'down'>>({});
  const [pendingDecisionByAction, setPendingDecisionByAction] = useState<Record<string, 'confirm' | 'cancel'>>({});
  const [telemetry, setTelemetry] = useState<ChatTelemetrySnapshot | null>(null);
  const [eventFilter, setEventFilter] = useState<'all' | 'message' | 'feedback' | 'error'>('all');
  const [visibleEventCount, setVisibleEventCount] = useState(8);

  const canViewTelemetry = role === 'admin' || role === 'sindico';
  const eventCounters = useMemo(() => {
    const events = telemetry?.recentEvents ?? [];
    return {
      all: events.length,
      message: events.filter((event) => event.type === 'message').length,
      feedback: events.filter((event) => event.type === 'feedback').length,
      error: events.filter((event) => event.type === 'error').length,
    };
  }, [telemetry?.recentEvents]);
  const filteredEvents = useMemo(
    () => telemetry?.recentEvents.filter((event) => (eventFilter === 'all' ? true : event.type === eventFilter)) ?? [],
    [eventFilter, telemetry?.recentEvents],
  );
  const visibleEvents = useMemo(() => filteredEvents.slice(0, visibleEventCount), [filteredEvents, visibleEventCount]);
  const canLoadMoreEvents = filteredEvents.length > visibleEventCount;
  const canShowLessEvents = visibleEventCount > 8 && filteredEvents.length > 8;

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
    if (canViewTelemetry) {
      void fetchChatTelemetry(15).then((snapshot) => {
        if (active) {
          setTelemetry(snapshot);
        }
      });
    }

    return () => {
      active = false;
    };
  }, [canViewTelemetry]);

  useEffect(() => {
    setVisibleEventCount(8);
  }, [eventFilter]);

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
      if (canViewTelemetry) {
        const snapshot = await fetchChatTelemetry(15);
        setTelemetry(snapshot);
      }
    } finally {
      setSending(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitMessage(text);
  }

  async function handleFeedback(messageId: string, rating: 'up' | 'down') {
    if (!messageId || feedbackByMessage[messageId]) {
      return;
    }

    setFeedbackByMessage((current) => ({ ...current, [messageId]: rating }));
    await sendChatFeedback(messageId, rating);
    if (canViewTelemetry) {
      const snapshot = await fetchChatTelemetry(15);
      setTelemetry(snapshot);
    }
  }

  async function handlePendingAction(messageId: string, pendingActionId: string, decision: 'confirm' | 'cancel') {
    if (!pendingActionId || pendingDecisionByAction[pendingActionId]) {
      return;
    }

    setPendingDecisionByAction((current) => ({ ...current, [pendingActionId]: decision }));
    try {
      const response = await resumeChatPendingAction(pendingActionId, decision);
      setMessages((current) => [...current, response]);
      if (canViewTelemetry) {
        const snapshot = await fetchChatTelemetry(15);
        setTelemetry(snapshot);
      }
    } catch {
      setMessages((current) => [
        ...current,
        {
          id: `assistant-error-${Date.now()}`,
          role: 'assistant',
          text: `Nao foi possivel ${decision === 'confirm' ? 'confirmar' : 'cancelar'} a acao pendente agora.`,
          time: nowTime(),
        },
      ]);
      setPendingDecisionByAction((current) => {
        const next = { ...current };
        delete next[pendingActionId];
        return next;
      });
    }
    // mantem o estado bloqueado para evitar reenvio da mesma pendencia no mesmo card
    setMessages((current) =>
      current.map((item) => (item.id === messageId ? { ...item, pendingAction: undefined } : item)),
    );
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

      {canViewTelemetry && telemetry ? (
        <section className="rounded-xl bg-surface-container-low p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-headline text-lg font-bold">Telemetria do chat</h3>
            <span className="text-[11px] text-on-surface-variant">Atualizado: {new Date(telemetry.updatedAt).toLocaleTimeString('pt-BR')}</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-lg bg-surface-container-highest p-3">
              <p className="text-[11px] uppercase">Mensagens</p>
              <p className="text-xl font-bold">{telemetry.counters.messages}</p>
            </div>
            <div className="rounded-lg bg-surface-container-highest p-3">
              <p className="text-[11px] uppercase">Bloqueios</p>
              <p className="text-xl font-bold">{telemetry.counters.blocked}</p>
            </div>
            <div className="rounded-lg bg-surface-container-highest p-3">
              <p className="text-[11px] uppercase">Fallbacks</p>
              <p className="text-xl font-bold">{telemetry.counters.fallback}</p>
            </div>
            <div className="rounded-lg bg-surface-container-highest p-3">
              <p className="text-[11px] uppercase">Satisfacao</p>
              <p className="text-xl font-bold">{telemetry.satisfaction.score ?? 0}%</p>
            </div>
          </div>
          <div className="rounded-lg bg-surface-container-highest p-3">
            <h4 className="text-sm font-bold mb-2">Eventos recentes</h4>
            <div className="mb-3 flex flex-wrap gap-2">
              <button type="button" onClick={() => setEventFilter('all')} className={`text-[11px] px-2 py-1 rounded ${eventFilter === 'all' ? 'bg-primary text-on-primary' : 'bg-surface-container-low'}`}>Todos ({eventCounters.all})</button>
              <button type="button" onClick={() => setEventFilter('message')} className={`text-[11px] px-2 py-1 rounded ${eventFilter === 'message' ? 'bg-primary text-on-primary' : 'bg-surface-container-low'}`}>Mensagens ({eventCounters.message})</button>
              <button type="button" onClick={() => setEventFilter('feedback')} className={`text-[11px] px-2 py-1 rounded ${eventFilter === 'feedback' ? 'bg-primary text-on-primary' : 'bg-surface-container-low'}`}>Feedbacks ({eventCounters.feedback})</button>
              <button type="button" onClick={() => setEventFilter('error')} className={`text-[11px] px-2 py-1 rounded ${eventFilter === 'error' ? 'bg-primary text-on-primary' : 'bg-surface-container-low'}`}>Erros ({eventCounters.error})</button>
            </div>
            {filteredEvents.length === 0 ? (
              <p className="text-xs text-on-surface-variant">Sem eventos registrados.</p>
            ) : (
              <>
                <ul className="space-y-2">
                  {visibleEvents.map((event) => (
                    <li key={`${event.type}-${event.ts}-${event.messageId || ''}`} className="text-xs">
                      <span className="font-semibold">{new Date(event.ts).toLocaleTimeString('pt-BR')}:</span>{' '}
                      <span className="text-on-surface-variant">{formatTelemetryEvent(event)}</span>
                    </li>
                  ))}
                </ul>
                {canLoadMoreEvents ? (
                  <button
                    type="button"
                    onClick={() => setVisibleEventCount((current) => current + 8)}
                    className="mt-3 text-[11px] px-3 py-1 rounded bg-surface-container-low"
                  >
                    Ver mais
                  </button>
                ) : null}
                {canShowLessEvents ? (
                  <button
                    type="button"
                    onClick={() => setVisibleEventCount(8)}
                    className="mt-3 ml-2 text-[11px] px-3 py-1 rounded bg-surface-container-low"
                  >
                    Ver menos
                  </button>
                ) : null}
              </>
            )}
          </div>
        </section>
      ) : null}

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
            {message.role === 'assistant' && message.guardrails?.blocked ? (
              <p className="mt-2 text-[11px] font-bold text-error">
                Resposta bloqueada por guardrail ({message.guardrails.reason || 'UNKNOWN'})
              </p>
            ) : null}
            {message.role === 'assistant' ? (
              <div className="mt-2 space-y-1">
                {message.agent?.domain ? (
                  <p className="text-[10px] opacity-80">
                    Agente: {message.agent.domain} / {message.agent.action || 'general_overview'}
                  </p>
                ) : null}
                {message.confidence ? (
                  <p className="text-[10px] opacity-80">
                    Confianca: {message.confidence}
                  </p>
                ) : null}
                {message.sources && message.sources.length > 0 ? (
                  <p className="text-[10px] opacity-80">
                    Fontes: {message.sources.join(', ')}
                  </p>
                ) : null}
                <div className="pt-1 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void handleFeedback(message.id, 'up')}
                    disabled={Boolean(feedbackByMessage[message.id])}
                    className="text-[10px] px-2 py-1 rounded bg-surface-container-low disabled:opacity-50"
                  >
                    Util
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleFeedback(message.id, 'down')}
                    disabled={Boolean(feedbackByMessage[message.id])}
                    className="text-[10px] px-2 py-1 rounded bg-surface-container-low disabled:opacity-50"
                  >
                    Nao util
                  </button>
                </div>
                {message.pendingAction ? (
                  <div className="mt-2 rounded-lg bg-surface-container-low p-2">
                    <p className="text-[11px] font-semibold">
                      Acao pendente: {message.pendingAction.targetLabel}
                    </p>
                    <p className="text-[10px] opacity-80 mt-1">
                      {message.pendingAction.confirmationPrompt}
                    </p>
                    <p className="text-[10px] opacity-80 mt-1">
                      Expira em: {new Date(message.pendingAction.expiresAt).toLocaleTimeString('pt-BR')}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void handlePendingAction(message.id, message.pendingAction!.id, 'confirm')}
                        disabled={Boolean(pendingDecisionByAction[message.pendingAction.id])}
                        className="text-[10px] px-2 py-1 rounded bg-primary text-on-primary disabled:opacity-50"
                      >
                        Confirmar
                      </button>
                      <button
                        type="button"
                        onClick={() => void handlePendingAction(message.id, message.pendingAction!.id, 'cancel')}
                        disabled={Boolean(pendingDecisionByAction[message.pendingAction.id])}
                        className="text-[10px] px-2 py-1 rounded bg-surface-container-highest disabled:opacity-50"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : null}
                {message.followUps && message.followUps.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {message.followUps.slice(0, 3).map((followUp) => (
                      <button
                        key={`${message.id}-${followUp}`}
                        type="button"
                        onClick={() => void submitMessage(followUp)}
                        className="text-[10px] px-2 py-1 rounded bg-surface-container-low"
                      >
                        {followUp}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
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

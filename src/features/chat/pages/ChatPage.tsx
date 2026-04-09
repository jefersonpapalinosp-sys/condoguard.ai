import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  fetchChatBootstrap,
  fetchChatTelemetry,
  postChatMessage,
  sendChatFeedback,
  type ChatTelemetrySnapshot,
} from '../../../services/chatService';
import type { ChatSuggestion } from '../../../services/mockApi';
import { useAuth } from '../../auth/context/AuthContext';
import { DataSourceBadge } from '../../../shared/ui/DataSourceBadge';
import { ErrorState } from '../../../shared/ui/states/ErrorState';
import { LoadingState } from '../../../shared/ui/states/LoadingState';
import type { EnrichedChatMessage } from '../types/chat';
import { MessageBubble } from '../components/MessageBubble';
import { TypingIndicator } from '../components/TypingIndicator';
import { SuggestionChips } from '../components/SuggestionChips';
import { ChatInput } from '../components/ChatInput';
import { TelemetryPanel } from '../components/TelemetryPanel';
import { WelcomeScreen } from '../components/WelcomeScreen';

function nowTime() {
  return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function buildWelcomeText(rawMessage: string, userName: string): string {
  const firstName = userName.split(' ')[0];
  // Strip the generic "Ola!" opener from backend and prepend personalized greeting
  const body = rawMessage.replace(/^Ola[!.]?\s*/i, '').replace(/^Olá[!.]?\s*/i, '');
  return `Olá, **${firstName}**! ${body}`;
}

export default function ChatPage() {
  const { role, userName } = useAuth();
  const [suggestions, setSuggestions] = useState<ChatSuggestion[]>([]);
  const [messages, setMessages] = useState<EnrichedChatMessage[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sendingAgentName, setSendingAgentName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedbackByMessage, setFeedbackByMessage] = useState<Record<string, 'up' | 'down'>>({});
  const [telemetry, setTelemetry] = useState<ChatTelemetrySnapshot | null>(null);
  const [aiActive, setAiActive] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const canViewTelemetry = role === 'admin' || role === 'sindico';
  const sessionId = useMemo(() => `chat-${Date.now().toString(36)}`, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        const response = await fetchChatBootstrap();
        if (!active) return;
        setSuggestions(response.suggestions);

        // Show personalized welcome message as first assistant message
        if (response.welcomeMessage) {
          const welcomeText = buildWelcomeText(response.welcomeMessage, userName);
          const welcomeMsg: EnrichedChatMessage = {
            id: 'welcome-init',
            role: 'assistant',
            text: welcomeText,
            time: nowTime(),
            agentName: 'CondoGuard Copiloto',
            aiPowered: response.welcomeMessage.toLowerCase().includes('gemini') || response.welcomeMessage.toLowerCase().includes('ai'),
          };
          setMessages([welcomeMsg]);
          setAiActive(welcomeMsg.aiPowered ?? false);
        }
        setError(null);
      } catch {
        if (active) setError('Falha ao carregar assistente de chat.');
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();

    if (canViewTelemetry) {
      void fetchChatTelemetry(15).then((snapshot) => {
        if (active && snapshot) setTelemetry(snapshot);
      });
    }

    return () => {
      active = false;
    };
  }, [canViewTelemetry, userName]);

  async function submitMessage(content: string) {
    const prompt = content.trim();
    if (!prompt || sending) return;

    const userMessage: EnrichedChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: prompt,
      time: nowTime(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setText('');
    setSending(true);
    setSendingAgentName(null);

    try {
      const response = await postChatMessage(prompt, sessionId);
      const assistantMessage: EnrichedChatMessage = response as EnrichedChatMessage;
      setMessages((prev) => [...prev, assistantMessage]);
      if (assistantMessage.aiPowered) setAiActive(true);

      if (canViewTelemetry) {
        const snapshot = await fetchChatTelemetry(15);
        if (snapshot) setTelemetry(snapshot);
      }
    } finally {
      setSending(false);
      setSendingAgentName(null);
    }
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    void submitMessage(text);
  }

  async function handleFeedback(messageId: string, rating: 'up' | 'down') {
    if (!messageId || feedbackByMessage[messageId]) return;
    setFeedbackByMessage((prev) => ({ ...prev, [messageId]: rating }));
    await sendChatFeedback(messageId, rating);
    if (canViewTelemetry) {
      const snapshot = await fetchChatTelemetry(15);
      if (snapshot) setTelemetry(snapshot);
    }
  }

  if (loading) return <LoadingState message="Iniciando Copiloto..." />;
  if (error) return <ErrorState message={error} />;

  const hasMessages = messages.length > 0;

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto h-full flex flex-col gap-5">
      {/* Header */}
      <section className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20 shrink-0">
            <span className="material-symbols-outlined text-[20px] text-primary">smart_toy</span>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-headline text-2xl md:text-3xl font-extrabold tracking-tight">Chat Copiloto</h2>
              {aiActive && (
                <span className="inline-flex items-center gap-1 rounded-full bg-tertiary-fixed-dim/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-on-tertiary-fixed-variant">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                  Gemini AI
                </span>
              )}
            </div>
            <p className="text-sm text-on-surface-variant mt-0.5">
              Assistente inteligente para gestão do seu condomínio.
            </p>
          </div>
        </div>
        <DataSourceBadge module="chat" />
      </section>

      <SuggestionChips suggestions={suggestions} onSelect={(prompt) => void submitMessage(prompt)} />

      {canViewTelemetry && telemetry && <TelemetryPanel telemetry={telemetry} />}

      {/* Messages area */}
      <section className="flex-1 min-h-0 bg-surface-container-low rounded-2xl p-4 overflow-y-auto flex flex-col gap-3">
        {!hasMessages ? (
          <WelcomeScreen userName={userName} onSelectSample={(prompt) => void submitMessage(prompt)} />
        ) : (
          <>
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                feedbackGiven={feedbackByMessage[msg.id]}
                onFeedback={(id, rating) => void handleFeedback(id, rating)}
                canViewDetails={canViewTelemetry}
              />
            ))}
            {sending && <TypingIndicator agentName={sendingAgentName} />}
            <div ref={messagesEndRef} />
          </>
        )}
      </section>

      <ChatInput
        value={text}
        onChange={setText}
        onSubmit={handleSubmit}
        disabled={sending}
      />
    </div>
  );
}

import { useMemo, useState } from 'react';
import type { ChatTelemetrySnapshot, ChatTelemetryEvent } from '../../../services/chatService';

function formatEvent(event: ChatTelemetryEvent): string {
  if (event.type === 'feedback') {
    return `Feedback ${event.rating === 'up' ? 'positivo' : 'negativo'} (${event.messageId ?? 'sem id'})`;
  }
  if (event.type === 'error') {
    return `Erro de chat: ${event.errorCode ?? 'UNKNOWN_ERROR'}`;
  }
  const blocked = event.guardrailBlocked
    ? `bloqueada (${event.guardrailReason ?? 'UNKNOWN'})`
    : 'respondida';
  return `Mensagem ${blocked} — intent ${event.intentId ?? 'n/a'} — confiança ${event.confidence ?? 'n/a'}`;
}

type FilterType = 'all' | 'message' | 'feedback' | 'error';

type Props = {
  telemetry: ChatTelemetrySnapshot;
};

export function TelemetryPanel({ telemetry }: Props) {
  const [eventFilter, setEventFilter] = useState<FilterType>('all');
  const [visibleCount, setVisibleCount] = useState(8);

  const counters = useMemo(() => {
    const events = telemetry.recentEvents;
    return {
      all: events.length,
      message: events.filter((e) => e.type === 'message').length,
      feedback: events.filter((e) => e.type === 'feedback').length,
      error: events.filter((e) => e.type === 'error').length,
    };
  }, [telemetry.recentEvents]);

  const filtered = useMemo(
    () => telemetry.recentEvents.filter((e) => eventFilter === 'all' || e.type === eventFilter),
    [eventFilter, telemetry.recentEvents],
  );

  const visible = filtered.slice(0, visibleCount);

  function handleFilter(f: FilterType) {
    setEventFilter(f);
    setVisibleCount(8);
  }

  return (
    <section className="rounded-xl bg-surface-container-low p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-headline text-lg font-bold">Telemetria do chat</h3>
        <span className="text-[11px] text-on-surface-variant">
          Atualizado: {new Date(telemetry.updatedAt).toLocaleTimeString('pt-BR')}
        </span>
      </div>

      {/* Counters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(
          [
            { label: 'Mensagens', value: telemetry.counters.messages },
            { label: 'Bloqueios', value: telemetry.counters.blocked },
            { label: 'Fallbacks', value: telemetry.counters.fallback },
            { label: 'Satisfação', value: `${telemetry.satisfaction.score ?? 0}%` },
          ] as const
        ).map(({ label, value }) => (
          <div key={label} className="rounded-lg bg-surface-container-highest p-3">
            <p className="text-[11px] uppercase tracking-wide text-on-surface-variant">{label}</p>
            <p className="text-xl font-bold mt-0.5">{value}</p>
          </div>
        ))}
      </div>

      {/* Events */}
      <div className="rounded-lg bg-surface-container-highest p-3">
        <h4 className="text-sm font-bold mb-2">Eventos recentes</h4>

        <div className="mb-3 flex flex-wrap gap-2">
          {(['all', 'message', 'feedback', 'error'] as FilterType[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => handleFilter(f)}
              className={`text-[11px] px-2 py-1 rounded transition-colors ${
                eventFilter === f ? 'bg-primary text-on-primary' : 'bg-surface-container-low'
              }`}
            >
              {f === 'all' ? 'Todos' : f === 'message' ? 'Mensagens' : f === 'feedback' ? 'Feedbacks' : 'Erros'}
              {' '}({counters[f]})
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <p className="text-xs text-on-surface-variant">Sem eventos registrados.</p>
        ) : (
          <>
            <ul className="space-y-1.5">
              {visible.map((event) => (
                <li
                  key={`${event.type}-${event.ts}-${event.messageId ?? ''}`}
                  className="text-xs"
                >
                  <span className="font-semibold">
                    {new Date(event.ts).toLocaleTimeString('pt-BR')}:
                  </span>{' '}
                  <span className="text-on-surface-variant">{formatEvent(event)}</span>
                </li>
              ))}
            </ul>

            <div className="flex gap-2 mt-3">
              {filtered.length > visibleCount && (
                <button
                  type="button"
                  onClick={() => setVisibleCount((c) => c + 8)}
                  className="text-[11px] px-3 py-1 rounded bg-surface-container-low hover:opacity-80"
                >
                  Ver mais
                </button>
              )}
              {visibleCount > 8 && filtered.length > 8 && (
                <button
                  type="button"
                  onClick={() => setVisibleCount(8)}
                  className="text-[11px] px-3 py-1 rounded bg-surface-container-low hover:opacity-80"
                >
                  Ver menos
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

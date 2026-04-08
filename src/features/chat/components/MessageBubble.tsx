import { useState } from 'react';
import type { ActionResult, EnrichedChatMessage } from '../types/chat';
import { AGENT_STYLES, CONFIDENCE_STYLES } from '../types/chat';

const ACTION_LABELS: Record<string, string> = {
  invoice_mark_paid: 'Fatura registrada como paga',
  alert_mark_read: 'Alerta marcado como lido',
  contract_renew: 'Contrato renovado',
  contract_close: 'Contrato encerrado',
};

const AGENT_ICONS: Record<string, string> = {
  'Agente Financeiro': 'receipt_long',
  'Agente de Alertas': 'warning',
  'Agente de Consumo': 'bolt',
  'Agente de Gestao': 'domain',
  'CondoGuard Copiloto': 'smart_toy',
};

// Simple markdown renderer: **bold**, bullet lists, numbered lists
function renderText(text: string): React.ReactNode {
  const lines = text.split('\n');
  const nodes: React.ReactNode[] = [];
  let i = 0;

  function parseLine(line: string): React.ReactNode {
    const parts = line.split(/(\*\*[^*\n]+\*\*)/g);
    return parts.map((part, idx) =>
      part.startsWith('**') && part.endsWith('**') ? (
        <strong key={idx} className="font-bold text-on-surface">
          {part.slice(2, -2)}
        </strong>
      ) : (
        part
      ),
    );
  }

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      if (nodes.length > 0) nodes.push(<div key={`sp-${i}`} className="h-1.5" />);
      i++;
      continue;
    }

    // Numbered list
    const numMatch = trimmed.match(/^(\d+)\.\s+(.+)/);
    if (numMatch) {
      nodes.push(
        <div key={i} className="flex items-start gap-2 py-0.5">
          <span className="mt-[1px] shrink-0 min-w-[1.1rem] text-xs font-bold text-primary">
            {numMatch[1]}.
          </span>
          <span className="text-sm leading-relaxed">{parseLine(numMatch[2])}</span>
        </div>,
      );
      i++;
      continue;
    }

    // Bullet point
    if (trimmed.startsWith('• ') || trimmed.startsWith('- ')) {
      const content = trimmed.slice(2);
      nodes.push(
        <div key={i} className="flex items-start gap-2 py-0.5">
          <span className="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full bg-primary-container" />
          <span className="text-sm leading-relaxed">{parseLine(content)}</span>
        </div>,
      );
      i++;
      continue;
    }

    // Regular paragraph
    nodes.push(
      <p key={i} className="text-sm leading-relaxed">
        {parseLine(trimmed)}
      </p>,
    );
    i++;
  }

  return <>{nodes}</>;
}

function ActionCard({ result }: { result: ActionResult }) {
  const isSuccess = result.status === 'success';
  const isMissing = result.status === 'missing_entity';
  const cardClass = isSuccess
    ? 'border-tertiary-fixed-dim/40 bg-tertiary-fixed-dim/15 text-on-tertiary-fixed-variant'
    : isMissing
      ? 'border-secondary/30 bg-secondary-container/40 text-on-secondary-container'
      : 'border-error/30 bg-error-container/40 text-on-error-container';
  const iconName = isSuccess ? 'check_circle' : isMissing ? 'info' : 'cancel';
  const label = ACTION_LABELS[result.type] ?? result.type;

  return (
    <div className={`mt-3 rounded-xl border px-3 py-2.5 ${cardClass}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="material-symbols-outlined text-[16px]">{iconName}</span>
        <span className="text-xs font-bold uppercase tracking-wider">{label}</span>
        {result.entity && (
          <span className="ml-auto font-mono text-[10px] opacity-70">{result.entity}</span>
        )}
      </div>
      <p className="text-xs leading-relaxed">{result.message}</p>
    </div>
  );
}

type Props = {
  message: EnrichedChatMessage;
  feedbackGiven: 'up' | 'down' | undefined;
  onFeedback: (id: string, rating: 'up' | 'down') => void;
  canViewDetails: boolean;
};

export function MessageBubble({ message, feedbackGiven, onFeedback, canViewDetails }: Props) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const isAssistant = message.role === 'assistant';
  const agentStyle = message.agentName ? AGENT_STYLES[message.agentName] : null;
  const confidenceStyle = message.confidence ? CONFIDENCE_STYLES[message.confidence] : null;
  const agentIcon = message.agentName ? (AGENT_ICONS[message.agentName] ?? 'smart_toy') : 'smart_toy';

  if (!isAssistant) {
    return (
      <article className="ml-auto max-w-[80%] rounded-2xl rounded-br-sm bg-primary px-4 py-3 text-on-primary shadow-sm">
        <p className="text-sm leading-relaxed">{message.text}</p>
        <span className="mt-1 block text-right text-[10px] opacity-60">{message.time}</span>
      </article>
    );
  }

  return (
    <article className="max-w-[88%] overflow-hidden rounded-2xl rounded-bl-sm border border-outline-variant/20 bg-surface-container-low shadow-sm">
      {/* Agent header */}
      <div className="flex items-center gap-2 border-b border-outline-variant/15 bg-surface-container-lowest/60 px-4 py-2">
        <div
          className={`flex h-6 w-6 items-center justify-center rounded-full text-[14px] ${agentStyle?.badge ?? 'bg-surface-container-highest text-on-surface-variant'}`}
        >
          <span className="material-symbols-outlined text-[14px]">{agentIcon}</span>
        </div>
        <span className={`text-[11px] font-bold ${agentStyle?.badge ? '' : 'text-on-surface-variant'}`}>
          {message.agentName ?? 'CondoGuard Copiloto'}
        </span>

        <div className="ml-auto flex items-center gap-2">
          {message.aiPowered !== undefined && (
            <span
              className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                message.aiPowered
                  ? 'bg-tertiary-fixed-dim/25 text-on-tertiary-fixed-variant'
                  : 'bg-surface-container-highest text-on-surface-variant'
              }`}
            >
              {message.aiPowered ? 'Gemini AI' : 'Regras'}
            </span>
          )}
          {canViewDetails && confidenceStyle && (
            <span className="flex items-center gap-1 text-[10px] text-on-surface-variant">
              <span className={`h-1.5 w-1.5 rounded-full ${confidenceStyle.dot}`} />
              {confidenceStyle.label}
            </span>
          )}
        </div>
      </div>

      {/* Message body */}
      <div className="space-y-1 px-4 pb-2 pt-3">
        {message.guardrails?.blocked && (
          <div className="mb-2 rounded-xl border border-error/30 bg-error-container/40 px-3 py-2">
            <p className="text-xs font-semibold text-on-error-container">
              <span className="material-symbols-outlined mr-1 text-[14px] align-middle">block</span>
              Resposta bloqueada — {message.guardrails.reason ?? 'POLICY'} ({message.guardrails.policyVersion})
            </p>
          </div>
        )}

        <div className="text-on-surface">{renderText(message.text)}</div>

        {message.actionResult && <ActionCard result={message.actionResult} />}

        {message.ragSources && message.ragSources.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {message.ragSources.map((src) => (
              <span
                key={src}
                className="inline-flex items-center gap-1 rounded-md border border-outline-variant/20 bg-surface-container-highest px-2 py-0.5 text-[10px] text-on-surface-variant"
              >
                <span className="material-symbols-outlined text-[10px]">source</span>
                {src}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-outline-variant/10 px-4 py-2">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onFeedback(message.id, 'up')}
            disabled={Boolean(feedbackGiven)}
            title="Útil"
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors disabled:cursor-not-allowed ${
              feedbackGiven === 'up'
                ? 'bg-tertiary-fixed-dim/25 text-on-tertiary-fixed-variant'
                : 'text-on-surface-variant hover:bg-surface-container-high disabled:opacity-40'
            }`}
          >
            <span className="material-symbols-outlined text-[14px]">thumb_up</span>
            Útil
          </button>
          <button
            type="button"
            onClick={() => onFeedback(message.id, 'down')}
            disabled={Boolean(feedbackGiven)}
            title="Não útil"
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors disabled:cursor-not-allowed ${
              feedbackGiven === 'down'
                ? 'bg-error-container/50 text-on-error-container'
                : 'text-on-surface-variant hover:bg-surface-container-high disabled:opacity-40'
            }`}
          >
            <span className="material-symbols-outlined text-[14px]">thumb_down</span>
            Não útil
          </button>
        </div>

        <div className="flex items-center gap-2.5">
          {canViewDetails && (
            <button
              type="button"
              onClick={() => setDetailsOpen((v) => !v)}
              className="flex items-center gap-1 text-[10px] text-on-surface-variant hover:text-on-surface"
            >
              <span className="material-symbols-outlined text-[12px]">
                {detailsOpen ? 'expand_less' : 'expand_more'}
              </span>
              Detalhes
            </button>
          )}
          <span className="text-[10px] opacity-50">{message.time}</span>
        </div>
      </div>

      {/* Expandable details */}
      {detailsOpen && canViewDetails && (
        <div className="border-t border-outline-variant/10 bg-surface-container-lowest/50 px-4 py-3">
          <div className="space-y-1 text-[10px] text-on-surface-variant">
            {message.intentId && (
              <p><span className="font-semibold text-on-surface">Intent:</span> {message.intentId}</p>
            )}
            {message.promptCatalogVersion && (
              <p><span className="font-semibold text-on-surface">Catálogo:</span> {message.promptCatalogVersion}</p>
            )}
            {message.sources && message.sources.length > 0 && (
              <p><span className="font-semibold text-on-surface">Fontes:</span> {message.sources.join(', ')}</p>
            )}
            {message.limitations && (
              <p><span className="font-semibold text-on-surface">Nota:</span> {message.limitations}</p>
            )}
          </div>
        </div>
      )}
    </article>
  );
}

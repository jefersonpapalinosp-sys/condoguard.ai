import { useState } from 'react';
import type { ActionResult, EnrichedChatMessage } from '../types/chat';
import { AGENT_STYLES, CONFIDENCE_STYLES } from '../types/chat';

const ACTION_LABELS: Record<string, string> = {
  invoice_mark_paid: 'Fatura paga',
  alert_mark_read: 'Alerta lido',
  contract_renew: 'Contrato renovado',
  contract_close: 'Contrato encerrado',
};

function ActionCard({ result }: { result: ActionResult }) {
  const isSuccess = result.status === 'success';
  const isMissing = result.status === 'missing_entity';
  const cardClass = isSuccess
    ? 'border-green-200 bg-green-50 text-green-900'
    : isMissing
      ? 'border-amber-200 bg-amber-50 text-amber-900'
      : 'border-red-200 bg-red-50 text-red-900';
  const icon = isSuccess ? '✅' : isMissing ? '⚠️' : '❌';
  const label = ACTION_LABELS[result.type] ?? result.type;

  return (
    <div className={`mt-2 rounded-xl border px-3 py-2.5 ${cardClass}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-base">{icon}</span>
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

  if (!isAssistant) {
    return (
      <article className="ml-auto max-w-[80%] rounded-xl rounded-br-sm px-4 py-3 bg-primary text-on-primary">
        <p className="text-sm leading-relaxed">{message.text}</p>
        <span className="text-[10px] opacity-60 mt-1 block text-right">{message.time}</span>
      </article>
    );
  }

  return (
    <article className="max-w-[85%] rounded-xl rounded-bl-sm bg-surface-container-highest text-on-surface">
      {/* Agent badge row */}
      {message.agentName && (
        <div className="flex items-center gap-2 px-4 pt-3 pb-1">
          <span
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold ${agentStyle?.badge ?? 'bg-gray-100 text-gray-700'}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${agentStyle?.dot ?? 'bg-gray-400'}`} />
            {message.agentName}
          </span>
          {canViewDetails && confidenceStyle && (
            <span className="flex items-center gap-1 text-[10px] text-on-surface-variant">
              <span className={`w-1.5 h-1.5 rounded-full ${confidenceStyle.dot}`} />
              {confidenceStyle.label}
            </span>
          )}
        </div>
      )}

      <div className="px-4 pb-1 pt-2">
        {/* Guardrail block */}
        {message.guardrails?.blocked && (
          <div className="mb-2 rounded-lg border border-error/30 bg-error/10 px-3 py-2">
            <p className="text-xs font-semibold text-error">
              Resposta bloqueada — {message.guardrails.reason ?? 'POLICY'} ({message.guardrails.policyVersion})
            </p>
          </div>
        )}

        {/* Message text */}
        <p className="text-sm leading-relaxed">{message.text}</p>

        {/* Action result card */}
        {message.actionResult && (
          <ActionCard result={message.actionResult} />
        )}

        {/* RAG source chips */}
        {message.ragSources && message.ragSources.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {message.ragSources.map((src) => (
              <span
                key={src}
                className="inline-block px-2 py-0.5 rounded text-[10px] bg-surface-container-low text-on-surface-variant border border-outline/20"
              >
                {src}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 pb-3 pt-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onFeedback(message.id, 'up')}
            disabled={Boolean(feedbackGiven)}
            title="Util"
            className={`text-[11px] px-2 py-1 rounded transition-all ${
              feedbackGiven === 'up'
                ? 'bg-green-100 text-green-700 font-semibold'
                : 'bg-surface-container-low text-on-surface-variant disabled:opacity-50'
            }`}
          >
            👍 Útil
          </button>
          <button
            type="button"
            onClick={() => onFeedback(message.id, 'down')}
            disabled={Boolean(feedbackGiven)}
            title="Nao util"
            className={`text-[11px] px-2 py-1 rounded transition-all ${
              feedbackGiven === 'down'
                ? 'bg-red-100 text-red-700 font-semibold'
                : 'bg-surface-container-low text-on-surface-variant disabled:opacity-50'
            }`}
          >
            👎 Não útil
          </button>
        </div>
        <div className="flex items-center gap-3">
          {canViewDetails && (
            <button
              type="button"
              onClick={() => setDetailsOpen((v) => !v)}
              className="text-[10px] text-on-surface-variant underline-offset-2 hover:underline"
            >
              {detailsOpen ? '∧ Fechar' : '∨ Detalhes'}
            </button>
          )}
          <span className="text-[10px] opacity-60">{message.time}</span>
        </div>
      </div>

      {/* Expandable details — admin / sindico only */}
      {detailsOpen && canViewDetails && (
        <div className="mx-4 mb-3 rounded-lg bg-surface-container-low px-3 py-2 space-y-1 border border-outline/10">
          {message.intentId && (
            <p className="text-[10px]">
              <span className="font-semibold">Intent:</span> {message.intentId}
            </p>
          )}
          {message.promptCatalogVersion && (
            <p className="text-[10px]">
              <span className="font-semibold">Catálogo:</span> {message.promptCatalogVersion}
            </p>
          )}
          {message.sources && message.sources.length > 0 && (
            <p className="text-[10px]">
              <span className="font-semibold">Fontes de dados:</span> {message.sources.join(', ')}
            </p>
          )}
          {message.limitations && (
            <p className="text-[10px]">
              <span className="font-semibold">Nota:</span> {message.limitations}
            </p>
          )}
          {message.aiPowered !== undefined && (
            <p className="text-[10px]">
              <span className="font-semibold">IA:</span> {message.aiPowered ? 'Gemini ativo' : 'Modo regras'}
            </p>
          )}
        </div>
      )}
    </article>
  );
}

import type { ChatMessage } from '../../../services/mockApi';

export type RagSource = {
  filename: string;
  score?: number;
};

export type AgentName =
  | 'Agente Financeiro'
  | 'Agente de Alertas'
  | 'Agente de Consumo'
  | 'Agente de Gestao'
  | 'CondoGuard Copiloto';

export type ActionResult = {
  type: string;
  status: 'success' | 'not_found' | 'missing_entity' | 'error' | 'unsupported';
  entity: string | null;
  message: string;
  data?: Record<string, unknown>;
};

// Extends the base ChatMessage with new Sprint 2/3/4/10 fields (all optional for backwards compat)
export type EnrichedChatMessage = ChatMessage & {
  agentName?: AgentName | string | null;
  ragSources?: string[];
  aiPowered?: boolean;
  actionResult?: ActionResult | null;
};

export type AgentDomain = 'financial' | 'alerts' | 'consumption' | 'maintenance' | 'general';

export const AGENT_STYLES: Record<string, { badge: string; dot: string; label: string }> = {
  'Agente Financeiro': {
    badge: 'bg-green-100 text-green-800',
    dot: 'bg-green-500',
    label: 'Financeiro',
  },
  'Agente de Alertas': {
    badge: 'bg-red-100 text-red-800',
    dot: 'bg-red-500',
    label: 'Alertas',
  },
  'Agente de Consumo': {
    badge: 'bg-blue-100 text-blue-800',
    dot: 'bg-blue-500',
    label: 'Consumo',
  },
  'Agente de Gestao': {
    badge: 'bg-yellow-100 text-yellow-800',
    dot: 'bg-yellow-500',
    label: 'Gestao',
  },
  'CondoGuard Copiloto': {
    badge: 'bg-gray-100 text-gray-700',
    dot: 'bg-gray-400',
    label: 'Copiloto',
  },
};

export const CONFIDENCE_STYLES: Record<string, { dot: string; label: string }> = {
  high: { dot: 'bg-green-500', label: 'Alta' },
  medium: { dot: 'bg-yellow-400', label: 'Media' },
  low: { dot: 'bg-gray-400', label: 'Baixa' },
};

export const AGENT_TILES = [
  {
    name: 'Agente Financeiro' as AgentName,
    icon: '💰',
    desc: 'Faturas, inadimplência, cobranças e fluxo de caixa.',
    sample: 'Quais faturas estão vencidas?',
  },
  {
    name: 'Agente de Alertas' as AgentName,
    icon: '🚨',
    desc: 'Alertas críticos, incidentes e riscos operacionais.',
    sample: 'Liste os alertas críticos ativos.',
  },
  {
    name: 'Agente de Consumo' as AgentName,
    icon: '⚡',
    desc: 'Energia, água, telemetria e anomalias de consumo.',
    sample: 'Existe consumo de energia fora da meta?',
  },
  {
    name: 'Agente de Gestao' as AgentName,
    icon: '🏢',
    desc: 'Unidades, manutenção preventiva e contratos.',
    sample: 'Monte um plano de ação para 24h.',
  },
];

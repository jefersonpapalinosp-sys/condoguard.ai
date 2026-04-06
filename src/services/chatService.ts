import { notifyApiFallback, setModuleDataSource } from './apiStatus';
import { isMockFallbackEnabled } from './fallbackPolicy';
import { requestJson } from './http';
import { getChatData, sendChatMessage, type ChatData, type ChatMessage } from './mockApi';

const MODULE_NAME = 'chat';

export type ChatTelemetryEvent = {
  ts: string;
  type: 'message' | 'feedback' | 'error';
  messageId?: string | null;
  intentId?: string | null;
  confidence?: 'low' | 'medium' | 'high' | null;
  guardrailBlocked?: boolean;
  guardrailReason?: string | null;
  rating?: 'up' | 'down';
  errorCode?: string;
  comment?: string | null;
};

export type ChatTelemetrySnapshot = {
  condominiumId: number;
  generatedAt: string;
  updatedAt: string;
  counters: {
    messages: number;
    blocked: number;
    fallback: number;
    errors: number;
    lowConfidence: number;
    outOfScope: number;
  };
  satisfaction: {
    total: number;
    positive: number;
    negative: number;
    score: number | null;
  };
  recentEvents: ChatTelemetryEvent[];
};

export async function fetchChatBootstrap(): Promise<ChatData> {
  try {
    const response = await requestJson<ChatData>('/api/chat/bootstrap');
    setModuleDataSource(MODULE_NAME, 'api');
    return response;
  } catch {
    if (!isMockFallbackEnabled()) {
      setModuleDataSource(MODULE_NAME, 'unknown');
      notifyApiFallback({ module: 'Chat', message: 'API indisponivel (fallback mock desativado)' });
      throw new Error('Falha ao carregar chat.');
    }
    setModuleDataSource(MODULE_NAME, 'mock');
    notifyApiFallback({ module: 'Chat', message: 'API indisponivel (fallback mock ativo)' });
    return getChatData();
  }
}

export async function postChatMessage(message: string): Promise<ChatMessage> {
  try {
    const response = await requestJson<ChatMessage>('/api/chat/message', {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
    setModuleDataSource(MODULE_NAME, 'api');
    return response;
  } catch {
    if (!isMockFallbackEnabled()) {
      setModuleDataSource(MODULE_NAME, 'unknown');
      notifyApiFallback({ module: 'Chat', message: 'API indisponivel (fallback mock desativado)' });
      throw new Error('Falha ao enviar mensagem no chat.');
    }
    setModuleDataSource(MODULE_NAME, 'mock');
    notifyApiFallback({ module: 'Chat', message: 'API indisponivel (fallback mock ativo)' });
    return sendChatMessage(message);
  }
}

export async function sendChatFeedback(messageId: string, rating: 'up' | 'down', comment?: string): Promise<void> {
  try {
    await requestJson<{ ok: boolean }>('/api/chat/feedback', {
      method: 'POST',
      body: JSON.stringify({ messageId, rating, comment: comment || undefined }),
    });
    setModuleDataSource(MODULE_NAME, 'api');
  } catch {
    setModuleDataSource(MODULE_NAME, isMockFallbackEnabled() ? 'mock' : 'unknown');
  }
}

export async function fetchChatTelemetry(limit = 20): Promise<ChatTelemetrySnapshot | null> {
  try {
    return await requestJson<ChatTelemetrySnapshot>(`/api/chat/telemetry?limit=${Math.max(1, limit)}`);
  } catch {
    return null;
  }
}

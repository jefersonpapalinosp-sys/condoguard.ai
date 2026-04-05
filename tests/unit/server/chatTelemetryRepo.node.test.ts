// @vitest-environment node
import { beforeEach, describe, expect, it } from 'vitest';
import {
  getChatTelemetrySnapshot,
  recordChatErrorTelemetry,
  recordChatFeedbackTelemetry,
  recordChatMessageTelemetry,
  resetChatTelemetryStore,
} from '../../../server/repositories/chatTelemetryRepo.mjs';

describe('chatTelemetryRepo', () => {
  beforeEach(() => {
    resetChatTelemetryStore();
  });

  it('aggregates message counters and guardrail/fallback flags', () => {
    recordChatMessageTelemetry(1, {
      id: 'bot-1',
      intentId: 'general_overview',
      confidence: 'medium',
      guardrails: { blocked: false, reason: null },
    });
    recordChatMessageTelemetry(1, {
      id: 'bot-2',
      intentId: 'general_overview',
      confidence: 'low',
      guardrails: { blocked: true, reason: 'OUT_OF_SCOPE' },
    });

    const snapshot = getChatTelemetrySnapshot(1, { limit: 10 });
    expect(snapshot.counters).toEqual(
      expect.objectContaining({
        messages: 2,
        blocked: 1,
        fallback: 1,
        lowConfidence: 1,
        outOfScope: 1,
      }),
    );
    expect(snapshot.recentEvents[0]).toEqual(
      expect.objectContaining({
        type: 'message',
        messageId: 'bot-2',
        guardrailBlocked: true,
      }),
    );
  });

  it('tracks satisfaction score from feedback events', () => {
    recordChatFeedbackTelemetry(1, { messageId: 'bot-1', rating: 'up', comment: null });
    recordChatFeedbackTelemetry(1, { messageId: 'bot-2', rating: 'down', comment: 'nao ajudou' });
    recordChatFeedbackTelemetry(1, { messageId: 'bot-3', rating: 'up', comment: null });

    const snapshot = getChatTelemetrySnapshot(1, { limit: 10 });
    expect(snapshot.satisfaction).toEqual(
      expect.objectContaining({
        total: 3,
        positive: 2,
        negative: 1,
        score: 66.67,
      }),
    );
  });

  it('tracks error events independently per tenant and respects snapshot limit', () => {
    recordChatErrorTelemetry(1, 'CHAT_ERROR');
    recordChatErrorTelemetry(1, 'TIMEOUT');
    recordChatMessageTelemetry(2, {
      id: 'bot-tenant-2',
      intentId: 'general_overview',
      confidence: 'medium',
      guardrails: { blocked: false, reason: null },
    });

    const tenant1 = getChatTelemetrySnapshot(1, { limit: 1 });
    const tenant2 = getChatTelemetrySnapshot(2, { limit: 10 });

    expect(tenant1.counters.errors).toBe(2);
    expect(tenant1.recentEvents).toHaveLength(1);
    expect(tenant1.recentEvents[0].type).toBe('error');

    expect(tenant2.counters.messages).toBe(1);
    expect(tenant2.counters.errors).toBe(0);
  });
});

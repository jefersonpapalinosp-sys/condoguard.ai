const MAX_EVENTS = 200;

const telemetryByCondominium = new Map();

function createEmptyState(condominiumId) {
  return {
    condominiumId,
    counters: {
      messages: 0,
      blocked: 0,
      fallback: 0,
      errors: 0,
      lowConfidence: 0,
      outOfScope: 0,
    },
    satisfaction: {
      total: 0,
      positive: 0,
      negative: 0,
    },
    recentEvents: [],
    updatedAt: new Date().toISOString(),
  };
}

function getState(condominiumId) {
  const normalizedId = Number(condominiumId || 0) || 0;
  if (!telemetryByCondominium.has(normalizedId)) {
    telemetryByCondominium.set(normalizedId, createEmptyState(normalizedId));
  }
  return telemetryByCondominium.get(normalizedId);
}

function pushEvent(state, event) {
  state.recentEvents.unshift(event);
  if (state.recentEvents.length > MAX_EVENTS) {
    state.recentEvents.length = MAX_EVENTS;
  }
  state.updatedAt = new Date().toISOString();
}

export function resetChatTelemetryStore() {
  telemetryByCondominium.clear();
}

export function recordChatMessageTelemetry(condominiumId, payload) {
  const state = getState(condominiumId);
  state.counters.messages += 1;

  if (payload?.guardrails?.blocked) {
    state.counters.blocked += 1;
    state.counters.fallback += 1;
  }

  if (payload?.confidence === 'low') {
    state.counters.lowConfidence += 1;
  }

  if (payload?.guardrails?.reason === 'OUT_OF_SCOPE') {
    state.counters.outOfScope += 1;
  }

  pushEvent(state, {
    ts: new Date().toISOString(),
    type: 'message',
    messageId: payload?.id || null,
    intentId: payload?.intentId || null,
    confidence: payload?.confidence || null,
    guardrailBlocked: Boolean(payload?.guardrails?.blocked),
    guardrailReason: payload?.guardrails?.reason || null,
  });
}

export function recordChatErrorTelemetry(condominiumId, errorCode) {
  const state = getState(condominiumId);
  state.counters.errors += 1;
  pushEvent(state, {
    ts: new Date().toISOString(),
    type: 'error',
    errorCode: String(errorCode || 'UNKNOWN_ERROR'),
  });
}

export function recordChatFeedbackTelemetry(condominiumId, feedback) {
  const state = getState(condominiumId);
  state.satisfaction.total += 1;
  if (feedback.rating === 'up') {
    state.satisfaction.positive += 1;
  } else if (feedback.rating === 'down') {
    state.satisfaction.negative += 1;
  }

  pushEvent(state, {
    ts: new Date().toISOString(),
    type: 'feedback',
    messageId: feedback.messageId,
    rating: feedback.rating,
    comment: feedback.comment || null,
  });
}

export function getChatTelemetrySnapshot(condominiumId, options = {}) {
  const state = getState(condominiumId);
  const limit = Math.max(1, Number(options.limit || 20));
  const satisfactionScore = state.satisfaction.total > 0
    ? Number(((state.satisfaction.positive / state.satisfaction.total) * 100).toFixed(2))
    : null;

  return {
    condominiumId: state.condominiumId,
    generatedAt: new Date().toISOString(),
    updatedAt: state.updatedAt,
    counters: { ...state.counters },
    satisfaction: {
      ...state.satisfaction,
      score: satisfactionScore,
    },
    recentEvents: state.recentEvents.slice(0, limit),
  };
}

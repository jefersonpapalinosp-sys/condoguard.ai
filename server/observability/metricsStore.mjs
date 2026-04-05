const MAX_LATENCY_SAMPLES = 2000;
const MAX_ROUTE_ENTRIES = 200;

const state = {
  startedAt: new Date().toISOString(),
  totalRequests: 0,
  totalErrors: 0,
  latencies: [],
  statusClasses: {
    '2xx': 0,
    '3xx': 0,
    '4xx': 0,
    '5xx': 0,
    other: 0,
  },
  routes: new Map(),
  errorCodes: new Map(),
};

function classifyStatus(status) {
  if (status >= 200 && status < 300) return '2xx';
  if (status >= 300 && status < 400) return '3xx';
  if (status >= 400 && status < 500) return '4xx';
  if (status >= 500 && status < 600) return '5xx';
  return 'other';
}

function routeKey(method, path) {
  return `${String(method || 'GET').toUpperCase()} ${String(path || '/')}`;
}

function ensureRouteEntry(key) {
  if (!state.routes.has(key)) {
    if (state.routes.size >= MAX_ROUTE_ENTRIES) {
      return null;
    }
    state.routes.set(key, {
      requests: 0,
      errors: 0,
      latencySumMs: 0,
      maxLatencyMs: 0,
    });
  }
  return state.routes.get(key);
}

function pushLatencySample(value) {
  state.latencies.push(value);
  if (state.latencies.length > MAX_LATENCY_SAMPLES) {
    state.latencies.shift();
  }
}

function percentile(values, p) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

export function resetObservabilityMetrics() {
  state.startedAt = new Date().toISOString();
  state.totalRequests = 0;
  state.totalErrors = 0;
  state.latencies = [];
  state.statusClasses = {
    '2xx': 0,
    '3xx': 0,
    '4xx': 0,
    '5xx': 0,
    other: 0,
  };
  state.routes.clear();
  state.errorCodes.clear();
}

export function recordApiRequestMetric({ method, path, status, latencyMs }) {
  const safeStatus = Number(status || 0) || 0;
  const safeLatency = Number(latencyMs || 0) || 0;

  state.totalRequests += 1;
  state.statusClasses[classifyStatus(safeStatus)] += 1;
  pushLatencySample(safeLatency);

  if (safeStatus >= 400) {
    state.totalErrors += 1;
  }

  const key = routeKey(method, path);
  const entry = ensureRouteEntry(key);
  if (!entry) {
    return;
  }

  entry.requests += 1;
  entry.latencySumMs += safeLatency;
  entry.maxLatencyMs = Math.max(entry.maxLatencyMs, safeLatency);
  if (safeStatus >= 400) {
    entry.errors += 1;
  }
}

export function recordApiErrorCodeMetric(code) {
  const key = String(code || 'UNKNOWN_ERROR');
  state.errorCodes.set(key, (state.errorCodes.get(key) || 0) + 1);
}

export function getObservabilityMetricsSnapshot({ routeLimit = 10, codeLimit = 10 } = {}) {
  const avgLatency = state.latencies.length > 0
    ? Number((state.latencies.reduce((sum, value) => sum + value, 0) / state.latencies.length).toFixed(2))
    : 0;
  const p95Latency = Number(percentile(state.latencies, 95).toFixed(2));
  const maxLatency = state.latencies.length > 0 ? Math.max(...state.latencies) : 0;
  const errorRate = state.totalRequests > 0
    ? Number(((state.totalErrors / state.totalRequests) * 100).toFixed(2))
    : 0;

  const topRoutes = [...state.routes.entries()]
    .map(([route, entry]) => ({
      route,
      requests: entry.requests,
      errors: entry.errors,
      avgLatencyMs: entry.requests > 0 ? Number((entry.latencySumMs / entry.requests).toFixed(2)) : 0,
      maxLatencyMs: entry.maxLatencyMs,
    }))
    .sort((a, b) => b.requests - a.requests)
    .slice(0, Math.max(1, Number(routeLimit || 10)));

  const errorCodes = [...state.errorCodes.entries()]
    .map(([code, count]) => ({ code, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, Math.max(1, Number(codeLimit || 10)));

  return {
    generatedAt: new Date().toISOString(),
    startedAt: state.startedAt,
    counters: {
      totalRequests: state.totalRequests,
      totalErrors: state.totalErrors,
      errorRatePct: errorRate,
    },
    latency: {
      avgMs: avgLatency,
      p95Ms: p95Latency,
      maxMs: maxLatency,
      samples: state.latencies.length,
    },
    statusClasses: { ...state.statusClasses },
    topRoutes,
    errorCodes,
  };
}

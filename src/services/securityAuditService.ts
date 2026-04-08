import { requestJson } from './http';

export type AuditEvent = {
  event: string;
  ts: string;
  actorSub?: string;
  condominiumId?: number;
  ip?: string;
  userAgent?: string;
  extra?: Record<string, unknown>;
};

export type AuditResponse = {
  items: AuditEvent[];
  meta: { returned: number; limit: number };
  filters: Record<string, unknown>;
};

export type AuditQuery = {
  event?: string;
  actorSub?: string;
  from?: string;
  to?: string;
  limit?: number;
};

function buildQuery(params: AuditQuery): string {
  const q: string[] = [];
  if (params.event) q.push(`event=${encodeURIComponent(params.event)}`);
  if (params.actorSub) q.push(`actorSub=${encodeURIComponent(params.actorSub)}`);
  if (params.from) q.push(`from=${encodeURIComponent(params.from)}`);
  if (params.to) q.push(`to=${encodeURIComponent(params.to)}`);
  if (params.limit) q.push(`limit=${params.limit}`);
  return q.length ? `?${q.join('&')}` : '';
}

export async function fetchSecurityAudit(params: AuditQuery = {}): Promise<AuditResponse> {
  return requestJson<AuditResponse>(`/api/security/audit${buildQuery(params)}`);
}

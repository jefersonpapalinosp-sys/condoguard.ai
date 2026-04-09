import { requestJson } from './http';

export type ComunicadoCategory = 'aviso' | 'urgente' | 'assembleia' | 'manutencao' | 'financeiro';
export type ComunicadoTargetRole = 'all' | 'morador' | 'sindico';
export type ComunicadoStatus = 'ativo' | 'arquivado';

export type Comunicado = {
  id: string;
  condominiumId: number;
  title: string;
  body: string;
  category: ComunicadoCategory;
  targetRole: ComunicadoTargetRole;
  status: ComunicadoStatus;
  createdAt: string;
  updatedAt?: string;
  authorName: string;
};

export type ComunicadoListResponse = {
  items: Comunicado[];
  total: number;
};

export type ComunicadoCreatePayload = {
  title: string;
  body: string;
  category: ComunicadoCategory;
  targetRole: ComunicadoTargetRole;
};

export async function fetchComunicados(params?: {
  category?: ComunicadoCategory;
  status?: ComunicadoStatus;
  targetRole?: ComunicadoTargetRole;
}): Promise<ComunicadoListResponse> {
  const qs = new URLSearchParams();
  if (params?.category) qs.set('category', params.category);
  if (params?.status) qs.set('status', params.status);
  if (params?.targetRole) qs.set('targetRole', params.targetRole);
  const query = qs.toString() ? `?${qs.toString()}` : '';
  return requestJson<ComunicadoListResponse>(`/api/comunicados${query}`);
}

export async function createComunicado(payload: ComunicadoCreatePayload): Promise<Comunicado> {
  const r = await requestJson<{ item: Comunicado }>('/api/comunicados', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return r.item;
}

export async function archiveComunicado(id: string): Promise<Comunicado> {
  const r = await requestJson<{ item: Comunicado }>(`/api/comunicados/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'arquivado' }),
  });
  return r.item;
}

export async function deleteComunicado(id: string): Promise<void> {
  await requestJson<{ ok: boolean }>(`/api/comunicados/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

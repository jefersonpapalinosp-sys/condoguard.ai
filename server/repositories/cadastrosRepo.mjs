import { readSeedJson } from '../utils/seedLoader.mjs';

const cadastroStoreByCondominium = new Map();

function safeDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString();
  }
  return date.toISOString();
}

function normalizeItem(item) {
  return {
    id: String(item.id || `cad-${Date.now()}`),
    condominiumId: Number(item.condominiumId || 0) || null,
    tipo: String(item.tipo || 'servico'),
    titulo: String(item.titulo || ''),
    descricao: String(item.descricao || ''),
    status: String(item.status || 'pending'),
    updatedAt: safeDate(item.updatedAt),
  };
}

function ensureTenantStore(condominiumId) {
  if (!cadastroStoreByCondominium.has(condominiumId)) {
    const seed = readSeedJson('cadastros.json');
    const seededItems = Array.isArray(seed?.items) ? seed.items : [];
    const scoped = seededItems
      .map((item) => normalizeItem(item))
      .filter((item) => item.condominiumId === condominiumId);
    cadastroStoreByCondominium.set(condominiumId, scoped);
  }

  return cadastroStoreByCondominium.get(condominiumId);
}

export async function listCadastros(condominiumId = 1) {
  const items = ensureTenantStore(condominiumId);
  const sorted = [...items].sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  return { items: sorted };
}

export async function createCadastro(condominiumId, payload) {
  const items = ensureTenantStore(condominiumId);
  const idSuffix = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  const now = new Date().toISOString();

  const created = normalizeItem({
    id: `cad-${Date.now()}-${idSuffix}`,
    condominiumId,
    tipo: payload.tipo,
    titulo: payload.titulo,
    descricao: payload.descricao,
    status: payload.status,
    updatedAt: now,
  });

  items.unshift(created);
  cadastroStoreByCondominium.set(condominiumId, items);
  return created;
}

export async function updateCadastroStatus(condominiumId, cadastroId, status) {
  const items = ensureTenantStore(condominiumId);
  const index = items.findIndex((item) => item.id === cadastroId);
  if (index < 0) {
    return null;
  }

  const updated = {
    ...items[index],
    status: String(status),
    updatedAt: new Date().toISOString(),
  };
  items[index] = normalizeItem(updated);
  cadastroStoreByCondominium.set(condominiumId, items);
  return items[index];
}

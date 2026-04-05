import { readSeedJson } from '../utils/seedLoader.mjs';

const ACTIVE_INTENTS_FILE = 'chat_intents.v1.json';

export function getChatIntentCatalog() {
  const payload = readSeedJson(ACTIVE_INTENTS_FILE);
  return {
    version: String(payload?.version || 'unknown'),
    intents: Array.isArray(payload?.intents) ? payload.intents : [],
  };
}

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function toStem(value) {
  const normalized = normalizeText(value)
    .replace(/[^a-z0-9\s]/g, '')
    .trim();

  if (!normalized) {
    return '';
  }

  // Heuristica simples para singular/plural e genero em PT-BR.
  return normalized
    .replace(/(oes|aes|ais|eis)$/g, '')
    .replace(/(res|is|ns|s)$/g, '')
    .replace(/(os|as|o|a|es|e)$/g, '');
}

export function classifyIntent(message) {
  const catalog = getChatIntentCatalog();
  const normalized = normalizeText(message);
  if (!normalized.trim()) {
    return { catalogVersion: catalog.version, intentId: 'general_overview', confidence: 'low' };
  }

  let winner = { id: 'general_overview', score: 0 };
  for (const intent of catalog.intents) {
    const keywords = Array.isArray(intent.keywords) ? intent.keywords : [];
    const score = keywords.reduce((total, keyword) => {
      const stem = toStem(keyword);
      if (!stem) {
        return total;
      }
      return total + (normalized.includes(stem) ? 1 : 0);
    }, 0);
    if (score > winner.score) {
      winner = { id: intent.id, score };
    }
  }

  const confidence = winner.score >= 3 ? 'high' : winner.score >= 1 ? 'medium' : 'low';
  return {
    catalogVersion: catalog.version,
    intentId: winner.id,
    confidence,
  };
}

export function listIntentSuggestions(limit = 3) {
  const catalog = getChatIntentCatalog();
  return catalog.intents.slice(0, limit).map((intent) => ({
    id: intent.id,
    label: intent.label,
    prompt: intent.promptTemplate,
  }));
}

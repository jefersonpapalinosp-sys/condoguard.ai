import { readSeedJson } from '../utils/seedLoader.mjs';

function nowTime() {
  return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export async function getChatBootstrap() {
  return readSeedJson('chat_bootstrap.json');
}

export async function askChat(message) {
  const m = String(message || '').toLowerCase();
  let text = 'Posso aprofundar esse ponto com dados financeiros, operacionais e de consumo.';

  if (m.includes('alerta')) text = 'Temos alertas criticos pendentes no momento.';
  if (m.includes('consumo')) text = 'Consumo medio abaixo da meta no periodo atual.';
  if (m.includes('fatura') || m.includes('inadimpl')) text = 'Existem faturas pendentes e vencidas para revisao.';

  return {
    id: `bot-${Date.now()}`,
    role: 'assistant',
    text,
    time: nowTime(),
  };
}

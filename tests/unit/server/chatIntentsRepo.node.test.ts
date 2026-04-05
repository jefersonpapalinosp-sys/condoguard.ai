// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

const catalogFixture = {
  version: 'test.v1',
  intents: [
    {
      id: 'financial_priorities',
      label: 'Resumo financeiro',
      promptTemplate: 'Quais prioridades financeiras hoje?',
      keywords: ['financeiro', 'fatura', 'inadimplencia'],
    },
    {
      id: 'critical_alerts',
      label: 'Alertas criticos',
      promptTemplate: 'Liste alertas criticos.',
      keywords: ['alerta', 'critico', 'urgente'],
    },
  ],
};

describe('chatIntentsRepo', () => {
  it('loads catalog metadata and suggestions', async () => {
    vi.resetModules();
    vi.doMock('../../../server/utils/seedLoader.mjs', () => ({
      readSeedJson: vi.fn().mockReturnValue(catalogFixture),
    }));

    const { getChatIntentCatalog, listIntentSuggestions } = await import('../../../server/repositories/chatIntentsRepo.mjs');
    const catalog = getChatIntentCatalog();
    const suggestions = listIntentSuggestions(2);

    expect(catalog.version).toBe('test.v1');
    expect(catalog.intents).toHaveLength(2);
    expect(suggestions).toEqual([
      {
        id: 'financial_priorities',
        label: 'Resumo financeiro',
        prompt: 'Quais prioridades financeiras hoje?',
      },
      {
        id: 'critical_alerts',
        label: 'Alertas criticos',
        prompt: 'Liste alertas criticos.',
      },
    ]);
  });

  it('classifies portuguese message by keyword stems and fallbacks when empty', async () => {
    vi.resetModules();
    vi.doMock('../../../server/utils/seedLoader.mjs', () => ({
      readSeedJson: vi.fn().mockReturnValue(catalogFixture),
    }));

    const { classifyIntent } = await import('../../../server/repositories/chatIntentsRepo.mjs');

    const financial = classifyIntent('Quais as prioridades financeiras com faturas e inadimplencias?');
    expect(financial).toEqual(
      expect.objectContaining({
        catalogVersion: 'test.v1',
        intentId: 'financial_priorities',
        confidence: 'high',
      }),
    );

    const empty = classifyIntent('   ');
    expect(empty).toEqual(
      expect.objectContaining({
        catalogVersion: 'test.v1',
        intentId: 'general_overview',
        confidence: 'low',
      }),
    );
  });
});

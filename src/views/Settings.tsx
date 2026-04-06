import { useEffect, useState } from 'react';
import { fetchSettingsData, type SettingsData } from '../services/settingsService';
import { DataSourceBadge } from '../shared/ui/DataSourceBadge';
import { LoadingState } from '../shared/ui/states/LoadingState';
import { ErrorState } from '../shared/ui/states/ErrorState';
import { EmptyState } from '../shared/ui/states/EmptyState';

function yesNo(value: boolean) {
  return value ? 'Sim' : 'Nao';
}

export default function Settings() {
  const [data, setData] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        const response = await fetchSettingsData();
        if (active) {
          setData(response);
          setError(null);
        }
      } catch {
        if (active) {
          setError('Falha ao carregar configuracoes operacionais.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return <LoadingState message="Carregando configuracoes..." />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  if (!data) {
    return <EmptyState message="Sem configuracoes disponiveis." />;
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8">
      <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-headline text-2xl md:text-4xl font-extrabold tracking-tight">Configuracoes</h2>
          <p className="text-on-surface-variant mt-2">Painel operacional de ambiente, seguranca e observabilidade.</p>
        </div>
        <DataSourceBadge module="settings" />
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <article className="bg-surface-container-highest p-6 rounded-xl">
          <p className="text-xs uppercase tracking-widest text-on-surface-variant">Ambiente</p>
          <h3 className="text-2xl font-headline font-extrabold mt-2">{data.platform.environment.toUpperCase()}</h3>
          <p className="text-xs text-on-surface-variant mt-2">Dialeto: {data.platform.dbDialect}</p>
          <p className="text-xs text-on-surface-variant">Condominio: #{data.tenant.condominiumId}</p>
        </article>

        <article className="bg-surface-container-highest p-6 rounded-xl">
          <p className="text-xs uppercase tracking-widest text-on-surface-variant">Autenticacao</p>
          <h3 className="text-xl font-headline font-extrabold mt-2">{data.platform.authProvider}</h3>
          <p className="text-xs text-on-surface-variant mt-2">OIDC configurado: {yesNo(data.platform.oidcConfigured)}</p>
          <p className="text-xs text-on-surface-variant">
            Login por senha habilitado: {yesNo(data.platform.authPasswordLoginEnabled)}
          </p>
        </article>

        <article className="bg-surface-container-highest p-6 rounded-xl">
          <p className="text-xs uppercase tracking-widest text-on-surface-variant">Fallback e alertas</p>
          <h3 className="text-xl font-headline font-extrabold mt-2">{data.observability.channel}</h3>
          <p className="text-xs text-on-surface-variant mt-2">
            Oracle seed fallback: {yesNo(data.platform.allowOracleSeedFallback)}
          </p>
          <p className="text-xs text-on-surface-variant">Eventos de fallback: {data.observability.fallbackEventsTotal}</p>
        </article>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <article className="bg-surface-container-low rounded-xl p-6 space-y-3">
          <h3 className="font-headline font-bold text-xl">Seguranca</h3>
          <p className="text-sm text-on-surface-variant">Janela rate limit: {data.security.rateLimitWindowMs} ms</p>
          <p className="text-sm text-on-surface-variant">Rate limit geral: {data.security.rateLimitMax}</p>
          <p className="text-sm text-on-surface-variant">Rate limit login: {data.security.loginRateLimitMax}</p>
          <p className="text-sm text-on-surface-variant">Auditoria ativa: {yesNo(data.security.securityAuditEnabled)}</p>
          <p className="text-sm text-on-surface-variant">Persistencia de auditoria: {yesNo(data.security.securityAuditPersistEnabled)}</p>
        </article>

        <article className="bg-surface-container-low rounded-xl p-6 space-y-3">
          <h3 className="font-headline font-bold text-xl">Thresholds de observabilidade</h3>
          <p className="text-sm text-on-surface-variant">
            P95 latencia (warn): {data.observability.thresholds.latencyP95WarnMs} ms
          </p>
          <p className="text-sm text-on-surface-variant">
            Taxa de erro (warn): {data.observability.thresholds.errorRateWarnPct}%
          </p>
          <p className="text-sm text-on-surface-variant">
            Fallback (warn): {data.observability.thresholds.fallbackWarnCount}
          </p>
          <p className="text-sm text-on-surface-variant">
            Ultima leitura: {new Date(data.generatedAt).toLocaleString('pt-BR')}
          </p>
        </article>
      </section>
    </div>
  );
}

import { FormEvent, useEffect, useState } from 'react';
import { fetchSettingsData, updateThresholds, type SettingsData } from '../services/settingsService';
import { fetchSecurityAudit, type AuditEvent, type AuditQuery } from '../services/securityAuditService';
import { useAuth } from '../features/auth/context/AuthContext';
import { DataSourceBadge } from '../shared/ui/DataSourceBadge';
import { LoadingState } from '../shared/ui/states/LoadingState';
import { ErrorState } from '../shared/ui/states/ErrorState';
import { EmptyState } from '../shared/ui/states/EmptyState';

type Tab = 'config' | 'audit';

function yesNo(value: boolean) {
  return value ? 'Sim' : 'Nao';
}

function issueToneClass(isReady: boolean) {
  return isReady
    ? 'border-tertiary-fixed-dim/35 bg-tertiary-fixed-dim/15 text-on-tertiary-fixed-variant'
    : 'border-error/20 bg-error-container/35 text-on-error-container';
}

// ---------------------------------------------------------------------------
// Threshold edit form
// ---------------------------------------------------------------------------
function ThresholdsCard({ data, onSaved }: { data: SettingsData; onSaved: (t: SettingsData['observability']['thresholds']) => void }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [latency, setLatency] = useState(String(data.observability.thresholds.latencyP95WarnMs));
  const [errorRate, setErrorRate] = useState(String(data.observability.thresholds.errorRateWarnPct));
  const [fallback, setFallback] = useState(String(data.observability.thresholds.fallbackWarnCount));

  function resetForm() {
    setLatency(String(data.observability.thresholds.latencyP95WarnMs));
    setErrorRate(String(data.observability.thresholds.errorRateWarnPct));
    setFallback(String(data.observability.thresholds.fallbackWarnCount));
    setSaveError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    try {
      const result = await updateThresholds({
        latencyP95WarnMs: Number(latency),
        errorRateWarnPct: Number(errorRate),
        fallbackWarnCount: Number(fallback),
      });
      onSaved(result.thresholds);
      setEditing(false);
    } catch {
      setSaveError('Falha ao salvar thresholds. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    'w-full rounded-lg border border-outline-variant/60 bg-surface-container px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary-container';

  return (
    <article className="bg-surface-container-low rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-headline font-bold text-xl">Thresholds de observabilidade</h3>
        {!editing && (
          <button
            type="button"
            onClick={() => { resetForm(); setEditing(true); }}
            className="flex items-center gap-1.5 rounded-xl border border-outline-variant/60 px-3 py-1.5 text-xs font-semibold text-on-surface-variant hover:bg-surface-container-high transition-colors"
          >
            <span className="material-symbols-outlined text-[14px]">edit</span>
            Editar
          </button>
        )}
      </div>

      {editing ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-wider text-on-surface-variant mb-1">
              P95 latência (warn ms)
            </label>
            <input
              type="number"
              min={100}
              max={60000}
              value={latency}
              onChange={(e) => setLatency(e.target.value)}
              required
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-on-surface-variant mb-1">
              Taxa de erro (warn %)
            </label>
            <input
              type="number"
              min={1}
              max={100}
              value={errorRate}
              onChange={(e) => setErrorRate(e.target.value)}
              required
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-on-surface-variant mb-1">
              Fallbacks (warn contagem)
            </label>
            <input
              type="number"
              min={0}
              max={1000}
              value={fallback}
              onChange={(e) => setFallback(e.target.value)}
              required
              className={inputClass}
            />
          </div>
          {saveError && <p className="text-xs text-error">{saveError}</p>}
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-primary-container px-4 py-2 text-sm font-bold text-white disabled:opacity-60 hover:opacity-90 transition-opacity"
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
            <button
              type="button"
              onClick={() => { setEditing(false); setSaveError(null); }}
              disabled={saving}
              className="rounded-xl border border-outline-variant/60 px-4 py-2 text-sm font-semibold text-on-surface-variant hover:bg-surface-container-high transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-on-surface-variant">
            P95 latencia (warn): <span className="font-semibold text-on-surface">{data.observability.thresholds.latencyP95WarnMs} ms</span>
          </p>
          <p className="text-sm text-on-surface-variant">
            Taxa de erro (warn): <span className="font-semibold text-on-surface">{data.observability.thresholds.errorRateWarnPct}%</span>
          </p>
          <p className="text-sm text-on-surface-variant">
            Fallback (warn): <span className="font-semibold text-on-surface">{data.observability.thresholds.fallbackWarnCount}</span>
          </p>
          <p className="text-sm text-on-surface-variant">
            Ultima leitura: {new Date(data.generatedAt).toLocaleString('pt-BR')}
          </p>
        </div>
      )}
    </article>
  );
}

// ---------------------------------------------------------------------------
// Security Audit tab
// ---------------------------------------------------------------------------
const AUDIT_EVENT_OPTIONS = [
  '',
  'auth_login_success',
  'auth_login_failed',
  'invoice_mark_paid',
  'invoice_create',
  'unit_status_update',
  'alert_mark_read',
  'audit_log_viewed',
  'settings_thresholds_updated',
  'chat_feedback_submitted',
];

const today = new Date().toISOString().slice(0, 10);
const firstOfMonth = today.slice(0, 8) + '01';

function AuditTab() {
  const [items, setItems] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetched, setFetched] = useState(false);

  const [eventFilter, setEventFilter] = useState('');
  const [actorFilter, setActorFilter] = useState('');
  const [fromDate, setFromDate] = useState(firstOfMonth);
  const [toDate, setToDate] = useState(today);
  const [limitVal, setLimitVal] = useState('100');

  async function handleFetch(e?: FormEvent) {
    e?.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const query: AuditQuery = { limit: Number(limitVal) || 100 };
      if (eventFilter) query.event = eventFilter;
      if (actorFilter.trim()) query.actorSub = actorFilter.trim();
      if (fromDate) query.from = fromDate + 'T00:00:00Z';
      if (toDate) query.to = toDate + 'T23:59:59Z';
      const result = await fetchSecurityAudit(query);
      setItems(result.items);
      setFetched(true);
    } catch {
      setError('Falha ao carregar eventos de auditoria.');
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    'rounded-lg border border-outline-variant/60 bg-surface-container px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary-container';

  function formatTs(ts: string) {
    try {
      return new Date(ts).toLocaleString('pt-BR');
    } catch {
      return ts;
    }
  }

  const eventBadgeClass: Record<string, string> = {
    auth_login_failed: 'bg-error-container text-on-error-container',
    auth_login_success: 'bg-tertiary-fixed-dim/30 text-on-tertiary-fixed-variant',
    invoice_mark_paid: 'bg-surface-container-high text-on-surface',
    settings_thresholds_updated: 'bg-secondary-container text-on-secondary-container',
  };

  return (
    <div className="space-y-6">
      {/* Filter bar */}
      <form onSubmit={handleFetch} className="rounded-2xl border border-outline-variant/30 bg-surface-container-low p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-0.5 min-w-[160px]">
            <label className="text-[10px] uppercase tracking-widest text-on-surface-variant">Evento</label>
            <select
              value={eventFilter}
              onChange={(e) => setEventFilter(e.target.value)}
              className={inputClass}
            >
              {AUDIT_EVENT_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt || '— todos —'}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-0.5 min-w-[160px]">
            <label className="text-[10px] uppercase tracking-widest text-on-surface-variant">Ator (sub)</label>
            <input
              type="text"
              value={actorFilter}
              onChange={(e) => setActorFilter(e.target.value)}
              placeholder="email@..."
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-0.5">
            <label className="text-[10px] uppercase tracking-widest text-on-surface-variant">De</label>
            <input type="date" value={fromDate} max={toDate} onChange={(e) => setFromDate(e.target.value)} className={inputClass} />
          </div>
          <div className="flex flex-col gap-0.5">
            <label className="text-[10px] uppercase tracking-widest text-on-surface-variant">Ate</label>
            <input type="date" value={toDate} min={fromDate} onChange={(e) => setToDate(e.target.value)} className={inputClass} />
          </div>
          <div className="flex flex-col gap-0.5 w-20">
            <label className="text-[10px] uppercase tracking-widest text-on-surface-variant">Limite</label>
            <input
              type="number"
              min={1}
              max={500}
              value={limitVal}
              onChange={(e) => setLimitVal(e.target.value)}
              className={inputClass}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl bg-primary-container px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60 hover:opacity-90 transition-opacity"
          >
            <span className="material-symbols-outlined text-[16px]">search</span>
            {loading ? 'Buscando...' : 'Buscar'}
          </button>
        </div>
      </form>

      {loading && <LoadingState message="Carregando eventos de auditoria..." />}
      {error && !loading && <ErrorState message={error} />}

      {!loading && !error && !fetched && (
        <EmptyState message="Configure os filtros acima e clique em Buscar para carregar os eventos." />
      )}

      {!loading && !error && fetched && items.length === 0 && (
        <EmptyState message="Nenhum evento encontrado para os filtros selecionados." />
      )}

      {!loading && !error && fetched && items.length > 0 && (
        <div className="rounded-2xl border border-outline-variant/30 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-surface-container-low border-b border-outline-variant/20">
            <span className="text-xs uppercase tracking-widest text-on-surface-variant font-semibold">
              {items.length} evento{items.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-outline-variant/20 bg-surface-container-lowest">
                  <th className="text-left py-2.5 px-4 text-xs uppercase tracking-wider text-on-surface-variant font-medium">Timestamp</th>
                  <th className="text-left py-2.5 px-4 text-xs uppercase tracking-wider text-on-surface-variant font-medium">Evento</th>
                  <th className="text-left py-2.5 px-4 text-xs uppercase tracking-wider text-on-surface-variant font-medium">Ator</th>
                  <th className="text-left py-2.5 px-4 text-xs uppercase tracking-wider text-on-surface-variant font-medium">IP</th>
                  <th className="text-left py-2.5 px-4 text-xs uppercase tracking-wider text-on-surface-variant font-medium">Detalhes</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx} className="border-b border-outline-variant/15 last:border-0 hover:bg-surface-container-low transition-colors">
                    <td className="py-2.5 px-4 text-on-surface-variant whitespace-nowrap font-mono text-xs">
                      {formatTs(item.ts)}
                    </td>
                    <td className="py-2.5 px-4">
                      <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${eventBadgeClass[item.event] ?? 'bg-surface-container-high text-on-surface'}`}>
                        {item.event}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-on-surface-variant text-xs max-w-[160px] truncate">
                      {item.actorSub ?? '—'}
                    </td>
                    <td className="py-2.5 px-4 text-on-surface-variant text-xs font-mono">
                      {item.ip ?? '—'}
                    </td>
                    <td className="py-2.5 px-4 text-on-surface-variant text-xs max-w-[240px] truncate">
                      {item.extra ? JSON.stringify(item.extra) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Settings page
// ---------------------------------------------------------------------------
export default function Settings() {
  const { role } = useAuth();
  const [data, setData] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('config');

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

  function handleThresholdsSaved(updated: SettingsData['observability']['thresholds']) {
    if (!data) return;
    setData({ ...data, observability: { ...data.observability, thresholds: updated } });
  }

  const isAdmin = role === 'admin';

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-headline text-2xl md:text-4xl font-extrabold tracking-tight">Configuracoes</h2>
          <p className="text-on-surface-variant mt-2">Painel operacional de ambiente, seguranca e observabilidade.</p>
        </div>
        <DataSourceBadge module="settings" />
      </section>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-surface-container p-1 self-start">
        <button
          type="button"
          onClick={() => setActiveTab('config')}
          className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
            activeTab === 'config'
              ? 'bg-primary-container text-white shadow-sm'
              : 'text-on-surface-variant hover:bg-surface-container-high'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">settings</span>
          Configuracoes
        </button>
        {isAdmin && (
          <button
            type="button"
            onClick={() => setActiveTab('audit')}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              activeTab === 'audit'
                ? 'bg-primary-container text-white shadow-sm'
                : 'text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">shield</span>
            Auditoria
          </button>
        )}
      </div>

      {/* Tab: Configuracoes */}
      {activeTab === 'config' && (
        <>
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
              <p className="text-xs text-on-surface-variant">OIDC pronto para homolog: {yesNo(data.platform.oidcReady)}</p>
              <p className="text-xs text-on-surface-variant">
                Login por senha habilitado: {yesNo(data.platform.authPasswordLoginEnabled)}
              </p>
              <p className="text-xs text-on-surface-variant">Claim role: {data.platform.oidcRoleClaim}</p>
              <p className="text-xs text-on-surface-variant">Claim tenant: {data.platform.oidcTenantClaim}</p>
              <p className="text-xs text-on-surface-variant">Algoritmos OIDC: {data.platform.oidcAllowedAlgs.join(', ')}</p>
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

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr,0.9fr]">
            <article className={`rounded-2xl border p-6 ${issueToneClass(data.platform.oidcReady)}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-widest opacity-80">OIDC readiness</p>
                  <h3 className="mt-2 font-headline text-2xl font-extrabold">
                    {data.platform.oidcReady ? 'Pronto para validacao real' : 'Pendencias para OIDC real'}
                  </h3>
                </div>
                <span className="rounded-full bg-black/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em]">
                  {data.platform.oidcReady ? 'Ready' : 'Action required'}
                </span>
              </div>

              <p className="mt-3 text-sm leading-6 opacity-90">
                Use este bloco para revisar rapidamente se o ambiente esta pronto para a rodada real de homolog com o provedor corporativo.
              </p>

              {data.platform.oidcIssues.length > 0 ? (
                <div className="mt-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] opacity-80">Ajustes necessarios</p>
                  <ul className="mt-3 space-y-2">
                    {data.platform.oidcIssues.map((issue) => (
                      <li key={issue} className="rounded-xl bg-black/5 px-4 py-3 text-sm leading-6">
                        {issue}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="mt-5 rounded-xl bg-black/5 px-4 py-4 text-sm leading-6">
                  Ambiente sem pendencias estruturais para OIDC. Falta apenas validar token real e evidencias de homolog.
                </div>
              )}
            </article>

            <article className="rounded-2xl border border-outline-variant/30 bg-surface-container-low p-6">
              <p className="text-xs uppercase tracking-widest text-on-surface-variant">Checklist de configuracao</p>
              <h3 className="mt-2 font-headline text-2xl font-extrabold">Campos monitorados</h3>

              <div className="mt-5 grid grid-cols-1 gap-3">
                <div className="rounded-xl border border-outline-variant/20 bg-surface-container-highest px-4 py-3">
                  <p className="text-xs uppercase tracking-widest text-on-surface-variant">Missing config</p>
                  <p className="mt-2 text-sm text-on-surface">
                    {data.platform.oidcMissingConfig.length > 0 ? data.platform.oidcMissingConfig.join(', ') : 'Nenhum campo pendente.'}
                  </p>
                </div>
                <div className="rounded-xl border border-outline-variant/20 bg-surface-container-highest px-4 py-3">
                  <p className="text-xs uppercase tracking-widest text-on-surface-variant">Comando de gate</p>
                  <p className="mt-2 font-mono text-xs text-on-surface break-all">npm run env:validate:s11:oidc</p>
                </div>
                <div className="rounded-xl border border-outline-variant/20 bg-surface-container-highest px-4 py-3">
                  <p className="text-xs uppercase tracking-widest text-on-surface-variant">Proximo passo</p>
                  <p className="mt-2 text-sm text-on-surface">
                    Preencher o `.env` de homolog com `issuer`, `audience`, `jwks`, claims e desabilitar login local.
                  </p>
                </div>
              </div>
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

            <ThresholdsCard data={data} onSaved={handleThresholdsSaved} />
          </section>
        </>
      )}

      {/* Tab: Auditoria */}
      {activeTab === 'audit' && isAdmin && <AuditTab />}
    </div>
  );
}

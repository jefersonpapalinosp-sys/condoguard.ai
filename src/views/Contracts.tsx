import { useEffect, useState, useCallback } from 'react';
import {
  fetchContractsDashboard,
  fetchContractsList,
  fetchContractsExpiring,
  fetchContractsAdjustments,
  renewContract,
  closeContract,
  type ContractsDashboard,
  type ContractsList,
  type ContractsExpiring,
  type ContractsAdjustments,
  type ContractRisk,
  type ContractStatus,
  type ListParams,
} from '../services/contractsService';
import { DataSourceBadge } from '../shared/ui/DataSourceBadge';
import { LoadingState } from '../shared/ui/states/LoadingState';
import { ErrorState } from '../shared/ui/states/ErrorState';
import { EmptyState } from '../shared/ui/states/EmptyState';
import { useAuth } from '../features/auth/context/AuthContext';

// ─── Constants ────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { id: 'lista', label: 'Lista', icon: 'list_alt' },
  { id: 'vencimentos', label: 'Vencimentos', icon: 'event_busy' },
  { id: 'reajustes', label: 'Reajustes', icon: 'trending_up' },
] as const;

type Tab = (typeof TABS)[number]['id'];

const RISK_STYLE: Record<ContractRisk, string> = {
  high: 'bg-error-container text-on-error-container',
  medium: 'bg-secondary-container/60 text-on-secondary-container',
  low: 'bg-tertiary-fixed-dim/30 text-on-tertiary-fixed-variant',
};
const RISK_LABEL: Record<ContractRisk, string> = { high: 'Alto', medium: 'Médio', low: 'Baixo' };

const STATUS_STYLE: Record<ContractStatus, string> = {
  active: 'bg-tertiary-fixed-dim/30 text-on-tertiary-fixed-variant',
  expiring: 'bg-secondary-container/60 text-on-secondary-container',
  expired: 'bg-error-container text-on-error-container',
  renewal_pending: 'bg-secondary-container/40 text-on-secondary-container',
  closed: 'bg-surface-container-highest text-on-surface-variant',
};
const STATUS_LABEL: Record<ContractStatus, string> = {
  active: 'Ativo',
  expiring: 'Vencendo',
  expired: 'Vencido',
  renewal_pending: 'Renovação pendente',
  closed: 'Encerrado',
};

// ─── Metric card ──────────────────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  icon,
  highlight,
}: {
  label: string;
  value: string | number;
  icon: string;
  highlight?: boolean;
}) {
  return (
    <article
      className={`rounded-2xl p-4 flex items-start gap-3 ${highlight ? 'bg-primary-container text-on-primary-container' : 'bg-surface-container-highest'}`}
    >
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${highlight ? 'bg-white/20' : 'bg-surface-container-low'}`}
      >
        <span className="material-symbols-outlined text-[18px]">{icon}</span>
      </div>
      <div>
        <p className={`text-[10px] uppercase tracking-wider ${highlight ? 'opacity-70' : 'text-on-surface-variant'}`}>
          {label}
        </p>
        <p className="text-xl font-headline font-extrabold mt-0.5">{value}</p>
      </div>
    </article>
  );
}

// ─── Dashboard tab ───────────────────────────────────────────────────────────

function DashboardTab() {
  const [data, setData] = useState<ContractsDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchContractsDashboard()
      .then((d) => { if (active) { setData(d); setLoading(false); } })
      .catch(() => { if (active) { setError('Falha ao carregar dashboard.'); setLoading(false); } });
    return () => { active = false; };
  }, []);

  if (loading) return <LoadingState message="Carregando dashboard..." />;
  if (error) return <ErrorState message={error} />;
  if (!data) return null;

  const m = data.metrics;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard label="Gasto mensal" value={m.totalMonthlySpend} icon="payments" highlight />
        <MetricCard label="Contratos ativos" value={m.activeContracts} icon="check_circle" />
        <MetricCard label="Vencendo em breve" value={m.expiringSoonContracts} icon="event_busy" />
        <MetricCard label="Alto risco" value={m.highRiskContracts} icon="warning" />
        <MetricCard label="Reajustes previstos" value={m.upcomingAdjustments} icon="trending_up" />
        <MetricCard label="Impacto estimado" value={m.estimatedFinancialImpact} icon="assessment" />
        <MetricCard label="Total de contratos" value={m.totalContracts} icon="description" />
        <MetricCard label="Vencidos" value={m.expiredContracts} icon="cancel" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Top risk */}
        <section className="bg-surface-container-highest rounded-2xl p-5">
          <h3 className="font-headline font-bold text-sm mb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] text-error">warning</span>
            Contratos de maior risco
          </h3>
          {data.highlights.topRiskContracts.length === 0 ? (
            <p className="text-xs text-on-surface-variant">Nenhum contrato de alto risco.</p>
          ) : (
            <div className="space-y-2">
              {data.highlights.topRiskContracts.map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold">{c.supplier}</p>
                    <p className="text-[10px] text-on-surface-variant">{c.contractNumber}</p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${RISK_STYLE[c.risk]}`}>
                      {RISK_LABEL[c.risk]}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_STYLE[c.status]}`}>
                      {STATUS_LABEL[c.status]}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Top spend */}
        <section className="bg-surface-container-highest rounded-2xl p-5">
          <h3 className="font-headline font-bold text-sm mb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] text-primary">payments</span>
            Maiores gastos mensais
          </h3>
          {data.highlights.topSpendContracts.length === 0 ? (
            <p className="text-xs text-on-surface-variant">Sem dados de gasto.</p>
          ) : (
            <div className="space-y-2">
              {data.highlights.topSpendContracts.map((c, idx) => (
                <div key={c.id} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-on-surface-variant w-4">{idx + 1}.</span>
                    <div>
                      <p className="text-xs font-semibold">{c.supplier}</p>
                      <p className="text-[10px] text-on-surface-variant">{c.contractNumber}</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-on-surface shrink-0">{c.monthlyValue}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

// ─── Lista tab ────────────────────────────────────────────────────────────────

function ListaTab({ canEdit }: { canEdit: boolean }) {
  const [data, setData] = useState<ContractsList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [params, setParams] = useState<ListParams>({ page: 1, pageSize: 20, sortBy: 'monthlyValue', sortOrder: 'desc' });
  const [search, setSearch] = useState('');
  const [actionId, setActionId] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<{ id: string; ok: boolean; text: string } | null>(null);

  const load = useCallback(async (p: ListParams) => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetchContractsList(p);
      setData(r);
    } catch {
      setError('Falha ao carregar lista de contratos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(params); }, [load, params]);

  function applySearch() {
    setParams((p) => ({ ...p, page: 1, search }));
  }

  function setFilter(key: keyof ListParams, value: string) {
    setParams((p) => ({ ...p, page: 1, [key]: value || undefined }));
  }

  async function handleRenew(id: string) {
    setActionId(id);
    try {
      const r = await renewContract(id);
      setActionMsg({ id, ok: true, text: r.message ?? 'Contrato renovado.' });
      void load(params);
    } catch {
      setActionMsg({ id, ok: false, text: 'Falha ao renovar.' });
    } finally {
      setActionId(null);
    }
  }

  async function handleClose(id: string) {
    if (!confirm('Encerrar este contrato?')) return;
    setActionId(id);
    try {
      const r = await closeContract(id);
      setActionMsg({ id, ok: true, text: r.message ?? 'Contrato encerrado.' });
      void load(params);
    } catch {
      setActionMsg({ id, ok: false, text: 'Falha ao encerrar.' });
    } finally {
      setActionId(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-end">
        <div className="flex gap-1 flex-1 min-w-[200px]">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applySearch()}
            placeholder="Buscar fornecedor, número..."
            className="flex-1 rounded-xl border border-outline-variant/40 bg-surface-container-highest px-3 py-2 text-sm focus:outline-none focus:border-primary/50"
          />
          <button
            type="button"
            onClick={applySearch}
            className="rounded-xl bg-primary px-3 py-2 text-on-primary"
          >
            <span className="material-symbols-outlined text-[16px]">search</span>
          </button>
        </div>
        <select
          onChange={(e) => setFilter('status', e.target.value)}
          className="rounded-xl border border-outline-variant/40 bg-surface-container-highest px-3 py-2 text-sm"
        >
          <option value="">Todos status</option>
          <option value="active">Ativo</option>
          <option value="expiring">Vencendo</option>
          <option value="expired">Vencido</option>
          <option value="closed">Encerrado</option>
        </select>
        <select
          onChange={(e) => setFilter('risk', e.target.value)}
          className="rounded-xl border border-outline-variant/40 bg-surface-container-highest px-3 py-2 text-sm"
        >
          <option value="">Todos riscos</option>
          <option value="high">Alto</option>
          <option value="medium">Médio</option>
          <option value="low">Baixo</option>
        </select>
        {data?.facets?.serviceTypes && data.facets.serviceTypes.length > 0 && (
          <select
            onChange={(e) => setFilter('serviceType', e.target.value)}
            className="rounded-xl border border-outline-variant/40 bg-surface-container-highest px-3 py-2 text-sm"
          >
            <option value="">Todos serviços</option>
            {data.facets.serviceTypes.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
      </div>

      {actionMsg && (
        <div
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold ${actionMsg.ok ? 'bg-tertiary-fixed-dim/20 text-on-tertiary-fixed-variant' : 'bg-error-container text-on-error-container'}`}
        >
          <span className="material-symbols-outlined text-[16px]">{actionMsg.ok ? 'check_circle' : 'error'}</span>
          {actionMsg.text}
          <button type="button" onClick={() => setActionMsg(null)} className="ml-auto">
            <span className="material-symbols-outlined text-[14px]">close</span>
          </button>
        </div>
      )}

      {loading && <LoadingState message="Carregando contratos..." />}
      {error && !loading && <ErrorState message={error} />}

      {!loading && !error && data && (
        <>
          <div className="overflow-x-auto rounded-2xl border border-outline-variant/20">
            <table className="w-full min-w-[800px] text-sm">
              <thead className="bg-surface-container-low">
                <tr className="text-left text-on-surface-variant text-[10px] uppercase tracking-wider">
                  <th className="px-4 py-3">Fornecedor / Serviço</th>
                  <th className="px-4 py-3">Valor mensal</th>
                  <th className="px-4 py-3">Índice</th>
                  <th className="px-4 py-3">Vencimento</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Risco</th>
                  {canEdit && <th className="px-4 py-3 text-right">Ações</th>}
                </tr>
              </thead>
              <tbody>
                {data.items.length === 0 ? (
                  <tr>
                    <td colSpan={canEdit ? 7 : 6} className="py-8 text-center text-on-surface-variant">
                      Nenhum contrato encontrado.
                    </td>
                  </tr>
                ) : (
                  data.items.map((item) => (
                    <tr key={item.id} className="border-t border-outline-variant/15 hover:bg-surface-container-lowest/50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-on-surface">{item.supplier}</p>
                        <p className="text-[10px] text-on-surface-variant">{item.serviceType} · {item.contractNumber}</p>
                      </td>
                      <td className="px-4 py-3 font-bold">{item.monthlyValueLabel}</td>
                      <td className="px-4 py-3 text-on-surface-variant">{item.index}</td>
                      <td className="px-4 py-3">
                        <p>{item.endDate ?? '—'}</p>
                        {item.daysToEnd !== null && (
                          <p className={`text-[10px] ${item.daysToEnd < 0 ? 'text-error' : item.daysToEnd <= 30 ? 'text-secondary' : 'text-on-surface-variant'}`}>
                            {item.daysToEnd < 0 ? `${Math.abs(item.daysToEnd)}d atraso` : `${item.daysToEnd}d restantes`}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_STYLE[item.status]}`}>
                          {STATUS_LABEL[item.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${RISK_STYLE[item.risk]}`}>
                          {RISK_LABEL[item.risk]}
                        </span>
                      </td>
                      {canEdit && (
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1.5">
                            {item.status !== 'closed' && (
                              <button
                                type="button"
                                onClick={() => void handleRenew(item.id)}
                                disabled={actionId === item.id}
                                className="flex items-center gap-1 rounded-lg bg-tertiary-fixed-dim/20 px-2.5 py-1.5 text-[11px] font-bold text-on-tertiary-fixed-variant hover:opacity-80 disabled:opacity-40 transition-opacity"
                              >
                                <span className="material-symbols-outlined text-[12px]">autorenew</span>
                                Renovar
                              </button>
                            )}
                            {item.status !== 'closed' && (
                              <button
                                type="button"
                                onClick={() => void handleClose(item.id)}
                                disabled={actionId === item.id}
                                className="flex items-center gap-1 rounded-lg bg-error-container/30 px-2.5 py-1.5 text-[11px] font-bold text-on-error-container hover:opacity-80 disabled:opacity-40 transition-opacity"
                              >
                                <span className="material-symbols-outlined text-[12px]">cancel</span>
                                Encerrar
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {(data.meta.hasPrevious || data.meta.hasNext) && (
            <div className="flex items-center justify-between text-sm">
              <p className="text-on-surface-variant text-xs">
                {data.meta.total} contratos · página {data.meta.page}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={!data.meta.hasPrevious}
                  onClick={() => setParams((p) => ({ ...p, page: (p.page ?? 1) - 1 }))}
                  className="rounded-xl border border-outline-variant/30 px-3 py-1.5 text-xs font-semibold disabled:opacity-40 hover:bg-surface-container-high transition-colors"
                >
                  Anterior
                </button>
                <button
                  type="button"
                  disabled={!data.meta.hasNext}
                  onClick={() => setParams((p) => ({ ...p, page: (p.page ?? 1) + 1 }))}
                  className="rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-on-primary disabled:opacity-40 hover:opacity-90 transition-opacity"
                >
                  Próxima
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Vencimentos tab ──────────────────────────────────────────────────────────

function VencimentosTab() {
  const [data, setData] = useState<ContractsExpiring | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchContractsExpiring()
      .then((d) => { if (active) { setData(d); setLoading(false); } })
      .catch(() => { if (active) { setError('Falha ao carregar vencimentos.'); setLoading(false); } });
    return () => { active = false; };
  }, []);

  if (loading) return <LoadingState message="Carregando vencimentos..." />;
  if (error) return <ErrorState message={error} />;
  if (!data) return null;

  const { summary, groups } = data;
  const hasAny = summary.expired + summary.in30Days + summary.in60Days + summary.in90Days > 0;

  if (!hasAny) return <EmptyState message="Nenhum contrato com vencimento próximo." />;

  const GROUPS: Array<{ key: keyof typeof groups; label: string; urgency: string }> = [
    { key: 'expired', label: 'Vencidos', urgency: 'border-error/30 bg-error-container/20 text-on-error-container' },
    { key: 'in30Days', label: 'Vencem em 30 dias', urgency: 'border-secondary/30 bg-secondary-container/20 text-on-secondary-container' },
    { key: 'in60Days', label: 'Vencem em 60 dias', urgency: 'border-outline-variant/30 bg-surface-container-highest' },
    { key: 'in90Days', label: 'Vencem em 90 dias', urgency: 'border-outline-variant/30 bg-surface-container-highest' },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard label="Vencidos" value={summary.expired} icon="cancel" />
        <MetricCard label="Em 30 dias" value={summary.in30Days} icon="event_busy" />
        <MetricCard label="Em 60 dias" value={summary.in60Days} icon="calendar_month" />
        <MetricCard label="Em 90 dias" value={summary.in90Days} icon="calendar_month" />
      </div>

      {GROUPS.map(({ key, label, urgency }) => {
        const items = groups[key];
        if (items.length === 0) return null;
        return (
          <section key={key} className={`rounded-2xl border p-4 ${urgency}`}>
            <h3 className="font-bold text-sm mb-3">{label} ({items.length})</h3>
            <div className="space-y-2">
              {items.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold">{item.supplier}</p>
                    <p className="text-[10px] opacity-70">{item.contractNumber} · {item.serviceType}</p>
                  </div>
                  <div className="text-right text-xs shrink-0">
                    <p className="font-bold">{item.endDate}</p>
                    <p className="opacity-70">{item.monthlyValueLabel}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

// ─── Reajustes tab ────────────────────────────────────────────────────────────

function ReajustesTab() {
  const [data, setData] = useState<ContractsAdjustments | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchContractsAdjustments()
      .then((d) => { if (active) { setData(d); setLoading(false); } })
      .catch(() => { if (active) { setError('Falha ao carregar reajustes.'); setLoading(false); } });
    return () => { active = false; };
  }, []);

  if (loading) return <LoadingState message="Carregando reajustes..." />;
  if (error) return <ErrorState message={error} />;
  if (!data) return null;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <MetricCard label="Reajustes previstos" value={data.summary.upcomingAdjustments} icon="trending_up" />
        <MetricCard label="Impacto estimado total" value={data.summary.estimatedImpact} icon="payments" highlight />
      </div>

      {data.items.length === 0 ? (
        <EmptyState message="Nenhum reajuste previsto nos próximos 120 dias." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-outline-variant/20">
          <table className="w-full min-w-[600px] text-sm">
            <thead className="bg-surface-container-low">
              <tr className="text-left text-on-surface-variant text-[10px] uppercase tracking-wider">
                <th className="px-4 py-3">Fornecedor</th>
                <th className="px-4 py-3">Índice</th>
                <th className="px-4 py-3">Reajuste em</th>
                <th className="px-4 py-3 text-right">Impacto estimado</th>
                <th className="px-4 py-3 text-right">Valor mensal atual</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => (
                <tr key={item.id} className="border-t border-outline-variant/15 hover:bg-surface-container-lowest/50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-semibold">{item.supplier}</p>
                    <p className="text-[10px] text-on-surface-variant">{item.serviceType}</p>
                  </td>
                  <td className="px-4 py-3 text-on-surface-variant">{item.index}</td>
                  <td className="px-4 py-3">
                    {item.adjustmentDueInDays !== null && (
                      <span
                        className={`text-xs font-bold ${item.adjustmentDueInDays <= 30 ? 'text-error' : item.adjustmentDueInDays <= 60 ? 'text-secondary' : 'text-on-surface-variant'}`}
                      >
                        {item.adjustmentDueInDays}d
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-bold">
                    {item.estimatedAdjustmentImpact != null
                      ? `+ R$ ${item.estimatedAdjustmentImpact.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">{item.monthlyValueLabel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Contracts() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const { role } = useAuth();
  const canEdit = role === 'admin' || role === 'sindico';

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-headline text-2xl md:text-4xl font-extrabold tracking-tight">Contratos</h2>
          <p className="text-on-surface-variant mt-1">
            Gestão de contratos de serviço, vencimentos e reajustes.
          </p>
        </div>
        <DataSourceBadge module="contracts" />
      </section>

      {/* Tabs */}
      <div className="flex gap-1 rounded-2xl bg-surface-container p-1 w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
              activeTab === tab.id
                ? 'bg-primary-container text-on-primary-container shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
            }`}
          >
            <span className="material-symbols-outlined text-[15px]">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'dashboard' && <DashboardTab />}
      {activeTab === 'lista' && <ListaTab canEdit={canEdit} />}
      {activeTab === 'vencimentos' && <VencimentosTab />}
      {activeTab === 'reajustes' && <ReajustesTab />}
    </div>
  );
}

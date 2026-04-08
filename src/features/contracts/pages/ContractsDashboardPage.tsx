import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ErrorState } from '../../../shared/ui/states/ErrorState';
import { ContractsLoadingSkeleton } from '../components/ContractsLoadingSkeleton';
import { ContractsPageShell } from '../components/ContractsPageShell';
import { fetchContractsDashboard } from '../services/contractsManagementService';
import type { ContractsDashboardResponse } from '../types/contracts';

const quickActions = [
  { to: '/contracts/novo', label: 'Novo contrato', icon: 'add_circle' },
  { to: '/contracts/lista', label: 'Lista de contratos', icon: 'list_alt' },
  { to: '/contracts/auditoria', label: 'Auditoria', icon: 'insights' },
  { to: '/contracts/vencimentos', label: 'Vencimentos', icon: 'event_busy' },
  { to: '/contracts/reajustes', label: 'Reajustes', icon: 'calculate' },
  { to: '/contracts/documentos', label: 'Documentos', icon: 'folder' },
];

export default function ContractsDashboardPage() {
  const [data, setData] = useState<ContractsDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        setLoading(true);
        const payload = await fetchContractsDashboard();
        if (active) {
          setData(payload);
          setError(null);
        }
      } catch {
        if (active) {
          setError('Falha ao carregar visao geral de contratos.');
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
    return (
      <ContractsLoadingSkeleton
        title="Gestao de contratos"
        subtitle="Painel executivo de contratos, riscos, vencimentos, reajustes e documentos."
        variant="dashboard"
        withAction
        message="Carregando dashboard de contratos..."
      />
    );
  }
  if (error || !data) return <ErrorState message={error || 'Falha ao carregar dashboard de contratos.'} />;

  return (
    <ContractsPageShell
      title="Gestao de contratos"
      subtitle="Painel executivo de contratos, riscos, vencimentos, reajustes e documentos."
      actions={
        <Link
          to="/contracts/novo"
          className="interactive-focus rounded-lg monolith-gradient px-4 py-2 text-xs font-bold uppercase tracking-widest text-white"
        >
          Novo contrato
        </Link>
      }
    >
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <article className="motion-fade-up rounded-2xl bg-primary-container p-5 text-white">
          <p className="text-[11px] uppercase tracking-widest text-white/80">Gasto mensal total</p>
          <h3 className="text-2xl font-headline font-extrabold mt-2">{data.metrics.totalMonthlySpend}</h3>
        </article>
        <article className="motion-fade-up motion-delay-1 rounded-2xl border border-outline-variant/25 bg-surface-container-highest p-5">
          <p className="text-[11px] uppercase tracking-widest text-on-surface-variant">Impacto estimado</p>
          <h3 className="text-2xl font-headline font-extrabold mt-2">{data.metrics.estimatedFinancialImpact}</h3>
        </article>
        <article className="motion-fade-up motion-delay-1 rounded-2xl border border-outline-variant/25 bg-surface-container-highest p-5">
          <p className="text-[11px] uppercase tracking-widest text-on-surface-variant">Contratos ativos</p>
          <h3 className="text-2xl font-headline font-extrabold mt-2">{data.metrics.activeContracts}</h3>
        </article>
        <article className="motion-fade-up motion-delay-1 rounded-2xl border border-outline-variant/25 bg-surface-container-highest p-5">
          <p className="text-[11px] uppercase tracking-widest text-on-surface-variant">Risco alto</p>
          <h3 className="text-2xl font-headline font-extrabold mt-2">{data.metrics.highRiskContracts}</h3>
        </article>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <article className="motion-fade-up motion-delay-1 rounded-2xl border border-outline-variant/30 bg-surface-container-low p-5">
          <p className="text-xs text-on-surface-variant uppercase tracking-widest">Total</p>
          <h4 className="text-2xl font-headline font-extrabold mt-2">{data.metrics.totalContracts}</h4>
        </article>
        <article className="motion-fade-up motion-delay-1 rounded-2xl border border-outline-variant/30 bg-surface-container-low p-5">
          <p className="text-xs text-on-surface-variant uppercase tracking-widest">Vencendo em breve</p>
          <h4 className="text-2xl font-headline font-extrabold mt-2">{data.metrics.expiringSoonContracts}</h4>
        </article>
        <article className="motion-fade-up motion-delay-1 rounded-2xl border border-outline-variant/30 bg-surface-container-low p-5">
          <p className="text-xs text-on-surface-variant uppercase tracking-widest">Vencidos</p>
          <h4 className="text-2xl font-headline font-extrabold mt-2">{data.metrics.expiredContracts}</h4>
        </article>
        <article className="motion-fade-up motion-delay-1 rounded-2xl border border-outline-variant/30 bg-surface-container-low p-5">
          <p className="text-xs text-on-surface-variant uppercase tracking-widest">Reajustes proximos</p>
          <h4 className="text-2xl font-headline font-extrabold mt-2">{data.metrics.upcomingAdjustments}</h4>
        </article>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {quickActions.map((action) => (
          <Link
            key={action.to}
            to={action.to}
            className="interactive-focus hover-lift motion-fade-up motion-delay-2 flex items-center justify-between rounded-2xl border border-outline-variant/30 bg-surface-container-low p-5 hover:bg-surface-container-high"
            aria-label={`Ir para ${action.label}`}
          >
            <div>
              <p className="text-xs uppercase tracking-widest text-on-surface-variant">Atalho</p>
              <h4 className="font-headline font-bold mt-1">{action.label}</h4>
            </div>
            <span className="material-symbols-outlined text-on-surface-variant">{action.icon}</span>
          </Link>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <article className="motion-fade-up motion-delay-2 rounded-2xl border border-outline-variant/30 bg-surface-container-low p-5">
          <h4 className="font-headline text-lg font-extrabold">Top risco</h4>
          <div className="mt-3 space-y-2">
            {data.highlights.topRiskContracts.map((item) => (
              <div key={item.id} className="hover-lift flex items-center justify-between gap-3 rounded-lg bg-surface-container-highest px-3 py-2">
                <div>
                  <p className="text-xs uppercase tracking-widest text-on-surface-variant">{item.contractNumber}</p>
                  <p className="font-semibold">{item.supplier}</p>
                </div>
                <Link
                  to={`/contracts/${item.id}`}
                  className="interactive-focus text-xs font-bold text-primary"
                  aria-label={`Ver contrato ${item.contractNumber}`}
                >
                  Ver
                </Link>
              </div>
            ))}
          </div>
        </article>

        <article className="motion-fade-up motion-delay-2 rounded-2xl border border-outline-variant/30 bg-surface-container-low p-5">
          <h4 className="font-headline text-lg font-extrabold">Top gasto</h4>
          <div className="mt-3 space-y-2">
            {data.highlights.topSpendContracts.map((item) => (
              <div key={item.id} className="hover-lift flex items-center justify-between gap-3 rounded-lg bg-surface-container-highest px-3 py-2">
                <div>
                  <p className="text-xs uppercase tracking-widest text-on-surface-variant">{item.contractNumber}</p>
                  <p className="font-semibold">{item.supplier}</p>
                </div>
                <p className="text-sm font-bold">{item.monthlyValue}</p>
              </div>
            ))}
          </div>
        </article>
      </section>
    </ContractsPageShell>
  );
}

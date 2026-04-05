import { useEffect, useState } from 'react';
import { getContractsData, type ContractsData, type ContractItem } from '../services/mockApi';
import { LoadingState } from '../shared/ui/states/LoadingState';
import { ErrorState } from '../shared/ui/states/ErrorState';
import { EmptyState } from '../shared/ui/states/EmptyState';

const riskLabel: Record<ContractItem['risk'], string> = {
  high: 'Alto',
  medium: 'Medio',
  low: 'Baixo',
};

const riskClass: Record<ContractItem['risk'], string> = {
  high: 'bg-error-container text-on-error-container',
  medium: 'bg-surface-container-highest text-on-surface-variant',
  low: 'bg-tertiary-fixed-dim/30 text-on-tertiary-fixed-variant',
};

export default function Contracts() {
  const [data, setData] = useState<ContractsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        const response = await getContractsData();
        if (active) {
          setData(response);
          setError(null);
        }
      } catch {
        if (active) {
          setError('Falha ao carregar contratos.');
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
    return <LoadingState message="Carregando contratos e auditoria..." />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  if (!data || data.items.length === 0) {
    return <EmptyState message="Nenhum contrato encontrado." />;
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      <section className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <h2 className="font-headline text-2xl md:text-4xl font-extrabold tracking-tight">Auditoria de contratos</h2>
          <p className="text-on-surface-variant mt-2">Analise automatica de reajustes, vencimentos e risco financeiro.</p>
          <p className="mt-2 inline-flex items-center rounded-full bg-secondary-container px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-on-secondary-container">
            Dados de contratos ainda sinteticos
          </p>
        </div>
        <div className="text-sm font-bold bg-surface-container-highest px-4 py-3 rounded-lg">
          Impacto trimestral estimado: {data.estimatedQuarterImpact}
        </div>
      </section>

      <section className="bg-primary-container text-white p-6 rounded-xl">
        <p className="text-xs uppercase tracking-widest text-on-primary-container">Gasto mensal total</p>
        <h3 className="text-2xl md:text-3xl font-headline font-extrabold mt-2">{data.totalMonthlySpend}</h3>
      </section>

      <section className="bg-surface-container-low rounded-xl p-6 overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="text-left text-on-surface-variant uppercase tracking-widest text-[10px]">
              <th className="py-3">Fornecedor</th>
              <th className="py-3">Valor mensal</th>
              <th className="py-3">Indice</th>
              <th className="py-3">Proximo reajuste</th>
              <th className="py-3">Risco</th>
              <th className="py-3">Nota</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item) => (
              <tr key={item.id} className="border-t border-outline-variant/20">
                <td className="py-4 font-bold">{item.vendor}</td>
                <td className="py-4">{item.monthlyValue}</td>
                <td className="py-4">{item.index}</td>
                <td className="py-4">{item.nextAdjustment}</td>
                <td className="py-4">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${riskClass[item.risk]}`}>{riskLabel[item.risk]}</span>
                </td>
                <td className="py-4 text-on-surface-variant">{item.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

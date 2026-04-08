import type { ChangeEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { EmptyState } from '../../../shared/ui/states/EmptyState';
import { ErrorState } from '../../../shared/ui/states/ErrorState';
import { ContractsLoadingSkeleton } from '../components/ContractsLoadingSkeleton';
import { ContractsPageShell } from '../components/ContractsPageShell';
import {
  deleteContractDocument,
  fetchContractDocuments,
  fetchContractsList,
  uploadContractDocumentWithFile,
} from '../services/contractsManagementService';
import type { ContractDocument, ContractRecord } from '../types/contracts';

const filterFieldClass =
  'interactive-focus w-full rounded-xl border border-outline-variant/35 bg-surface-container-highest px-3 py-2.5 text-sm text-on-surface outline-none transition-colors placeholder:text-on-surface-variant/80 focus:border-primary-fixed';
const filterLabelClass = 'text-[11px] font-semibold uppercase tracking-[0.15em] text-on-surface-variant';

const documentStatusLabel: Record<ContractDocument['status'], string> = {
  active: 'Ativo',
  archived: 'Arquivado',
  pending_review: 'Pendente de revisao',
};

const documentStatusClass: Record<ContractDocument['status'], string> = {
  active: 'bg-tertiary-fixed-dim/30 text-on-tertiary-fixed-variant',
  archived: 'bg-surface-container-high text-on-surface-variant',
  pending_review: 'bg-secondary-container text-on-secondary-container',
};

export default function ContractsDocumentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [contracts, setContracts] = useState<ContractRecord[]>([]);
  const [documents, setDocuments] = useState<ContractDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedContractId, setSelectedContractId] = useState<string>(searchParams.get('contractId') || '');
  const [docType, setDocType] = useState('geral');
  const [runningDeleteId, setRunningDeleteId] = useState<string | null>(null);
  const hasLoadedOnceRef = useRef(false);

  const filteredDocuments = useMemo(() => {
    if (!selectedContractId) return documents;
    return documents.filter((item) => item.contractId === selectedContractId);
  }, [documents, selectedContractId]);
  const selectedContractLabel = useMemo(() => {
    if (!selectedContractId) return 'Todos os contratos';
    const contract = contracts.find((item) => item.id === selectedContractId);
    return contract ? `${contract.contractNumber} - ${contract.name}` : selectedContractId;
  }, [contracts, selectedContractId]);
  const hasActiveProcess = submitting || Boolean(runningDeleteId) || refreshing;
  const processLabel = submitting ? 'Enviando documento...' : runningDeleteId ? 'Removendo documento...' : 'Atualizando documentos...';

  useEffect(() => {
    let active = true;
    async function load() {
      const isRefreshing = hasLoadedOnceRef.current;

      try {
        if (isRefreshing) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }
        const [contractsResp, docsResp] = await Promise.all([
          fetchContractsList({ page: 1, pageSize: 200, sortBy: 'contract', sortOrder: 'asc' }),
          fetchContractDocuments(selectedContractId || undefined),
        ]);
        if (active) {
          setContracts(contractsResp.items);
          setDocuments(docsResp.items);
          setError(null);
          hasLoadedOnceRef.current = true;
        }
      } catch {
        if (active) {
          setError(isRefreshing ? 'Falha ao atualizar documentos contratuais.' : 'Falha ao carregar documentos contratuais.');
        }
      } finally {
        if (active) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [selectedContractId]);

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !selectedContractId) {
      return;
    }
    try {
      setSubmitting(true);
      setRefreshing(true);
      await uploadContractDocumentWithFile(selectedContractId, file, docType);
      const refreshed = await fetchContractDocuments(selectedContractId);
      setDocuments(refreshed.items);
      setError(null);
      event.target.value = '';
    } catch {
      setError('Falha ao anexar documento.');
    } finally {
      setSubmitting(false);
      setRefreshing(false);
    }
  }

  async function handleDelete(documentId: string) {
    try {
      setRunningDeleteId(documentId);
      setRefreshing(true);
      await deleteContractDocument(documentId);
      const refreshed = await fetchContractDocuments(selectedContractId || undefined);
      setDocuments(refreshed.items);
      setError(null);
    } catch {
      setError('Falha ao remover documento.');
    } finally {
      setRunningDeleteId(null);
      setRefreshing(false);
    }
  }

  if (loading && !hasLoadedOnceRef.current) {
    return (
      <ContractsLoadingSkeleton
        title="Documentos de contratos"
        subtitle="Gestao de anexos por contrato, tipo de documento e status de envio."
        variant="table"
        message="Carregando documentos contratuais..."
      />
    );
  }
  if (!hasLoadedOnceRef.current) return <ErrorState message={error || 'Falha ao carregar documentos contratuais.'} />;

  return (
    <ContractsPageShell title="Documentos de contratos" subtitle="Gestao de anexos por contrato, tipo de documento e status de envio.">
      <section className="rounded-2xl border border-outline-variant/30 bg-surface-container-low p-4 md:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">Filtros e anexos</p>
            <h3 className="mt-1 font-headline text-lg font-extrabold md:text-xl">Gestao documental por contrato</h3>
          </div>
          <span className="rounded-full bg-surface-container-highest px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-on-surface-variant">
            {filteredDocuments.length} documento(s) exibido(s)
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <label className="space-y-1.5">
            <span className={filterLabelClass}>Contrato</span>
            <select
              aria-label="Filtrar documentos por contrato"
              value={selectedContractId}
              onChange={(event) => {
                const value = event.target.value;
                setSelectedContractId(value);
                if (value) {
                  setSearchParams({ contractId: value });
                } else {
                  setSearchParams({});
                }
              }}
              className={filterFieldClass}
            >
              <option value="">Todos os contratos</option>
              {contracts.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.contractNumber} - {item.name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5">
            <span className={filterLabelClass}>Tipo para upload</span>
            <select aria-label="Selecionar tipo de documento para upload" value={docType} onChange={(event) => setDocType(event.target.value)} className={filterFieldClass}>
              <option value="geral">Documento geral</option>
              <option value="aditivo">Aditivo</option>
              <option value="fiscal">Fiscal</option>
              <option value="juridico">Juridico</option>
              <option value="sla">SLA</option>
            </select>
          </label>

          <label
            className={`interactive-focus flex items-center justify-center rounded-xl px-3 py-2.5 text-center text-xs font-bold uppercase tracking-widest ${
              !selectedContractId || submitting
                ? 'cursor-not-allowed bg-surface-container-highest text-on-surface-variant'
                : 'cursor-pointer bg-primary text-on-primary'
            }`}
          >
            {submitting ? 'Enviando...' : 'Upload de documento'}
            <input type="file" className="hidden" disabled={!selectedContractId || submitting} onChange={handleUpload} />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-outline-variant/30 bg-surface-container-highest px-2.5 py-1 text-[11px] font-semibold text-on-surface-variant">
            Contexto: {selectedContractLabel}
          </span>
          {!selectedContractId ? (
            <span className="rounded-full border border-outline-variant/30 bg-surface-container-highest px-2.5 py-1 text-[11px] font-semibold text-on-surface-variant">
              Selecione um contrato para liberar o upload
            </span>
          ) : null}
        </div>
      </section>

      {error ? (
        <p className="rounded-xl border border-error/30 bg-error-container/40 px-3 py-2 text-xs font-semibold text-on-error-container" role="status" aria-live="polite">
          {error}
        </p>
      ) : null}
      {hasActiveProcess ? (
        <p className="rounded-xl border border-primary-fixed/40 bg-primary-fixed/25 px-3 py-2 text-xs font-semibold text-on-surface-variant" aria-live="polite">
          {processLabel}
        </p>
      ) : null}

      <div className="relative" aria-busy={hasActiveProcess ? true : undefined}>
        {filteredDocuments.length === 0 ? (
          <EmptyState message="Nenhum documento encontrado para o filtro selecionado." />
        ) : (
          <>
            <section className="space-y-3 md:hidden" aria-busy={hasActiveProcess ? true : undefined}>
              {filteredDocuments.map((doc) => (
                <article key={doc.id} className="hover-lift rounded-2xl border border-outline-variant/25 bg-surface-container-low p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-on-surface-variant">{doc.contractName || doc.contractId}</p>
                      <h3 className="mt-1 font-headline text-base font-bold">{doc.name}</h3>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${documentStatusClass[doc.status]}`}>
                      {documentStatusLabel[doc.status]}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg bg-surface-container-highest px-2.5 py-2">
                      <p className="uppercase tracking-widest text-on-surface-variant">Tipo</p>
                      <p className="mt-1 font-semibold">{doc.type}</p>
                    </div>
                    <div className="rounded-lg bg-surface-container-highest px-2.5 py-2">
                      <p className="uppercase tracking-widest text-on-surface-variant">Tamanho</p>
                      <p className="mt-1 font-semibold">{doc.sizeKb.toFixed(2)} KB</p>
                    </div>
                    <div className="col-span-2 rounded-lg bg-surface-container-highest px-2.5 py-2">
                      <p className="uppercase tracking-widest text-on-surface-variant">Data envio</p>
                      <p className="mt-1 font-semibold">{doc.uploadedAt}</p>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      aria-label={`Baixar documento ${doc.name}`}
                      onClick={() => {
                        if (doc.url) window.open(doc.url, '_blank', 'noopener,noreferrer');
                      }}
                      className="interactive-focus w-full rounded-lg bg-surface-container-highest px-3 py-2 text-xs font-bold"
                      disabled={!doc.url}
                    >
                      Baixar
                    </button>
                    <button
                      type="button"
                      aria-label={`Remover documento ${doc.name}`}
                      onClick={() => void handleDelete(doc.id)}
                      disabled={runningDeleteId === doc.id}
                      className="interactive-focus w-full rounded-lg bg-error px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                    >
                      {runningDeleteId === doc.id ? 'Removendo...' : 'Remover'}
                    </button>
                  </div>
                </article>
              ))}
            </section>

            <section className="hidden overflow-x-auto rounded-2xl border border-outline-variant/30 bg-surface-container-low p-5 md:block" aria-busy={hasActiveProcess ? true : undefined}>
              <table className="w-full min-w-[820px] text-sm">
                <caption className="sr-only">Documentos de contratos com tipo, data de envio e status.</caption>
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-widest text-on-surface-variant">
                    <th scope="col" className="py-3">Contrato</th>
                    <th scope="col" className="py-3">Documento</th>
                    <th scope="col" className="py-3">Tipo</th>
                    <th scope="col" className="py-3">Data envio</th>
                    <th scope="col" className="py-3">Status</th>
                    <th scope="col" className="py-3">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDocuments.map((doc) => (
                    <tr key={doc.id} className="border-t border-outline-variant/20">
                      <th scope="row" className="py-3 text-left">{doc.contractName || doc.contractId}</th>
                      <td className="py-3">
                        <p className="font-semibold">{doc.name}</p>
                        <p className="text-xs text-on-surface-variant">{doc.sizeKb.toFixed(2)} KB</p>
                      </td>
                      <td className="py-3">{doc.type}</td>
                      <td className="py-3">{doc.uploadedAt}</td>
                      <td className="py-3">
                        <span className={`rounded px-2 py-1 text-xs font-bold ${documentStatusClass[doc.status]}`}>
                          {documentStatusLabel[doc.status]}
                        </span>
                      </td>
                      <td className="py-3">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            aria-label={`Baixar documento ${doc.name}`}
                            onClick={() => {
                              if (doc.url) window.open(doc.url, '_blank', 'noopener,noreferrer');
                            }}
                            className="interactive-focus rounded bg-surface-container-highest px-3 py-2 text-xs font-bold"
                            disabled={!doc.url}
                          >
                            Baixar
                          </button>
                          <button
                            type="button"
                            aria-label={`Remover documento ${doc.name}`}
                            onClick={() => void handleDelete(doc.id)}
                            disabled={runningDeleteId === doc.id}
                            className="interactive-focus rounded bg-error px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                          >
                            {runningDeleteId === doc.id ? 'Removendo...' : 'Remover'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </>
        )}

        {hasActiveProcess ? (
          <div className="pointer-events-none absolute inset-0 flex items-start justify-end rounded-2xl p-3">
            <div className="flex items-center gap-2 rounded-full border border-outline-variant/35 bg-surface-container-low px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-on-surface-variant shadow-sm">
              <span className="h-2 w-2 animate-pulse rounded-full bg-primary" aria-hidden="true" />
              {processLabel}
            </div>
          </div>
        ) : null}
      </div>
    </ContractsPageShell>
  );
}

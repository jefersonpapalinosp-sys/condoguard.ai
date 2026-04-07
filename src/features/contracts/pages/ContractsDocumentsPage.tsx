import type { ChangeEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ContractsPageShell } from '../components/ContractsPageShell';
import {
  deleteContractDocument,
  fetchContractDocuments,
  fetchContractsList,
  uploadContractDocument,
} from '../services/contractsManagementService';
import type { ContractDocument, ContractRecord } from '../types/contracts';
import { EmptyState } from '../../../shared/ui/states/EmptyState';
import { ErrorState } from '../../../shared/ui/states/ErrorState';
import { LoadingState } from '../../../shared/ui/states/LoadingState';

export default function ContractsDocumentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [contracts, setContracts] = useState<ContractRecord[]>([]);
  const [documents, setDocuments] = useState<ContractDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedContractId, setSelectedContractId] = useState<string>(searchParams.get('contractId') || '');
  const [docType, setDocType] = useState('geral');
  const [runningDeleteId, setRunningDeleteId] = useState<string | null>(null);

  const filteredDocuments = useMemo(() => {
    if (!selectedContractId) return documents;
    return documents.filter((item) => item.contractId === selectedContractId);
  }, [documents, selectedContractId]);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        setLoading(true);
        const [contractsResp, docsResp] = await Promise.all([
          fetchContractsList({ page: 1, pageSize: 200, sortBy: 'contract', sortOrder: 'asc' }),
          fetchContractDocuments(selectedContractId || undefined),
        ]);
        if (active) {
          setContracts(contractsResp.items);
          setDocuments(docsResp.items);
          setError(null);
        }
      } catch {
        if (active) {
          setError('Falha ao carregar documentos contratuais.');
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
  }, [selectedContractId]);

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !selectedContractId) {
      return;
    }
    try {
      setSubmitting(true);
      await uploadContractDocument(selectedContractId, {
        name: file.name,
        type: docType,
        sizeKb: Number((file.size / 1024).toFixed(2)),
        status: 'active',
      });
      const refreshed = await fetchContractDocuments(selectedContractId);
      setDocuments(refreshed.items);
      event.target.value = '';
    } catch {
      setError('Falha ao anexar documento.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(documentId: string) {
    try {
      setRunningDeleteId(documentId);
      await deleteContractDocument(documentId);
      const refreshed = await fetchContractDocuments(selectedContractId || undefined);
      setDocuments(refreshed.items);
    } catch {
      setError('Falha ao remover documento.');
    } finally {
      setRunningDeleteId(null);
    }
  }

  if (loading) return <LoadingState message="Carregando documentos contratuais..." />;
  if (error) return <ErrorState message={error} />;

  return (
    <ContractsPageShell title="Documentos de contratos" subtitle="Gestao de anexos por contrato, tipo de documento e status de envio.">
      <section className="bg-surface-container-low rounded-xl p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <select
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
          className="px-3 py-2 rounded-lg bg-surface-container-highest outline-none"
        >
          <option value="">Todos os contratos</option>
          {contracts.map((item) => (
            <option key={item.id} value={item.id}>
              {item.contractNumber} - {item.name}
            </option>
          ))}
        </select>

        <select value={docType} onChange={(event) => setDocType(event.target.value)} className="px-3 py-2 rounded-lg bg-surface-container-highest outline-none">
          <option value="geral">Documento geral</option>
          <option value="aditivo">Aditivo</option>
          <option value="fiscal">Fiscal</option>
          <option value="juridico">Juridico</option>
          <option value="sla">SLA</option>
        </select>

        <label className="px-3 py-2 rounded-lg bg-primary text-on-primary text-xs font-bold uppercase tracking-widest cursor-pointer text-center">
          {submitting ? 'Enviando...' : 'Upload de documento'}
          <input type="file" className="hidden" disabled={!selectedContractId || submitting} onChange={handleUpload} />
        </label>
      </section>

      {filteredDocuments.length === 0 ? (
        <EmptyState message="Nenhum documento encontrado para o filtro selecionado." />
      ) : (
        <section className="bg-surface-container-low rounded-xl p-4 overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="text-left text-on-surface-variant uppercase tracking-widest text-[10px]">
                <th className="py-3">Contrato</th>
                <th className="py-3">Documento</th>
                <th className="py-3">Tipo</th>
                <th className="py-3">Data envio</th>
                <th className="py-3">Status</th>
                <th className="py-3">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocuments.map((doc) => (
                <tr key={doc.id} className="border-t border-outline-variant/20">
                  <td className="py-3">{doc.contractName || doc.contractId}</td>
                  <td className="py-3">
                    <p className="font-semibold">{doc.name}</p>
                    <p className="text-xs text-on-surface-variant">{doc.sizeKb.toFixed(2)} KB</p>
                  </td>
                  <td className="py-3">{doc.type}</td>
                  <td className="py-3">{doc.uploadedAt}</td>
                  <td className="py-3">{doc.status}</td>
                  <td className="py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          if (doc.url) window.open(doc.url, '_blank', 'noopener,noreferrer');
                        }}
                        className="px-3 py-2 rounded bg-surface-container-highest text-xs font-bold"
                        disabled={!doc.url}
                      >
                        Baixar
                      </button>
                      <button
                        onClick={() => void handleDelete(doc.id)}
                        disabled={runningDeleteId === doc.id}
                        className="px-3 py-2 rounded bg-error text-white text-xs font-bold disabled:opacity-50"
                      >
                        Remover
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </ContractsPageShell>
  );
}

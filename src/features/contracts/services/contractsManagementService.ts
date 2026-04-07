import { notifyApiFallback, setModuleDataSource } from '../../../services/apiStatus';
import { isMockFallbackEnabled } from '../../../services/fallbackPolicy';
import { requestJson } from '../../../services/http';
import type {
  ContractDetailResponse,
  ContractDocument,
  ContractDocumentCreatePayload,
  ContractDocumentListResponse,
  ContractRecord,
  ContractsAdjustmentsResponse,
  ContractsAuditResponse,
  ContractsDashboardResponse,
  ContractsExpiringResponse,
  ContractsListQuery,
  ContractsListResponse,
  ContractUpsertPayload,
} from '../types/contracts';

const MODULE_NAME = 'contracts';

const indexRates: Record<'IPCA' | 'IGPM' | 'INPC' | 'FIXO', number> = {
  IPCA: 0.06,
  IGPM: 0.08,
  INPC: 0.055,
  FIXO: 0.04,
};

let fallbackContracts: ContractRecord[] = [
  {
    id: 'ct1',
    contractNumber: 'CTR-0001',
    name: 'Portaria e controle de acesso',
    supplier: 'Sentinel Security Ltda',
    supplierId: 1,
    category: 'Seguranca',
    description: 'Contrato de seguranca e controle de acesso 24h.',
    serviceType: 'Seguranca patrimonial',
    monthlyValue: 45200,
    monthlyValueLabel: 'R$ 45.200,00',
    startDate: '2025-01-15',
    endDate: '2026-08-15',
    termMonths: 19,
    index: 'IPCA',
    adjustmentFrequencyMonths: 12,
    nextAdjustmentDate: '2026-08-15',
    internalOwner: 'Ricardo Silva',
    status: 'expiring',
    renewalStatus: 'in_progress',
    risk: 'high',
    notes: 'Renovacao em negociacao com fornecedor.',
    createdAt: '2025-01-15T10:00:00Z',
    updatedAt: '2026-04-06T10:00:00Z',
    daysToEnd: 131,
    adjustmentDueInDays: 131,
    projectedMonthlyValue: 47912,
    projectedMonthlyValueLabel: 'R$ 47.912,00',
    estimatedAdjustmentImpact: 2712,
    estimatedAdjustmentImpactLabel: 'R$ 2.712,00',
  },
  {
    id: 'ct2',
    contractNumber: 'CTR-0002',
    name: 'Limpeza e conservacao',
    supplier: 'LimpaPro Servicos',
    supplierId: 2,
    category: 'Conservacao',
    description: 'Limpeza diaria de areas comuns e fachadas.',
    serviceType: 'Limpeza e conservacao',
    monthlyValue: 28500,
    monthlyValueLabel: 'R$ 28.500,00',
    startDate: '2025-03-02',
    endDate: '2026-10-02',
    termMonths: 19,
    index: 'IGPM',
    adjustmentFrequencyMonths: 12,
    nextAdjustmentDate: '2026-10-02',
    internalOwner: 'Camila Souza',
    status: 'active',
    renewalStatus: 'not_started',
    risk: 'medium',
    notes: 'Sem ocorrencias criticas.',
    createdAt: '2025-03-02T10:00:00Z',
    updatedAt: '2026-04-06T10:00:00Z',
    daysToEnd: 179,
    adjustmentDueInDays: 179,
    projectedMonthlyValue: 30780,
    projectedMonthlyValueLabel: 'R$ 30.780,00',
    estimatedAdjustmentImpact: 2280,
    estimatedAdjustmentImpactLabel: 'R$ 2.280,00',
  },
  {
    id: 'ct3',
    contractNumber: 'CTR-0003',
    name: 'Manutencao de elevadores',
    supplier: 'TechLift Elevadores',
    supplierId: 3,
    category: 'Manutencao',
    description: 'Manutencao preventiva e corretiva dos elevadores.',
    serviceType: 'Manutencao de elevadores',
    monthlyValue: 12800,
    monthlyValueLabel: 'R$ 12.800,00',
    startDate: '2025-06-12',
    endDate: '2027-01-12',
    termMonths: 19,
    index: 'IPCA',
    adjustmentFrequencyMonths: 12,
    nextAdjustmentDate: '2027-01-12',
    internalOwner: 'Ricardo Silva',
    status: 'active',
    renewalStatus: 'not_started',
    risk: 'low',
    notes: 'Contrato em conformidade.',
    createdAt: '2025-06-12T10:00:00Z',
    updatedAt: '2026-04-06T10:00:00Z',
    daysToEnd: 281,
    adjustmentDueInDays: 281,
    projectedMonthlyValue: 13568,
    projectedMonthlyValueLabel: 'R$ 13.568,00',
    estimatedAdjustmentImpact: 768,
    estimatedAdjustmentImpactLabel: 'R$ 768,00',
  },
];

let fallbackDocuments: ContractDocument[] = [];

function formatCurrency(value: number) {
  return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function enrichFallback(item: ContractRecord): ContractRecord {
  const rate = indexRates[item.index] ?? 0.05;
  const projected = Number((item.monthlyValue * (1 + rate)).toFixed(2));
  return {
    ...item,
    monthlyValueLabel: formatCurrency(item.monthlyValue),
    projectedMonthlyValue: projected,
    projectedMonthlyValueLabel: formatCurrency(projected),
    estimatedAdjustmentImpact: Number((projected - item.monthlyValue).toFixed(2)),
    estimatedAdjustmentImpactLabel: formatCurrency(projected - item.monthlyValue),
  };
}

function markApiSource() {
  setModuleDataSource(MODULE_NAME, 'api');
}

function handleFallbackError(message: string): never {
  setModuleDataSource(MODULE_NAME, 'unknown');
  notifyApiFallback({ module: 'Contratos', message: `${message} (fallback mock desativado)` });
  throw new Error(message);
}

function notifyMockFallback(message: string) {
  setModuleDataSource(MODULE_NAME, 'mock');
  notifyApiFallback({ module: 'Contratos', message: `${message} (fallback mock ativo)` });
}

function buildQuery(params: Record<string, string | number | boolean | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }
    query.set(key, String(value));
  });
  const suffix = query.toString();
  return suffix ? `?${suffix}` : '';
}

function filterFallbackContracts(query: ContractsListQuery = {}) {
  const normalizedSearch = query.search?.trim().toLowerCase() ?? '';
  let items = [...fallbackContracts].map(enrichFallback);

  if (query.status) items = items.filter((item) => item.status === query.status);
  if (query.supplier) items = items.filter((item) => item.supplier.toLowerCase().includes(query.supplier!.toLowerCase()));
  if (query.serviceType) items = items.filter((item) => item.serviceType.toLowerCase().includes(query.serviceType!.toLowerCase()));
  if (query.index) items = items.filter((item) => item.index === query.index);
  if (query.risk) items = items.filter((item) => item.risk === query.risk);
  if (query.expiringOnly) items = items.filter((item) => typeof item.daysToEnd === 'number' && item.daysToEnd >= 0 && item.daysToEnd <= 90);
  if (normalizedSearch) {
    items = items.filter((item) =>
      [item.contractNumber, item.name, item.supplier, item.category, item.description].some((field) =>
        field.toLowerCase().includes(normalizedSearch),
      ),
    );
  }

  const sortBy = query.sortBy ?? 'monthlyValue';
  const sortOrder = query.sortOrder ?? 'desc';
  const sortMap: Record<string, (item: ContractRecord) => string | number> = {
    contract: (item) => item.contractNumber,
    supplier: (item) => item.supplier,
    category: (item) => item.category,
    monthlyValue: (item) => item.monthlyValue,
    startDate: (item) => item.startDate,
    endDate: (item) => item.endDate,
    index: (item) => item.index,
    nextAdjustment: (item) => item.nextAdjustmentDate,
    status: (item) => item.status,
    risk: (item) => item.risk,
  };
  const extractor = sortMap[sortBy] ?? sortMap.monthlyValue;
  items.sort((a, b) => {
    const va = extractor(a);
    const vb = extractor(b);
    if (va < vb) return sortOrder === 'asc' ? -1 : 1;
    if (va > vb) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.max(1, query.pageSize ?? 20);
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const chunk = items.slice(start, start + pageSize);

  return {
    items: chunk,
    meta: {
      page: currentPage,
      pageSize,
      total,
      totalPages,
      hasNext: currentPage < totalPages,
      hasPrevious: currentPage > 1,
    },
    filters: {
      status: query.status ?? null,
      supplier: query.supplier ?? null,
      serviceType: query.serviceType ?? null,
      index: query.index ?? null,
      risk: query.risk ?? null,
      search: query.search ?? null,
      expiringOnly: Boolean(query.expiringOnly),
    },
    sort: { sortBy, sortOrder },
    facets: {
      suppliers: [...new Set(fallbackContracts.map((item) => item.supplier))].sort(),
      serviceTypes: [...new Set(fallbackContracts.map((item) => item.serviceType))].sort(),
      indices: [...new Set(fallbackContracts.map((item) => item.index))].sort(),
    },
  } satisfies ContractsListResponse;
}

function fallbackDashboard(): ContractsDashboardResponse {
  const items = fallbackContracts.map(enrichFallback);
  const totalMonthlySpend = items.reduce((acc, item) => acc + item.monthlyValue, 0);
  const estimatedImpact = items.reduce((acc, item) => acc + item.estimatedAdjustmentImpact, 0);
  return {
    metrics: {
      totalContracts: items.length,
      activeContracts: items.filter((item) => item.status === 'active').length,
      expiringSoonContracts: items.filter((item) => item.status === 'expiring').length,
      expiredContracts: items.filter((item) => item.status === 'expired').length,
      upcomingAdjustments: items.filter((item) => (item.adjustmentDueInDays ?? 999) <= 90).length,
      highRiskContracts: items.filter((item) => item.risk === 'high').length,
      totalMonthlySpend: formatCurrency(totalMonthlySpend),
      estimatedFinancialImpact: formatCurrency(estimatedImpact),
    },
    highlights: {
      topRiskContracts: items
        .filter((item) => item.risk !== 'low')
        .slice(0, 5)
        .map((item) => ({
          id: item.id,
          contractNumber: item.contractNumber,
          supplier: item.supplier,
          risk: item.risk,
          status: item.status,
        })),
      topSpendContracts: [...items]
        .sort((a, b) => b.monthlyValue - a.monthlyValue)
        .slice(0, 5)
        .map((item) => ({
          id: item.id,
          contractNumber: item.contractNumber,
          supplier: item.supplier,
          monthlyValue: item.monthlyValueLabel,
        })),
    },
  };
}

export async function fetchContractsDashboard(): Promise<ContractsDashboardResponse> {
  try {
    const response = await requestJson<ContractsDashboardResponse>('/api/contracts/dashboard');
    markApiSource();
    return response;
  } catch {
    if (!isMockFallbackEnabled()) {
      handleFallbackError('Falha ao carregar dashboard de contratos.');
    }
    notifyMockFallback('API indisponivel');
    return fallbackDashboard();
  }
}

export async function fetchContractsList(query: ContractsListQuery = {}): Promise<ContractsListResponse> {
  try {
    const response = await requestJson<ContractsListResponse>(
      `/api/contracts/lista${buildQuery({
        page: query.page,
        pageSize: query.pageSize,
        status: query.status,
        supplier: query.supplier,
        serviceType: query.serviceType,
        index: query.index,
        expiringOnly: query.expiringOnly,
        risk: query.risk,
        search: query.search,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
      })}`,
    );
    markApiSource();
    return response;
  } catch {
    if (!isMockFallbackEnabled()) {
      handleFallbackError('Falha ao carregar lista de contratos.');
    }
    notifyMockFallback('API indisponivel');
    return filterFallbackContracts(query);
  }
}

export async function fetchContractDetail(contractId: string): Promise<ContractDetailResponse> {
  try {
    const response = await requestJson<ContractDetailResponse>(`/api/contracts/${encodeURIComponent(contractId)}`);
    markApiSource();
    return response;
  } catch {
    if (!isMockFallbackEnabled()) {
      handleFallbackError('Falha ao carregar detalhes do contrato.');
    }
    notifyMockFallback('API indisponivel');
    const item = fallbackContracts.find((contract) => contract.id === contractId);
    if (!item) {
      throw new Error('Contrato nao encontrado.');
    }
    return {
      item: enrichFallback(item),
      supplier: {
        name: item.supplier,
        category: item.category,
        serviceType: item.serviceType,
        internalOwner: item.internalOwner,
      },
      documents: fallbackDocuments.filter((doc) => doc.contractId === contractId),
      timeline: [],
      alerts: [],
    };
  }
}

export async function createContract(payload: ContractUpsertPayload): Promise<ContractRecord> {
  try {
    const response = await requestJson<{ item: ContractRecord }>('/api/contracts', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    markApiSource();
    return response.item;
  } catch {
    if (!isMockFallbackEnabled()) {
      handleFallbackError('Falha ao criar contrato.');
    }
    notifyMockFallback('API indisponivel');
    const now = new Date().toISOString();
    const id = `local-${Date.now()}`;
    const created: ContractRecord = enrichFallback({
      id,
      contractNumber: payload.contractNumber || `CTR-${String(fallbackContracts.length + 1).padStart(4, '0')}`,
      name: payload.name,
      supplier: payload.supplier,
      supplierId: null,
      category: payload.category,
      description: payload.description,
      serviceType: payload.serviceType,
      monthlyValue: payload.monthlyValue,
      monthlyValueLabel: formatCurrency(payload.monthlyValue),
      startDate: payload.startDate,
      endDate: payload.endDate,
      termMonths: payload.termMonths ?? 12,
      index: payload.index,
      adjustmentFrequencyMonths: payload.adjustmentFrequencyMonths,
      nextAdjustmentDate: payload.nextAdjustmentDate || payload.endDate,
      internalOwner: payload.internalOwner,
      status: payload.status,
      renewalStatus: 'not_started',
      risk: payload.risk,
      notes: payload.notes,
      createdAt: now,
      updatedAt: now,
      daysToEnd: 90,
      adjustmentDueInDays: 90,
      projectedMonthlyValue: payload.monthlyValue,
      projectedMonthlyValueLabel: formatCurrency(payload.monthlyValue),
      estimatedAdjustmentImpact: 0,
      estimatedAdjustmentImpactLabel: formatCurrency(0),
    });
    fallbackContracts = [created, ...fallbackContracts];
    return created;
  }
}

export async function updateContract(contractId: string, payload: Partial<ContractUpsertPayload>): Promise<ContractRecord> {
  try {
    const response = await requestJson<{ item: ContractRecord }>(`/api/contracts/${encodeURIComponent(contractId)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    markApiSource();
    return response.item;
  } catch {
    if (!isMockFallbackEnabled()) {
      handleFallbackError('Falha ao atualizar contrato.');
    }
    notifyMockFallback('API indisponivel');
    const current = fallbackContracts.find((item) => item.id === contractId);
    if (!current) {
      throw new Error('Contrato nao encontrado.');
    }
    const updated = enrichFallback({
      ...current,
      ...payload,
      updatedAt: new Date().toISOString(),
    });
    fallbackContracts = fallbackContracts.map((item) => (item.id === contractId ? updated : item));
    return updated;
  }
}

export async function renewContract(contractId: string): Promise<ContractRecord> {
  try {
    const response = await requestJson<{ item: ContractRecord }>(`/api/contracts/${encodeURIComponent(contractId)}/renew`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
    markApiSource();
    return response.item;
  } catch {
    if (!isMockFallbackEnabled()) {
      handleFallbackError('Falha ao renovar contrato.');
    }
    notifyMockFallback('API indisponivel');
    return updateContract(contractId, { status: 'active', notes: 'Contrato renovado manualmente.' });
  }
}

export async function closeContract(contractId: string): Promise<ContractRecord> {
  try {
    const response = await requestJson<{ item: ContractRecord }>(`/api/contracts/${encodeURIComponent(contractId)}/close`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
    markApiSource();
    return response.item;
  } catch {
    if (!isMockFallbackEnabled()) {
      handleFallbackError('Falha ao encerrar contrato.');
    }
    notifyMockFallback('API indisponivel');
    return updateContract(contractId, { status: 'closed', notes: 'Contrato encerrado manualmente.' });
  }
}

export async function fetchContractsAudit(params: { search?: string; risk?: string; index?: string } = {}): Promise<ContractsAuditResponse> {
  try {
    const response = await requestJson<ContractsAuditResponse>(
      `/api/contracts/auditoria${buildQuery({ search: params.search, risk: params.risk, index: params.index })}`,
    );
    markApiSource();
    return response;
  } catch {
    if (!isMockFallbackEnabled()) {
      handleFallbackError('Falha ao carregar auditoria de contratos.');
    }
    notifyMockFallback('API indisponivel');
    const list = filterFallbackContracts({
      search: params.search,
      risk: params.risk as 'low' | 'medium' | 'high' | undefined,
      index: params.index as 'IPCA' | 'IGPM' | 'INPC' | 'FIXO' | undefined,
    }).items;
    const totalMonthly = list.reduce((acc, item) => acc + item.monthlyValue, 0);
    const impact = list.reduce((acc, item) => acc + item.estimatedAdjustmentImpact, 0);
    return {
      estimatedQuarterImpact: formatCurrency(impact * 3),
      totalMonthlySpend: formatCurrency(totalMonthly),
      items: list.map((item) => ({
        id: item.id,
        vendor: item.supplier,
        monthlyValue: item.monthlyValueLabel,
        index: item.index,
        nextAdjustment: item.nextAdjustmentDate,
        risk: item.risk,
        note: item.notes || item.description,
      })),
      comparisonsBySupplier: [],
      topImpactContracts: [],
      projectedIndexVariation: { IPCA: '6.0%', IGPM: '8.0%', INPC: '5.5%', FIXO: '4.0%' },
      alerts: {
        highRiskContracts: list.filter((item) => item.risk === 'high').length,
        expiringIn30Days: list.filter((item) => (item.daysToEnd ?? 999) <= 30).length,
      },
      filters: { search: params.search ?? null, risk: params.risk ?? null, index: params.index ?? null },
    };
  }
}

export async function fetchContractsExpiring(): Promise<ContractsExpiringResponse> {
  try {
    const response = await requestJson<ContractsExpiringResponse>('/api/contracts/vencimentos');
    markApiSource();
    return response;
  } catch {
    if (!isMockFallbackEnabled()) {
      handleFallbackError('Falha ao carregar vencimentos.');
    }
    notifyMockFallback('API indisponivel');
    const items = fallbackContracts.map(enrichFallback);
    return {
      summary: {
        expired: items.filter((item) => (item.daysToEnd ?? 1) < 0).length,
        in30Days: items.filter((item) => (item.daysToEnd ?? 999) >= 0 && (item.daysToEnd ?? 999) <= 30).length,
        in60Days: items.filter((item) => (item.daysToEnd ?? 999) >= 31 && (item.daysToEnd ?? 999) <= 60).length,
        in90Days: items.filter((item) => (item.daysToEnd ?? 999) >= 61 && (item.daysToEnd ?? 999) <= 90).length,
      },
      groups: {
        expired: items.filter((item) => (item.daysToEnd ?? 1) < 0),
        in30Days: items.filter((item) => (item.daysToEnd ?? 999) >= 0 && (item.daysToEnd ?? 999) <= 30),
        in60Days: items.filter((item) => (item.daysToEnd ?? 999) >= 31 && (item.daysToEnd ?? 999) <= 60),
        in90Days: items.filter((item) => (item.daysToEnd ?? 999) >= 61 && (item.daysToEnd ?? 999) <= 90),
      },
    };
  }
}

export async function fetchContractsAdjustments(): Promise<ContractsAdjustmentsResponse> {
  try {
    const response = await requestJson<ContractsAdjustmentsResponse>('/api/contracts/reajustes');
    markApiSource();
    return response;
  } catch {
    if (!isMockFallbackEnabled()) {
      handleFallbackError('Falha ao carregar reajustes.');
    }
    notifyMockFallback('API indisponivel');
    const items = fallbackContracts.map(enrichFallback).filter((item) => (item.adjustmentDueInDays ?? 999) <= 120);
    return {
      summary: {
        upcomingAdjustments: items.length,
        estimatedImpact: formatCurrency(items.reduce((acc, item) => acc + item.estimatedAdjustmentImpact, 0)),
      },
      items,
    };
  }
}

export async function fetchContractDocuments(contractId?: string): Promise<ContractDocumentListResponse> {
  try {
    const response = await requestJson<ContractDocumentListResponse>(
      `/api/contracts/documentos${buildQuery({ contractId })}`,
    );
    markApiSource();
    return response;
  } catch {
    if (!isMockFallbackEnabled()) {
      handleFallbackError('Falha ao carregar documentos de contratos.');
    }
    notifyMockFallback('API indisponivel');
    return {
      items: contractId ? fallbackDocuments.filter((item) => item.contractId === contractId) : fallbackDocuments,
    };
  }
}

export async function uploadContractDocument(contractId: string, payload: ContractDocumentCreatePayload): Promise<ContractDocument> {
  try {
    const response = await requestJson<{ item: ContractDocument }>(`/api/contracts/documentos/${encodeURIComponent(contractId)}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    markApiSource();
    return response.item;
  } catch {
    if (!isMockFallbackEnabled()) {
      handleFallbackError('Falha ao anexar documento.');
    }
    notifyMockFallback('API indisponivel');
    const contractName = fallbackContracts.find((item) => item.id === contractId)?.name ?? `Contrato ${contractId}`;
    const item: ContractDocument = {
      id: `doc-${Date.now()}`,
      contractId,
      contractName,
      name: payload.name,
      type: payload.type,
      sizeKb: payload.sizeKb,
      uploadedAt: new Date().toISOString(),
      status: payload.status ?? 'active',
      url: payload.url,
      uploadedBy: 'local-user',
    };
    fallbackDocuments = [item, ...fallbackDocuments];
    return item;
  }
}

export async function deleteContractDocument(documentId: string): Promise<void> {
  try {
    await requestJson<{ ok: boolean }>(`/api/contracts/documentos/${encodeURIComponent(documentId)}`, {
      method: 'DELETE',
    });
    markApiSource();
  } catch {
    if (!isMockFallbackEnabled()) {
      handleFallbackError('Falha ao remover documento.');
    }
    notifyMockFallback('API indisponivel');
    fallbackDocuments = fallbackDocuments.filter((item) => item.id !== documentId);
  }
}

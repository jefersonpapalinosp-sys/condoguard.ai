import { notifyApiFallback, setModuleDataSource } from './apiStatus';
import { isMockFallbackEnabled } from './fallbackPolicy';
import { requestJson } from './http';
import { getContractsData, type ContractsData } from './mockApi';

const MODULE_NAME = 'contracts';

// ─── Legacy fallback ────────────────────────────────────────────────────────
export async function fetchContractsData(): Promise<ContractsData> {
  try {
    const response = await requestJson<ContractsData>('/api/contracts');
    setModuleDataSource(MODULE_NAME, 'api');
    return response;
  } catch {
    if (!isMockFallbackEnabled()) {
      setModuleDataSource(MODULE_NAME, 'unknown');
      notifyApiFallback({ module: 'Contratos', message: 'API indisponivel (fallback mock desativado)' });
      throw new Error('Falha ao carregar contratos.');
    }
    setModuleDataSource(MODULE_NAME, 'mock');
    notifyApiFallback({ module: 'Contratos', message: 'API indisponivel (fallback mock ativo)' });
    return getContractsData();
  }
}

// ─── Types ───────────────────────────────────────────────────────────────────

export type ContractRisk = 'high' | 'medium' | 'low';
export type ContractStatus = 'active' | 'expiring' | 'expired' | 'renewal_pending' | 'closed';

export type ContractListItem = {
  id: string;
  contractNumber: string;
  name: string;
  supplier: string;
  serviceType: string;
  category: string;
  status: ContractStatus;
  risk: ContractRisk;
  monthlyValueLabel: string;
  monthlyValue: number;
  startDate: string;
  endDate: string;
  daysToEnd: number | null;
  index: string;
  adjustmentDueInDays: number | null;
  estimatedAdjustmentImpact: number | null;
  internalOwner: string;
};

export type ContractsDashboard = {
  metrics: {
    totalContracts: number;
    activeContracts: number;
    expiringSoonContracts: number;
    expiredContracts: number;
    upcomingAdjustments: number;
    highRiskContracts: number;
    totalMonthlySpend: string;
    estimatedFinancialImpact: string;
  };
  highlights: {
    topRiskContracts: Array<{ id: string; contractNumber: string; supplier: string; risk: ContractRisk; status: ContractStatus }>;
    topSpendContracts: Array<{ id: string; contractNumber: string; supplier: string; monthlyValue: string }>;
  };
};

export type ContractsList = {
  items: ContractListItem[];
  meta: { page: number; pageSize: number; total: number; hasPrevious: boolean; hasNext: boolean };
  facets: { suppliers: string[]; serviceTypes: string[]; indices: string[] };
};

export type ContractsExpiring = {
  summary: { expired: number; in30Days: number; in60Days: number; in90Days: number };
  groups: {
    expired: ContractListItem[];
    in30Days: ContractListItem[];
    in60Days: ContractListItem[];
    in90Days: ContractListItem[];
  };
};

export type ContractsAdjustments = {
  summary: { upcomingAdjustments: number; estimatedImpact: string };
  items: ContractListItem[];
};

export type ListParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  risk?: string;
  supplier?: string;
  serviceType?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
};

// ─── API functions ───────────────────────────────────────────────────────────

export async function fetchContractsDashboard(): Promise<ContractsDashboard> {
  const r = await requestJson<ContractsDashboard>('/api/contracts/dashboard');
  setModuleDataSource(MODULE_NAME, 'api');
  return r;
}

export async function fetchContractsList(params: ListParams = {}): Promise<ContractsList> {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.pageSize) qs.set('pageSize', String(params.pageSize));
  if (params.search) qs.set('search', params.search);
  if (params.status) qs.set('status', params.status);
  if (params.risk) qs.set('risk', params.risk);
  if (params.supplier) qs.set('supplier', params.supplier);
  if (params.serviceType) qs.set('serviceType', params.serviceType);
  if (params.sortBy) qs.set('sortBy', params.sortBy);
  if (params.sortOrder) qs.set('sortOrder', params.sortOrder);
  const query = qs.toString() ? `?${qs.toString()}` : '';
  return requestJson<ContractsList>(`/api/contracts/lista${query}`);
}

export async function fetchContractsExpiring(): Promise<ContractsExpiring> {
  return requestJson<ContractsExpiring>('/api/contracts/vencimentos');
}

export async function fetchContractsAdjustments(): Promise<ContractsAdjustments> {
  return requestJson<ContractsAdjustments>('/api/contracts/reajustes');
}

export async function renewContract(contractId: string): Promise<{ ok: boolean; message?: string }> {
  return requestJson<{ ok: boolean; message?: string }>(
    `/api/contracts/${encodeURIComponent(contractId)}/renew`,
    { method: 'POST' },
  );
}

export async function closeContract(contractId: string): Promise<{ ok: boolean; message?: string }> {
  return requestJson<{ ok: boolean; message?: string }>(
    `/api/contracts/${encodeURIComponent(contractId)}/close`,
    { method: 'POST' },
  );
}

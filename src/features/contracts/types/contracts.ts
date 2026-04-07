export type ContractRisk = 'low' | 'medium' | 'high';
export type ContractStatus = 'active' | 'expiring' | 'expired' | 'renewal_pending' | 'closed' | 'draft';
export type ContractRenewalStatus = 'not_started' | 'in_progress' | 'renewed' | 'closed';

export type ContractRecord = {
  id: string;
  contractNumber: string;
  name: string;
  supplier: string;
  supplierId?: number | null;
  category: string;
  description: string;
  serviceType: string;
  monthlyValue: number;
  monthlyValueLabel: string;
  startDate: string;
  endDate: string;
  termMonths: number;
  index: 'IPCA' | 'IGPM' | 'INPC' | 'FIXO';
  adjustmentFrequencyMonths: number;
  nextAdjustmentDate: string;
  internalOwner: string;
  status: ContractStatus;
  renewalStatus: ContractRenewalStatus;
  risk: ContractRisk;
  notes: string;
  createdAt: string;
  updatedAt: string;
  daysToEnd?: number | null;
  adjustmentDueInDays?: number | null;
  projectedMonthlyValue: number;
  projectedMonthlyValueLabel: string;
  estimatedAdjustmentImpact: number;
  estimatedAdjustmentImpactLabel: string;
};

export type ContractsDashboardResponse = {
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
    topRiskContracts: Array<{
      id: string;
      contractNumber: string;
      supplier: string;
      risk: ContractRisk;
      status: ContractStatus;
    }>;
    topSpendContracts: Array<{
      id: string;
      contractNumber: string;
      supplier: string;
      monthlyValue: string;
    }>;
  };
};

export type ContractsListQuery = {
  page?: number;
  pageSize?: number;
  status?: ContractStatus;
  supplier?: string;
  serviceType?: string;
  index?: 'IPCA' | 'IGPM' | 'INPC' | 'FIXO';
  expiringOnly?: boolean;
  risk?: ContractRisk;
  search?: string;
  sortBy?: 'contract' | 'supplier' | 'category' | 'monthlyValue' | 'startDate' | 'endDate' | 'index' | 'nextAdjustment' | 'status' | 'risk';
  sortOrder?: 'asc' | 'desc';
};

export type ContractsListResponse = {
  items: ContractRecord[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
  filters: {
    status?: ContractStatus | null;
    supplier?: string | null;
    serviceType?: string | null;
    index?: string | null;
    risk?: ContractRisk | null;
    search?: string | null;
    expiringOnly?: boolean;
  };
  sort: {
    sortBy: string;
    sortOrder: 'asc' | 'desc';
  };
  facets: {
    suppliers: string[];
    serviceTypes: string[];
    indices: string[];
  };
};

export type ContractDetailResponse = {
  item: ContractRecord;
  supplier: {
    name: string;
    category: string;
    serviceType: string;
    internalOwner: string;
  };
  documents: ContractDocument[];
  timeline: ContractTimelineEvent[];
  alerts: Array<{
    level: 'critical' | 'warning' | 'info';
    message: string;
  }>;
};

export type ContractTimelineEvent = {
  id: string;
  type: string;
  message: string;
  actor: string;
  createdAt: string;
};

export type ContractDocument = {
  id: string;
  contractId: string;
  contractName?: string;
  name: string;
  type: string;
  sizeKb: number;
  uploadedAt: string;
  status: 'active' | 'archived' | 'pending_review';
  url?: string;
  uploadedBy?: string;
};

export type ContractDocumentListResponse = {
  items: ContractDocument[];
};

export type ContractsAuditResponse = {
  estimatedQuarterImpact: string;
  totalMonthlySpend: string;
  items: Array<{
    id: string;
    vendor: string;
    monthlyValue: string;
    index: string;
    nextAdjustment: string;
    risk: ContractRisk;
    note: string;
  }>;
  comparisonsBySupplier: Array<{
    supplier: string;
    contractsCount: number;
    monthlyValue: string;
    riskLevel: ContractRisk;
  }>;
  topImpactContracts: Array<{
    id: string;
    contractNumber: string;
    supplier: string;
    estimatedAdjustmentImpact: string;
    risk: ContractRisk;
  }>;
  projectedIndexVariation: Record<string, string>;
  alerts: {
    highRiskContracts: number;
    expiringIn30Days: number;
  };
  filters: {
    search?: string | null;
    risk?: string | null;
    index?: string | null;
  };
};

export type ContractsExpiringResponse = {
  summary: {
    expired: number;
    in30Days: number;
    in60Days: number;
    in90Days: number;
  };
  groups: {
    expired: ContractRecord[];
    in30Days: ContractRecord[];
    in60Days: ContractRecord[];
    in90Days: ContractRecord[];
  };
};

export type ContractsAdjustmentsResponse = {
  summary: {
    upcomingAdjustments: number;
    estimatedImpact: string;
  };
  items: ContractRecord[];
};

export type ContractUpsertPayload = {
  contractNumber?: string;
  name: string;
  supplier: string;
  category: string;
  description: string;
  serviceType: string;
  startDate: string;
  endDate: string;
  termMonths?: number;
  monthlyValue: number;
  index: 'IPCA' | 'IGPM' | 'INPC' | 'FIXO';
  adjustmentFrequencyMonths: number;
  nextAdjustmentDate?: string;
  internalOwner: string;
  status: ContractStatus;
  risk: ContractRisk;
  notes: string;
};

export type ContractDocumentCreatePayload = {
  name: string;
  type: string;
  sizeKb: number;
  status?: 'active' | 'archived' | 'pending_review';
  url?: string;
};

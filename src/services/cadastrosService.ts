import { notifyApiFallback, setModuleDataSource } from './apiStatus';
import { requestJson } from './http';

export type CadastroTipo = 'unidade' | 'morador' | 'fornecedor' | 'servico';
export type CadastroStatus = 'active' | 'pending' | 'inactive';

export type CadastroRegistro = {
  id: string;
  condominiumId?: number | null;
  tipo: CadastroTipo;
  titulo: string;
  descricao: string;
  status: CadastroStatus;
  updatedAt: string;
};

export type CadastrosResponse = {
  items: CadastroRegistro[];
  meta?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
  filters?: {
    tipo?: CadastroTipo | null;
    status?: CadastroStatus | null;
    search?: string | null;
  };
};

const MODULE_NAME = 'cadastros';

const mockCadastros: CadastroRegistro[] = [
  {
    id: 'cad-001',
    tipo: 'unidade',
    titulo: 'Unidade A-101',
    descricao: 'Responsavel: Maria Silva',
    status: 'active',
    updatedAt: '2026-04-05T09:22:00.000Z',
  },
  {
    id: 'cad-002',
    tipo: 'morador',
    titulo: 'Carlos Souza',
    descricao: 'Unidade B-204',
    status: 'active',
    updatedAt: '2026-04-05T08:41:00.000Z',
  },
  {
    id: 'cad-003',
    tipo: 'fornecedor',
    titulo: 'Elevadores Prime LTDA',
    descricao: 'Contrato de manutencao preventiva',
    status: 'pending',
    updatedAt: '2026-04-04T17:10:00.000Z',
  },
  {
    id: 'cad-004',
    tipo: 'servico',
    titulo: 'Limpeza tecnica de reservatorio',
    descricao: 'Execucao mensal - Blocos A, B e C',
    status: 'active',
    updatedAt: '2026-04-04T14:35:00.000Z',
  },
  {
    id: 'cad-005',
    tipo: 'morador',
    titulo: 'Fernanda Lima',
    descricao: 'Unidade C-309',
    status: 'inactive',
    updatedAt: '2026-04-02T11:02:00.000Z',
  },
];

export async function fetchCadastrosData(): Promise<CadastrosResponse> {
  try {
    const response = await requestJson<CadastrosResponse>('/api/cadastros?page=1&pageSize=200');
    setModuleDataSource(MODULE_NAME, 'api');
    return response;
  } catch {
    setModuleDataSource(MODULE_NAME, 'mock');
    notifyApiFallback({ module: 'Cadastros', message: 'API indisponivel' });
    return { items: [...mockCadastros] };
  }
}

export async function createCadastroData(payload: {
  tipo: CadastroTipo;
  titulo: string;
  descricao: string;
  status: CadastroStatus;
}): Promise<CadastroRegistro> {
  try {
    const response = await requestJson<{ item: CadastroRegistro }>('/api/cadastros', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setModuleDataSource(MODULE_NAME, 'api');
    return response.item;
  } catch {
    setModuleDataSource(MODULE_NAME, 'mock');
    notifyApiFallback({ module: 'Cadastros', message: 'Criado localmente em modo fallback' });
    const local: CadastroRegistro = {
      id: `cad-local-${Date.now()}`,
      tipo: payload.tipo,
      titulo: payload.titulo,
      descricao: payload.descricao,
      status: payload.status,
      updatedAt: new Date().toISOString(),
    };
    mockCadastros.unshift(local);
    return local;
  }
}

export async function updateCadastroStatusData(id: string, status: CadastroStatus): Promise<CadastroRegistro> {
  try {
    const response = await requestJson<{ item: CadastroRegistro }>(`/api/cadastros/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    setModuleDataSource(MODULE_NAME, 'api');
    return response.item;
  } catch {
    setModuleDataSource(MODULE_NAME, 'mock');
    notifyApiFallback({ module: 'Cadastros', message: 'Status atualizado localmente em modo fallback' });
    const index = mockCadastros.findIndex((item) => item.id === id);
    if (index < 0) {
      throw new Error('Cadastro nao encontrado');
    }
    mockCadastros[index] = {
      ...mockCadastros[index],
      status,
      updatedAt: new Date().toISOString(),
    };
    return mockCadastros[index];
  }
}

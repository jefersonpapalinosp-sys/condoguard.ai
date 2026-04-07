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

export async function fetchCadastrosData(): Promise<CadastrosResponse> {
  try {
    const response = await requestJson<CadastrosResponse>('/api/cadastros?page=1&pageSize=200');
    setModuleDataSource(MODULE_NAME, 'api');
    return response;
  } catch {
    setModuleDataSource(MODULE_NAME, 'unknown');
    notifyApiFallback({ module: 'Cadastros', message: 'API indisponivel' });
    throw new Error('Falha ao carregar cadastros.');
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
    setModuleDataSource(MODULE_NAME, 'unknown');
    notifyApiFallback({ module: 'Cadastros', message: 'Falha ao criar cadastro na API' });
    throw new Error('Falha ao criar cadastro.');
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
    setModuleDataSource(MODULE_NAME, 'unknown');
    notifyApiFallback({ module: 'Cadastros', message: 'Falha ao atualizar status na API' });
    throw new Error('Falha ao atualizar cadastro.');
  }
}

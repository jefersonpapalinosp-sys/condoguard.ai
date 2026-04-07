vi.mock('../../../src/services/http', () => ({
  requestJson: vi.fn(),
}));

vi.mock('../../../src/services/apiStatus', () => ({
  notifyApiFallback: vi.fn(),
  setModuleDataSource: vi.fn(),
}));

describe('cadastrosService.fetchCadastrosData', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('builds query params with tipo/status/search/page/pageSize', async () => {
    const { requestJson } = await import('../../../src/services/http');
    const { fetchCadastrosData } = await import('../../../src/services/cadastrosService');

    vi.mocked(requestJson).mockResolvedValue({ items: [] });

    await fetchCadastrosData({
      tipo: 'unidade',
      status: 'active',
      search: 'A-101',
      page: 2,
      pageSize: 15,
    });

    const calledUrl = vi.mocked(requestJson).mock.calls[0][0];
    expect(calledUrl).toContain('/api/cadastros?');
    expect(calledUrl).toContain('tipo=unidade');
    expect(calledUrl).toContain('status=active');
    expect(calledUrl).toContain('search=A-101');
    expect(calledUrl).toContain('page=2');
    expect(calledUrl).toContain('pageSize=15');
  });

  it('marks source unknown and throws when API fails', async () => {
    const { requestJson } = await import('../../../src/services/http');
    const { setModuleDataSource, notifyApiFallback } = await import('../../../src/services/apiStatus');
    const { fetchCadastrosData } = await import('../../../src/services/cadastrosService');

    vi.mocked(requestJson).mockRejectedValue(new Error('network'));

    await expect(fetchCadastrosData()).rejects.toThrow(/Falha ao carregar cadastros/i);
    expect(setModuleDataSource).toHaveBeenCalledWith('cadastros', 'unknown');
    expect(notifyApiFallback).toHaveBeenCalledWith({
      module: 'Cadastros',
      message: 'API indisponivel',
    });
  });
});

describe('cadastrosService mutations', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('posts create payload to /api/cadastros', async () => {
    const { requestJson } = await import('../../../src/services/http');
    const { createCadastroData } = await import('../../../src/services/cadastrosService');

    vi.mocked(requestJson).mockResolvedValue({
      item: {
        id: 'cad-1',
        tipo: 'unidade',
        titulo: 'Unidade A-101',
        descricao: 'Teste',
        status: 'active',
        updatedAt: '2026-04-07T00:00:00.000Z',
      },
    });

    await createCadastroData({
      tipo: 'unidade',
      titulo: 'Unidade A-101',
      descricao: 'Teste',
      status: 'active',
    });

    expect(requestJson).toHaveBeenCalledWith('/api/cadastros', {
      method: 'POST',
      body: JSON.stringify({
        tipo: 'unidade',
        titulo: 'Unidade A-101',
        descricao: 'Teste',
        status: 'active',
      }),
    });
  });

  it('patches status endpoint with encoded id', async () => {
    const { requestJson } = await import('../../../src/services/http');
    const { updateCadastroStatusData } = await import('../../../src/services/cadastrosService');

    vi.mocked(requestJson).mockResolvedValue({
      item: {
        id: 'cad/1',
        tipo: 'unidade',
        titulo: 'Unidade A-101',
        descricao: 'Teste',
        status: 'inactive',
        updatedAt: '2026-04-07T00:00:00.000Z',
      },
    });

    await updateCadastroStatusData('cad/1', 'inactive');

    expect(requestJson).toHaveBeenCalledWith('/api/cadastros/cad%2F1/status', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'inactive' }),
    });
  });
});

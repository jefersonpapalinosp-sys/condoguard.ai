import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import CadastrosGeraisPage from '../../../src/features/cadastros/pages/CadastrosGeraisPage';

vi.mock('../../../src/services/cadastrosService', () => ({
  fetchCadastrosData: vi.fn(),
  createCadastroData: vi.fn(),
  updateCadastroStatusData: vi.fn(),
}));

const meta = {
  page: 1,
  pageSize: 20,
  total: 1,
  totalPages: 1,
  hasNext: false,
  hasPrevious: false,
};

describe('CadastrosGerais page routing by type', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loads by route slug and navigates between tabs', async () => {
    const { fetchCadastrosData } = await import('../../../src/services/cadastrosService');

    vi.mocked(fetchCadastrosData).mockImplementation(async (query = {}) => {
      if (query.tipo === 'morador') {
        return {
          items: [
            {
              id: 'cad-mor-1',
              tipo: 'morador',
              titulo: 'Maria Silva',
              descricao: 'Bloco A, apto 102',
              status: 'active',
              updatedAt: '2026-04-07T00:00:00.000Z',
            },
          ],
          meta,
        };
      }

      return {
        items: [
          {
            id: 'cad-uni-1',
            tipo: 'unidade',
            titulo: 'Unidade A-101',
            descricao: 'Ocupada',
            status: 'active',
            updatedAt: '2026-04-07T00:00:00.000Z',
          },
        ],
        meta,
      };
    });

    render(
      <MemoryRouter initialEntries={['/cadastros-gerais/unidades']}>
        <Routes>
          <Route path="/cadastros-gerais/:tipoSlug" element={<CadastrosGeraisPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Cadastros de Unidades')).toBeInTheDocument();
    expect(await screen.findByText('Unidade A-101')).toBeInTheDocument();
    expect(fetchCadastrosData).toHaveBeenCalledWith(
      expect.objectContaining({
        tipo: 'unidade',
      }),
    );

    const user = userEvent.setup();
    await user.click(screen.getByRole('link', { name: 'Moradores' }));

    expect(await screen.findByText('Cadastros de Moradores')).toBeInTheDocument();
    expect(await screen.findByText('Maria Silva')).toBeInTheDocument();
    expect(fetchCadastrosData).toHaveBeenCalledWith(
      expect.objectContaining({
        tipo: 'morador',
      }),
    );
  });

  it('redirects invalid slug to /todos', async () => {
    const { fetchCadastrosData } = await import('../../../src/services/cadastrosService');
    vi.mocked(fetchCadastrosData).mockResolvedValue({ items: [], meta: { ...meta, total: 0 } });

    render(
      <MemoryRouter initialEntries={['/cadastros-gerais/invalido']}>
        <Routes>
          <Route path="/cadastros-gerais/:tipoSlug" element={<CadastrosGeraisPage />} />
          <Route path="/cadastros-gerais/todos" element={<CadastrosGeraisPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Cadastros Gerais')).toBeInTheDocument();
    await waitFor(() => {
      expect(fetchCadastrosData).toHaveBeenCalledWith(
        expect.objectContaining({
          tipo: undefined,
        }),
      );
    });
  });
});

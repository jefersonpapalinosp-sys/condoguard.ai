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

describe('CadastrosGerais page', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loads cadastros and filters by tipo using tabs', async () => {
    const { fetchCadastrosData } = await import('../../../src/services/cadastrosService');

    vi.mocked(fetchCadastrosData).mockResolvedValue({
      items: [
        {
          id: 'cad-uni-1',
          tipo: 'unidade',
          titulo: 'Unidade A-101',
          descricao: 'Ocupada',
          status: 'active',
          updatedAt: '2026-04-07T00:00:00.000Z',
        },
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
    });

    render(
      <MemoryRouter initialEntries={['/cadastros-gerais']}>
        <Routes>
          <Route path="/cadastros-gerais" element={<CadastrosGeraisPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Cadastros Gerais')).toBeInTheDocument();
    expect(await screen.findByText('Unidade A-101')).toBeInTheDocument();
    expect(await screen.findByText('Maria Silva')).toBeInTheDocument();
    expect(fetchCadastrosData).toHaveBeenCalledWith();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Moradores' }));

    await waitFor(() => {
      expect(screen.getByText('Maria Silva')).toBeInTheDocument();
      expect(screen.queryByText('Unidade A-101')).not.toBeInTheDocument();
    });
  });
});

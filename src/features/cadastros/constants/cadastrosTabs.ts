import type { CadastroTipo } from '../../../services/cadastrosService';

export type CadastrosTabSlug = 'todos' | 'unidades' | 'moradores' | 'fornecedores' | 'servicos';

export type CadastrosTab = {
  slug: CadastrosTabSlug;
  label: string;
  tipo: CadastroTipo | null;
  heading: string;
};

export const CADASTROS_DEFAULT_SLUG: CadastrosTabSlug = 'todos';

export const CADASTROS_TABS: CadastrosTab[] = [
  { slug: 'todos', label: 'Todos', tipo: null, heading: 'Cadastros Gerais' },
  { slug: 'unidades', label: 'Unidades', tipo: 'unidade', heading: 'Cadastros de Unidades' },
  { slug: 'moradores', label: 'Moradores', tipo: 'morador', heading: 'Cadastros de Moradores' },
  { slug: 'fornecedores', label: 'Fornecedores', tipo: 'fornecedor', heading: 'Cadastros de Fornecedores' },
  { slug: 'servicos', label: 'Servicos', tipo: 'servico', heading: 'Cadastros de Servicos' },
];

const VALID_SLUGS = new Set<CadastrosTabSlug>(CADASTROS_TABS.map((tab) => tab.slug));

export function isCadastrosTabSlug(value: string): value is CadastrosTabSlug {
  return VALID_SLUGS.has(value as CadastrosTabSlug);
}

export function getCadastrosTab(slug: CadastrosTabSlug): CadastrosTab {
  return CADASTROS_TABS.find((tab) => tab.slug === slug) ?? CADASTROS_TABS[0];
}

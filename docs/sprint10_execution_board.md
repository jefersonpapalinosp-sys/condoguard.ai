# Sprint 10 - Execution Board (Cadastros por Tipo)

Data de referencia: 6 de abril de 2026

Objetivo da sprint: implementar navegacao e paginas separadas por tipo de cadastro (Todos, Unidades, Moradores, Fornecedores, Servicos), mantendo consistencia funcional com o modulo atual.

## Escopo da sprint

- Subrotas de cadastros por tipo.
- Abas navegaveis por URL (estilo da referencia visual).
- Busca rapida e listagem por contexto de tipo.
- Service consumindo filtros da API.
- Regressao do fluxo de criacao e alteracao de status.

## Fora de escopo

- Novo modelo de dados por tipo com campos especializados.
- Mudancas de RBAC/alcada de permissao.
- Refatoracao completa de backend para filtro SQL push-down.

## Status resumido

- `S10-01` IA/UX e arquitetura de navegacao por tipo: **todo**
- `S10-02` Router e paginas separadas de cadastros: **todo**
- `S10-03` Service/API com filtros dinamicos: **todo**
- `S10-04` Reuso de componentes e padrao visual: **todo**
- `S10-05` Testes de regressao e navegacao: **todo**
- `S10-06` Smoke e fechamento com evidencias: **todo**

## S10-01 - IA/UX e arquitetura de navegacao por tipo

- [ ] Definir mapeamento oficial de abas e slugs (`todos`, `unidades`, `moradores`, `fornecedores`, `servicos`).
- [ ] Definir comportamento da busca rapida por aba.
- [ ] Definir estrategia de fallback para rota invalida (redirect para `todos`).
- [ ] Validar consistencia mobile/desktop da navegacao por abas.

DoD:
- Documento de arquitetura de rotas aprovado.
- Mapa de abas compartilhado com frontend.

## S10-02 - Router e paginas separadas de cadastros

- [ ] Criar rota pai `/cadastros-gerais`.
- [ ] Criar subrotas por tipo (`/unidades`, `/moradores`, `/fornecedores`, `/servicos`).
- [ ] Extrair layout comum de cadastros para evitar duplicacao.
- [ ] Garantir estado ativo da aba conforme URL atual.

DoD:
- Cada aba abre por URL propria.
- Back/forward do navegador funciona sem quebra de estado.

## S10-03 - Service/API com filtros dinamicos

- [ ] Evoluir `fetchCadastrosData` para aceitar query params (`tipo`, `status`, `search`, `page`, `pageSize`).
- [ ] Integrar chamadas da tela por contexto de aba.
- [ ] Preservar comportamento de erro/fonte de dados (`DataSourceBadge`).
- [ ] Validar compatibilidade com contrato atual de `GET /api/cadastros`.

DoD:
- Listagens carregadas por filtro de API, sem filtro local obrigatorio de tipo.
- Nenhuma regressao em criacao e alteracao de status.

## S10-04 - Reuso de componentes e padrao visual

- [ ] Criar componente de tabs de tipo com estilo padronizado.
- [ ] Reaproveitar bloco de busca rapida para todas as subpaginas.
- [ ] Reaproveitar lista/cards de registro com variacao por tipo apenas quando necessario.
- [ ] Garantir acessibilidade minima (aria-current/aria-label).

DoD:
- UI consistente com referencia visual.
- Sem duplicacao excessiva de JSX entre paginas de tipo.

## S10-05 - Testes de regressao e navegacao

- [ ] Unit tests do service para query por tipo e busca.
- [ ] Integration tests para roteamento entre abas.
- [ ] Contrato backend para filtros `tipo`, `search` e paginacao.
- [ ] Cobertura do fluxo create + update status em pelo menos 2 abas.

DoD:
- Suite alterada passando em CI local.
- Regressao de cadastros coberta para fluxo principal.

## S10-06 - Smoke e fechamento com evidencias

- [ ] Rodar `npm.cmd run lint`.
- [ ] Rodar `npm.cmd run test`.
- [ ] Rodar `npm.cmd run test:py`.
- [ ] Executar smoke manual das abas por tipo.
- [ ] Publicar relatorio final da sprint.

DoD:
- Suites verdes.
- Evidencias registradas em `docs/`.

## Sequencia sugerida (10 dias uteis)

1. Dia 1-2: `S10-01` desenho de rotas e UX final.
2. Dia 3-4: `S10-02` implementacao de router e paginas.
3. Dia 5-6: `S10-03` service e integracao de filtros.
4. Dia 7: `S10-04` consolidacao visual e componentes.
5. Dia 8-9: `S10-05` testes de regressao.
6. Dia 10: `S10-06` smoke e fechamento.

## Riscos e mitigacao

- Risco: regressao no fluxo atual de Cadastros Gerais.
  Mitigacao: manter layout comum e testes de create/update.
- Risco: divergencia entre slug da rota e tipo da API.
  Mitigacao: mapa centralizado `slug -> tipo`.
- Risco: comportamento inconsistente de busca entre abas.
  Mitigacao: regra unica de busca e debounce padronizado.

## Criterio de encerramento da Sprint 10

- Cadastros acessiveis por paginas separadas de tipo com URL dedicada.
- UX de abas funcional no padrao visual esperado.
- Fluxos de listar, criar e atualizar status funcionando sem regressao.
- Relatorio final publicado com evidencias PASS/FAIL.

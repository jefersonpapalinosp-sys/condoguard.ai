# Sprint 10 - Analise Tecnica Cadastros por Tipo

Data de referencia: 6 de abril de 2026
Escopo: separar o modulo de cadastros em paginas por tipo, mantendo navegacao por abas (Todos, Unidades, Moradores, Fornecedores, Servicos).

## 1) Contexto da demanda

A demanda e transformar o fluxo atual de "Cadastros Gerais" em experiencia com paginas separadas por tipo de cadastro, preservando UX de navegacao rapida por abas como no layout de referencia.

Objetivo pratico:
- melhorar foco operacional por tipo;
- permitir deep-link por URL;
- simplificar evolucao de formularios especificos por tipo no futuro.

## 2) Estado atual (as-is)

Frontend atual:
- unica tela consolidada em `src/views/CadastrosGerais.tsx`;
- filtro de tipo implementado localmente no estado React;
- rota unica `"/cadastros-gerais"` em `src/app/router/AppRouter.tsx`;
- item de menu unico em `src/features/layout/components/AppLayout.tsx`.

Service atual:
- `src/services/cadastrosService.ts` chama `/api/cadastros?page=1&pageSize=200`;
- nao usa query dinamica para `tipo`, `status` e `search`.

Backend atual:
- rota `GET /api/cadastros` ja aceita `tipo`, `status`, `search`, `page`, `pageSize`;
- filtros aplicados na rota depois da carga de dados;
- contrato atual ja atende segmentacao por tipo sem breaking change.

## 3) Diagnostico tecnico

Pontos fortes:
- backend ja possui filtro por tipo pronto para consumo;
- modelo atual de dados (`tipo`, `titulo`, `descricao`, `status`) suporta separacao imediata por pagina.

Gaps para o objetivo:
- URL nao representa o tipo selecionado;
- impossivel abrir direto "Moradores" por link dedicado;
- estado de filtro fica acoplado a uma pagina unica extensa;
- service nao aproveita filtros de API para reduzir payload.

## 4) Arquitetura recomendada (to-be)

### 4.1 Roteamento por tipo (frontend)

Criar estrutura com rota pai de cadastros e subrotas por tipo:
- `/cadastros-gerais` (equivalente a "Todos");
- `/cadastros-gerais/unidades`;
- `/cadastros-gerais/moradores`;
- `/cadastros-gerais/fornecedores`;
- `/cadastros-gerais/servicos`.

Observacao:
- abas continuam visuais no topo, mas agora cada aba navega para rota propria.

### 4.2 Composicao de paginas

Extrair layout comum:
- header, badge, busca rapida, botao novo cadastro, contadores e lista.

Separar pagina por tipo:
- cada pagina fixa o `tipo` por rota;
- "Todos" nao fixa tipo;
- busca rapida permanece comum.

### 4.3 Service/API

Evoluir `fetchCadastrosData` para query parametrizada:
- `tipo`, `status`, `search`, `page`, `pageSize`;
- retorno mantendo contrato atual (`items/meta/filters`).

Backend:
- manter endpoints atuais sem quebra;
- opcional de performance: mover parte dos filtros para camada de repositorio Oracle em sprint futura.

## 5) Impactos por camada

Frontend:
- `AppRouter`, `AppLayout`, paginas de `cadastros`, service de `cadastros`.

Backend:
- sem alteracao obrigatoria de contrato nesta sprint;
- potencial ajuste interno de performance se priorizado.

Testes:
- unitario do service para query por tipo;
- integracao de navegacao/abas por rota;
- contrato backend de filtro `tipo` e `search`;
- e2e minimo para abrir cada aba e validar estado ativo.

## 6) Riscos e mitigacao

1. Risco: regressao na tela atual de cadastros.
Mitigacao: extrair componentes comuns e cobrir rotas com testes de integracao.

2. Risco: inconsistencia entre rotas e label de tipo.
Mitigacao: mapa unico `route <-> tipo` compartilhado entre tabs e loader.

3. Risco: aumento de chamadas sem necessidade.
Mitigacao: debounce de busca e reaproveitamento de parametros de pagina.

4. Risco: confusao de permissao para criar/editar.
Mitigacao: manter RBAC atual (`admin`/`sindico`) sem alterar politica.

## 7) Criterio tecnico para iniciar implementacao

- definicao oficial das rotas de tipo;
- mapeamento de labels e slugs aprovado (`unidades`, `moradores`, `fornecedores`, `servicos`);
- contrato de filtros do service validado com backend;
- plano de teste de regressao de cadastros aprovado.

## 8) Recomendacao de entrega

Fase 1 (Sprint 10):
- rotas por tipo + tabs navegaveis;
- service com filtros de API;
- cobertura de testes e smoke local.

Fase 2 (Sprint futura):
- formularios especializados por tipo (campos especificos de unidade/morador/fornecedor/servico);
- refinamento de performance no backend para filtro direto em Oracle.

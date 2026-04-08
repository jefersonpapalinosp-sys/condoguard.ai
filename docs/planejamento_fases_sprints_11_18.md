# Planejamento por Fases e Novas Sprints (S11-S18)

Data de referencia: 8 de abril de 2026  
Fontes de referencia:
- diagramas arquiteturais datados de 8 de abril de 2026;
- backlog atual em `docs/product_backlog_sprints.md`;
- estrutura real do repositorio frontend, backend e camada de dados.

## Objetivo do documento

Consolidar a arquitetura-alvo do CondoGuard.AI a partir das imagens de referencia e transformar essa visao em um plano executavel por fases, com novas sprints apos a Sprint 10, para concluirmos a implementacao e os ajustes do sistema completo.

Este documento nao substitui os boards executivos de cada sprint. Ele funciona como mapa-mestre de direcao tecnica, produto e governanca.

## 1. Leitura consolidada das imagens

### 1.1 Camada de dados e governanca

As imagens apontam que a camada de dados precisa ser tratada como produto e nao apenas como suporte operacional.

Pilares identificados:
- versionamento e orquestracao por Flyway como trilha oficial de DDL e DML;
- schema transacional core com isolamento multi-tenant por `condominio_id`;
- tenant seed e identidade local para perfis `admin`, `sindico` e `morador`;
- camada MART e views para desacoplamento entre API e estrutura transacional;
- mecanismo formal de fallback de views para evitar quebra operacional em transicoes;
- qualidade de dados tratada como gate de deploy, com relatorios JSON, checks de duplicidade, orfaos e dominios invalidos;
- governanca operacional com runbooks, Oracle setup, data dictionary e checklist de homolog/producao.

### 1.2 Frontend por camadas

As imagens do frontend mostram uma arquitetura em camadas bem definida:
- runtime e bootstrap;
- providers globais e boundaries;
- router e controle de acesso;
- sessao, autenticacao e eventos;
- HTTP, resiliencia e fallback;
- servicos de dominio por modulo;
- features e paginas;
- layout e componentes compartilhados;
- testes automatizados;
- build, qualidade e CI/CD.

Implicacoes praticas:
- a navegacao precisa refletir perfis e jornadas reais de administradores, sindicos e moradores;
- fallback deve ser explicito, observavel e controlado por ambiente;
- cada modulo deve ter service proprio, contrato claro e UX consistente;
- o layout precisa ser mobile-first e padronizado para desktop, tablet e celular.

### 1.3 Visao full-system

As imagens consolidadas mostram um fluxo alvo unico:
- frontend estruturado por camadas;
- backend FastAPI como orquestrador dos dominios;
- camada de dados Oracle com MART, governanca e mecanismos de fallback controlados;
- IA com roteamento de agente, planner de acoes e gerenciamento de contexto;
- observabilidade ponta a ponta com `trace_id`, auditoria e testes de regressao.

Em outras palavras, o sistema final nao e apenas "frontend + API + banco". Ele precisa operar como uma plataforma com contratos claros entre UX, servicos, identidade, dados e operacao.

### 1.4 Backend por camadas

As imagens do backend reforcam quatro macroblocos:
- ingress, seguranca e bootstrap;
- orquestracao e servicos de dominio;
- persistencia e fallback controlado;
- observabilidade, auditoria e health.

Isso significa que o backend alvo precisa:
- fechar OIDC/JWT/JWKS e RBAC reais;
- manter validacao forte de payload e isolamento por tenant;
- separar controllers, services, repositories e orchestrators;
- tratar ENEL e SABESP como integracoes operacionais com historico, deduplicacao e retry;
- expor sinais operacionais confiaveis para CI, smoke, health e suporte.

## 2. Leitura do estado atual do repositorio

O repositorio ja possui uma base importante aderente ao desenho das imagens.

### 2.1 O que ja esta presente

- frontend com `AppProviders`, `AppRouter`, `ProtectedRoute`, layout compartilhado e modulos por feature;
- services dedicados em `src/services` para dashboard, alertas, consumo, contratos, faturas, chat, gestao, configuracoes e integracoes;
- backend FastAPI em `backend/app/main.py` com middlewares de seguranca, CORS, rate limit e observabilidade;
- routers separados para core, contratos, ENEL e SABESP;
- repositories, services de chat, trilha de IA e armazenamento de telemetria;
- base SQL, views/marts, checks de qualidade e documentacao Oracle;
- esteira de testes com Vitest, Playwright, pytest e gates de CI.

### 2.2 Principais gaps para atingir a arquitetura-alvo

- fechamento do provedor real de identidade com OIDC/JWKS em homolog/producao;
- padronizacao end-to-end do isolamento por tenant em todos os dominios e integracoes;
- consolidacao do Flyway como trilha oficial de evolucao da base;
- formalizacao da camada MART e do mecanismo de view fallback como contrato de backend;
- evolucao das integracoes ENEL e SABESP para operacao assistida com governanca completa;
- padronizacao visual e responsiva de todos os modulos principais;
- conclusao das jornadas operacionais fim a fim por perfil de usuario;
- formalizacao dos gates de qualidade, seguranca, dados e go-live.

## 3. Principios para a proxima etapa

- Oracle-first em `hml` e `prod`.
- Fallback apenas quando explicito, rastreavel e controlado por ambiente.
- Tenant isolation como regra obrigatoria de modelagem, consulta e autorizacao.
- Frontend feature-driven, com shell unificado e experiencia responsiva.
- Backend orientado a services e orchestrators, com contratos claros por modulo.
- Dados, qualidade e observabilidade como partes do produto e nao como pos-projeto.
- Cada sprint deve encerrar com evidencias tecnicas, runbook atualizado e criterio de aceite verificavel.

## 4. Macrofases recomendadas

## Fase 1 - Fechamento arquitetural e seguranca

Sprints: `Sprint 11` e `Sprint 12`

Objetivo:
- fechar os gates que sustentam toda a arquitetura: identidade real, tenancy, governanca de dados e contratos de leitura via MART.

Saidas esperadas:
- autenticacao corporativa validada;
- contrato de tenant padronizado;
- Flyway e views oficializados;
- qualidade de dados usada como gate.

## Fase 2 - Backend operacional e integracoes

Sprints: `Sprint 13` e `Sprint 14`

Objetivo:
- tornar backend e frontend consistentes com a operacao real, incluindo integracoes externas, shell visual, responsividade e padrao de modulo.

Saidas esperadas:
- orquestradores ENEL/SABESP maduros;
- services padronizados;
- navegacao e layout mobile-first;
- base visual pronta para jornadas completas.

## Fase 3 - Jornadas completas e IA operacional

Sprints: `Sprint 15` e `Sprint 16`

Objetivo:
- concluir fluxos de negocio ponta a ponta e elevar o CondoGuard para um copiloto operacional confiavel.

Saidas esperadas:
- modulos de negocio fechados por jornada;
- IA com contexto, fontes, guardrails e acoes assistidas;
- experiencia por perfil mais proxima da operacao real do condominio.

## Fase 4 - Governanca de release e go-live

Sprints: `Sprint 17` e `Sprint 18`

Objetivo:
- transformar a solucao em plataforma pronta para rollout, com observabilidade, gates, handoff e entrada assistida em operacao real.

Saidas esperadas:
- release gates automatizados;
- runbooks e rollback validados;
- piloto controlado;
- criterios de expansao definidos.

## 5. Novas sprints apos a Sprint 10

## Sprint 11 - Identidade real, tenancy e contrato arquitetural

Objetivo:
- remover o ultimo risco estrutural de acesso e consolidar o contrato de isolamento multi-condominio.

Entregas principais:
- `S11-01` Fechar OIDC/JWKS real em homolog e preparar producao.
- `S11-02` Alinhar sessao frontend/backend com expiracao, renovacao e logout previsiveis.
- `S11-03` Padronizar `condominio_id` em rotas, repositories, integracoes e auditoria.
- `S11-04` Propagar `trace_id` entre frontend, backend e logs operacionais.
- `S11-05` Publicar smoke de seguranca e tenancy como gate de sprint.

Criterios de aceite:
- login corporativo validado com token real;
- acessos cross-tenant negados em todos os dominios criticos;
- `trace_id` visivel em request, log e resposta observavel;
- relatorio de smoke de seguranca publicado em `docs/`.

## Sprint 12 - Dados, Flyway, MART e qualidade

Objetivo:
- oficializar a camada de dados como contrato do produto.

Entregas principais:
- `S12-01` Consolidar migracoes em Flyway para schema core, views e seeds controlados.
- `S12-02` Revisar entidades core para contratos, faturas, integracoes e auditoria.
- `S12-03` Formalizar camada MART para dashboards, alerts, invoices, management e contracts.
- `S12-04` Implementar gate automatizado de data quality com relatorio JSON versionado.
- `S12-05` Atualizar data dictionary, checklist Oracle e runbook de homolog/prod.

Criterios de aceite:
- ambiente novo sobe apenas por migracoes versionadas;
- views/marts criticos documentados e consumiveis pela API;
- falha de qualidade de dados bloqueia fechamento da sprint;
- documentacao operacional da base atualizada.

## Sprint 13 - Backend orquestrado e integracoes operacionais

Objetivo:
- amadurecer o backend como camada de orquestracao de negocio e integracoes.

Entregas principais:
- `S13-01` Padronizar controllers, services, repositories e orchestrators por dominio.
- `S13-02` Formalizar contratos do planner de acoes e do gerenciador de contexto do chat.
- `S13-03` Evoluir ENEL para historico de execucao, retry, dedupe e trilha de erro.
- `S13-04` Evoluir SABESP no mesmo padrao operacional da ENEL.
- `S13-05` Publicar health checks, auditoria e metricas por integracao.

Criterios de aceite:
- integracoes ENEL e SABESP operam com historico e estados claros;
- falhas ficam auditaveis por item e por run;
- backend apresenta padrao unico de orquestracao entre modulos;
- endpoints de integracao possuem contrato e testes dedicados.

## Sprint 14 - Shell frontend, design system aplicado e responsividade real

Objetivo:
- transformar a interface em uma experiencia coerente, bonita e responsiva em todos os tamanhos de tela.

Entregas principais:
- `S14-01` Revisar shell global: header, sidebar, breadcrumbs, tabs, filtros e estados de pagina.
- `S14-02` Consolidar tokens visuais, espacamentos, componentes de status e estados compartilhados.
- `S14-03` Ajustar modulos principais para tablet e mobile sem perda funcional.
- `S14-04` Padronizar tabelas, cards, formularios e acoes flutuantes por contexto.
- `S14-05` Validar acessibilidade minima, loading, empty state e error state por jornada.

Criterios de aceite:
- paginas chave funcionam bem em desktop, tablet e mobile;
- navegacao lateral e contextual seguem padrao unico;
- design system aplicado sem divergencias relevantes entre modulos;
- regressao visual critica coberta por checklist de sprint.

## Sprint 15 - Jornadas operacionais ponta a ponta

Objetivo:
- fechar os fluxos mais importantes do produto com UX e regras prontas para operacao real.

Entregas principais:
- `S15-01` Contratos: lista, cadastro, edicao, auditoria, vencimentos, reajustes e documentos.
- `S15-02` Faturas: filtros, exportacao, pagamento, historico e consistencia financeira.
- `S15-03` Cadastros por tipo e gestao de unidades com fluxo operacional coerente.
- `S15-04` Consumo, alertas e relatorios com acoes e indicadores realmente utilizaveis.
- `S15-05` Refinar diferencas de experiencia por perfil `admin`, `sindico` e `morador`.

Criterios de aceite:
- jornadas principais podem ser executadas sem quebra manual de fluxo;
- filtros, ordenacao, exportacao e acoes persistem corretamente;
- modulo por modulo possui checklist de aceite funcional;
- cobertura de regressao dos fluxos principais publicada.

## Sprint 16 - IA operacional, contexto e confiabilidade

Objetivo:
- elevar o CondoGuard.AI de chat utilitario para copiloto operacional confiavel.

Entregas principais:
- `S16-01` Consolidar roteamento de intents e agentes por dominio.
- `S16-02` Formalizar gerenciamento de contexto por tenant, modulo e periodo.
- `S16-03` Exibir fontes, confianca, limitacoes e guardrails em respostas relevantes.
- `S16-04` Evoluir base de conhecimento, indexacao e governanca de conteudo.
- `S16-05` Criar respostas assistidas por acao, resumo e recomendacao operacional.

Criterios de aceite:
- respostas usam contexto rastreavel do condominio;
- limites e bloqueios aparecem de forma transparente quando necessario;
- eventos de qualidade e feedback podem ser acompanhados operacionalmente;
- chat passa a suportar casos reais de administracao condominial com previsibilidade.

## Sprint 17 - Observabilidade, testes e gates de release

Objetivo:
- blindar a plataforma para rollout controlado.

Entregas principais:
- `S17-01` Expandir metricas, logs estruturados e alertas por modulo, rota e integracao.
- `S17-02` Publicar catalogo de erro, taxonomia de eventos e consulta auditavel.
- `S17-03` Completar suites criticas: unit, integration, contract, E2E, smoke Oracle e smoke de seguranca.
- `S17-04` Consolidar pipeline CI/CD com gates de cobertura, E2E, data quality e observabilidade.
- `S17-05` Executar drill de rollback e validacao de runbooks.

Criterios de aceite:
- pipeline bloqueia regressao funcional e arquitetural;
- flakiness de E2E fica mapeada e controlada;
- runbooks de incidente e rollback sao executaveis;
- status de release pode ser decidido por evidencias e nao por percepcao.

## Sprint 18 - Go-live assistido, handoff e expansao

Objetivo:
- levar o sistema completo para operacao real com risco controlado.

Entregas principais:
- `S18-01` Espelhar homolog com producao nos itens criticos.
- `S18-02` Executar rollout piloto em condominios selecionados.
- `S18-03` Treinar administradores, sindicos e time interno de suporte.
- `S18-04` Monitorar janela assistida de operacao e registrar incidentes/aprendizados.
- `S18-05` Publicar plano de expansao pos-piloto e backlog de melhoria continua.

Criterios de aceite:
- piloto ocorre sem incidente critico sem contorno;
- equipe operacional consegue seguir runbooks sem dependencia do time de desenvolvimento;
- backlog pos-go-live fica priorizado por impacto real;
- aceite executivo registrado para proxima onda de implantacao.

## 6. Caminho critico para go-live

Os diagramas deixam claro que o go-live depende de um pequeno conjunto de gates estruturais.

Gates obrigatorios:
- identidade real fechada com OIDC/JWKS;
- tenant isolation validado ponta a ponta;
- Oracle e Flyway operando como fonte oficial em `hml/prod`;
- camada MART e fallback formalizados para leitura de backend;
- data quality com relatorio e bloqueio de falha;
- observabilidade com `trace_id`, logs, health e alertas;
- cobertura de smoke e E2E para rotas/jornadas criticas;
- runbooks, rollback e handoff testados antes do piloto.

Sem esses gates, qualquer melhoria visual ou funcional corre risco de virar debito operacional no momento da implantacao.

## 7. Artefatos minimos exigidos por sprint

Para manter consistencia com o historico do projeto, cada sprint nova deve gerar:
- execution board;
- checklist de fechamento;
- smoke report ou relatorio tecnico de validacao;
- atualizacao de runbook ou documento operacional afetado;
- registro claro de suites executadas e resultado PASS/FAIL.

## 8. Ordem recomendada de execucao imediata

1. Congelar este documento como referencia arquitetural pos-Sprint 10.
2. Abrir `Sprint 11` com board executivo focado em OIDC, tenancy e `trace_id`.
3. Definir donos por trilha: frontend, backend, dados, IA e operacao.
4. Criar mapa de modulos por persona (`admin`, `sindico`, `morador`) para guiar Sprint 14 e Sprint 15.
5. Usar este plano como base para gerar os proximos boards e checklists.

## 9. Recomendacao de uso deste plano

Este planejamento deve ser lido em conjunto com:
- `docs/product_backlog_sprints.md`
- `docs/sprints_status_master.md`
- `docs/data_roadmap.md`
- `docs/testing_strategy.md`

Recomendacao pratica:
- `product_backlog_sprints.md` continua como backlog executivo;
- este documento passa a ser a referencia de arquitetura e fases para as sprints 11 a 18;
- cada sprint ganha depois seu board operacional proprio.

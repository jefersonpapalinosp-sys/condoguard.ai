# Plano de Sprints e Backlog (CondoGuard.AI)

Data de referencia: 3 de abril de 2026  
Cadencia sugerida: sprints de 2 semanas

## Cronograma sugerido

- Sprint 1: 24 de marco a 4 de abril de 2026 (concluida)
- Sprint 2: 6 a 17 de abril de 2026
- Sprint 3: 20 de abril a 1 de maio de 2026
- Sprint 4: 4 a 15 de maio de 2026
- Sprint 5: 18 a 29 de maio de 2026
- Sprint 6: 1 a 12 de junho de 2026
- Sprint 7: 15 a 26 de junho de 2026
- Sprint 8: 29 de junho a 10 de julho de 2026
- Sprint 9: 13 a 24 de julho de 2026
- Sprint 10: 27 de julho a 7 de agosto de 2026
- Sprint 11: 10 a 21 de agosto de 2026
- Sprint 12: 24 de agosto a 4 de setembro de 2026
- Sprint 13: 7 a 18 de setembro de 2026
- Sprint 14: 21 de setembro a 2 de outubro de 2026
- Sprint 15: 5 a 16 de outubro de 2026
- Sprint 16: 19 a 30 de outubro de 2026
- Sprint 17: 2 a 13 de novembro de 2026
- Sprint 18: 16 a 27 de novembro de 2026

Expansao arquitetural apos a Sprint 10:
- consultar `docs/planejamento_fases_sprints_11_18.md` para a visao por fases e novas sprints do sistema completo.

## Sprint 1 - Fundacao (concluida)

Objetivo: entregar base funcional do produto para iniciar Oracle real e evolucao de seguranca nas sprints seguintes.

Entregas principais:

1. Frontend base com modulos operacionais e navegacao principal.
2. API local com endpoints core e fallback mock.
3. Base SQL inicial e scripts Oracle equivalentes.
4. Estrategia de testes automatizados e suites executaveis.
5. Documentacao operacional inicial (setup Oracle, backlog, board de execucao).

Evidencias:

- `docs/sprint1_execution_board.md`
- `docs/sprint1_closing_checklist.md`

## Sprint 2 - Oracle real e base de producao

Objetivo: conectar API ao Oracle real em homolog, com observabilidade minima e deploy confiavel.

Observacao de escopo:
- Sprint 2 nao inclui fechamento de producao.
- Troca de usuarios demo por provedor real de identidade fica na Sprint 3.
- Corte definitivo de fallback mock em producao fica como gate de go-live (Sprint 7).

1. `S2-01` Configurar ambiente Oracle homolog e segredos da API  
Prioridade: P0 | Estimativa: 3 pts  
Criterio de aceite: `/api/health` retorna `dialect=oracle` e `dbStatus=oracle_pool_ok`.
2. `S2-02` Versionar SQL com Flyway ou Liquibase  
Prioridade: P0 | Estimativa: 5 pts  
Criterio de aceite: scripts `001/002/003` executam em ordem por pipeline.
3. `S2-03` Ajustar fallback para seed apenas em `dev/hml`  
Prioridade: P0 | Estimativa: 3 pts  
Criterio de aceite: ambiente `prod` falha explicitamente se Oracle indisponivel.
4. `S2-04` Health detalhado (pool, latencia, erro resumido)  
Prioridade: P1 | Estimativa: 3 pts  
Criterio de aceite: endpoint de health ampliado com indicadores de conectividade.
5. `S2-05` Smoke de endpoints principais no Oracle  
Prioridade: P0 | Estimativa: 3 pts  
Criterio de aceite: `/api/invoices`, `/api/management/units`, `/api/alerts`, `/api/chat/bootstrap` servindo Oracle.

## Sprint 3 - Seguranca, acesso e multi-condominio

Objetivo: controlar acesso por perfil e isolar dados por condominio.

Observacao de escopo:
- Nesta sprint entra a evolucao de autenticacao para identidade real (substituir usuarios demo/JWT local por provedor corporativo).

1. `S3-01` Autenticacao e identidade (JWT + provedor corporativo)  
Prioridade: P0 | Estimativa: 5 pts  
Criterio de aceite:
- usuarios demo/JWT local removidos do fluxo principal de autenticacao;
- login validado via provedor real de identidade em homolog;
- endpoints protegidos aceitam apenas token valido emitido pelo provedor configurado.
2. `S3-02` Autorizacao por perfil (`sindico`, `admin`, `morador`)  
Prioridade: P0 | Estimativa: 5 pts  
Criterio de aceite: testes cobrindo cenarios permitidos/negados.
3. `S3-03` Escopo `condominium_id` em queries e rotas  
Prioridade: P0 | Estimativa: 5 pts  
Criterio de aceite: usuario nao acessa dados de outro condominio.
4. `S3-04` Rate limit + CORS restritivo + validacao de payload  
Prioridade: P1 | Estimativa: 3 pts  
Criterio de aceite: protecoes ativas e testadas.
5. `S3-05` Auditoria de acoes sensiveis  
Prioridade: P1 | Estimativa: 3 pts  
Criterio de aceite: operacoes criticas geram trilha auditavel.

## Sprint 4 - Modulos de negocio (financeiro, gestao, alertas)

Objetivo: fechar fluxos operacionais fim a fim sem mock.

1. `S4-01` Financeiro com filtros/paginacao/exportacao CSV  
Prioridade: P0 | Estimativa: 5 pts  
Criterio de aceite: listagem filtravel e exportacao funcional.
2. `S4-02` Gestao de unidades com indicadores operacionais  
Prioridade: P0 | Estimativa: 5 pts  
Criterio de aceite: painel com ocupacao, inadimplencia e pendencias.
3. `S4-03` Alertas com severidade, historico e leitura  
Prioridade: P0 | Estimativa: 5 pts  
Criterio de aceite: usuario acompanha ciclo completo do alerta.
4. `S4-04` Padrao unico de API para listagens  
Prioridade: P1 | Estimativa: 3 pts  
Criterio de aceite: formato consistente de filtro, ordenacao e pagina.

## Sprint 5 - IA CondoGuard (assistente)

Objetivo: respostas confiaveis com contexto real do condominio.

1. `S5-01` Catalogo de intents e prompts versionados  
Prioridade: P0 | Estimativa: 3 pts  
Criterio de aceite: intents mapeadas por caso de uso de negocio.
2. `S5-02` Servico de contexto para chat (dados reais)  
Prioridade: P0 | Estimativa: 5 pts  
Criterio de aceite: resposta usa dados atuais do condominio.
3. `S5-03` Guardrails (fonte, confianca, bloqueio de alucinacao)  
Prioridade: P0 | Estimativa: 5 pts  
Criterio de aceite: respostas com transparencia de fonte/limite.
4. `S5-04` Telemetria de qualidade do chat  
Prioridade: P1 | Estimativa: 3 pts  
Criterio de aceite: metricas de erro, fallback e satisfacao registradas.

## Sprint 6 - Qualidade, testes e observabilidade

Objetivo: estabilizar a plataforma para escala e go-live.

1. `S6-01` Testes unitarios de servicos e repositorios criticos  
Prioridade: P0 | Estimativa: 5 pts  
Criterio de aceite: cobertura minima definida e atingida.
2. `S6-02` Testes de integracao API + Oracle no CI  
Prioridade: P0 | Estimativa: 5 pts  
Criterio de aceite: pipeline bloqueia merge com regressao.
3. `S6-03` Testes E2E das jornadas principais  
Prioridade: P0 | Estimativa: 5 pts  
Criterio de aceite: jornadas chave passando automatizadas.
4. `S6-04` Logs estruturados + metricas + alertas operacionais  
Prioridade: P1 | Estimativa: 3 pts  
Criterio de aceite: alertas de erro/latencia configurados.

## Sprint 7 - Go-live controlado

Objetivo: publicar com risco controlado e plano de resposta.

Observacao de escopo:
- O go-live exige fallback mock desativado em producao e validacao final de identidade real em ambiente produtivo.

1. `S7-01` Homologacao espelhando producao  
Prioridade: P0 | Estimativa: 3 pts  
Criterio de aceite:
- fallback mock desativado em producao;
- identidade real validada em ambiente produtivo;
- comportamento equivalente entre homolog e producao para fluxos criticos.
2. `S7-02` Rollout piloto (1-2 condominios)  
Prioridade: P0 | Estimativa: 5 pts  
Criterio de aceite: operacao real sem incidentes criticos na janela piloto.
3. `S7-03` Runbook e plano de rollback  
Prioridade: P0 | Estimativa: 3 pts  
Criterio de aceite: time consegue executar rollback em simulacao.
4. `S7-04` Treinamento e handoff operacional  
Prioridade: P1 | Estimativa: 3 pts  
Criterio de aceite: equipe treinada e documentacao final assinada.

## Sprint 8 - Eliminacao de dados sinteticos

Objetivo: remover dados sinteticos/hardcoded remanescentes para comportamento Oracle-first.

1. `S8-01` Cadastros Oracle real end-to-end  
Prioridade: P0 | Estimativa: 5 pts  
Criterio de aceite: GET/POST/PATCH de cadastros sem seed invisivel quando fallback desativado.
2. `S8-02` Dashboard sem KPI hardcoded  
Prioridade: P0 | Estimativa: 3 pts  
Criterio de aceite: `monthlySavings` e `currentConsumption` calculados dinamicamente.
3. `S8-03` Management sem dependencia de sintetico  
Prioridade: P0 | Estimativa: 3 pts  
Criterio de aceite: `pendingCount` consistente com fonte real ou indisponibilidade explicita.
4. `S8-04` Settings funcional minima  
Prioridade: P1 | Estimativa: 3 pts  
Criterio de aceite: tela Settings consumindo endpoint real com loading/erro.
5. `S8-05` Politica de fallback por ambiente  
Prioridade: P0 | Estimativa: 3 pts  
Criterio de aceite: fallback mock desativado por padrao em `hml/prod`.
6. `S8-06` Regressao e evidencias  
Prioridade: P0 | Estimativa: 3 pts  
Criterio de aceite: lint + suites + smoke Oracle PASS com relatorio da sprint.

## Sprint 9 - Integracao de faturas de concessionaria (ENEL)

Objetivo: analisar e implementar MVP assistido para ingestao de faturas externas no CondoGuard.

1. `S9-01` Analise tecnica e desenho da solucao  
Prioridade: P0 | Estimativa: 3 pts  
Criterio de aceite: arquitetura, riscos e abordagem recomendada documentados.
2. `S9-02` Modelo de dados de integracao e migracoes  
Prioridade: P0 | Estimativa: 5 pts  
Criterio de aceite: tabelas de execucao/itens e regras de dedupe versionadas em Flyway.
3. `S9-03` Orquestrador backend (MVP assistido)  
Prioridade: P0 | Estimativa: 5 pts  
Criterio de aceite: run manual importa dados sem duplicidade e com trilha de erro por item.
4. `S9-04` Endpoints de operacao e historico  
Prioridade: P0 | Estimativa: 3 pts  
Criterio de aceite: APIs para criar run e consultar historico/detalhes com RBAC.
5. `S9-05` Observabilidade e seguranca  
Prioridade: P1 | Estimativa: 3 pts  
Criterio de aceite: metricas/logs por run e segredos sem hardcode.
6. `S9-06` Testes, smoke e fechamento  
Prioridade: P0 | Estimativa: 3 pts  
Criterio de aceite: testes do parser/endpoints + relatorio final com evidencias.

## Sprint 10 - Cadastros por tipo

Objetivo: criar paginas separadas por tipo de cadastro com navegacao por abas e URL dedicada.

1. `S10-01` Desenho de UX e arquitetura de rotas  
Prioridade: P0 | Estimativa: 3 pts  
Criterio de aceite: mapa oficial `aba/slug/tipo` aprovado e documentado.
2. `S10-02` Router e subrotas por tipo  
Prioridade: P0 | Estimativa: 5 pts  
Criterio de aceite: rotas `/cadastros-gerais` e subrotas por tipo funcionando com fallback de rota invalida.
3. `S10-03` Service/API com filtros dinamicos  
Prioridade: P0 | Estimativa: 3 pts  
Criterio de aceite: listagem por tipo/search/status consumindo query params da API.
4. `S10-04` Componentizacao e padrao visual das abas  
Prioridade: P1 | Estimativa: 3 pts  
Criterio de aceite: tabs no padrao visual esperado, com estado ativo por URL.
5. `S10-05` Testes de regressao do modulo  
Prioridade: P0 | Estimativa: 5 pts  
Criterio de aceite: unit + integration cobrindo navegacao entre abas e fluxos de create/update.
6. `S10-06` Smoke e evidencias finais  
Prioridade: P0 | Estimativa: 3 pts  
Criterio de aceite: lint/test/test:py PASS e relatorio final de sprint publicado.

## Sprint 11 - Identidade real, tenancy e contrato arquitetural

Objetivo: fechar os gates de seguranca e isolamento que sustentam a operacao multi-condominio e os proximos releases.

1. `S11-01` OIDC/JWKS real em homolog  
Prioridade: P0 | Estimativa: 5 pts  
Criterio de aceite: autenticacao validada com token real, `issuer`, `audience` e `JWKS` corretos.
2. `S11-02` Sessao unificada frontend/backend  
Prioridade: P0 | Estimativa: 3 pts  
Criterio de aceite: expiracao, logout e tratamento de `401`/`403` previsiveis em toda a navegacao protegida.
3. `S11-03` Tenant scope end-to-end por `condominio_id`  
Prioridade: P0 | Estimativa: 5 pts  
Criterio de aceite: endpoints, repositories e integracoes negam acesso cross-tenant e registram auditoria adequada.
4. `S11-04` `trace_id` ponta a ponta  
Prioridade: P1 | Estimativa: 3 pts  
Criterio de aceite: request, resposta e logs estruturados expõem `trace_id` consistente para troubleshooting.
5. `S11-05` Smoke de seguranca e tenancy  
Prioridade: P0 | Estimativa: 3 pts  
Criterio de aceite: suite de smoke documentada com PASS para autenticacao, RBAC, tenant isolation e rastreabilidade.

## Sprint 12 - Dados, Flyway, MART e qualidade

Objetivo: oficializar a camada de dados como contrato do produto, usando Flyway, `MART` e data quality como base operacional da plataforma.

1. `S12-01` Consolidar migracoes em Flyway  
Prioridade: P0 | Estimativa: 5 pts  
Criterio de aceite: ambiente novo pode ser bootstrapado por `V001 -> V011` com runbook atualizado.
2. `S12-02` Revisar entidades core para contratos, faturas, integracoes e auditoria  
Prioridade: P1 | Estimativa: 3 pts  
Criterio de aceite: entidades criticas e gaps estruturais mapeados para o backend e para a proxima sprint.
3. `S12-03` Formalizar camada `MART` para modulos criticos  
Prioridade: P0 | Estimativa: 5 pts  
Criterio de aceite: views consumidas pela API documentadas como contrato de leitura.
4. `S12-04` Implementar gate automatizado de data quality  
Prioridade: P0 | Estimativa: 3 pts  
Criterio de aceite: comando oficial retorna `PASS/FAIL` a partir do relatorio JSON versionado.
5. `S12-05` Atualizar runbook, checklist Oracle e data dictionary  
Prioridade: P0 | Estimativa: 3 pts  
Criterio de aceite: documentacao operacional alinhada ao estado real da base.

## Definicao de pronto (DoD) para todas as sprints

- Code review concluido.
- Testes automatizados da mudanca executados.
- Documentacao atualizada.
- Checklist de deploy/rollback atualizado.
- Monitoramento e logs revisados para a feature.

## Dependencias e riscos

1. Ambiente Oracle homolog/producao disponivel dentro da Sprint 2.
2. Definicao de perfis e regras de acesso antes da Sprint 3.
3. Fonte de dados confiavel para IA antes da Sprint 5.
4. Capacidade do time para automatizacao de testes nas Sprints 6 e 7.

## Primeiro recorte de execucao (proximos 5 dias uteis)

1. Escolher ferramenta de migracao (`Flyway` recomendado pela simplicidade inicial).
2. Quebrar Sprint 2 em issues tecnicas no board (ID `S2-01` a `S2-05`).
3. Preparar pipeline de migration em homolog.
4. Rodar smoke Oracle completo apos migracoes.
5. Registrar baseline de performance (latencia dos endpoints principais).
6. Preparar quebra tecnica da Sprint 3 (cards `S3-01` a `S3-03`) no board: `docs/sprint3_execution_board.md`.

# Plano de Sprints e Backlog (CondoGuard.AI)

Data de referencia: 3 de abril de 2026  
Cadencia sugerida: sprints de 2 semanas

## Cronograma sugerido

- Sprint 2: 6 a 17 de abril de 2026
- Sprint 3: 20 de abril a 1 de maio de 2026
- Sprint 4: 4 a 15 de maio de 2026
- Sprint 5: 18 a 29 de maio de 2026
- Sprint 6: 1 a 12 de junho de 2026
- Sprint 7: 15 a 26 de junho de 2026

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

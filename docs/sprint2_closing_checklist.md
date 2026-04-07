# Sprint 2 - Checklist de Fechamento

Data de referencia: 4 de abril de 2026  
Objetivo: concluir os itens pendentes da Sprint 2 com evidencias tecnicas.

## Resumo do status atual

1. `S2-01` Oracle homolog e segredos: **Parcial**
2. `S2-02` Migracoes Flyway/Liquibase: **Em progresso**
3. `S2-03` Fallback seed so em `dev/hml`: **Implementado (pendente validacao em homolog)**
4. `S2-04` Health detalhado: **Implementado (pendente validacao em homolog)**
5. `S2-05` Smoke endpoints Oracle real: **Parcial**

## Checklist executavel por card

## `S2-01` Configurar Oracle homolog e segredos da API (P0)

Status: **Parcial**

- [ ] Confirmar credenciais reais no ambiente homolog (`ORACLE_USER`, `ORACLE_PASSWORD`, `ORACLE_CONNECT_STRING`).
- [ ] Validar conectividade de rede da API para o Oracle homolog.
- [ ] Rodar API em modo Oracle (`npm run api:dev:oracle` em homolog).
- [ ] Registrar evidencia do health com `dialect=oracle` e `dbStatus=oracle_pool_ok`.

Evidencia obrigatoria:
- JSON do endpoint `/api/health` com timestamp e ambiente homolog.

## `S2-02` Versionar SQL com Flyway ou Liquibase (P0)

Status: **Em progresso**

- [x] Definir ferramenta oficial (`Flyway` recomendado no backlog).
- [x] Criar estrutura de migration versionada (`001`, `002`, `003`) para Oracle.
- [x] Criar pipeline de execucao automatica em homolog.
- [ ] Validar execucao em ordem e idempotencia controlada.
- [x] Documentar runbook de migration.

Evidencia obrigatoria:
- Log de pipeline executando `001 -> 002 -> 003` sem erro.

## `S2-03` Ajustar fallback para seed apenas em `dev/hml` (P0)

Status: **Implementado (pendente validacao em homolog)**

- [x] Introduzir controle explicito por ambiente (`APP_ENV` ou equivalente).
- [x] Permitir fallback seed apenas em `dev/hml`.
- [x] Em `prod`, retornar erro explicito quando Oracle estiver indisponivel.
- [x] Ajustar logs para diagnostico rapido sem expor segredos.

Evidencia obrigatoria:
- Teste em ambiente `prod` simulado mostrando falha explicita sem seed.
- Teste em `dev/hml` mostrando fallback ativo.

## `S2-04` Health detalhado (P1)

Status: **Implementado (pendente validacao em homolog)**

- [x] Incluir latencia de verificacao do banco no payload do health.
- [x] Incluir estado do pool Oracle (ativo/inativo).
- [x] Incluir erro resumido quando houver falha (sem segredo).
- [x] Manter compatibilidade com consumidores atuais.

Evidencia obrigatoria:
- Payload de `/api/health` contendo campos de latencia/pool/erro resumido.

## `S2-05` Smoke de endpoints principais no Oracle (P0)

Status: **Parcial**

- [ ] Executar smoke real em homolog Oracle:
- [ ] `/api/invoices`
- [ ] `/api/management/units`
- [ ] `/api/alerts`
- [ ] `/api/chat/bootstrap`
- [ ] Registrar status HTTP e latencia baseline.
- [x] Criar relatorio de smoke versionado em `docs/sprint2_oracle_smoke_report.md`.

Evidencia obrigatoria:
- Relatorio de smoke versionado em `docs/` com data/hora/ambiente.

## Ordem recomendada de conclusao

1. Concluir `S2-01`.
2. Implementar `S2-02`.
3. Implementar `S2-03`.
4. Executar `S2-05`.
5. Fechar `S2-04` (P1) e validar compatibilidade.

## Definicao de encerramento da Sprint 2

- Todos os P0 (`S2-01`, `S2-02`, `S2-03`, `S2-05`) com status `Done`.
- `S2-04` concluido ou replanejado formalmente com risco aceito.
- Evidencias anexadas por card.
- Sem dependencia critica aberta para iniciar Sprint 3.

## Atualizacao rapida (04-APR-2026)

- [x] `S2-01`: `/api/health` validado com `dialect=oracle` e `dbStatus=oracle_pool_ok`.
- [x] `S2-04`: health detalhado validado (`poolStatus`, `latencyMs`, `errorSummary`).
- [x] Fluxo de autenticacao validado (`/api/auth/login` gera token).
- [x] Endpoints protegidos validam auth (`401 AUTH_REQUIRED` sem token).
- [x] Smoke autenticado executado nos endpoints principais (`200` com token).
- [x] Fechamento final de `S2-05`: smoke repetido com `ALLOW_ORACLE_SEED_FALLBACK=false`.

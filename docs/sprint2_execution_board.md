# Sprint 2 - Board de Execucao (Oracle real)

Janela da sprint: 6 a 17 de abril de 2026  
Objetivo: conectar Oracle real em homolog e estabilizar deploy/health dos endpoints core.

Fora de escopo da Sprint 2:
- Nao esta na Sprint 2: substituir usuarios demo por provedor real de identidade (entra na Sprint 3, card `S3-01`).
- Nao esta na Sprint 2: encerrar fallback mock em producao (gate de go-live na Sprint 7, card `S7-01`).

## Capacidade e prioridade

- Total estimado: 17 pontos
- Escopo P0: `S2-01`, `S2-02`, `S2-03`, `S2-05`
- Escopo P1: `S2-04`
- Regra: so puxar P1 quando todos os P0 estiverem em `Done`.

## Board (Kanban)

### To Do

1. `S2-01` Configurar Oracle homolog e segredos da API (3 pts, P0)  
Owner sugerido: Backend/DevOps  
Dependencias: acesso ao banco homolog, credenciais validas  
Checklist tecnico:
- Definir `ORACLE_USER`, `ORACLE_PASSWORD`, `ORACLE_CONNECT_STRING` no ambiente homolog.
- Validar porta/rede e rota da API para o Oracle.
- Rodar API com `npm run api:dev:oracle` em homolog.
- Confirmar `/api/health` com `dbStatus=oracle_pool_ok`.
DoD do card:
- Evidencia de health anexada (JSON + timestamp).
- Segredos fora do repositorio (somente no ambiente).

2. `S2-02` Versionar SQL com Flyway (5 pts, P0)  
Owner sugerido: Dados/Backend  
Dependencias: decisao oficial da ferramenta (Flyway)  
Checklist tecnico:
- Criar pasta de migracoes versionadas (`V001`, `V002`, `V003`) a partir dos scripts atuais.
- Padronizar ordem de execucao para schema e views.
- Criar comando/pipeline de migration em homolog.
- Registrar passo a passo em doc operacional.
DoD do card:
- Pipeline executa migracoes sem intervencao manual.
- Banco homolog recriado do zero com sucesso.

3. `S2-03` Fallback seed apenas em `dev/hml` (3 pts, P0)  
Owner sugerido: Backend  
Dependencias: `S2-01`  
Checklist tecnico:
- Definir variavel de ambiente de runtime (`APP_ENV` ou equivalente).
- Permitir fallback seed apenas fora de producao.
- Em producao, retornar erro controlado se Oracle indisponivel.
- Ajustar mensagens de log para diagnostico rapido.
DoD do card:
- Teste em `prod` simulado confirma falha explicita sem seed.
- Teste em `dev`/`hml` confirma fallback ativo.

4. `S2-05` Smoke dos endpoints core no Oracle (3 pts, P0)  
Owner sugerido: QA/Backend  
Dependencias: `S2-01`, `S2-02`  
Checklist tecnico:
- Executar smoke em `/api/invoices`.
- Executar smoke em `/api/management/units`.
- Executar smoke em `/api/alerts`.
- Executar smoke em `/api/chat/bootstrap`.
- Registrar latencia baseline e status HTTP.
DoD do card:
- Todos endpoints com HTTP 200 em homolog.
- Relatorio simples de smoke versionado em `docs/`.

5. `S2-04` Health detalhado (pool, latencia, erro resumido) (3 pts, P1)  
Owner sugerido: Backend  
Dependencias: `S2-01`  
Checklist tecnico:
- Expandir payload de health com tempo de resposta Oracle.
- Incluir status do pool (ativo/inativo).
- Incluir causa resumida em caso de erro (sem expor segredos).
- Manter compatibilidade com consumidores atuais.
DoD do card:
- Endpoint documentado e validado por teste manual.
- Sem quebra dos clientes frontend.

### Doing

- Mover para `Doing` no maximo 2 cards simultaneos.
- Ordem recomendada de execucao: `S2-01` -> `S2-02` -> `S2-03` -> `S2-05` -> `S2-04`.

### Done

- Card so entra em `Done` com evidencia tecnica anexada (print/log/JSON).
- Todos os itens de checklist do card devem estar marcados.

## Plano diario (10 dias uteis)

1. Dia 1: iniciar `S2-01` (credenciais, rede, health Oracle).
2. Dia 2: finalizar `S2-01` e iniciar `S2-02` (estrutura Flyway).
3. Dia 3: continuar `S2-02` (pipeline homolog).
4. Dia 4: finalizar `S2-02` com teste de recriacao.
5. Dia 5: iniciar e concluir `S2-03`.
6. Dia 6: iniciar `S2-05` (smoke endpoints).
7. Dia 7: concluir `S2-05` + baseline de latencia.
8. Dia 8: iniciar `S2-04` (health detalhado).
9. Dia 9: concluir `S2-04` e validar compatibilidade.
10. Dia 10: buffer de riscos + fechamento da sprint.

## Riscos e mitigacao (Sprint 2)

1. Credencial Oracle atrasada.  
Mitigacao: solicitar no Dia 1 com SLA interno e dono definido.
2. Divergencia de schema entre scripts e banco real.  
Mitigacao: validacao de migration em banco limpo antes de smoke.
3. Regressao por remover fallback em prod.  
Mitigacao: feature flag por ambiente + teste de erro controlado.

## Criterio de encerramento da Sprint 2

- `S2-01`, `S2-02`, `S2-03`, `S2-05` em `Done`.
- Health Oracle operacional em homolog com `oracle_pool_ok`.
- Evidencias da sprint registradas em docs (smoke + health + migration).

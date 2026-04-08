# Sprint 11 - Cronograma, Prioridades e Responsaveis

Data de referencia: 8 de abril de 2026  
Janela planejada da sprint: 10 a 21 de agosto de 2026

Observacao:
- os responsaveis abaixo sao sugeridos por trilha funcional;
- os nomes finais podem ser preenchidos depois, sem alterar o plano;
- a prioridade operacional desta sprint e `seguranca + tenancy + rastreabilidade`.

## Trilhas e donos sugeridos

| Trilha | Dono sugerido | Responsabilidade principal |
| --- | --- | --- |
| Backend/Auth | Engenharia Backend | OIDC, JWKS, claims, RBAC, `require_auth` |
| Frontend/Auth | Engenharia Frontend | sessao, expiracao, logout, UX protegida |
| Backend/Core + Dados | Backend + Dados | `condominio_id`, repositories, integracoes |
| Platform/Observability | Backend Platform | `trace_id`, logs, padrao de resposta |
| QA/Automation | QA/Engenharia | smoke, regressao, evidencias |
| DevOps/Operacao | Operacoes/Infra | ambiente homolog, segredos, acesso ao IdP |
| Produto/Arquitetura | Produto + Lideranca tecnica | aceite funcional, priorizacao, desbloqueios |

## Priorizacao da sprint

### Prioridade `P0`

- `S11-01` OIDC/JWKS real em homolog
- `S11-02` Sessao unificada frontend/backend
- `S11-03` Tenant scope end-to-end por `condominio_id`
- `S11-05` Smoke de seguranca e tenancy

### Prioridade `P1`

- `S11-04` `trace_id` ponta a ponta

## Cronograma recomendado

| Janela | Card | Dono sugerido | Entrega esperada |
| --- | --- | --- | --- |
| Dia 1 | `S11-01` | Backend/Auth + DevOps | ambiente validado, claims confirmados, token real disponivel |
| Dia 2-3 | `S11-01` | Backend/Auth | autenticacao real funcionando e cenarios negativos validados |
| Dia 3-4 | `S11-02` | Frontend/Auth | expiracao e logout previsiveis no cliente |
| Dia 4-6 | `S11-03` | Backend/Core + Dados | tenant scope revisado em rotas, repositories e integracoes |
| Dia 6-7 | `S11-04` | Platform/Observability | `trace_id` em resposta e logs estruturados |
| Dia 8-9 | `S11-05` | QA/Automation + Backend | smoke executado, gaps corrigidos e relatorio publicado |
| Dia 10 | Fechamento | Todos os donos | checklist final, handoff e prontidao para Sprint 12 |

## Dependencias por trilha

| Trilha bloqueia | Impacto |
| --- | --- |
| DevOps/Operacao -> Backend/Auth | sem segredos/IdP, `S11-01` nao fecha |
| Backend/Auth -> Frontend/Auth | sem token real consistente, sessao do cliente fica incompleta |
| Backend/Auth -> Backend/Core + Dados | tenant real do token precisa estar validado antes do smoke |
| Platform/Observability -> QA | sem `trace_id`, troubleshooting do smoke fica lento |
| QA -> Produto/Arquitetura | sem evidencias, a sprint nao fecha com seguranca |

## Checklist diario sugerido

- validar impedimentos de ambiente e credenciais;
- confirmar cards em caminho critico;
- revisar se o que foi implementado esta gerando evidencia;
- congelar riscos remanescentes antes de encerrar o dia;
- registrar decisao tecnica relevante em `docs/`.

## Criterio de sucesso do cronograma

- `S11-01` fechado ate metade da sprint;
- `S11-03` sem risco estrutural aberto no fechamento tecnico;
- `S11-05` executado com relatorio versionado antes do ultimo dia;
- Sprint 12 inicia sem reabrir gate de identidade e tenancy.

# Sprint 12 - Cronograma, Prioridades e Responsaveis

Data de referencia: 8 de abril de 2026  
Janela planejada da sprint: 24 de agosto a 4 de setembro de 2026

Observacao:
- os responsaveis abaixo sao sugeridos por trilha funcional;
- os nomes finais podem ser preenchidos depois;
- a prioridade operacional desta sprint e `dados + governanca + contrato de leitura`.

## Trilhas e donos sugeridos

| Trilha | Dono sugerido | Responsabilidade principal |
| --- | --- | --- |
| Dados/DBA | Engenharia de Dados | Flyway, schema Oracle, views, massa controlada |
| Backend/Core | Engenharia Backend | consumo de `MART`, entidades core, fallback |
| QA/Automation | QA/Engenharia | gate de data quality, reproducao local, CI futuro |
| Operacao/Infra | Operacoes/Infra | ambiente homolog/prod, execucao de migracoes |
| Arquitetura/Produto | Lideranca tecnica + Produto | aceite estrutural e priorizacao de gaps |

## Priorizacao da sprint

### Prioridade `P0`

- `S12-01` Consolidar migracoes em Flyway
- `S12-03` Formalizar camada MART
- `S12-04` Gate automatizado de data quality
- `S12-05` Atualizar documentacao operacional da base

### Prioridade `P1`

- `S12-02` Revisar entidades core

## Cronograma recomendado

| Janela | Card | Dono sugerido | Entrega esperada |
| --- | --- | --- | --- |
| Dia 1-2 | `S12-01` | Dados/DBA + Backend | inventario Flyway consolidado e runbook atualizado |
| Dia 2-4 | `S12-03` | Backend/Core + Dados | contrato `MART` documentado com consumidores reais |
| Dia 4-5 | `S12-04` | QA/Automation + Dados | gate de data quality publicado e validado |
| Dia 5-7 | `S12-05` | Arquitetura + Operacao | checklist Oracle, dicionario e documentacao sincronizados |
| Dia 7-9 | `S12-02` | Backend/Core + Dados | gaps de entidades core revisados e priorizados |
| Dia 10 | Fechamento | Todos os donos | evidencias, riscos remanescentes e handoff para Sprint 13 |

## Dependencias por trilha

| Trilha bloqueia | Impacto |
| --- | --- |
| Dados/DBA -> Backend/Core | sem versoes/migracoes claras, contrato de leitura fica fraco |
| Backend/Core -> QA/Automation | gate e evidencias perdem contexto sem saber o que a API consome |
| QA/Automation -> Arquitetura | sem gate objetivo, nao ha criterio forte de fechamento |
| Operacao/Infra -> Dados/DBA | sem ambiente acessivel, runbook nao e validado na pratica |

## Checklist diario sugerido

- revisar se novas mudancas de schema entram por Flyway;
- confirmar se `MART` continua refletindo o que o backend le;
- executar o gate de data quality ao menos em modo diagnostico;
- registrar risco estrutural e divergencia documental no mesmo dia;
- manter backlog de gaps preparado para Sprint 13.

## Criterio de sucesso do cronograma

- runbook e checklist operacionais atualizados ate a metade da sprint;
- gate de qualidade ativo antes do fechamento tecnico;
- `MART` tratado como contrato de leitura no handoff;
- Sprint 13 inicia com menos dependencia de conhecimento informal da base.

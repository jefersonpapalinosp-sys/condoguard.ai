# S12-03 - Formalizar camada MART como contrato de leitura

## Contexto

Objetivo da Sprint 12: explicitar a camada `MART` como contrato de leitura do backend e reduzir acoplamento direto com o modelo transacional.

Card: `S12-03`  
Prioridade: `P0`  
Estimativa: `5 pts`

## Criterio de aceite

- views `MART` consumidas pela API ficam documentadas;
- fallbacks relevantes ficam explicitos;
- dependencias entre repositories e views sao conhecidas.

## Escopo tecnico

- revisar `V002`, `V006` e `V008`;
- mapear consumidores reais em repositories e services;
- atualizar a documentacao do contrato de leitura.

## Arquivos provaveis

- `database/flyway/sql/V002__marts_views.sql`
- `database/flyway/sql/V006__contracts_view.sql`
- `database/flyway/sql/V008__contracts_view_finalize.sql`
- `backend/app/repositories/`
- `backend/app/services/chat_context_service.py`
- `docs/data_dictionary.md`

## Checklist de implementacao

- [x] Confirmar views `MART` consumidas hoje.
- [x] Atualizar documentacao com as views oficiais atuais.
- [ ] Revisar fallback de `vw_contracts`.
- [ ] Identificar oportunidades de novas views para Sprint 13.

## Evidencias obrigatorias

- [ ] lista oficial de views e consumidores;
- [ ] observacoes de fallback e risco documentadas;
- [ ] referencia ao runbook/dicionario atualizado.

## Dependencias

- `S12-01`.

## Definicao de pronto (DoD do card)

- criterio de aceite atendido;
- contrato de leitura `MART` entendido pelo time;
- menos risco de regressao estrutural em repository.

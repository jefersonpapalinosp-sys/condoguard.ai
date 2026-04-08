# S12-04 - Implementar gate automatizado de data quality

## Contexto

Objetivo da Sprint 12: fazer o relatorio JSON de qualidade bloquear o fechamento tecnico quando existirem inconsistencias abertas.

Card: `S12-04`  
Prioridade: `P0`  
Estimativa: `3 pts`

## Criterio de aceite

- existe um comando oficial para validar o relatorio JSON;
- o gate retorna `PASS` sem issues e `FAIL` com inconsistencias;
- a saida do comando e legivel para dados, backend e QA.

## Escopo tecnico

- criar o script do gate;
- adicionar script no `package.json`;
- validar a logica com teste unitario;
- documentar como usar em modo estrito e diagnostico.

## Arquivos provaveis

- `scripts/db/data-quality-gate.mjs`
- `package.json`
- `tests/unit/scripts/dataQualityGate.test.ts`
- `database/reports/data_quality_report.json`

## Checklist de implementacao

- [x] Criar sumarizador para numeros, listas e dominios.
- [x] Publicar CLI com `--report` e `--warn-only`.
- [x] Adicionar comando oficial em `package.json`.
- [x] Cobrir casos basicos com teste unitario.
- [x] Publicar baseline diagnostica no CI em modo `warn-only`.
- [ ] Integrar ao CI futuro.

## Evidencias obrigatorias

- [ ] execucao local do gate em modo estrito;
- [ ] execucao do gate em modo diagnostico;
- [ ] referencia no board/checklist da sprint.

## Dependencias

- relatorio JSON versionado em `database/reports/`.

## Definicao de pronto (DoD do card)

- criterio de aceite atendido;
- gate reproduzivel por qualquer pessoa do time;
- pronto para ser incorporado ao pipeline.

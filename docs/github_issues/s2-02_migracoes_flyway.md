# S2-02 - Versionar SQL com Flyway

## Contexto

Objetivo da Sprint 2: padronizar execucao de schema e objetos Oracle por versionamento.

Card: `S2-02`  
Prioridade: `P0`  
Estimativa: `5 pts`

## Criterio de aceite

- Scripts `001/002/003` executam em ordem por pipeline.

## Escopo tecnico

- Adotar Flyway como ferramenta de migration.
- Estruturar migracoes versionadas para:
  - schema base;
  - views/marts;
  - testes/validacoes de qualidade.
- Integrar execucao das migracoes no pipeline de homolog.
- Documentar processo operacional.

## Checklist de implementacao

- [ ] Criar estrutura de diretorios para migracoes Flyway.
- [ ] Converter scripts atuais para versoes Flyway (`V001`, `V002`, `V003`).
- [ ] Configurar comando de migration no pipeline homolog.
- [ ] Garantir execucao ordenada e idempotente.
- [ ] Validar recriacao de banco limpo via pipeline.
- [ ] Atualizar documentacao operacional.

## Evidencias obrigatorias

- [ ] Log de pipeline com execucao `V001 -> V002 -> V003`.
- [ ] Evidencia de sucesso em banco limpo.
- [ ] Link para documentacao atualizada.

## Dependencias

- `S2-01` concluido (Oracle homolog operacional).

## Definicao de pronto (DoD do card)

- Criterio de aceite atendido em homolog.
- Pipeline executa migracoes sem intervencao manual.
- Documentacao atualizada.

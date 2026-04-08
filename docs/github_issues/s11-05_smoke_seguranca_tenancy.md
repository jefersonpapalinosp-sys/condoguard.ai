# S11-05 - Smoke de seguranca e tenancy

## Contexto

Objetivo da Sprint 11: consolidar um gate reproduzivel que comprove autenticacao, RBAC, tenant isolation e rastreabilidade antes da Sprint 12.

Card: `S11-05`  
Prioridade: `P0`  
Estimativa: `3 pts`

## Criterio de aceite

- existe um smoke reproduzivel cobrindo cenarios positivos e negativos;
- o relatorio final mostra autenticacao, autorizacao, tenant scope e `trace_id`;
- as evidencias permitem repetir o gate sem dependencia de conhecimento tacito.

## Escopo tecnico

- consolidar comandos e scripts necessarios;
- registrar premissas de ambiente;
- incluir cenarios `PASS` e `DENY`;
- publicar relatorio final em markdown.

## Arquivos provaveis

- `tests/`
- `backend/tests/`
- `scripts/`
- `docs/`
- configuracoes de CI relevantes

## Checklist de implementacao

- [ ] Definir cenarios minimos do smoke.
- [ ] Executar autenticacao real com token valido.
- [ ] Executar cenarios de role negada e tenant negado.
- [ ] Validar presenca de `trace_id` ou correlacao equivalente.
- [ ] Publicar relatorio final com PASS/FAIL e riscos remanescentes.

## Evidencias obrigatorias

- [ ] comandos executados;
- [ ] resultado por cenario;
- [ ] data, ambiente e premissas;
- [ ] riscos ou pendencias que sobram para Sprint 12.

## Dependencias

- `S11-01`, `S11-02`, `S11-03` e `S11-04` fechados ou estaveis.

## Definicao de pronto (DoD do card)

- criterio de aceite atendido;
- relatorio versionado em `docs/`;
- sprint apta a ser encerrada com evidencias reutilizaveis.

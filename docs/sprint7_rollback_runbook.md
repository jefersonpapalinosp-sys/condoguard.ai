# Sprint 7 - Runbook de Rollback Tecnico e de Dados (S7-03)

Data de referencia: 6 de abril de 2026

Objetivo: padronizar rollback em incidente critico com passos executaveis e evidencias.

## 1) Quando acionar rollback

Acionar rollback quando houver pelo menos um dos cenarios:

1. indisponibilidade critica sustentada acima do SLA interno;
2. falha de autenticacao/autorizacao sem mitigacao rapida;
3. regressao funcional em fluxo core (financeiro/alertas/chat/observabilidade);
4. risco de integridade de dados ou vazamento de tenant.

## 2) Responsaveis (on-call)

- Decision owner (go/no-go de rollback): _preencher_
- Executor tecnico backend: _preencher_
- Executor banco/dados: _preencher_
- Comunicacao com negocio: _preencher_

## 3) Rollback tecnico (aplicacao)

1. Congelar mudancas:
   - bloquear novos deploys temporariamente.
2. Redirecionar para versao estavel:
   - checkout/release tag aprovada anteriormente.
3. Reiniciar servicos da versao estavel.
4. Confirmar health:
   - `/api/health` com `dialect=oracle` e `dbStatus=oracle_pool_ok`.
5. Validar fluxo minimo:
   - login
   - `/api/invoices`
   - `/api/alerts`
   - `/api/chat/message`
   - `/api/observability/metrics`

Comando de validacao tecnica:

```powershell
npm.cmd run release:s7:rollback-drill
```

## 4) Rollback de dados (quando aplicavel)

1. Identificar versao de schema aplicada no incidente.
2. Aplicar estrategia de reversao aprovada:
   - rollback por migration reversa (quando existir), ou
   - restauracao de backup/snapshot validado.
3. Rodar checagens de consistencia:
   - contagem basica por tabela critica,
   - validacao de tenant isolation por amostragem.
4. Registrar diferencas detectadas e resolvidas.

Observacao:
- Evitar rollback destrutivo sem snapshot/backup confirmado.
- Toda acao de dados deve ser auditada com timestamp e responsavel.

## 5) Evidencias obrigatorias apos rollback

1. `docs/sprint7_rollback_drill_report.md` atualizado.
2. Registro de timeline:
   - inicio incidente
   - inicio rollback
   - recuperacao
3. RTO observado (segundos/minutos).
4. RPO observado (perda de dados aceitavel/real).
5. Decisao final (Go/No-Go) assinada pelos responsaveis.

## 6) Comunicacao minima

1. Aviso de incidente aberto.
2. Aviso de rollback iniciado.
3. Aviso de servico recuperado.
4. Post-mortem inicial em ate 24h.

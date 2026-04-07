# Sprint 5 - Closing Checklist (IA CondoGuard)

Data de referencia: 5 de abril de 2026

## Escopo planejado

- [x] `S5-01` Catalogo de intents e prompts versionados.
- [x] `S5-02` Servico de contexto para chat com dados reais por condominio.
- [x] `S5-03` Guardrails de confianca/fonte/bloqueio de alucinacao.
- [x] `S5-04` Telemetria de qualidade (erro, fallback, satisfacao).

## Evidencias tecnicas

- [x] Endpoint `GET /api/chat/intents` funcional.
- [x] Endpoint `GET /api/chat/context` funcional.
- [x] Endpoint `POST /api/chat/message` com `guardrails`, `confidence`, `sources`, `limitations`.
- [x] Endpoint `POST /api/chat/feedback` funcional.
- [x] Endpoint `GET /api/chat/telemetry` funcional (admin/sindico).
- [x] Tela `/chat` com painel de telemetria e timeline filtravel.
- [x] `ChatbotWidget` com envio de feedback de utilidade.

## Qualidade

- [x] `npm.cmd run lint` PASS.
- [x] `npm.cmd run test:api` PASS.
- [x] `npm.cmd run test:integration -- Chat.integration.test.tsx` PASS.

## Pendencias para homolog/producao

- [ ] Validacao final com identidade real (`S3-01`) no fluxo completo.
- [ ] Definir politica de retencao/expurgo da telemetria em ambiente produtivo.
- [ ] Publicar dashboard operacional para time de produto/operacao (consumo de telemetria).

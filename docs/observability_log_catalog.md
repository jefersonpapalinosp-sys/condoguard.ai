# Catalogo de Logs Estruturados (Sprint 6)

Data de referencia: 5 de abril de 2026

Formato base de evento (`[security]`):

- `ts`
- `event`
- `method`
- `path`
- `ip`
- `userAgent`
- `actorSub`
- `actorRole`
- `condominiumId`

## Eventos de autenticacao

- `auth_login_success`
- `auth_login_failed`
- `auth_missing_token`
- `auth_invalid_token_payload`
- `auth_invalid_token_role`
- `auth_token_expired`
- `auth_invalid_oidc_token`
- `auth_invalid_token_signature`
- `auth_invalid_tenant_scope`
- `auth_forbidden_role`

## Eventos de protecao de borda

- `cors_denied`
- `rate_limit_exceeded`
- `api_error_response`

## Eventos de negocio/auditoria

- `invoice_mark_paid`
- `alert_mark_read`
- `chat_feedback_submitted`
- `audit_log_viewed`

## Eventos para observabilidade operacional

- API metrics: `GET /api/observability/metrics`
- API alerts: `GET /api/observability/alerts`
- Fallback server-side por modulo:
  - `invoices` (`oracle_fallback_seed`)
  - `alerts` (`oracle_fallback_seed`)
  - `management` (`oracle_fallback_seed`)
  - `auth` (`oracle_fallback_demo_auth`)

## Uso recomendado

1. Buscar picos de `api_error_response` por `code`.
2. Monitorar `fallbacks.total` e `fallbacks.modules`.
3. Acionar investigacao quando `GET /api/observability/alerts` retornar `hasAlerts=true`.

# Matriz de Ambientes (Sprint 7)

Data de referencia: 6 de abril de 2026

Objetivo: congelar perfil de configuracao por ambiente para reduzir risco de go-live.

## Regras por ambiente

| Variavel | dev | hml | prod |
|---|---|---|---|
| `APP_ENV` | `dev` | `hml` | `prod` |
| `DB_DIALECT` | `mock` ou `oracle` | `oracle` | `oracle` |
| `ALLOW_ORACLE_SEED_FALLBACK` | `true` (permitido) | `false` | `false` |
| `AUTH_PROVIDER` | `local_jwt` ou `oidc_jwks` | `local_jwt` ou `oidc_jwks` | `oidc_jwks` |
| `AUTH_PASSWORD_LOGIN_ENABLED` | `true` (quando local_jwt) | opcional | `false` |
| `OIDC_ISSUER/AUDIENCE/JWKS_URL` | opcional | recomendado | obrigatorio |
| `CORS_ALLOWED_ORIGINS` | obrigatorio | obrigatorio | obrigatorio |
| `JWT_SECRET` | obrigatorio | obrigatorio | obrigatorio forte |

## Validador automatico

Comando:

```powershell
cd C:\Users\Camila\Desktop\Senac\workspace\CondoGuard.AI\condoguard.ai
npm.cmd run env:validate
```

Comportamento:

- Faz leitura do arquivo `.env.local`.
- Valida regras de seguranca e consistencia conforme `APP_ENV`.
- Sai com erro (`exit 1`) quando detectar configuracao invalida.

Script:

- `scripts/release/validate-env-profile.mjs`

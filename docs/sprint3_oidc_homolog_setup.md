# Sprint 3 - Setup OIDC em Homolog

Data de referencia: 4 de abril de 2026  
Objetivo: ativar `S3-01` com provedor corporativo real usando `oidc_jwks`.

## 1) Variaveis obrigatorias

No ambiente homolog, configurar:

```env
AUTH_PROVIDER="oidc_jwks"
AUTH_PASSWORD_LOGIN_ENABLED="false"
OIDC_ISSUER="https://SEU_ISSUER"
OIDC_AUDIENCE="SEU_AUDIENCE"
OIDC_JWKS_URL="https://SEU_ISSUER/.well-known/jwks.json"
OIDC_ROLE_CLAIM="roles"
OIDC_TENANT_CLAIM="condominium_id"
OIDC_ALLOWED_ALGS="RS256"
```

Observacao:
- Em `hml` e `prod`, manter `ENABLE_DEMO_AUTH="false"`.
- Em `hml` e `prod` com OIDC, manter `AUTH_PASSWORD_LOGIN_ENABLED="false"` para bloquear login local por senha.

## 2) Validacao de health

Com a API no ar:

```powershell
curl.exe http://localhost:4001/api/health
```

Esperado:
- `authProvider = "oidc_jwks"`
- `authPasswordLoginEnabled = false`
- `oidcConfigured = true`
- `dialect = "oracle"`
- `dbStatus = "oracle_pool_ok"`

## 3) Validacao funcional de token real

1. Obter token real no provedor corporativo.
2. Chamar endpoint protegido:

```powershell
$headers = @{ Authorization = "Bearer <TOKEN_REAL>" }
Invoke-RestMethod -Uri "http://localhost:4001/api/alerts" -Headers $headers
```

Esperado:
- token valido -> `200`
- token invalido/expirado -> `401`

## 4) Criterio de aceite (S3-01)

1. Fluxo principal de homolog autenticando com token real do provedor.
2. Endpoints protegidos aceitando apenas token valido do provedor configurado.
3. Evidencias registradas em `docs/sprint3_test_matrix.md`.

## 5) Smoke automatizado de fechamento (recomendado)

Com token real do provedor (copiar JWT):

```powershell
npm.cmd run security:smoke:sprint3:oidc -- -ApiBaseUrl "http://localhost:4001" -AccessToken "<TOKEN_REAL>"
```

Saida esperada:
- arquivo `docs/sprint3_oidc_smoke_report.md`
- status final `PASS: S3-01 OIDC closure checks validated.`

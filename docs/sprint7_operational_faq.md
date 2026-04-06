# Sprint 7 - FAQ Operacional e Escalonamento (S7-04)

Data de referencia: 6 de abril de 2026

## 1) Como validar rapidamente se o sistema esta saudavel?

1. Verificar health:

```powershell
curl.exe http://localhost:4000/api/health
```

Esperado:
- `ok=true`
- `dialect=oracle`
- `dbStatus=oracle_pool_ok`

2. Validar login API:

```powershell
Invoke-RestMethod -Method Post -Uri "http://localhost:4000/api/auth/login" `
  -ContentType "application/json" `
  -Body '{"email":"admin@condoguard.ai","password":"password123"}'
```

## 2) Como diferenciar problema de frontend, backend ou autenticacao?

- Frontend:
  - pagina nao carrega em `http://localhost:3000`
  - erro de Vite/porta.
- Backend:
  - `curl /api/health` falha ou retorna erro.
- Autenticacao:
  - login API retorna `401/501`,
  - erro de token/credenciais no frontend.

## 3) O que fazer quando o login falha no frontend, mas API esta online?

1. Confirmar `VITE_API_BASE_URL` no `.env.local`.
2. Reiniciar frontend (`npm.cmd run dev`).
3. Fazer hard refresh no navegador (`Ctrl + F5`).
4. Validar CORS (`CORS_ALLOWED_ORIGINS` inclui porta atual do frontend).

## 4) Quando escalar?

- N1 para N2: ate 15 min sem restaurar servico.
- N2 para plantao tecnico: ate 30 min ou incidente critico.
- Plantao para decisao de rollback: conforme runbook S7.

## 5) Quais evidencias anexar no incidente?

1. payload de `/api/health`;
2. erro exato (status/codigo) do endpoint afetado;
3. horario de inicio e acoes executadas;
4. print/log da tentativa de mitigacao;
5. relatorio de smoke/drill quando aplicavel.

## 6) Quais comandos padrao de validacao antes do Go-live?

```powershell
npm.cmd run env:validate
npm.cmd run release:s7:hml-smoke
npm.cmd run release:s7:rollback-drill
```

Para gate OIDC final:

```powershell
$env:OIDC_ACCESS_TOKEN="<TOKEN_OIDC_REAL>"
npm.cmd run security:smoke:s3:s7:oidc-gate -- --ApiBaseUrl "http://localhost:4000"
```

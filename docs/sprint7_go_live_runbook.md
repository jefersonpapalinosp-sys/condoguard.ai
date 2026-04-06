# Sprint 7 - Runbook Unico de Go-live

Data de referencia: 6 de abril de 2026

Objetivo: executar go-live controlado com validacao tecnica, plano de rollback e evidencias auditaveis.

## 1) Pre-flight obrigatorio

1. CI Quality Gate verde no `main`.
2. Secrets Oracle e OIDC validados no ambiente alvo.
3. Perfil de ambiente validado:

```powershell
cd C:\Users\Camila\Desktop\Senac\workspace\CondoGuard.AI\condoguard.ai
npm.cmd run env:validate
```

4. Verificar health:

```powershell
curl.exe http://localhost:4000/api/health
```

Aceite esperado:
- `dialect=oracle`
- `dbStatus=oracle_pool_ok`
- `APP_ENV` coerente com o ambiente alvo

## 2) Gate S7-01 (homolog espelhando producao)

### 2.1 Smoke tecnico com fluxos criticos

Modo local_jwt (homolog tecnico):

```powershell
npm.cmd run release:s7:hml-smoke
```

Modo OIDC real (gate final de identidade):

```powershell
  powershell -ExecutionPolicy Bypass -File scripts/release/sprint7-hml-go-live-smoke.ps1 `
  -ApiBaseUrl "http://localhost:4000" `
  -RequireOidc `
  -AccessToken "<TOKEN_OIDC_REAL>" `
  -ExpectedEnv "hml"
```

Relatorio gerado:
- `docs/sprint7_hml_smoke_report.md`

### 2.2 Gate final OIDC (S3-01 + S7-01)

Comando unico (usa `OIDC_ACCESS_TOKEN` ou `-AccessToken`):

```powershell
$env:OIDC_ACCESS_TOKEN="<TOKEN_OIDC_REAL>"
npm.cmd run security:smoke:s3:s7:oidc-gate -- --ApiBaseUrl "http://localhost:4000"
```

Relatorios gerados:
- `docs/sprint3_oidc_smoke_report.md`
- `docs/sprint7_hml_smoke_report.md`
- `docs/sprint3_s7_oidc_final_gate_report.md`

## 3) Rollback drill (S7-03)

Runbook detalhado de rollback tecnico/dados:
- `docs/sprint7_rollback_runbook.md`

Executar simulacao assistida:

```powershell
npm.cmd run release:s7:rollback-drill
```

Ou com endpoints explicitos:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/release/sprint7-rollback-drill.ps1 `
  -PrimaryApiBaseUrl "http://localhost:4000" `
  -RollbackApiBaseUrl "http://localhost:4000" `
  -AccessToken "<TOKEN_VALIDO_OPCIONAL>"
```

Modo automatizado (sem prompts interativos):

```powershell
powershell -ExecutionPolicy Bypass -File scripts/release/sprint7-rollback-drill.ps1 `
  -PrimaryApiBaseUrl "http://localhost:4000" `
  -RollbackApiBaseUrl "http://localhost:4000" `
  -AccessToken "<TOKEN_VALIDO_OPCIONAL>" `
  -NonInteractive
```

Relatorio gerado:
- `docs/sprint7_rollback_drill_report.md`

## 4) Go/No-Go

Go apenas se:
- S3-01 fechado com OIDC real.
- Smoke S7-01 com `failed=0`.
- Drill de rollback com `recovery_failed=0`.
- RTO/RPO anotados no relatorio e aceitos pelo time.

No-Go quando:
- qualquer endpoint critico retornar nao-200 no smoke/drill;
- OIDC real nao estiver validado;
- rollback nao recuperar dentro da janela acordada.

Checklist de decisao:
- `docs/sprint7_go_no_go_checklist.md`

## 5) Evidencias minimas para fechamento

1. `docs/sprint7_hml_smoke_report.md`
2. `docs/sprint7_rollback_drill_report.md`
3. `docs/sprint7_operational_faq.md`
4. Link do run de CI verde
5. Registro de decisao Go/No-Go com data e responsaveis
6. Ata de handoff assinada (`docs/sprint7_handoff_minutes_template.md`)

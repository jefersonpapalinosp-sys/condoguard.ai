# GitHub Actions - Secrets Oracle (Sprint 6)

Data de referencia: 5 de abril de 2026

Objetivo: habilitar o job `oracle-smoke` do workflow `ci-quality.yml`.

## Secrets obrigatorios

- `ORACLE_USER`
- `ORACLE_PASSWORD`
- `ORACLE_CONNECT_STRING`

## Configuracao pela interface GitHub

1. Abrir o repositorio no GitHub.
2. Entrar em `Settings` > `Secrets and variables` > `Actions`.
3. Clicar em `New repository secret`.
4. Criar os 3 secrets obrigatorios.
5. Rodar o workflow `CI Quality Gate` em `Actions`.

## Configuracao por CLI (PowerShell Windows)

```powershell
cd C:\Users\Camila\Desktop\Senac\workspace\CondoGuard.AI\condoguard.ai
gh auth login
gh secret set ORACLE_USER --body "APP"
gh secret set ORACLE_PASSWORD --body "SUA_SENHA"
gh secret set ORACLE_CONNECT_STRING --body "72.61.39.94:1521/FREEPDB1"
```

## Validacao esperada

- Job `oracle-smoke` executa no pipeline.
- `curl http://localhost:4001/api/health` no job retorna:
  - `"dialect":"oracle"`
  - `"dbStatus":"oracle_pool_ok"`

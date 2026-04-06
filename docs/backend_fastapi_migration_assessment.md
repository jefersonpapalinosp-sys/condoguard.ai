# Levantamento Completo - Migracao Backend Node -> FastAPI

Data de referencia: 6 de abril de 2026

## 1) Estado atual (o que ja esta pronto)

- FastAPI ativo em `backend/app/*` com estrutura por camadas (`api`, `core`, `repositories`, `services`, `observability`, `audit`).
- Endpoints principais migrados e compativeis com frontend:
  - `/api/health`
  - `/api/auth/login`
  - `/api/invoices`, `/api/invoices/export.csv`, `/api/invoices/{id}/pay`
  - `/api/management/units`
  - `/api/cadastros` (GET/POST/PATCH status)
  - `/api/alerts`, `/api/alerts/{id}/read`
  - `/api/chat/*`
  - `/api/observability/*`
  - `/api/security/audit`
- Scripts de execucao FastAPI padronizados no `package.json` (`api:dev`, `api:start:*`).
- E2E Playwright usando FastAPI com API isolada.
- Testes Python existentes e verdes (`backend/tests`).

## 2) Gaps para concluir a troca total

## G0 - Critico (bloqueia corte do Node)

- [ ] `npm run test` ainda valida backend Node legado.
  - Evidencia: testes de API/contract/smoke importam `server/index.mjs` diretamente.
  - Impacto: falso positivo de qualidade para migracao (suite verde sem garantir FastAPI).
- [ ] Existe bug intermitente de CORS preflight no FastAPI.
  - Sintoma observado: `RuntimeError: Response content longer than Content-Length` em `OPTIONS`.
  - Origem provavel: middleware CORS custom em `backend/app/main.py`.
- [ ] Dependencias e scripts Node legados ainda ativos.
  - `api:dev:node:mock`, `api:dev:node:oracle` no `package.json`.
  - Dependencias backend Node ainda instaladas (`express`, `helmet`, `express-rate-limit`, `jsonwebtoken`).

## G1 - Alto (necessario para descomissionamento seguro)

- [ ] Migrar testes de API/contract/smoke do legado para FastAPI.
  - Hoje: `tests/api`, `tests/contract`, `tests/smoke` rodam contra Node.
  - Desejado: cobertura equivalente em `backend/tests` (pytest + TestClient/httpx).
- [ ] Atualizar documentacao ainda referenciando `server/*` e conceitos do Express.
  - README e docs antigos ainda citam `helmet`, `server/index.mjs`, `server/data/*`.
- [ ] Revisar scripts de dados/utilitarios que escrevem em `server/data`.
  - Ex.: `scripts/data/analyze_and_project.py` com saida padrao em `server/data`.

## G2 - Medio (hardening e manutencao)

- [ ] Definir politica final de observabilidade/auditoria (retenção e rotação de logs).
- [ ] Unificar cobertura de qualidade entre Node frontend e Python backend no CI (metas separadas e claras).
- [ ] Fechar checklist de descomissionamento (`docs/backend_node_decommission_checklist.md`) com evidencias automatizadas.

## 3) Plano recomendado de execucao

## Fase A - Confiabilidade FastAPI (P0)

- [ ] Corrigir middleware CORS no FastAPI (preferir `CORSMiddleware` oficial).
- [ ] Garantir preflight `OPTIONS` sem erro e sem ruido no log.
- [ ] Revalidar:
  - `npm run test:e2e`
  - `npm run test:py`

## Fase B - Qualidade migrada para Python (P0)

- [ ] Portar testes de `tests/api` para `backend/tests` (pytest).
- [ ] Portar testes de `tests/contract` para validação de contrato FastAPI.
- [ ] Portar `tests/smoke` para smoke FastAPI.
- [ ] Ajustar `npm run test` para nao depender de `server/index.mjs`.

## Fase C - Corte controlado do legado Node (P1)

- [ ] Remover scripts `api:dev:node:*` do `package.json`.
- [ ] Remover dependencias Node de backend nao usadas.
- [ ] Atualizar docs/runbooks com FastAPI como unica trilha.
- [ ] Remover pasta `server/` (apos tag/backup historico).

## Fase D - Fechamento operacional (P1)

- [ ] Rodar pipeline completo CI com gates novos.
- [ ] Executar smoke Oracle no FastAPI em homolog.
- [ ] Congelar checklist final de descomissionamento com evidencias.

## 4) Definicao de pronto para "Backend migrado"

- [ ] Nenhum teste automatizado depende de `server/index.mjs`.
- [ ] CI verde validando frontend + FastAPI + Oracle smoke.
- [ ] `package.json` sem scripts/deps backend Node.
- [ ] `server/` removido do branch principal.
- [ ] Documentacao operacional 100% FastAPI.

## 5) Ordem sugerida (curta)

1. Corrigir CORS preflight no FastAPI.
2. Migrar suites `api/contract/smoke` para pytest.
3. Virar CI para FastAPI-first.
4. Remover legado Node.


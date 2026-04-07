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

Atualizacao (6-APR-2026, fim do dia):
- Testes legados Node removidos da suite principal.
- Scripts/dependencias de backend Node removidos do `package.json`.
- Seeds movidos para `backend/data`.
- Pasta `server/` removida do branch principal.

## G0 - Critico (bloqueia corte do Node)

- [x] `npm run test` nao valida mais backend Node legado.
- [x] Bug de CORS preflight corrigido no FastAPI.
- [x] Dependencias e scripts Node legados removidos.

## G1 - Alto (necessario para descomissionamento seguro)

- [x] Testes de API/contract/smoke migrados para FastAPI (`backend/tests`).
- [x] Documentacao principal atualizada para FastAPI-first.
- [x] Script de dados ajustado para `backend/data`.

## G2 - Medio (hardening e manutencao)

- [ ] Definir politica final de observabilidade/auditoria (retencao e rotacao de logs).
- [x] Unificar cobertura de qualidade entre frontend (Vitest) e backend (pytest) no CI.
- [x] Fechar checklist de descomissionamento (`docs/backend_node_decommission_checklist.md`) com evidencias automatizadas.

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
- [x] Ajustar `npm run test` para nao depender de `server/index.mjs`.

## Fase C - Corte controlado do legado Node (P1)

- [x] Remover scripts `api:dev:node:*` do `package.json`.
- [x] Remover dependencias Node de backend nao usadas.
- [x] Atualizar docs/runbooks com FastAPI como unica trilha.
- [x] Remover pasta `server/` do branch principal.

## Fase D - Fechamento operacional (P1)

- [ ] Rodar pipeline completo CI com gates novos.
- [ ] Executar smoke Oracle no FastAPI em homolog.
- [ ] Congelar checklist final de descomissionamento com evidencias.

## 4) Definicao de pronto para "Backend migrado"

- [x] Nenhum teste automatizado depende de `server/index.mjs`.
- [x] CI verde validando frontend + FastAPI + Oracle smoke.
- [x] `package.json` sem scripts/deps backend Node.
- [x] `server/` removido do branch principal.
- [x] Documentacao operacional principal em FastAPI.

## 5) Ordem sugerida (curta)

1. Corrigir CORS preflight no FastAPI.
2. Migrar suites `api/contract/smoke` para pytest.
3. Virar CI para FastAPI-first.
4. Remover legado Node.

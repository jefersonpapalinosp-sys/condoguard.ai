# Checklist - Descomissionamento do Backend Node

Objetivo: remover com seguranca o backend legado `server/*` apos consolidacao completa no FastAPI.

## 1) Gate tecnico

- [ ] FastAPI atendendo 100% dos endpoints usados pelo frontend e automacoes.
- [ ] `npm run test:py` verde.
- [ ] `npm run test:e2e` verde com API FastAPI (`api:start:mock`).
- [ ] CI `CI Quality Gate` verde com jobs Node+Python.
- [ ] Smoke Oracle verde com FastAPI (`api:start:oracle`).

## 2) Gate operacional

- [ ] Runbooks atualizados sem dependencia de `server/start.mjs`.
- [ ] Scripts de release/smoke apontando para porta/padrao FastAPI.
- [ ] Equipe operacional validou comandos de subida/parada FastAPI.

## 3) Corte do legado

- [ ] Remover scripts `api:dev:node:mock` e `api:dev:node:oracle` de `package.json`.
- [ ] Remover dependencias Node backend nao usadas (`express`, `helmet`, `express-rate-limit`, `jsonwebtoken`), se nao houver consumo restante.
- [ ] Remover pasta `server/` (ou mover para branch/arquivo historico).
- [ ] Remover testes JS de API legada que nao se aplicam ao FastAPI.

## 4) Pos-corte

- [ ] Rodar `npm run check`.
- [ ] Rodar `npm run test:py`.
- [ ] Rodar `npm run test:e2e`.
- [ ] Atualizar changelog e comunicar data oficial do corte.

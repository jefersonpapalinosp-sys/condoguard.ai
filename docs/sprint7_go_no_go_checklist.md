# Sprint 7 - Checklist Go/No-Go

Data de referencia: 6 de abril de 2026

Objetivo: formalizar decisao de entrada em piloto/go-live com bloqueios explicitos.

## Estado atual

- [x] Gate tecnico local (S7-01 smoke tecnico) validado.
- [x] Drill tecnico de rollback validado.
- [ ] Gate de identidade real (S3-01) validado.

Decisao recomendada no estado atual: **NO-GO para go-live real** (bloqueio por OIDC real pendente).

## Checklist de decisao

### Bloco tecnico

- [ ] `S3-01` PASS com OIDC real (issuer/audience/jwks + token real).
- [ ] `S7-01` PASS em modo OIDC (`failed=0`).
- [ ] `S7-03` PASS com RTO/RPO registrados e aceitos.
- [ ] CI Quality Gate verde mais recente no `main`.

### Bloco operacional

- [ ] Piloto (`S7-02`) com responsaveis e janela preenchidos.
- [ ] FAQ operacional revisado com contatos reais.
- [ ] Treinamento (`S7-04`) executado e registrado.
- [ ] Ata de handoff assinada.

### Bloco de risco e rollback

- [ ] Runbook de rollback revisado no dia da decisao.
- [ ] Canal de incidente testado.
- [ ] Responsavel de decisao de rollback nomeado na janela.

## Registro da decisao

- Data/hora: `____/____/________ ____:____`
- Decisao: `GO` / `NO-GO`
- Responsavel tecnico: `____________________________`
- Responsavel negocio: `____________________________`
- Observacoes: `________________________________________________________`

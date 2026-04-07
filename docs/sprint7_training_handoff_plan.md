# Sprint 7 - Plano de Treinamento e Handoff (S7-04)

Data de referencia: 6 de abril de 2026

Objetivo: preparar suporte e negocio para operar a plataforma no pos-go-live.

## Publico alvo

- Suporte N1/N2
- Operacao de condominio (sindico/admin)
- Responsavel tecnico de plantao

## Trilha minima de treinamento

1. Login e sessao (incluindo erro de permissao e expiracao de token).
2. Fluxos criticos:
   - financeiro (lista, filtros, exportacao, pagamento)
   - alertas (leitura e acompanhamento)
   - chat (contexto, limitacoes e feedback)
   - observabilidade (metricas e alertas)
3. Procedimento de incidente e escalonamento.
4. Abertura de chamado e coleta de evidencias.

## FAQ operacional (base)

- Como validar rapidamente se backend esta saudavel?
- Como identificar se problema e auth, dados ou conectividade?
- Quando acionar rollback?
- Quais evidencias anexar no incidente?

## Escalonamento

- N1 -> N2: ate 15 min sem resolucao
- N2 -> Plantao tecnico: ate 30 min ou impacto critico
- Plantao tecnico -> decisao de rollback: conforme runbook S7

## Rotina pos-go-live (primeiras 2 semanas)

1. Daily tecnico de 15 min com status de incidentes.
2. Revisao diaria de metricas de erro, latencia e fallback.
3. Revisao semanal com negocio para ajustes de operacao.

## Evidencias de handoff

- Lista de presenca de treinamento.
- Registro da sessao de Q&A.
- Documento final assinado pelos responsaveis.

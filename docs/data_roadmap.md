# Roadmap de Dados

## Fase atual (implementado)

- Modelo versionado em `database/flyway/sql/V001__core_schema.sql`
- Marts de leitura em `database/flyway/sql/V002__marts_views.sql`
- Validacoes de qualidade em `database/flyway/sql/V003__data_quality_tests.sql`
- Evolucoes complementares em `V004` ate `V010`
- Pipeline de analise e seeds em `scripts/data/analyze_and_project.py`
- Gate operacional de baseline em `scripts/db/data-quality-gate.mjs`
- API minima real em `backend/app/main.py` (FastAPI)

## Proxima fase (recomendado)

1. Criar carga ETL Bronze -> Silver com versionamento.
2. Limpar a baseline atual para promover o gate de data quality para modo bloqueante em CI.
3. Substituir seeds por leitura real do banco nos endpoints.
4. Criar endpoint de alertas e dashboard diretamente dos marts.
5. Implementar auditoria IA preenchendo `status_auditoria_ia`.

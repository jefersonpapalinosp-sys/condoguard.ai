# Roadmap de Dados

## Fase atual (implementado)

- Modelo SQL base em `database/sql/001_core_schema.sql`
- Marts para frontend em `database/sql/002_marts_views.sql`
- Testes de qualidade em `database/sql/003_data_quality_tests.sql`
- Pipeline de analise e seeds em `scripts/data/analyze_and_project.py`
- API minima real em `backend/app/main.py` (FastAPI)

## Proxima fase (recomendado)

1. Criar carga ETL Bronze -> Silver com versionamento.
2. Executar quality checks em CI e bloquear deploy em falha.
3. Substituir seeds por leitura real do banco nos endpoints.
4. Criar endpoint de alertas e dashboard diretamente dos marts.
5. Implementar auditoria IA preenchendo `status_auditoria_ia`.

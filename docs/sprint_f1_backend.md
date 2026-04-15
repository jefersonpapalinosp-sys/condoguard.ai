# SPRINTS — FASE 1: Gestão de Projetos
**Período:** Mai–Out 2026 | 24 semanas | Sprints 1–12
**Responsável backend + integrações:** Claude Code Agent
**Marco:** Produto vendável — GED + RAG + NCs + Cotações + Contratos

> Este arquivo é o guia de execução para o Claude Code Agent.
> A cada sprint: ler as tarefas, implementar, rodar os testes definidos e marcar como concluído.
> Sempre executar `npm run api:dev:mock` para validar localmente antes de avançar.

---

## Estrutura de Pastas do Backend (referência)

```
backend/
├── app/
│   ├── main.py                    # Registrar novos routers aqui
│   ├── api/
│   │   ├── routes.py              # Router legado (manter)
│   │   ├── auth_routes.py         # [NOVO] Login, me, refresh
│   │   ├── admin_routes.py        # [NOVO] Gestão de usuários (admin-only)
│   │   ├── projetos_routes.py     # [NOVO] CRUD projetos
│   │   ├── ged_routes.py          # [NOVO] Upload, busca, versões
│   │   ├── ncs_routes.py          # [NOVO] Não Conformidades
│   │   ├── cotacoes_routes.py     # [NOVO] Mapa de cotação
│   │   └── contratos_routes.py    # [NOVO] Contratos engenharia
│   ├── agents/
│   │   ├── storage_agent.py       # [NOVO] Azure Blob
│   │   ├── file_agent.py          # [NOVO] OCR + QR stamp
│   │   ├── nlp_agent.py           # [NOVO] Embeddings + classificação
│   │   ├── analysis_agent.py      # [NOVO] RAG + conflitos
│   │   ├── data_agent.py          # [NOVO] Archival Cool Tier
│   │   ├── prompts/
│   │   │   ├── file_prompts.py
│   │   │   ├── nlp_prompts.py
│   │   │   └── analysis_prompts.py
│   │   └── graph_state.py         # Estado compartilhado (Pydantic)
│   ├── repositories/
│   │   ├── auth_repo.py           # [ADAPTAR] Adicionar 8 perfis
│   │   ├── usuarios_repo.py       # [NOVO] CRUD usuários + permissões
│   │   ├── projetos_repo.py       # [NOVO]
│   │   ├── ged_repo.py            # [NOVO]
│   │   ├── ncs_repo.py            # [NOVO]
│   │   ├── cotacoes_repo.py       # [NOVO]
│   │   ├── contratos_repo.py      # [ADAPTAR] Do Projeto Integrado
│   │   └── dashboard_repo.py      # [ADAPTAR] KPIs F1
│   ├── core/
│   │   ├── security.py            # [ADAPTAR] Novos decoradores
│   │   └── config.py              # [ADAPTAR] Novas env vars Azure
│   ├── integrations/
│   │   ├── azure_blob.py          # [NOVO] Cliente Azure Blob Storage
│   │   ├── azure_openai.py        # [NOVO] Cliente Azure OpenAI
│   │   ├── azure_doc_intel.py     # [NOVO] Azure Document Intelligence
│   │   └── azure_search.py        # [NOVO] Azure AI Search
│   └── db/
│       └── oracle_client.py       # [ADAPTAR] Pool Oracle 23ai + Vector Search
├── data/                          # Mock JSON (DB_DIALECT=mock)
│   ├── usuarios.json
│   ├── projetos.json
│   ├── documentos.json
│   ├── ncs.json
│   ├── cotacoes.json
│   └── knowledge_base/            # Docs engenharia civil para RAG
└── tests/
    ├── test_auth.py
    ├── test_usuarios.py
    ├── test_projetos.py
    ├── test_ged.py
    ├── test_ncs.py
    ├── test_cotacoes.py
    └── test_contratos.py
```

---

## SPRINT 1–2 — Infraestrutura, Scaffold e Gestão de Acesso
**Semanas 1–4 | Foco: base técnica que tudo mais depende**

### Objetivo
Ambiente rodando, CI/CD configurado, scaffold FastAPI adaptado, DDL base no Oracle 23ai,
auth JWT com 8 perfis funcionando e painel de usuários operacional.

---

### 1. Scaffold — adaptar Projeto Integrado para novo domínio

**`backend/app/main.py`** — registrar novos routers e remover os do Projeto Integrado:
```python
# Remover: contracts_module_routes, enel_integration_routes, sabesp_integration_routes
# Adicionar:
from app.api import (
    auth_routes, admin_routes, projetos_routes,
    ged_routes, ncs_routes, cotacoes_routes, contratos_routes
)
app.include_router(auth_routes.router, prefix="/api/auth", tags=["auth"])
app.include_router(admin_routes.router, prefix="/api/admin", tags=["admin"])
app.include_router(projetos_routes.router, prefix="/api/projetos", tags=["projetos"])
app.include_router(ged_routes.router, prefix="/api/ged", tags=["ged"])
app.include_router(ncs_routes.router, prefix="/api/ncs", tags=["ncs"])
app.include_router(cotacoes_routes.router, prefix="/api/cotacoes", tags=["cotacoes"])
app.include_router(contratos_routes.router, prefix="/api/contratos", tags=["contratos"])
```

**`backend/app/core/config.py`** — adicionar variáveis Azure:
```python
# Adicionar ao Settings:
azure_openai_endpoint: str = ""
azure_openai_api_key: str = ""
azure_openai_deployment: str = "gpt-4o"
azure_openai_embedding_deployment: str = "text-embedding-3-large"
azure_ai_search_endpoint: str = ""
azure_ai_search_key: str = ""
azure_ai_search_index: str = "documentos-plataforma"
azure_blob_connection_string: str = ""
azure_blob_container_docs: str = "documentos"
azure_doc_intelligence_endpoint: str = ""
azure_doc_intelligence_key: str = ""
```

---

### 2. DDL V013 — Schema base F1

**`database/flyway/sql/V013__base_f1.sql`**

```sql
-- Usuários com perfil e controle de acesso
CREATE TABLE usuarios (
    id              NUMBER(19,0) GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id       VARCHAR2(100) NOT NULL,
    nome            VARCHAR2(200) NOT NULL,
    email           VARCHAR2(255) NOT NULL,
    senha_hash      VARCHAR2(255) NOT NULL,
    role            VARCHAR2(50)  NOT NULL,
    -- roles: admin | gestor | coordenador | engenheiro | mestre_obras
    --        cliente_final | prestador | financeiro | prestador_mkt
    doc_level       VARCHAR2(50)  DEFAULT 'interno' NOT NULL,
    -- doc_level: publico | interno | confidencial | restrito
    escopo_dados    VARCHAR2(50)  DEFAULT 'project' NOT NULL,
    -- escopo: global | tenant | project | own
    ativo           NUMBER(1)     DEFAULT 1 NOT NULL,
    criado_por      NUMBER(19,0),
    criado_em       TIMESTAMP     DEFAULT SYSTIMESTAMP NOT NULL,
    ultimo_acesso   TIMESTAMP,
    expira_em       TIMESTAMP,  -- para contas externas com prazo
    CONSTRAINT uq_usuario_email UNIQUE (tenant_id, email),
    CONSTRAINT ck_usuario_role CHECK (role IN (
        'admin','gestor','coordenador','engenheiro','mestre_obras',
        'cliente_final','prestador','financeiro','prestador_mkt'
    )),
    CONSTRAINT ck_usuario_doc_level CHECK (doc_level IN (
        'publico','interno','confidencial','restrito'
    ))
);

-- Vínculo usuário ↔ projetos autorizados (scope=project)
CREATE TABLE usuario_projetos (
    usuario_id          NUMBER(19,0) NOT NULL,
    projeto_id          NUMBER(19,0) NOT NULL,
    permissao_nivel     VARCHAR2(50) DEFAULT 'leitura' NOT NULL,
    -- leitura | edicao | aprovacao
    concedido_por       NUMBER(19,0),
    concedido_em        TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
    PRIMARY KEY (usuario_id, projeto_id),
    CONSTRAINT ck_permissao_nivel CHECK (permissao_nivel IN ('leitura','edicao','aprovacao'))
);

-- Override pontual de permissão por usuário
CREATE TABLE permissoes_customizadas (
    id          NUMBER(19,0) GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    usuario_id  NUMBER(19,0) NOT NULL,
    recurso     VARCHAR2(100) NOT NULL,  -- 'contratos', 'financeiro', 'ged', etc.
    acao        VARCHAR2(50)  NOT NULL,  -- 'read', 'write', 'delete', 'approve'
    permitido   NUMBER(1)     NOT NULL,  -- 1=permite, 0=bloqueia (override)
    criado_por  NUMBER(19,0),
    CONSTRAINT uq_permissao_custom UNIQUE (usuario_id, recurso, acao)
);

-- Projetos de engenharia
CREATE TABLE projetos (
    id              NUMBER(19,0) GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id       VARCHAR2(100) NOT NULL,
    nome            VARCHAR2(300) NOT NULL,
    descricao       CLOB,
    codigo          VARCHAR2(50),
    status          VARCHAR2(50)  DEFAULT 'ativo' NOT NULL,
    -- ativo | pausado | concluido | cancelado
    responsavel_id  NUMBER(19,0),
    data_inicio     DATE,
    data_fim_prev   DATE,
    criado_em       TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
    atualizado_em   TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
    CONSTRAINT ck_projeto_status CHECK (status IN ('ativo','pausado','concluido','cancelado'))
);

-- Etapas/fases do projeto
CREATE TABLE etapas_projeto (
    id              NUMBER(19,0) GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    projeto_id      NUMBER(19,0) NOT NULL,
    nome            VARCHAR2(200) NOT NULL,
    ordem           NUMBER(5,0)   NOT NULL,
    status          VARCHAR2(50)  DEFAULT 'pendente' NOT NULL,
    percentual      NUMBER(5,2)   DEFAULT 0,
    CONSTRAINT fk_etapa_projeto FOREIGN KEY (projeto_id) REFERENCES projetos(id)
);

-- Disciplinas configuráveis por projeto (JSON Duality View — inserido em V017)
CREATE TABLE disciplinas_projeto (
    id          NUMBER(19,0) GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    projeto_id  NUMBER(19,0) NOT NULL,
    nome        VARCHAR2(100) NOT NULL,  -- Estrutural, Hidráulico, Elétrico, etc.
    ativo       NUMBER(1) DEFAULT 1,
    CONSTRAINT fk_disciplina_projeto FOREIGN KEY (projeto_id) REFERENCES projetos(id)
);

-- Fornecedores / equipe técnica
CREATE TABLE fornecedores (
    id          NUMBER(19,0) GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id   VARCHAR2(100) NOT NULL,
    nome        VARCHAR2(300) NOT NULL,
    tipo        VARCHAR2(50)  NOT NULL,  -- projetista | empreiteiro | fornecedor | consultor
    cnpj        VARCHAR2(20),
    email       VARCHAR2(255),
    telefone    VARCHAR2(30),
    ativo       NUMBER(1) DEFAULT 1
);

-- Índices
CREATE INDEX idx_usuario_tenant   ON usuarios(tenant_id);
CREATE INDEX idx_usuario_role     ON usuarios(role);
CREATE INDEX idx_projeto_tenant   ON projetos(tenant_id);
CREATE INDEX idx_projeto_status   ON projetos(status);
CREATE INDEX idx_up_usuario       ON usuario_projetos(usuario_id);
CREATE INDEX idx_up_projeto       ON usuario_projetos(projeto_id);
```

---

### 3. Auth — adaptar `backend/app/core/security.py`

Adicionar ao JWT payload:
```python
def create_access_token(user: dict) -> str:
    payload = {
        "sub":         str(user["id"]),
        "email":       user["email"],
        "role":        user["role"],
        "tenant_id":   user["tenant_id"],
        "scope":       user["escopo_dados"],        # global|tenant|project|own
        "project_ids": user.get("project_ids", []), # lista de IDs autorizados
        "doc_level":   user["doc_level"],           # publico|interno|confidencial|restrito
        "exp":         datetime.utcnow() + timedelta(seconds=settings.jwt_expires_seconds)
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")
```

Novos decoradores a implementar em `security.py`:
```python
def require_data_scope(minimum_scope: str):
    """Filtra queryset pelo scope do JWT. Injeta project_ids no request state."""

def require_doc_level(minimum_level: str):
    """Bloqueia acesso se doc_level do usuário < nível mínimo exigido."""

def require_financial_access():
    """Apenas admin, gestor e financeiro podem ver dados financeiros."""

def require_tenant_match():
    """Garante que usuário só acessa dados do próprio tenant_id."""
```

---

### 4. Endpoints de Auth — `backend/app/api/auth_routes.py`

```
POST   /api/auth/login          — email + senha → JWT
GET    /api/auth/me             — dados do usuário logado (do JWT)
POST   /api/auth/logout         — invalida token (blacklist em memória)
POST   /api/auth/reset-password — admin envia link de reset (mock: retorna token)
```

**Contrato de resposta `/api/auth/login`:**
```json
{
  "access_token": "eyJ...",
  "token_type": "bearer",
  "expires_in": 3600,
  "user": {
    "id": 1,
    "nome": "Renan Papalino",
    "email": "admin@plataforma.dev",
    "role": "admin",
    "tenant_id": "construtoraXYZ",
    "doc_level": "restrito",
    "scope": "global"
  }
}
```

---

### 5. Endpoints de Gestão de Usuários — `backend/app/api/admin_routes.py`

Todos exigem `@require_roles(["admin"])`.

```
GET    /api/admin/usuarios                      — lista com filtros: role, status, projeto
POST   /api/admin/usuarios                      — criar usuário
GET    /api/admin/usuarios/:id                  — detalhe + projetos + permissões custom
PUT    /api/admin/usuarios/:id                  — editar perfil, doc_level, escopo
PATCH  /api/admin/usuarios/:id/status           — ativar / desativar
POST   /api/admin/usuarios/:id/reset-senha      — gerar nova senha temporária
POST   /api/admin/usuarios/:id/projetos         — vincular projeto
DELETE /api/admin/usuarios/:id/projetos/:pid    — desvincular projeto
GET    /api/admin/usuarios/:id/permissoes       — listar overrides
POST   /api/admin/usuarios/:id/permissoes       — criar override
DELETE /api/admin/usuarios/:id/permissoes/:pid  — remover override
GET    /api/admin/usuarios/:id/acesso-log       — histórico de logins e ações
```

---

### 6. Endpoints de Projetos — `backend/app/api/projetos_routes.py`

```
GET    /api/projetos                  — lista filtrada por scope (tenant ou project_ids)
POST   /api/projetos                  — criar projeto  [@require_roles(["admin","gestor","coordenador"])]
GET    /api/projetos/:id              — detalhe
PUT    /api/projetos/:id              — editar
DELETE /api/projetos/:id              — cancelar (soft delete) [@require_roles(["admin","gestor"])]
GET    /api/projetos/:id/etapas       — lista de etapas
POST   /api/projetos/:id/etapas       — criar etapa
PUT    /api/projetos/:id/etapas/:eid  — atualizar etapa (percentual, status)
GET    /api/projetos/:id/disciplinas  — disciplinas configuradas
POST   /api/projetos/:id/disciplinas  — adicionar disciplina
GET    /api/projetos/:id/equipe       — membros vinculados ao projeto
POST   /api/projetos/:id/equipe       — vincular membro
```

---

### 7. Mock Data para Sprint 1–2

**`backend/data/usuarios.json`** — 8 usuários demo, um por perfil
**`backend/data/projetos.json`** — 3 projetos de exemplo com etapas e disciplinas

---

### 8. CI/CD — `.github/workflows/api.yml`

```yaml
name: API CI/CD
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.11' }
      - run: pip install -r backend/requirements.txt
      - run: pytest backend/tests/ -v

  deploy-hml:
    needs: test
    if: github.ref == 'refs/heads/develop'
    runs-on: ubuntu-latest
    steps:
      - uses: azure/login@v2
        with: { creds: ${{ secrets.AZURE_CREDENTIALS }} }
      - run: az containerapp update --name api-hml ...

  deploy-prod:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: azure/login@v2
        with: { creds: ${{ secrets.AZURE_CREDENTIALS }} }
      - run: az containerapp update --name api-prod ...
```

---

### 9. Testes Sprint 1–2

**`backend/tests/test_auth.py`**
- [ ] Login com credenciais válidas → JWT com todos os campos do payload
- [ ] Login com senha errada → 401
- [ ] GET /api/auth/me com token válido → dados do usuário
- [ ] GET /api/auth/me sem token → 401
- [ ] Token expirado → 401

**`backend/tests/test_usuarios.py`**
- [ ] Admin cria usuário → 201 com ID
- [ ] Admin lista usuários → filtra por role e status
- [ ] Admin desativa usuário → login bloqueado
- [ ] Admin vincula projeto → aparece em project_ids do JWT
- [ ] Não-admin tenta criar usuário → 403
- [ ] Admin cria override de permissão → validado no endpoint protegido

**`backend/tests/test_projetos.py`**
- [ ] Gestor cria projeto → 201
- [ ] Engenheiro sem vínculo tenta ver projeto → 403
- [ ] Engenheiro com vínculo vê projeto → 200
- [ ] Scope tenant: coordenador vê todos os projetos do tenant
- [ ] Scope project: engenheiro vê apenas project_ids do JWT

### Definição de Pronto — Sprint 1–2
- [ ] `npm run api:dev:mock` sobe sem erros
- [ ] Todos os testes passam (`npm run test:py`)
- [ ] Auth funciona com os 8 perfis demo
- [ ] Painel `/admin/usuarios` retorna dados corretos no mock
- [ ] CI/CD pipeline verde no GitHub Actions

---

## SPRINT 3–4 — GED Core: Upload, OCR, QR Stamp e Storage
**Semanas 5–8 | Foco: pipeline de upload inteligente (etapas 1–3)**

### Objetivo
Usuário faz upload de um documento → o backend armazena no Azure Blob, extrai texto via OCR
e insere QR stamp no PDF. Tudo via `BackgroundTasks`. Resultados acessíveis no endpoint do GED.

---

### 1. DDL V014 — GED: Documentos e Versões

**`database/flyway/sql/V014__ged.sql`**

```sql
-- Documentos do GED
CREATE TABLE documentos (
    id              NUMBER(19,0) GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id       VARCHAR2(100) NOT NULL,
    projeto_id      NUMBER(19,0)  NOT NULL,
    nome_original   VARCHAR2(500) NOT NULL,
    nome_padrao     VARCHAR2(500),            -- preenchido pelo nlp-agent
    tipo_doc        VARCHAR2(100),            -- Planta, Memorial, Laudo, etc.
    disciplina      VARCHAR2(100),            -- Estrutural, Hidráulico, etc.
    revisao         VARCHAR2(20),             -- R00, R01, R02...
    fase            VARCHAR2(100),            -- Anteprojeto, Executivo, etc.
    autor           VARCHAR2(200),
    nivel_acesso    VARCHAR2(50)  DEFAULT 'interno' NOT NULL,
    -- publico | interno | confidencial | restrito
    status          VARCHAR2(50)  DEFAULT 'processando' NOT NULL,
    -- processando | confirmacao_pendente | ativo | obsoleto | arquivado
    blob_staging_url  VARCHAR2(1000),         -- URL temporária (TTL 24h)
    blob_final_url    VARCHAR2(1000),         -- URL definitiva no Blob
    blob_container    VARCHAR2(200),
    blob_path         VARCHAR2(1000),
    tamanho_bytes     NUMBER(15,0),
    hash_sha256       VARCHAR2(64),
    trace_id          VARCHAR2(100),          -- ID único para rastreamento + QR
    tem_qr_stamp      NUMBER(1) DEFAULT 0,
    ocr_texto         CLOB,                   -- Texto extraído pelo OCR
    ocr_metadados     CLOB,                   -- JSON com tabelas, layout, etc.
    pre_fill_payload  CLOB,                   -- JSON com sugestões do nlp-agent
    uploader_id       NUMBER(19,0) NOT NULL,
    criado_em         TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
    atualizado_em     TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
    CONSTRAINT fk_doc_projeto FOREIGN KEY (projeto_id) REFERENCES projetos(id),
    CONSTRAINT ck_doc_nivel CHECK (nivel_acesso IN ('publico','interno','confidencial','restrito')),
    CONSTRAINT ck_doc_status CHECK (status IN (
        'processando','confirmacao_pendente','ativo','obsoleto','arquivado'
    ))
);

-- Histórico de revisões de cada documento
CREATE SEQUENCE seq_revisao_doc START WITH 1 INCREMENT BY 1;

CREATE TABLE revisoes_documento (
    id              NUMBER(19,0) GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    documento_id    NUMBER(19,0) NOT NULL,
    revisao         VARCHAR2(20) NOT NULL,
    blob_url        VARCHAR2(1000),
    trace_id        VARCHAR2(100),
    status          VARCHAR2(50) DEFAULT 'vigente',   -- vigente | obsoleto
    substituido_por NUMBER(19,0),
    criado_por      NUMBER(19,0),
    criado_em       TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
    CONSTRAINT fk_rev_documento FOREIGN KEY (documento_id) REFERENCES documentos(id)
);

-- Lista Mestra (gerada automaticamente)
CREATE TABLE lista_mestra (
    id              NUMBER(19,0) GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    projeto_id      NUMBER(19,0) NOT NULL,
    documento_id    NUMBER(19,0) NOT NULL,
    disciplina      VARCHAR2(100),
    revisao_atual   VARCHAR2(20),
    status          VARCHAR2(50),
    responsavel     VARCHAR2(200),
    atualizado_em   TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
    CONSTRAINT uq_lista_mestra UNIQUE (projeto_id, documento_id),
    CONSTRAINT fk_lm_projeto FOREIGN KEY (projeto_id) REFERENCES projetos(id),
    CONSTRAINT fk_lm_documento FOREIGN KEY (documento_id) REFERENCES documentos(id)
);

CREATE INDEX idx_doc_projeto     ON documentos(projeto_id);
CREATE INDEX idx_doc_status      ON documentos(status);
CREATE INDEX idx_doc_disciplina  ON documentos(disciplina);
CREATE INDEX idx_doc_trace_id    ON documentos(trace_id);
CREATE INDEX idx_rev_documento   ON revisoes_documento(documento_id);
```

---

### 2. Integração Azure Blob — `backend/app/integrations/azure_blob.py`

```python
from azure.storage.blob import BlobServiceClient, generate_blob_sas, BlobSasPermissions
from datetime import datetime, timedelta, timezone
from app.core.config import settings

class AzureBlobClient:
    def __init__(self):
        self._client = BlobServiceClient.from_connection_string(
            settings.azure_blob_connection_string
        ) if settings.azure_blob_connection_string else None

    def is_available(self) -> bool:
        return self._client is not None

    def upload_staging(self, file_bytes: bytes, filename: str, trace_id: str) -> str:
        """Envia para pasta staging/ com TTL 24h via lifecycle policy."""
        blob_name = f"staging/{trace_id}/{filename}"
        container = self._client.get_container_client(settings.azure_blob_container_docs)
        container.upload_blob(blob_name, file_bytes, overwrite=True)
        return blob_name

    def move_to_final(self, staging_path: str, final_path: str) -> str:
        """Move blob de staging para destino final."""
        container = self._client.get_container_client(settings.azure_blob_container_docs)
        source_blob = container.get_blob_client(staging_path)
        dest_blob = container.get_blob_client(final_path)
        dest_blob.start_copy_from_url(source_blob.url)
        source_blob.delete_blob()
        return final_path

    def move_to_cool_tier(self, blob_path: str):
        """Muda tier de Hot para Cool (archival de versão obsoleta)."""
        blob = self._client.get_container_client(
            settings.azure_blob_container_docs
        ).get_blob_client(blob_path)
        blob.set_standard_blob_tier("Cool")

    def generate_sas_url(self, blob_path: str, expires_hours: int = 1) -> str:
        """Gera URL assinada para download seguro."""
        # implementar com BlobSasPermissions
        ...

    def build_final_path(self, tenant_id: str, projeto_id: int,
                         disciplina: str, revisao: str, filename: str) -> str:
        """Padrão: {tenant}/{projeto_id}/{disciplina}/{revisao}/{filename}"""
        return f"{tenant_id}/{projeto_id}/{disciplina}/{revisao}/{filename}"

# Mock para DB_DIALECT=mock
class AzureBlobMock:
    def is_available(self) -> bool: return False
    def upload_staging(self, *args, **kwargs) -> str: return "mock/staging/doc.pdf"
    def move_to_final(self, staging: str, final: str) -> str: return final
    def move_to_cool_tier(self, *args): pass
    def generate_sas_url(self, blob_path: str, **kwargs) -> str:
        return f"http://localhost:4000/mock-blob/{blob_path}"
    def build_final_path(self, tenant, projeto, disciplina, revisao, filename) -> str:
        return f"{tenant}/{projeto}/{disciplina}/{revisao}/{filename}"

def get_blob_client():
    if settings.azure_blob_connection_string:
        return AzureBlobClient()
    return AzureBlobMock()
```

---

### 3. Integração Azure Document Intelligence — `backend/app/integrations/azure_doc_intel.py`

```python
from azure.ai.documentintelligence import DocumentIntelligenceClient
from azure.core.credentials import AzureKeyCredential
from app.core.config import settings

class AzureDocIntelClient:
    def __init__(self):
        self._client = DocumentIntelligenceClient(
            endpoint=settings.azure_doc_intelligence_endpoint,
            credential=AzureKeyCredential(settings.azure_doc_intelligence_key)
        ) if settings.azure_doc_intelligence_endpoint else None

    def extract_text_and_tables(self, file_bytes: bytes) -> dict:
        """
        Retorna:
        {
          "text": "texto completo extraído",
          "tables": [...],
          "pages": [...],
          "key_value_pairs": {...}
        }
        """
        if not self._client:
            return self._mock_response()
        poller = self._client.begin_analyze_document(
            "prebuilt-layout", file_bytes, content_type="application/pdf"
        )
        result = poller.result()
        return {
            "text": result.content,
            "tables": [t.as_dict() for t in (result.tables or [])],
            "pages": len(result.pages or []),
            "key_value_pairs": {}
        }

    def _mock_response(self) -> dict:
        return {
            "text": "Documento de Exemplo — Projeto Residencial\nDisciplina: Estrutural\nRevisão: R02",
            "tables": [],
            "pages": 3,
            "key_value_pairs": {"disciplina": "Estrutural", "revisao": "R02"}
        }
```

---

### 4. storage_agent — `backend/app/agents/storage_agent.py`

```python
import uuid, hashlib
from app.integrations.azure_blob import get_blob_client
from app.agents.graph_state import DocumentState

blob = get_blob_client()

def upload_to_staging(state: DocumentState) -> DocumentState:
    """
    Etapa 1 do pipeline: envia arquivo para staging no Blob.
    Gera trace_id único e calcula hash SHA-256.
    """
    trace_id = str(uuid.uuid4())
    file_bytes = state.file_bytes
    sha256 = hashlib.sha256(file_bytes).hexdigest()
    staging_path = blob.upload_staging(file_bytes, state.original_filename, trace_id)
    state.trace_id = trace_id
    state.sha256 = sha256
    state.blob_staging_path = staging_path
    state.status = "staged"
    return state

def move_to_final_storage(state: DocumentState) -> DocumentState:
    """
    Etapa final: move de staging para pasta definitiva após confirmação do usuário.
    """
    final_path = blob.build_final_path(
        state.tenant_id, state.projeto_id,
        state.disciplina, state.revisao, state.nome_padrao
    )
    blob.move_to_final(state.blob_staging_path, final_path)
    state.blob_final_path = final_path
    state.status = "stored"
    return state

def archive_previous_revision(old_blob_path: str):
    """Chamado quando uma nova revisão substitui a anterior — move para Cool Tier."""
    if old_blob_path:
        blob.move_to_cool_tier(old_blob_path)
```

---

### 5. file_agent — `backend/app/agents/file_agent.py`

```python
import io, fitz  # PyMuPDF
import qrcode
from app.integrations.azure_doc_intel import AzureDocIntelClient
from app.agents.graph_state import DocumentState

doc_intel = AzureDocIntelClient()

def run_ocr(state: DocumentState) -> DocumentState:
    """Extrai texto e tabelas do documento via Azure Document Intelligence."""
    result = doc_intel.extract_text_and_tables(state.file_bytes)
    state.ocr_text = result["text"]
    state.ocr_tables = result["tables"]
    state.ocr_pages = result.get("pages", 1)
    state.status = "ocr_done"
    return state

def stamp_qr_code(state: DocumentState) -> DocumentState:
    """
    Insere QR code no PDF com trace_id para rastreabilidade.
    QR aponta para: https://app.plataforma.com/ged/trace/{trace_id}
    """
    if not state.file_bytes or not state.file_bytes.endswith_pdf():
        return state  # só para PDFs

    qr_url = f"https://app.plataforma.com/ged/trace/{state.trace_id}"
    qr_img = qrcode.make(qr_url)
    qr_bytes = io.BytesIO()
    qr_img.save(qr_bytes, format="PNG")
    qr_bytes.seek(0)

    pdf = fitz.open(stream=state.file_bytes, filetype="pdf")
    page = pdf[0]  # primeira página
    rect = fitz.Rect(page.rect.width - 80, page.rect.height - 80,
                     page.rect.width - 5,  page.rect.height - 5)
    page.insert_image(rect, stream=qr_bytes.read())

    stamped = io.BytesIO()
    pdf.save(stamped)
    state.file_bytes = stamped.getvalue()
    state.has_qr_stamp = True
    state.status = "stamped"
    return state
```

**`requirements.txt`** — adicionar:
```
azure-storage-blob>=12.19.0
azure-ai-documentintelligence>=1.0.0
azure-ai-formrecognizer>=3.3.0
PyMuPDF>=1.24.0
qrcode[pil]>=7.4.2
```

---

### 6. graph_state — `backend/app/agents/graph_state.py`

```python
from pydantic import BaseModel, Field
from typing import Optional, List, Any

class DocumentState(BaseModel):
    # Entrada
    file_bytes: bytes = b""
    original_filename: str = ""
    tenant_id: str = ""
    projeto_id: int = 0
    uploader_id: int = 0

    # Gerado pelo storage_agent
    trace_id: str = ""
    sha256: str = ""
    blob_staging_path: str = ""
    blob_final_path: str = ""
    has_qr_stamp: bool = False

    # Gerado pelo file_agent
    ocr_text: str = ""
    ocr_tables: List[Any] = Field(default_factory=list)
    ocr_pages: int = 0

    # Gerado pelo nlp_agent
    tipo_doc: str = ""
    disciplina: str = ""
    revisao: str = ""
    fase: str = ""
    autor: str = ""
    nome_padrao: str = ""
    nivel_acesso: str = "interno"
    pre_fill_confidence: float = 0.0

    # Gerado pelo analysis_agent
    conflicts: List[str] = Field(default_factory=list)
    rag_score: float = 0.0

    # Controle de fluxo
    status: str = "pending"
    error: Optional[str] = None

    class Config:
        arbitrary_types_allowed = True
```

---

### 7. Endpoints GED — `backend/app/api/ged_routes.py`

```
POST   /api/ged/upload              — recebe arquivo multipart, inicia BackgroundTask
GET    /api/ged/status/:trace_id    — polling de status do processamento
POST   /api/ged/confirmar/:trace_id — usuário confirma metadados pré-preenchidos
GET    /api/ged                     — lista docs do projeto (filtros: disciplina, revisao, status)
GET    /api/ged/:id                 — detalhe do documento
GET    /api/ged/:id/download        — gera SAS URL para download
DELETE /api/ged/:id                 — marcar como obsoleto (soft delete)
GET    /api/ged/:id/revisoes        — histórico de revisões
GET    /api/ged/lista-mestra        — lista mestra do projeto
GET    /api/ged/trace/:trace_id     — resolve QR code → redireciona para detalhe
```

**Pipeline BackgroundTask em `POST /api/ged/upload`:**
```python
@router.post("/upload")
async def upload_documento(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    projeto_id: int = Form(...),
    current_user = Depends(require_auth())
):
    file_bytes = await file.read()
    state = DocumentState(
        file_bytes=file_bytes,
        original_filename=file.filename,
        tenant_id=current_user.tenant_id,
        projeto_id=projeto_id,
        uploader_id=current_user.id
    )
    # Salva registro inicial no banco
    doc_id = await ged_repo.create_document_pending(state)
    # Inicia pipeline assíncrono
    background_tasks.add_task(run_ged_pipeline, state, doc_id)
    return {"doc_id": doc_id, "trace_id": state.trace_id, "status": "processando"}
```

---

### 8. WebSocket para notificações — `backend/app/api/ws_routes.py`

```python
# GET /ws/ged/{trace_id}  — frontend conecta para receber atualização em tempo real
# Quando pipeline conclui, envia:
# { "event": "confirmacao_pronta", "trace_id": "...", "pre_fill": {...} }
# Após confirmação:
# { "event": "documento_ativo", "doc_id": 42, "blob_url": "..." }
```

---

### 9. Testes Sprint 3–4

**`backend/tests/test_ged.py`**
- [ ] Upload PDF → `trace_id` retornado, status `processando`
- [ ] GET status/:trace_id → retorna status atualizado
- [ ] Mock: OCR extrai texto corretamente
- [ ] Mock: QR stamp inserido no PDF (verificar `has_qr_stamp=True`)
- [ ] Mock: storage_agent salva path no staging
- [ ] POST confirmar/:trace_id → status muda para `ativo`, blob movido para final
- [ ] GET lista-mestra → retorna documentos ativos com disciplina e revisão
- [ ] Nível de acesso `confidencial`: engenheiro não consegue ver → 403
- [ ] Nível de acesso `publico`: cliente_final consegue ver → 200

### Definição de Pronto — Sprint 3–4
- [ ] Upload → OCR → QR stamp → status `confirmacao_pendente` no mock
- [ ] Confirmar → `ativo` + blob path final registrado
- [ ] Lista mestra retorna documentos corretos
- [ ] Acesso por nível funciona corretamente (5 cenários testados)
- [ ] `npm run test:py` verde

---

## SPRINT 5–6 — IA Semântica: Embeddings, Classificação e Busca
**Semanas 9–12 | Foco: nlp-agent + Oracle 23ai Vector Search + Azure AI Search**

### Objetivo
nlp-agent preenche automaticamente todos os metadados do documento a partir do OCR.
Oracle 23ai e Azure AI Search indexam o conteúdo. Busca semântica funcional.

---

### 1. DDL V017 — Vector Search Oracle 23ai

**`database/flyway/sql/V017__vector_search.sql`**

```sql
-- Chunks semânticos de documentos
CREATE TABLE documento_chunks (
    id              NUMBER(19,0) GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    documento_id    NUMBER(19,0) NOT NULL,
    projeto_id      NUMBER(19,0) NOT NULL,
    tenant_id       VARCHAR2(100) NOT NULL,
    chunk_index     NUMBER(5,0)  NOT NULL,
    texto           CLOB         NOT NULL,
    embedding       VECTOR(3072, FLOAT32),  -- Oracle 23ai VECTOR type
    nivel_acesso    VARCHAR2(50)  DEFAULT 'interno',
    criado_em       TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
    CONSTRAINT fk_chunk_documento FOREIGN KEY (documento_id) REFERENCES documentos(id)
);

-- Índice HNSW para busca vetorial eficiente
CREATE VECTOR INDEX idx_chunk_embedding
    ON documento_chunks(embedding)
    ORGANIZATION INMEMORY NEIGHBOR GRAPH
    DISTANCE COSINE
    WITH TARGET ACCURACY 95;

CREATE INDEX idx_chunk_doc     ON documento_chunks(documento_id);
CREATE INDEX idx_chunk_projeto ON documento_chunks(projeto_id);
CREATE INDEX idx_chunk_tenant  ON documento_chunks(tenant_id);
```

---

### 2. Integração Azure OpenAI — `backend/app/integrations/azure_openai.py`

```python
from openai import AzureOpenAI
from app.core.config import settings

class AzureOpenAIClient:
    def __init__(self):
        self._client = AzureOpenAI(
            azure_endpoint=settings.azure_openai_endpoint,
            api_key=settings.azure_openai_api_key,
            api_version="2024-02-01"
        ) if settings.azure_openai_endpoint else None

    def generate_embedding(self, text: str) -> list[float]:
        """Gera embedding 3072-dim com text-embedding-3-large."""
        if not self._client:
            return self._mock_embedding()
        response = self._client.embeddings.create(
            input=text,
            model=settings.azure_openai_embedding_deployment
        )
        return response.data[0].embedding

    def chat_completion(self, system: str, user: str,
                        temperature: float = 0.1) -> str:
        """Chamada GPT-4o para classificação/análise."""
        if not self._client:
            return self._mock_classification()
        response = self._client.chat.completions.create(
            model=settings.azure_openai_deployment,
            messages=[
                {"role": "system", "content": system},
                {"role": "user",   "content": user}
            ],
            temperature=temperature,
            response_format={"type": "json_object"}
        )
        return response.choices[0].message.content

    def _mock_embedding(self) -> list[float]:
        return [0.01] * 3072

    def _mock_classification(self) -> str:
        return '{"tipo_doc":"Planta","disciplina":"Estrutural","revisao":"R02","fase":"Executivo","autor":"Escritório XYZ","nome_padrao":"EST-R02-Planta-Fundacao.pdf","nivel_acesso":"interno","confidence":0.92}'
```

---

### 3. Integração Azure AI Search — `backend/app/integrations/azure_search.py`

```python
from azure.search.documents import SearchClient
from azure.search.documents.models import VectorizedQuery
from azure.core.credentials import AzureKeyCredential
from app.core.config import settings

class AzureSearchClient:
    def __init__(self):
        self._client = SearchClient(
            endpoint=settings.azure_ai_search_endpoint,
            index_name=settings.azure_ai_search_index,
            credential=AzureKeyCredential(settings.azure_ai_search_key)
        ) if settings.azure_ai_search_endpoint else None

    def index_document(self, doc: dict):
        """Indexa chunk no Azure AI Search (híbrido: keyword + vetorial)."""
        if not self._client:
            return
        self._client.upload_documents([doc])

    def search(self, query: str, embedding: list[float],
               tenant_id: str, project_ids: list[int],
               doc_level: str, top_k: int = 5) -> list[dict]:
        """Busca híbrida: keyword + vetorial com filtros de acesso."""
        if not self._client:
            return self._mock_results(query)
        vector_query = VectorizedQuery(
            vector=embedding, k_nearest_neighbors=top_k,
            fields="embedding"
        )
        level_filter = self._build_level_filter(doc_level)
        scope_filter = f"projeto_id in ({','.join(map(str, project_ids))})"
        results = self._client.search(
            search_text=query,
            vector_queries=[vector_query],
            filter=f"tenant_id eq '{tenant_id}' and {scope_filter} and {level_filter}",
            top=top_k,
            select=["documento_id","chunk_index","texto","disciplina","revisao","nome_padrao"]
        )
        return [r for r in results]

    def _build_level_filter(self, user_doc_level: str) -> str:
        levels = {"publico": ["publico"],
                  "interno": ["publico","interno"],
                  "confidencial": ["publico","interno","confidencial"],
                  "restrito": ["publico","interno","confidencial","restrito"]}
        allowed = levels.get(user_doc_level, ["publico"])
        quoted = [f"'{l}'" for l in allowed]
        return f"nivel_acesso in ({','.join(quoted)})"

    def _mock_results(self, query: str) -> list[dict]:
        return [{"documento_id": 1, "texto": f"Resultado mock para: {query}",
                 "disciplina": "Estrutural", "score": 0.92}]
```

---

### 4. nlp_agent — `backend/app/agents/nlp_agent.py`

```python
import json
from app.integrations.azure_openai import AzureOpenAIClient
from app.agents.graph_state import DocumentState
from app.agents.prompts.nlp_prompts import CLASSIFICATION_PROMPT, NAMING_PROMPT

openai_client = AzureOpenAIClient()

def classify_and_prefill(state: DocumentState) -> DocumentState:
    """
    Usa GPT-4o para classificar o documento e pré-preencher todos os metadados.
    Retorna campos prontos para o usuário confirmar (zero digitação).
    """
    prompt_input = f"""
    Nome original: {state.original_filename}
    Texto OCR (primeiros 2000 chars): {state.ocr_text[:2000]}
    Tabelas detectadas: {json.dumps(state.ocr_tables[:3])}
    """
    result_json = openai_client.chat_completion(
        system=CLASSIFICATION_PROMPT,
        user=prompt_input
    )
    result = json.loads(result_json)
    state.tipo_doc     = result.get("tipo_doc", "")
    state.disciplina   = result.get("disciplina", "")
    state.revisao      = result.get("revisao", "R00")
    state.fase         = result.get("fase", "")
    state.autor        = result.get("autor", "")
    state.nome_padrao  = result.get("nome_padrao", state.original_filename)
    state.nivel_acesso = result.get("nivel_acesso", "interno")
    state.pre_fill_confidence = result.get("confidence", 0.0)
    state.status = "confirmacao_pendente"
    return state

def generate_and_index_embeddings(state: DocumentState) -> DocumentState:
    """
    Divide o texto em chunks semânticos (≈500 tokens) e gera embeddings.
    Indexa no Oracle 23ai Vector Search E no Azure AI Search.
    """
    chunks = _split_into_chunks(state.ocr_text, max_tokens=500)
    state.chunks = chunks
    state.embeddings = [openai_client.generate_embedding(c) for c in chunks]
    state.status = "indexed"
    return state

def _split_into_chunks(text: str, max_tokens: int = 500) -> list[str]:
    words = text.split()
    return [" ".join(words[i:i+max_tokens]) for i in range(0, len(words), max_tokens)]
```

**`backend/app/agents/prompts/nlp_prompts.py`**

```python
CLASSIFICATION_PROMPT = """
Você é um especialista em documentação técnica de engenharia civil brasileira.
Analise o documento e retorne um JSON com os campos abaixo.
Use ABNT NBR como referência para nomenclatura de disciplinas.

Retorne APENAS JSON válido com esta estrutura:
{
  "tipo_doc": "Planta|Memorial Descritivo|Laudo|Cronograma|Orçamento|Especificação|Relatório|ART|Contrato|Outro",
  "disciplina": "Estrutural|Hidráulico|Elétrico|Arquitetônico|AVAC|Fundações|Paisagismo|Topografia|Outro",
  "revisao": "R00|R01|R02|...",
  "fase": "Estudo Preliminar|Anteprojeto|Projeto Executivo|As-Built|Outro",
  "autor": "nome do autor ou escritório detectado",
  "nome_padrao": "DISC-REVISAO-Descricao.ext (ex: EST-R02-Planta-Fundacao.pdf)",
  "nivel_acesso": "publico|interno|confidencial|restrito",
  "confidence": 0.0  // 0.0 a 1.0
}
"""
```

---

### 5. Endpoints de Busca Semântica — `backend/app/api/ged_routes.py` (adicionar)

```
GET  /api/ged/busca?q=...&projeto_id=...   — busca híbrida (keyword + vetorial)
GET  /api/ged/busca-semantica              — busca somente vetorial (RAG)
POST /api/ged/similaridade/:id             — documentos similares a um dado doc
```

**Contrato de resposta busca:**
```json
{
  "query": "planta de fundações revisão 02",
  "resultados": [
    {
      "doc_id": 42,
      "nome_padrao": "EST-R02-Planta-Fundacao.pdf",
      "disciplina": "Estrutural",
      "revisao": "R02",
      "score": 0.94,
      "trecho": "...fundação sapata corrida em concreto armado...",
      "blob_url": "https://..."
    }
  ],
  "total": 1,
  "fonte": "oracle_vector+azure_search"
}
```

---

### 6. Endpoint de Versões e Lista Mestra

```
GET  /api/ged/:id/revisoes          — histórico de revisões do documento
GET  /api/projetos/:id/lista-mestra — lista mestra auto-gerada (disciplina × revisão × status)
```

---

### 7. Testes Sprint 5–6

**`backend/tests/test_nlp_agent.py`**
- [ ] Mock OCR text → nlp-agent retorna JSON com todos os campos preenchidos
- [ ] confidence >= 0.7 para documentos típicos de engenharia
- [ ] nivel_acesso inferido corretamente (contratos → confidencial, plantas → interno)
- [ ] nome_padrao segue padrão DISC-REVISAO-Descricao.ext

**`backend/tests/test_ged_search.py`**
- [ ] Busca por keyword retorna resultados relevantes (mock)
- [ ] Busca vetorial com embedding mock retorna top-K
- [ ] Filtro de nivel_acesso: `publico` não retorna docs `confidencial`
- [ ] Filtro de project_ids: escopo `project` não vaza docs de outros projetos
- [ ] Lista mestra agrupada por disciplina corretamente

### Definição de Pronto — Sprint 5–6
- [ ] Pipeline completo: upload → OCR → nlp-agent → pre_fill → confirmação → indexação
- [ ] Busca semântica retorna resultados com score
- [ ] Controle de acesso na busca (nivel_acesso + project_ids)
- [ ] Lista mestra auto-gerada e atualizada após cada upload
- [ ] `npm run test:py` verde

---

## SPRINT 7–8 — NCs, Fluxo de Aprovação e Controle de Acesso Avançado
**Semanas 13–16 | Foco: Não Conformidades + aprovação de documentos + RBAC granular**

### Objetivo
Módulo de NCs completo com base de lições aprendidas. Fluxo de aprovação de documentos com
notificações. Disciplinas customizáveis por projeto (JSON Duality). RBAC com todos os
decoradores implementados e testados com os 8 perfis.

---

### 1. DDL V015 — NCs e Lições Aprendidas

**`database/flyway/sql/V015__ncs.sql`**

```sql
CREATE TABLE nao_conformidades (
    id              NUMBER(19,0) GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id       VARCHAR2(100) NOT NULL,
    projeto_id      NUMBER(19,0)  NOT NULL,
    documento_id    NUMBER(19,0),             -- doc que originou a NC (opcional)
    codigo          VARCHAR2(50)  NOT NULL,   -- NC-2026-001
    tipo            VARCHAR2(100) NOT NULL,   -- Projeto | Execução | Segurança | Qualidade
    severidade      VARCHAR2(50)  NOT NULL,   -- critica | alta | media | baixa
    descricao       CLOB          NOT NULL,
    impacto         CLOB,
    status          VARCHAR2(50)  DEFAULT 'aberta' NOT NULL,
    -- aberta | em_tratamento | aguardando_verificacao | encerrada | cancelada
    responsavel_id  NUMBER(19,0),
    prazo           DATE,
    encerrada_em    TIMESTAMP,
    criado_por      NUMBER(19,0),
    criado_em       TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
    CONSTRAINT fk_nc_projeto    FOREIGN KEY (projeto_id)    REFERENCES projetos(id),
    CONSTRAINT fk_nc_documento  FOREIGN KEY (documento_id)  REFERENCES documentos(id),
    CONSTRAINT ck_nc_severidade CHECK (severidade IN ('critica','alta','media','baixa')),
    CONSTRAINT ck_nc_status     CHECK (status IN (
        'aberta','em_tratamento','aguardando_verificacao','encerrada','cancelada'
    ))
);

CREATE TABLE acoes_corretivas (
    id              NUMBER(19,0) GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nc_id           NUMBER(19,0) NOT NULL,
    descricao       CLOB         NOT NULL,
    responsavel_id  NUMBER(19,0),
    prazo           DATE,
    evidencia_url   VARCHAR2(1000),  -- blob URL do arquivo de evidência
    status          VARCHAR2(50) DEFAULT 'pendente',
    -- pendente | em_andamento | concluida
    criado_em       TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
    CONSTRAINT fk_acao_nc FOREIGN KEY (nc_id) REFERENCES nao_conformidades(id)
);

CREATE TABLE licoes_aprendidas (
    id              NUMBER(19,0) GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nc_id           NUMBER(19,0) NOT NULL,
    tenant_id       VARCHAR2(100) NOT NULL,
    titulo          VARCHAR2(300) NOT NULL,
    descricao       CLOB,
    categoria       VARCHAR2(100),   -- usada para busca semântica futura
    aprovado        NUMBER(1) DEFAULT 0,
    criado_em       TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
    CONSTRAINT fk_licao_nc FOREIGN KEY (nc_id) REFERENCES nao_conformidades(id)
);

CREATE INDEX idx_nc_projeto   ON nao_conformidades(projeto_id);
CREATE INDEX idx_nc_status    ON nao_conformidades(status);
CREATE INDEX idx_nc_severidade ON nao_conformidades(severidade);
```

---

### 2. DDL V016 — Cotações e Contratos de Engenharia

**`database/flyway/sql/V016__cotacoes_contratos.sql`**

```sql
CREATE TABLE cotacoes (
    id              NUMBER(19,0) GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id       VARCHAR2(100) NOT NULL,
    projeto_id      NUMBER(19,0)  NOT NULL,
    titulo          VARCHAR2(300) NOT NULL,
    escopo          CLOB,
    status          VARCHAR2(50)  DEFAULT 'aberta',
    -- aberta | aguardando_propostas | em_analise | encerrada
    criado_por      NUMBER(19,0),
    criado_em       TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
    CONSTRAINT fk_cotacao_projeto FOREIGN KEY (projeto_id) REFERENCES projetos(id)
);

CREATE TABLE propostas_cotacao (
    id              NUMBER(19,0) GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    cotacao_id      NUMBER(19,0) NOT NULL,
    fornecedor_id   NUMBER(19,0),
    nome_fornecedor VARCHAR2(300),
    valor_total     NUMBER(15,2),
    prazo_dias      NUMBER(5,0),
    observacoes     CLOB,
    blob_url        VARCHAR2(1000),  -- PDF da proposta
    status          VARCHAR2(50) DEFAULT 'recebida',
    -- recebida | em_analise | aprovada | rejeitada
    criado_em       TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
    CONSTRAINT fk_proposta_cotacao FOREIGN KEY (cotacao_id) REFERENCES cotacoes(id)
);

-- Contratos de engenharia (adaptado do Projeto Integrado contracts_management_repo)
CREATE TABLE contratos_engenharia (
    id              NUMBER(19,0) GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id       VARCHAR2(100) NOT NULL,
    projeto_id      NUMBER(19,0)  NOT NULL,
    numero          VARCHAR2(100) NOT NULL,
    tipo            VARCHAR2(100),   -- Projeto | Execução | Consultoria | Fornecimento
    fornecedor_id   NUMBER(19,0),
    valor_total     NUMBER(15,2),
    data_assinatura DATE,
    data_inicio     DATE,
    data_fim_prev   DATE,
    status          VARCHAR2(50) DEFAULT 'ativo',
    blob_url        VARCHAR2(1000),
    criado_em       TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
    CONSTRAINT fk_contrato_projeto FOREIGN KEY (projeto_id) REFERENCES projetos(id)
);

CREATE INDEX idx_cotacao_projeto  ON cotacoes(projeto_id);
CREATE INDEX idx_proposta_cotacao ON propostas_cotacao(cotacao_id);
CREATE INDEX idx_contrato_projeto ON contratos_engenharia(projeto_id);
```

---

### 3. JSON Duality View — Disciplinas configuráveis

**Adicionar a `V016` ou criar `V016b`:**
```sql
-- JSON Duality View para disciplinas flexíveis por projeto
CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW disciplinas_projeto_dv AS
    SELECT JSON {
        '_id'       : dp.id,
        'projeto_id': dp.projeto_id,
        'nome'      : dp.nome,
        'ativo'     : dp.ativo
    }
    FROM disciplinas_projeto dp
    WITH INSERT UPDATE DELETE;
```

---

### 4. Endpoints NCs — `backend/app/api/ncs_routes.py`

```
GET    /api/ncs                         — lista (filtros: projeto, status, severidade)
POST   /api/ncs                         — abrir NC [@require_roles(["admin","gestor","coordenador","engenheiro"])]
GET    /api/ncs/:id                     — detalhe
PUT    /api/ncs/:id                     — editar
PATCH  /api/ncs/:id/status              — mudar status (ex: encerrar)
POST   /api/ncs/:id/acoes               — adicionar ação corretiva
PUT    /api/ncs/:id/acoes/:aid          — atualizar ação
POST   /api/ncs/:id/licao               — registrar lição aprendida (após encerrar)
GET    /api/ncs/licoes                  — base de lições aprendidas (tenant-wide)
GET    /api/ncs/dashboard               — resumo: abertas, críticas, vencidas
```

---

### 5. Endpoints Cotações — `backend/app/api/cotacoes_routes.py`

```
GET    /api/cotacoes                    — lista
POST   /api/cotacoes                    — criar [@require_roles(["admin","gestor","coordenador"])]
GET    /api/cotacoes/:id                — detalhe + propostas
POST   /api/cotacoes/:id/propostas      — adicionar proposta (com upload PDF)
PUT    /api/cotacoes/:id/propostas/:pid — atualizar proposta
PATCH  /api/cotacoes/:id/propostas/:pid/status — aprovar/rejeitar
GET    /api/cotacoes/:id/comparativo    — tabela comparativa de propostas
```

---

### 6. Fluxo de Aprovação de Documentos (adicionar ao GED)

Estados: `rascunho` → `revisao` → `aprovacao_pendente` → `aprovado` | `reprovado`

```
PATCH  /api/ged/:id/submeter-revisao    — engenheiro submete para revisão
PATCH  /api/ged/:id/aprovar             — coordenador/gestor aprova [@require_roles(["coordenador","gestor","admin"])]
PATCH  /api/ged/:id/reprovar            — reprovar com comentário
GET    /api/ged/pendentes-aprovacao     — lista docs aguardando aprovação (para coordenador/gestor)
```

---

### 7. RBAC — Completar decoradores em `security.py`

```python
# require_data_scope: injeta project_ids no estado do request
def require_data_scope(minimum_scope: str = "project"):
    async def dependency(
        request: Request,
        current_user = Depends(require_auth())
    ):
        scope = current_user.scope
        if scope == "own":
            request.state.filter_user_id = current_user.id
        elif scope == "project":
            request.state.filter_project_ids = current_user.project_ids
        elif scope == "tenant":
            request.state.filter_tenant_id = current_user.tenant_id
        # "global" não aplica filtro
        return current_user
    return Depends(dependency)

# require_financial_access: bloqueia quem não tem visão financeira
FINANCIAL_ROLES = {"admin", "gestor", "financeiro"}

def require_financial_access():
    def dependency(current_user = Depends(require_auth())):
        if current_user.role not in FINANCIAL_ROLES:
            raise HTTPException(403, "Acesso a dados financeiros não permitido")
        return current_user
    return Depends(dependency)
```

---

### 8. Testes Sprint 7–8

**`backend/tests/test_ncs.py`**
- [ ] Engenheiro abre NC → 201
- [ ] mestre_obras vê NC de sua obra → 200 (read-only)
- [ ] cliente_final tenta ver NCs → 403
- [ ] Ação corretiva adicionada → status NC muda para `em_tratamento`
- [ ] NC encerrada → pode registrar lição aprendida
- [ ] Lições aprendidas listadas no tenant → filtro funciona

**`backend/tests/test_cotacoes.py`**
- [ ] Coordenador cria cotação → 201
- [ ] Proposta adicionada com PDF (mock blob) → `blob_url` salvo
- [ ] Comparativo retorna tabela com valores ordenados por preço
- [ ] Engenheiro tenta criar cotação → 403

**`backend/tests/test_rbac.py`**
- [ ] Scope `project`: engenheiro não vê projetos fora de `project_ids`
- [ ] Scope `tenant`: coordenador vê todos os projetos do tenant
- [ ] `require_financial_access`: projetista → 403 em endpoint de valor de contrato
- [ ] `require_doc_level`: `interno` não retorna docs `confidencial`
- [ ] permissao_customizada override: engenheiro com override `contratos.read=true` consegue ver contratos

### Definição de Pronto — Sprint 7–8
- [ ] NCs completas com ações e lições aprendidas
- [ ] Fluxo de aprovação de docs funcionando (4 estados)
- [ ] RBAC com todos os decoradores cobrindo os 8 perfis
- [ ] Cotações com upload de propostas (mock blob)
- [ ] `npm run test:py` verde

---

## SPRINT 9–10 — RAG, Analysis Agent e Archival
**Semanas 17–20 | Foco: detecção de conflitos entre documentos + archival automático**

### Objetivo
analysis_agent detecta conflitos entre disciplinas usando RAG. data_agent move versões
obsoletas para Cool Tier. DDL Property Graph para rastreabilidade. Contratos completos.

---

### 1. DDL V018 — Property Graph (Rastreabilidade ISO 9001)

**`database/flyway/sql/V018__property_graph.sql`**

```sql
-- Tabela de nós do grafo
CREATE TABLE grafo_nos (
    id          NUMBER(19,0) GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id   VARCHAR2(100) NOT NULL,
    projeto_id  NUMBER(19,0),
    tipo_no     VARCHAR2(50)  NOT NULL,  -- projeto | documento | nc | etapa | fornecedor
    referencia_id NUMBER(19,0) NOT NULL, -- FK para a tabela de origem
    label       VARCHAR2(300),
    criado_em   TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL
);

-- Tabela de arestas do grafo
CREATE TABLE grafo_arestas (
    id          NUMBER(19,0) GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    no_origem   NUMBER(19,0) NOT NULL,
    no_destino  NUMBER(19,0) NOT NULL,
    tipo_aresta VARCHAR2(100) NOT NULL,
    -- originou_nc | revisou | aprovou | substituiu | vinculado_a
    metadados   CLOB,  -- JSON com detalhes da relação
    criado_em   TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
    CONSTRAINT fk_aresta_origem  FOREIGN KEY (no_origem)  REFERENCES grafo_nos(id),
    CONSTRAINT fk_aresta_destino FOREIGN KEY (no_destino) REFERENCES grafo_nos(id)
);

-- Property Graph Oracle 23ai
CREATE PROPERTY GRAPH rastreabilidade_pg
    VERTEX TABLES (
        projetos     KEY (id) LABEL PROJETO    PROPERTIES (id, nome, status),
        documentos   KEY (id) LABEL DOCUMENTO  PROPERTIES (id, nome_padrao, disciplina, revisao),
        nao_conformidades KEY (id) LABEL NC    PROPERTIES (id, codigo, severidade, status),
        etapas_projeto KEY (id) LABEL ETAPA   PROPERTIES (id, nome, percentual)
    )
    EDGE TABLES (
        grafo_arestas KEY (id)
            SOURCE KEY (no_origem)  REFERENCES grafo_nos(id)
            DESTINATION KEY (no_destino) REFERENCES grafo_nos(id)
            LABEL RELACIONA PROPERTIES (tipo_aresta, metadados)
    );
```

---

### 2. analysis_agent — `backend/app/agents/analysis_agent.py`

```python
import json
from app.integrations.azure_openai import AzureOpenAIClient
from app.integrations.azure_search import AzureSearchClient
from app.agents.graph_state import DocumentState
from app.agents.prompts.analysis_prompts import CONFLICT_DETECTION_PROMPT

openai_client = AzureOpenAIClient()
search_client = AzureSearchClient()

def detect_conflicts(state: DocumentState) -> DocumentState:
    """
    RAG: recupera documentos similares da mesma disciplina e usa GPT-4o
    para identificar conflitos, divergências ou inconsistências normativas.
    """
    # Busca documentos similares (mesma disciplina, mesmo projeto)
    similar_docs = search_client.search(
        query=state.ocr_text[:1000],
        embedding=state.embeddings[0] if state.embeddings else [],
        tenant_id=state.tenant_id,
        project_ids=[state.projeto_id],
        doc_level="restrito",  # analysis vê tudo
        top_k=5
    )

    if not similar_docs:
        state.conflicts = []
        state.rag_score = 1.0
        return state

    context = "\n---\n".join([d["texto"] for d in similar_docs])
    result_json = openai_client.chat_completion(
        system=CONFLICT_DETECTION_PROMPT,
        user=f"DOCUMENTO NOVO:\n{state.ocr_text[:2000]}\n\nDOCUMENTOS EXISTENTES:\n{context}"
    )
    result = json.loads(result_json)
    state.conflicts = result.get("conflitos", [])
    state.rag_score = result.get("score_consistencia", 1.0)
    state.status = "analyzed"
    return state
```

**`backend/app/agents/prompts/analysis_prompts.py`**

```python
CONFLICT_DETECTION_PROMPT = """
Você é um especialista em análise técnica de projetos de engenharia civil.
Compare o documento novo com os documentos existentes e identifique:
1. Conflitos diretos (dimensões, especificações ou normas incompatíveis)
2. Divergências (informações diferentes sobre o mesmo elemento)
3. Inconsistências normativas (violações de normas ABNT detectáveis no texto)

Retorne JSON:
{
  "conflitos": [
    {
      "tipo": "conflito_direto|divergencia|inconsistencia_normativa",
      "descricao": "descrição clara do problema",
      "trecho_novo": "trecho do documento novo",
      "trecho_existente": "trecho do documento existente",
      "severidade": "critica|alta|media|baixa"
    }
  ],
  "score_consistencia": 0.95  // 1.0 = sem conflitos
}
"""
```

---

### 3. data_agent — `backend/app/agents/data_agent.py`

```python
from app.integrations.azure_blob import get_blob_client
from app.repositories.ged_repo import GedRepository

blob = get_blob_client()

async def archive_obsolete_revision(documento_id: int, old_blob_path: str, db):
    """
    Quando um documento é substituído por nova revisão:
    1. Muda status da revisão anterior para 'obsoleto'
    2. Move blob para Cool Tier no Azure
    3. Registra evento no audit trail
    """
    await GedRepository(db).mark_revision_obsolete(documento_id)
    blob.move_to_cool_tier(old_blob_path)
    # Oracle Unified Audit registra automaticamente via trigger

async def persist_document_state(state, db):
    """Persiste o estado final do DocumentState no Oracle após confirmação."""
    await GedRepository(db).update_document_after_pipeline(state)

async def persist_chunks_and_embeddings(state, db):
    """Salva chunks e embeddings na tabela documento_chunks."""
    await GedRepository(db).save_chunks(state.chunks, state.embeddings, state)
```

---

### 4. Endpoint de Conflitos e RAG

**Adicionar a `ged_routes.py`:**
```
GET  /api/ged/:id/conflitos        — lista conflitos detectados pelo analysis-agent
POST /api/ged/:id/reanalizar       — força nova análise RAG no documento
GET  /api/projetos/:id/saude-ged   — score geral de consistência do GED do projeto
```

---

### 5. Testes Sprint 9–10

**`backend/tests/test_analysis_agent.py`**
- [ ] Documento sem similares → conflicts=[], rag_score=1.0
- [ ] Mock dois docs com dimensões conflitantes → conflict detectado com severidade correta
- [ ] score_consistencia < 0.5 para conflito crítico

**`backend/tests/test_archival.py`**
- [ ] Nova revisão de doc → revisão anterior marcada `obsoleto` no Oracle
- [ ] Mock blob: `move_to_cool_tier` chamado com path correto
- [ ] GET /api/ged/:id/revisoes mostra status `obsoleto` na revisão anterior

**`backend/tests/test_contratos.py`**
- [ ] Gestor cria contrato com valor → 201
- [ ] Coordenador tenta ver valor → campo `null` (require_financial_access)
- [ ] Financeiro externo vê valor → 200

### Definição de Pronto — Sprint 9–10
- [ ] analysis_agent detecta conflitos em mock com texto real
- [ ] archival move revisão obsoleta para Cool Tier (mock)
- [ ] Property Graph criado no Oracle (executar V018 no mock schema)
- [ ] Contratos completos com controle financeiro por role
- [ ] `npm run test:py` verde

---

## SPRINT 11–12 — Dashboard, Hardening e Go-live F1
**Semanas 21–24 | Foco: KPIs, segurança, performance, E2E e deploy produção**

### Objetivo
Dashboard com KPIs completos da F1. Hardening de segurança (Oracle Unified Audit, rate limiting,
LGPD). Pipeline GED completo de ponta a ponta testado com E2E Playwright. Deploy produção.

---

### 1. Dashboard F1 — `backend/app/repositories/dashboard_repo.py`

KPIs a implementar:

```python
async def get_f1_kpis(tenant_id: str, project_ids: list[int]) -> dict:
    return {
        "projetos_ativos":      # COUNT projetos status=ativo no escopo
        "ncs_abertas":          # COUNT ncs status IN (aberta, em_tratamento)
        "ncs_criticas":         # COUNT ncs severidade=critica AND status!=encerrada
        "docs_pendentes_aprovacao": # COUNT documentos status=aprovacao_pendente
        "docs_processando":     # COUNT documentos status=processando
        "custo_contratos_ativos": # SUM contratos valor_total (role check!)
        "cotacoes_abertas":     # COUNT cotacoes status=aberta
        "ultima_atualizacao":   # SYSTIMESTAMP
    }

async def get_timeline_ncs(tenant_id: str, project_ids: list[int]) -> list:
    # NCs abertas por mês (últimos 6 meses) — para sparkline

async def get_docs_por_disciplina(projeto_id: int) -> list:
    # Contagem de docs por disciplina — para gráfico de barras
```

**Endpoint:**
```
GET /api/dashboard          — KPIs F1 (filtrado por scope do JWT)
GET /api/dashboard/timeline — série temporal NCs (para sparkline)
GET /api/dashboard/ged-status/:projeto_id — breakdown docs por disciplina
```

---

### 2. Oracle Unified Audit — `backend/app/db/oracle_audit.py`

```sql
-- Executar no Oracle (parte do setup de produção)
-- Auditoria de operações sensíveis
CREATE AUDIT POLICY plataforma_audit
    ACTIONS
        INSERT ON usuarios,
        UPDATE ON usuarios,
        DELETE ON usuarios,
        INSERT ON documentos,
        DELETE ON documentos,
        INSERT ON nao_conformidades,
        UPDATE ON contratos_engenharia
    WHEN 'SYS_CONTEXT(''USERENV'',''CLIENT_INFO'') IS NOT NULL'
    EVALUATE PER SESSION;

AUDIT POLICY plataforma_audit;
```

```python
# Adicionar middleware em main.py para injetar trace_id no Oracle Client Info
@app.middleware("http")
async def inject_oracle_trace_id(request: Request, call_next):
    trace_id = request.headers.get("X-Trace-Id", str(uuid.uuid4()))
    request.state.trace_id = trace_id
    # oracle_client.set_client_info(trace_id) — injetar via connection pool
    response = await call_next(request)
    response.headers["X-Trace-Id"] = trace_id
    return response
```

---

### 3. Relatórios F1 — `backend/app/api/relatorios_routes.py`

```
GET /api/relatorios/ncs              — relatório de NCs com filtros e export CSV
GET /api/relatorios/ged              — relatório de documentos por projeto/disciplina
GET /api/relatorios/lista-mestra/:pid — lista mestra completa (download Excel/PDF)
GET /api/relatorios/rastreabilidade/:pid — grafo de rastreabilidade (Property Graph)
```

---

### 4. Hardening de Segurança

**Rate limiting por endpoint sensível** — `backend/app/core/rate_limit.py`:
```python
RATE_LIMITS = {
    "/api/auth/login":         {"max": 10, "window_ms": 60000},   # 10/min
    "/api/ged/upload":         {"max": 20, "window_ms": 60000},   # 20/min por user
    "/api/admin/usuarios":     {"max": 50, "window_ms": 60000},
    "default":                 {"max": 120, "window_ms": 60000}
}
```

**Validações de segurança no upload:**
```python
ALLOWED_MIME_TYPES = {
    "application/pdf", "image/png", "image/jpeg",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "image/tiff", "application/dwg"
}
MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024  # 50 MB

def validate_upload(file: UploadFile):
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(415, "Tipo de arquivo não permitido")
    # tamanho verificado após read()
```

---

### 5. Testes E2E — `tests/e2e/ged_pipeline.spec.ts`

```typescript
test("Pipeline GED completo — do upload ao documento ativo", async ({ page }) => {
  await page.goto("/login")
  await page.fill('[name=email]', 'coordenador@plataforma.dev')
  await page.fill('[name=password]', 'password123')
  await page.click('[type=submit]')

  await page.goto("/ged")
  await page.setInputFiles('input[type=file]', 'tests/fixtures/planta_estrutural.pdf')
  await page.selectOption('[name=projeto_id]', '1')
  await page.click('[data-testid=btn-upload]')

  // Aguarda processamento (polling status)
  await page.waitForSelector('[data-testid=modal-confirmacao]', { timeout: 15000 })

  // Verifica pré-preenchimento
  await expect(page.locator('[name=disciplina]')).toHaveValue('Estrutural')
  await expect(page.locator('[name=revisao]')).not.toHaveValue('')

  // Confirma
  await page.click('[data-testid=btn-confirmar]')
  await expect(page.locator('[data-testid=status-doc]')).toHaveText('Ativo')
})

test("Acesso negado — cliente_final não acessa GED", async ({ page }) => {
  await loginAs(page, 'cliente@plataforma.dev')
  await page.goto("/ged")
  await expect(page).toHaveURL("/dashboard")  // redirecionado
})
```

---

### 6. `requirements.txt` — dependências F1 completas

```
# Azure
azure-storage-blob>=12.19.0
azure-ai-documentintelligence>=1.0.0
azure-search-documents>=11.6.0
openai>=1.35.0

# PDF e imagem
PyMuPDF>=1.24.0
qrcode[pil]>=7.4.2
pillow>=10.3.0

# Oracle 23ai (vector)
oracledb>=2.3.0

# Existentes (manter)
fastapi>=0.116.0
uvicorn[standard]>=0.35.0
pydantic>=2.11.0
pydantic-settings>=2.10.0
python-jose[cryptography]>=3.4.0
passlib[bcrypt]>=1.7.4
python-multipart>=0.0.20
httpx>=0.28.0
pytest>=8.4.0
pytest-asyncio>=0.26.0
```

---

### 7. Mock Data Final — Sprint 11–12

Garantir que todos os mocks estão alinhados com as DDLs:

**`backend/data/`** deve conter:
- `usuarios.json` — 8 usuários (um por perfil)
- `projetos.json` — 3 projetos com etapas e disciplinas
- `documentos.json` — 10 docs com níveis de acesso variados
- `ncs.json` — 5 NCs (status variados, severidades variadas)
- `cotacoes.json` — 2 cotações com propostas
- `contratos.json` — 3 contratos
- `dashboard.json` — KPIs pré-calculados para mock
- `knowledge_base/` — ao menos 3 markdown de engenharia civil para RAG

---

### 8. Checklist Final — Go-live F1

- [ ] `npm run api:dev:mock` sobe e responde em todos os 40+ endpoints
- [ ] `npm run api:dev:oracle` conecta ao Oracle 23ai (quando disponível)
- [ ] `npm run test:py` 100% verde (todos os arquivos test_*.py)
- [ ] `npm run test:e2e` — pipeline GED completo passa
- [ ] `npm run test:coverage` ≥ 75% nos caminhos críticos
- [ ] Todos os 8 perfis demo testados (login + fluxo principal)
- [ ] Oracle Unified Audit ativo para operações sensíveis
- [ ] Upload rejeita arquivos > 50 MB e tipos não permitidos
- [ ] Rate limiting ativo em `/api/auth/login`
- [ ] CI/CD pipeline verde (test → hml → prod)
- [ ] Variáveis Azure configuradas no Key Vault de produção

---

## Resumo dos Endpoints F1

| Grupo | Quantidade | Principais |
|-------|-----------|-----------|
| Auth | 4 | login, me, logout, reset-senha |
| Admin/Usuários | 12 | CRUD usuários, vínculos, permissões, log |
| Projetos | 10 | CRUD, etapas, disciplinas, equipe |
| GED | 14 | upload, status, confirmar, busca, revisões, aprovação |
| NCs | 9 | CRUD, ações, lições, dashboard |
| Cotações | 7 | CRUD, propostas, comparativo |
| Contratos | 6 | CRUD, detalhes |
| Dashboard | 3 | KPIs, timeline, GED-status |
| Relatórios | 4 | NCs, GED, lista-mestra, rastreabilidade |
| WebSocket | 1 | /ws/ged/{trace_id} |
| **Total** | **~70** | |

## Resumo das Migrations F1

| Migration | Tabelas | Linhas DDL (aprox.) |
|-----------|---------|---------------------|
| V013 | usuarios, usuario_projetos, permissoes_customizadas, projetos, etapas_projeto, disciplinas_projeto, fornecedores | ~120 |
| V014 | documentos, revisoes_documento, lista_mestra | ~80 |
| V015 | nao_conformidades, acoes_corretivas, licoes_aprendidas | ~70 |
| V016 | cotacoes, propostas_cotacao, contratos_engenharia | ~70 |
| V017 | documento_chunks (VECTOR), índice HNSW | ~30 |
| V018 | grafo_nos, grafo_arestas, Property Graph DDL | ~50 |

## Dependências entre Sprints

```
Sprint 1-2 (auth + scaffold)
    └── Sprint 3-4 (GED upload) ← depende do auth JWT
        └── Sprint 5-6 (nlp + busca) ← depende do GED
            └── Sprint 9-10 (RAG) ← depende dos embeddings
Sprint 7-8 (NCs + RBAC) ← paralelo com 5-6, depende de 3-4
Sprint 11-12 (dashboard + go-live) ← depende de todos
```

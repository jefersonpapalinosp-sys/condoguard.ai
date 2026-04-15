# CLAUDE.md — Plataforma Integrada de Construção Civil

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Plataforma Integrada de Construção Civil** — SaaS que conecta gestão de projetos de engenharia, gestão de obra, inteligência artificial e marketplace em um ecossistema único para o setor da construção civil.

> "A primeira plataforma que começa no projeto e conecta até a obra com inteligência."

**Base de código:** Projeto Integrado adaptado — React + TypeScript (Vite), FastAPI (Python), Oracle Database 23ai com fallback mock para desenvolvimento local.

**Autores:** Jeferson Papalino, Renan Papalino | Colaboração: Juliana Félix
**Versão do documento:** 5.0 — Abril 2026 | 4 Fases | 19 meses | 36 Sprints

---

## Commands

### Development
```bash
npm install            # Instalar dependências frontend
npm run dev            # React dev server (porta 3000)
npm run api:dev        # FastAPI com hot reload (porta 4000)
npm run api:dev:mock   # FastAPI com mock database (sem Oracle)
npm run api:dev:oracle # FastAPI com Oracle 23ai
```

### Build & Lint
```bash
npm run lint    # TypeScript type check
npm run check   # lint + build
npm run build   # Production Vite build
npm run clean   # Remove dist/
```

### Testing
```bash
npm run test              # Frontend unit/component tests (Vitest)
npm run test:unit         # Unit tests only
npm run test:component    # Component tests only
npm run test:integration  # Integration tests
npm run test:e2e          # Playwright E2E (inicia ambos servidores)
npm run test:e2e:headed   # E2E com browser visível
npm run test:py           # Backend pytest suite
npm run test:api          # API parity tests
npm run test:contract     # Contract endpoint tests
npm run test:coverage     # Coverage report (75% threshold)
npm run test:all          # Suite completa (frontend + backend + E2E)
```

### Database Migrations
```bash
npm run db:migrate:flyway  # Flyway migrations no Oracle 23ai
```

### Azure (produção / homologação)
```bash
az login                              # Login Azure CLI
az acr login --name <registry-name>  # Login Azure Container Registry
az staticwebapp deploy                # Deploy frontend Azure Static Web Apps
docker build -t api .                 # Build imagem do backend
az containerapp update --name api ... # Deploy API Azure Container Apps
```

---

## Architecture

### Stack Completa

| Camada | Tecnologia | Descrição |
|--------|-----------|-----------|
| Frontend | React 19 + Vite 6 + TypeScript | SPA responsiva + PWA offline |
| Hosting Frontend | Azure Static Web Apps | CDN global |
| Mobile | PWA (F1) → React Native (F2) | Android primeiro, sync offline, câmera, push |
| API Gateway | FastAPI + Azure Container Apps | Auto-scaling, REST + WebSocket real-time |
| Tarefas assíncronas | FastAPI BackgroundTasks (F1–F2) → RabbitMQ (F3+) | Background simples até F2; filas dedicadas a partir de F3 |
| Agentes IA | Pool de 6 agentes Python | storage / file / nlp / analysis / data / photo / whatsapp |
| Banco de Dados | Oracle Database 23ai (OCI via ODSA) | Vector Search + Property Graph + JSON Duality |
| Busca Semântica | Azure AI Search + Oracle Text | Híbrida: keyword + vetorial + semantic ranking |
| IA/LLM | Azure OpenAI (GPT-4o) + Oracle ML | Embeddings 3072-dim, classificação in-database |
| OCR/Documentos | Azure AI Document Intelligence | OCR, tabelas, layout de plantas, QR stamp automático |
| Storage | Azure Blob + Cool Storage | Docs ativos / arquivo morto (Cool Tier automático) |
| Auth | JWT email + senha (bcrypt) | Admin gerencia usuários via painel; sem SSO externo |
| CI/CD | GitHub Actions + ACR | build → testes → deploy Container Apps / Static Web Apps |
| Monitoramento | Azure Monitor + Application Insights | Métricas, traces, alertas |
| Segurança | Oracle TDE + Database Vault + Key Vault | Criptografia repouso/trânsito + LGPD |

### Pool de Agentes IA

| Agente | Fase | Responsabilidade |
|--------|------|-----------------|
| `storage_agent.py` | F1 | Azure Blob: organização de pastas, nomenclatura, metadados, lista mestra, archival (Cool Tier) |
| `file_agent.py` | F1 | OCR, tabelas, chunking semântico, QR stamp automático em PDFs |
| `nlp_agent.py` | F1 | Classificação, embeddings (3072-dim), pré-preenchimento para confirmação |
| `analysis_agent.py` | F1–F3 | RAG, conflitos entre disciplinas, verificação normativa, cross-project analytics |
| `data_agent.py` | F1–F2 | Oracle CRUD, audit trail, cache |
| `photo_agent.py` | F2 | Validação qualidade fotos, orientação ângulo/iluminação, tags Oracle ML |
| `whatsapp_agent.py` | F3 | WhatsApp Business API: img/áudio/doc → registro automático, notificações outbound |

> **F1–F2:** Agentes executam via `FastAPI BackgroundTasks` (sem infra extra). **F3+:** Migrar para RabbitMQ quando o volume de uploads justificar filas dedicadas.

### Fluxo de Upload Inteligente (GED — F1)
```
Usuário faz upload
  → React → FastAPI → Azure Blob (staging, TTL 24h)
  → [BackgroundTask] file-agent: OCR (Azure AI Document Intelligence) + QR stamp no PDF
  → [BackgroundTask] nlp-agent: classificação automática (tipo, disciplina, revisão, autor)
                              + pré-preenchimento de todos os campos
  → WebSocket → Modal React "Confirmar" (usuário só clica Confirmar — zero digitação)
  → chunking semântico + embedding (Azure OpenAI, 3072-dim)
  → Oracle 23ai AI Vector Search + Azure AI Search (indexação dual)
  → storage-agent: move para pasta definitiva no Blob (nomenclatura padrão + metadados)
  → analysis-agent: RAG — conflitos entre disciplinas, divergências normativas
  → data-agent: versão anterior movida para Cool Tier automaticamente
  → WebSocket → notificação final (score, alertas, sugestões)
```

### Autenticação

**Modelo:** JWT email + senha (bcrypt) — reutilizado do Projeto Integrado sem alterações no core.
- `AUTH_PROVIDER=local_jwt` em todos os ambientes
- Token JWT (1h) no `localStorage`; payload inclui `role`, `tenant_id`, `project_ids`, `doc_level`
- Backend: `backend/app/core/security.py` (base existente + novos decoradores de permissão)
- Admin cria, edita, ativa/desativa e redefine senhas de usuários via `/admin/usuarios`

**Credenciais demo (ENABLE_DEMO_AUTH=true — apenas dev/mock):**
- `admin@plataforma.dev` / `password123` — Administrador
- `gestor@plataforma.dev` / `password123` — Gestor de Projetos/Obras
- `coordenador@plataforma.dev` / `password123` — Coordenador Técnico
- `engenheiro@plataforma.dev` / `password123` — Engenheiro/Projetista
- `mestre@plataforma.dev` / `password123` — Mestre de Obras
- `cliente@plataforma.dev` / `password123` — Cliente Final
- `prestador@plataforma.dev` / `password123` — Prestador de Serviço
- `financeiro@plataforma.dev` / `password123` — Financeiro Externo

---

### Gestão de Acesso — Perfis de Usuário

A plataforma opera com **8 perfis** organizados em 3 grupos: Operação Interna, Externos e Plataforma.

#### Grupo 1 — Operação Interna (usuários da construtora)

| Perfil | Código | Descrição |
|--------|--------|-----------|
| Administrador | `admin` | Controle total da plataforma: usuários, configurações, todos os projetos e obras, observabilidade, financeiro completo |
| Gestor de Projetos/Obras | `gestor` | Gerencia projetos e obras de ponta a ponta; vê financeiro; aprova documentos; define acesso de terceiros |
| Coordenador Técnico | `coordenador` | GED, NCs, cotações, contratos técnicos; sem acesso a financeiro estratégico |
| Engenheiro/Projetista | `engenheiro` | Trabalha nos próprios documentos; visualiza projetos autorizados; não vê financeiro |
| Mestre de Obras / Técnico de Campo | `mestre_obras` | Diário (RDO), OS, fotos de obra, medições físicas; sem acesso a projetos técnicos ou financeiro |

#### Grupo 2 — Externos (fora da construtora)

| Perfil | Código | Descrição |
|--------|--------|-----------|
| Cliente Final | `cliente_final` | Dono/investidor da obra; acesso somente ao portal do cliente — feed da obra, fotos públicas, relatórios simplificados sem valores estratégicos |
| Prestador de Serviço | `prestador` | Empreiteiro ou fornecedor contratado; acessa apenas as OS e documentos que lhe foram atribuídos; envia fotos e registra progresso |
| Financeiro Externo | `financeiro` | Escritório de contabilidade ou controller; acessa medições, contratos e faturas de um projeto específico; sem acesso a documentos técnicos |

#### Grupo 3 — Plataforma (F4 — Marketplace)

| Perfil | Código | Descrição |
|--------|--------|-----------|
| Prestador Marketplace | `prestador_mkt` | Perfil público no marketplace; gerencia próprio cadastro, portfólio e responde a avaliações; sem acesso a projetos reais |

---

### Matriz de Acesso por Módulo

`✅ total` · `📖 somente leitura` · `🔒 próprio escopo` · `❌ sem acesso`

| Módulo | admin | gestor | coordenador | engenheiro | mestre_obras | cliente_final | prestador | financeiro |
|--------|:-----:|:------:|:-----------:|:----------:|:------------:|:-------------:|:---------:|:----------:|
| Dashboard (KPIs) | ✅ | ✅ | ✅ | 📖 | 📖 restrito | 📖 simplificado | ❌ | 📖 financeiro |
| Projetos (CRUD) | ✅ | ✅ | ✅ | 🔒 autorizados | ❌ | ❌ | ❌ | ❌ |
| GED — upload | ✅ | ✅ | ✅ | 🔒 próprios | ❌ | ❌ | ❌ | ❌ |
| GED — busca/visualização | ✅ | ✅ | ✅ | 🔒 autorizados | ❌ | ❌ | ❌ | ❌ |
| Versões/Revisões | ✅ | ✅ | ✅ | 🔒 próprias | ❌ | ❌ | ❌ | ❌ |
| NCs | ✅ | ✅ | ✅ | 🔒 próprias | 📖 da obra | ❌ | ❌ | ❌ |
| Cotações | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Contratos | ✅ | ✅ | 📖 | ❌ | ❌ | ❌ | 📖 próprios | ✅ |
| Cadastros gerais | ✅ | ✅ | ✅ | 📖 | ❌ | ❌ | ❌ | ❌ |
| Obras (gestão) | ✅ | ✅ | 📖 | ❌ | 🔒 atribuídas | ❌ | ❌ | ❌ |
| Diário de Obra (RDO) | ✅ | ✅ | 📖 | ❌ | ✅ atribuídas | 📖 resumido | ❌ | ❌ |
| Ordens de Serviço | ✅ | ✅ | 📖 | ❌ | 🔒 atribuídas | ❌ | 🔒 atribuídas | ❌ |
| Medições | ✅ | ✅ | 📖 | ❌ | 📖 física | ❌ | ❌ | ✅ |
| Equipe / Efetivo | ✅ | ✅ | 📖 | ❌ | 🔒 própria obra | ❌ | ❌ | ❌ |
| Portal Cliente | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Relatórios | ✅ | ✅ | ✅ | ❌ | 📖 da obra | 📖 resumido | ❌ | 📖 financeiro |
| Comunicados | ✅ | ✅ | ✅ | 📖 | 📖 | ❌ | 📖 próprio | ❌ |
| Chat IA | ✅ | ✅ | ✅ | ✅ | 📖 | ❌ | ❌ | ❌ |
| Check-up IA (F3) | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Analytics (F3) | ✅ | ✅ | 📖 | ❌ | ❌ | ❌ | ❌ | ❌ |
| WhatsApp (F3) | ✅ | ✅ | 📖 | ❌ | ✅ | ✅ recebe | 📖 | ❌ |
| Marketplace (F4) | ✅ | 📖 | ❌ | ❌ | ❌ | ❌ | 🔒 próprio perfil | ❌ |
| Configurações | ✅ | 📖 tenant | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Gestão de Usuários | ✅ | 🔒 externos do próprio tenant | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Observabilidade | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

### Níveis de Documento (GED)

Todo documento no GED possui um `nivel_acesso` que restringe quem pode visualizá-lo ou baixá-lo,
independente do perfil do usuário.

| Nível | Código | Visível para |
|-------|--------|-------------|
| Público | `publico` | Todos os usuários com acesso ao projeto, incluindo cliente_final |
| Interno | `interno` | Apenas usuários internos (admin, gestor, coordenador, engenheiro, mestre_obras) |
| Confidencial | `confidencial` | Somente admin, gestor e coordenador |
| Restrito | `restrito` | Somente admin e gestor |

> O `nivel_acesso` é atribuído automaticamente pelo `nlp-agent` durante o upload e pode ser
> ajustado manualmente pelo gestor ou coordenador. Nunca pelo engenheiro ou externos.

**Regra de visibilidade em tela:** campos, valores e informações também seguem o nível do usuário.
Exemplo: a coluna "Valor do Contrato" é exibida para `admin`/`gestor`/`financeiro`; para
`coordenador` aparece como `---`; para demais perfis o campo não é renderizado.

---

### Escopo de Dados (Data Scope)

Controla quais registros cada usuário pode ver, além do nível de documento.

| Escopo | Código | Quem usa | Regra |
|--------|--------|----------|-------|
| Global | `global` | admin | Vê todos os tenants, todos os projetos |
| Tenant | `tenant` | gestor, coordenador, financeiro | Vê todos os projetos do próprio tenant |
| Projeto | `project` | engenheiro, mestre_obras | Vê apenas os projetos/obras em `project_ids` (JWT) |
| Próprio | `own` | prestador, financeiro_externo | Vê apenas registros onde é o responsável direto |

O escopo é injetado no JWT como `"scope": "project"` e `"project_ids": [42, 87]`.
O backend filtra automaticamente via `require_data_scope()` antes de qualquer query.

---

### Visibilidade de Informações Financeiras

Dados financeiros (valores de contrato, custos, medições financeiras, orçamento detalhado) têm
controle adicional independente do perfil:

| Campo financeiro | admin | gestor | coordenador | engenheiro | mestre_obras | cliente_final | prestador | financeiro |
|-----------------|:-----:|:------:|:-----------:|:----------:|:------------:|:-------------:|:---------:|:----------:|
| Valor total do contrato | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | 🔒 próprio | ✅ |
| Orçamento detalhado (SINAPI) | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Medição financeira (R$) | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Medição física (%) | ✅ | ✅ | ✅ | ❌ | ✅ | 📖 resumida | ❌ | ✅ |
| Custo acumulado da obra | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Desvio orçamentário | ✅ | ✅ | 📖 alerta | ❌ | ❌ | ❌ | ❌ | ✅ |
| Dados bancários / NF | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | 🔒 próprios | ✅ |

---

### Implementação Técnica

#### Database — tabelas de controle de acesso (V013+)

```sql
-- Usuários com perfil e tenant
usuarios (
  id, nome, email, senha_hash, role, tenant_id,
  ativo, criado_por, criado_em, ultimo_acesso
)

-- Vínculo usuário ↔ projetos autorizados (para scope=project)
usuario_projetos (
  usuario_id, projeto_id, permissao_nivel  -- 'leitura' | 'edicao' | 'aprovacao'
)

-- Permissões customizadas por usuário (override do perfil padrão)
permissoes_customizadas (
  usuario_id, recurso, acao, permitido  -- ex: 'contratos', 'read', true
)
```

#### JWT Payload
```json
{
  "sub": "42",
  "email": "joao@construtora.com",
  "role": "engenheiro",
  "tenant_id": "construtoraXYZ",
  "scope": "project",
  "project_ids": [12, 34],
  "doc_level": "interno",
  "exp": 1718000000
}
```

#### Backend — decoradores (`backend/app/core/security.py`)
```python
@require_auth()                                    # Qualquer usuário autenticado
@require_roles(["admin", "gestor"])               # Perfil mínimo
@require_data_scope("project")                     # Filtra por project_ids do JWT
@require_doc_level("confidencial")                 # Nível mínimo do documento
@require_financial_access()                        # Bloqueia quem não vê financeiro
```

#### Frontend — hook e componente de permissão
```typescript
// Hook
const { can, role, docLevel } = usePermissions()
can('read', 'contratos')           // boolean
can('write', 'ged')                // boolean
can('view_financial')              // boolean

// Componente guard
<Can action="read" resource="contratos">
  <ContratosPage />
</Can>

// Sidebar filtrada automaticamente
// Colunas financeiras renderizadas condicionalmente
// Campos sensíveis substituídos por "---" se sem permissão
```

#### Sidebar — visibilidade por perfil
A sidebar renderiza apenas os itens permitidos para o `role` do JWT. Itens bloqueados não
aparecem no DOM (não apenas desabilitados — não renderizados).

---

### Painel de Gestão de Usuários (admin-only: `/admin/usuarios`)

Funcionalidades disponíveis exclusivamente para o perfil `admin`:

- **Listar** todos os usuários do tenant com filtro por perfil, status e projeto
- **Criar** usuário: email, nome, perfil, projetos autorizados, nível de documento máximo
- **Editar** perfil e permissões de qualquer usuário
- **Ativar / Desativar** conta (sem deletar — preserva audit trail)
- **Redefinir senha** e enviar email de boas-vindas
- **Vincular projetos**: selecionar quais projetos o usuário pode acessar
- **Permissões customizadas**: override pontual do perfil padrão por módulo
- **Histórico de acesso**: último login, IPs recentes, ações auditadas
- **Gestão de externos**: criar contas para `cliente_final`, `prestador` e `financeiro` com prazo de expiração opcional

### Oracle Database 23ai

| Feature | Uso na Plataforma |
|---------|------------------|
| AI Vector Search | Embeddings de docs, RAG, busca semântica, cross-project analytics |
| Pluggable Databases (PDB) | PDB por construtora — isolamento multi-tenant real |
| Property Graph | Dependências projeto↔obra↔doc↔NC, rastreabilidade ISO 9001 |
| JSON Duality Views | Diário de obra, OS, configurações de disciplinas flexíveis |
| Oracle ML | Classificação de fotos, orçamento automático, matching marketplace |
| Partitioning | Medições, fotos, diário particionados por projeto + período |
| TDE + Database Vault | Criptografia LGPD + acesso granular |
| Oracle Unified Audit | Audit trail: timestamp + user_id + trace_id + IP |

**Migrations Flyway (V013–V020):**
```
V013 — DDL base F1: projetos, etapas_projeto, equipe, fornecedores
V014 — GED: documentos, revisoes_documento, lista_mestra
V015 — NCs: nao_conformidades, acoes_corretivas, licoes_aprendidas
V016 — Cotações e contratos de engenharia
V017 — Vector Search: embeddings, chunks, índices vetoriais
V018 — Property Graph: nós e arestas projeto↔doc↔nc
V019 — F2: obras, etapas_obra, diario_obra, ordens_servico, medicoes, efetivo
V020 — F4: marketplace, prestadores, avaliacoes, cashback
```

---

## Frontend (`src/`)

### Entry Point
`src/main.tsx` → `src/App.tsx` → `src/app/AppProviders.tsx`

### Routing
`src/app/router/AppRouter.tsx` — React Router v7 + AuthProvider

### Layout (AppLayout)
```
AppLayout (src/features/layout/components/AppLayout.tsx)
├── Sidebar (itens filtrados por role)
│   ├── [F1] Dashboard, Projetos, GED, Versões/Revisões,
│   │        NCs, Cotações, Contratos, Cadastros
│   ├── [F2] Obras, Diário/RDO, Ordens de Serviço,
│   │        Medições, Equipe, Portal Cliente
│   ├── [F3] Check-up IA, Analytics, WhatsApp
│   └── Admin: Comunicados, Configurações, Observabilidade
├── Header
│   ├── Logo "Plataforma Integrada"
│   ├── Título da página (dinâmico)
│   ├── Notificações 🔔 (NCs críticas, docs pendentes — polling 30s)
│   └── Perfil do usuário + logout
├── Breadcrumb (dinâmico por pathname)
└── Main content (Outlet para rotas aninhadas)
```

### Feature Modules (`src/features/`)

#### FASE 1 — Gestão de Projetos

| Módulo | Rotas | Descrição |
|--------|-------|-----------|
| `auth/` | `/login` | Login email + senha, gestão de usuários em `/settings/usuarios` |
| `dashboard/` | `/dashboard` | KPIs: projetos ativos, NCs abertas, docs pendentes, custo |
| `projetos/` | `/projetos`, `/projetos/novo`, `/projetos/:id` | CRUD projetos de engenharia |
| `ged/` | `/ged` | GED inteligente: upload → OCR → classificação → busca semântica |
| `versoes/` | `/versoes` | Controle de revisões R0x, status vigente/obsoleto, rollback |
| `ncs/` | `/ncs`, `/ncs/:id` | Não Conformidades: tipo, impacto, ação corretiva, lições aprendidas |
| `cotacoes/` | `/cotacoes` | Mapa de cotação: comparativo de propostas, histórico fornecedores |
| `contratos/` | `/contratos/*` | Contratos com fornecedores — 8 sub-rotas (herdado Projeto Integrado) |
| `cadastros/` | `/cadastros` | Equipes, fornecedores, disciplinas, equipamentos |
| `comunicados/` | `/comunicados` | Avisos para equipes (herdado Projeto Integrado) |
| `settings/` | `/settings` | Disciplinas por projeto, thresholds, configurações |
| `observability/` | `/observability` | Métricas, audit logs (admin-only, herdado Projeto Integrado) |

**Dashboard KPIs (F1):**
- Projetos Ativos (sparkline azul)
- NCs Abertas (sparkline vermelho)
- Documentos Pendentes de Aprovação (sparkline laranja)
- Custo Acumulado do Mês (sparkline verde)

#### FASE 2 — Gestão de Obras (adicionados Sprint 13+)

| Módulo | Rotas | Descrição |
|--------|-------|-----------|
| `obras/` | `/obras`, `/obras/:id` | Gestão de obras, etapas, QR Code por pavimento |
| `diario/` | `/diario` | Diário de Obra (RDO): feed cronológico, fotos, clima, efetivo |
| `ordens-servico/` | `/os`, `/os/:id` | OS: checklists, fotos, vídeos, responsável |
| `medicoes/` | `/medicoes` | Medições: evolução física %, faturamento vs orçamento |
| `equipe/` | `/equipe` | Efetivo diário, produtividade, terceirizados |
| `portal-cliente/` | `/portal` | Feed público, relatórios simples para clientes |

#### FASE 3 — Inteligência (adicionados Sprint 22+)

| Módulo | Rotas | Descrição |
|--------|-------|-----------|
| `check-up/` | `/check-up` | Score geral: riscos, oportunidades, benchmarks |
| `analytics/` | `/analytics` | Cross-project analytics, comparativos entre obras |
| `whatsapp/` | `/whatsapp` | Painel agente WhatsApp Business |

#### FASE 4 — Marketplace (adicionados Sprint 29+)

| Módulo | Rotas | Descrição |
|--------|-------|-----------|
| `marketplace/` | `/marketplace` | Prestadores, fornecedores, matching IA, avaliações, cashback |

### Service Layer (`src/services/`)
- `http.ts` — Fetch wrapper: JWT injeção automática, 8s timeout, 2 retries em 5xx, fallback mock
- `apiStatus.ts` — Rastreia fonte de dados (API vs mock) por módulo
- `fallbackPolicy.ts` — Auto-fallback: dev=true, hml/prod=false (opt-in via VITE_ENABLE_MOCK_FALLBACK)
- `authTokenStore.ts` — Armazenamento JWT, expiração, refresh
- `authEvents.ts` — Sincronização cross-tab

Serviços de domínio: `projetosService.ts`, `gedService.ts`, `ncsService.ts`, `cotacoesService.ts`,
`contratosService.ts`, `obrasService.ts`, `diarioService.ts`, `medicoesService.ts`, etc.

### Shared Components (`src/shared/ui/`)
- `LoadingState.tsx` — Skeleton loader
- `ErrorState.tsx` — Mensagem de erro + retry
- `EmptyState.tsx` — Estado vazio
- `StatusBadge.tsx` — Badges de severidade/status
- `DataSourceBadge.tsx` — Indicador "API real" / "mock fallback"
- `PaginationBar.tsx` — Navegação de páginas
- `ChatbotWidget.tsx` — Botão flutuante de chat
- `ApiFallbackToast.tsx` — Toast notificação de fallback
- `ErrorBoundary.tsx` — React error boundary

### Paleta de Cores (Tailwind CSS v4 + Material Design 3)
```css
--md-sys-color-primary: #1565C0;        /* Azul construção */
--md-sys-color-secondary: #E65100;      /* Laranja obra */
--md-sys-color-tertiary: #2E7D32;       /* Verde progresso */
--md-sys-color-error: #C62828;          /* Vermelho NC/alerta */
--md-sys-color-surface: #F5F5F5;        /* Cinza neutro */
--md-sys-color-on-primary: #FFFFFF;
--md-sys-color-on-surface: #1C1B1F;
```

---

## Backend (`backend/app/`)

### Entry Point
`backend/app/main.py` — registra middleware stack e monta routers

### Middleware Stack (ordem de execução)
1. `TraceIdMiddleware` — Adiciona X-Trace-Id para rastreamento
2. `SecurityHeadersMiddleware` — HSTS, X-Content-Type-Options, X-Frame-Options
3. `CORSMiddleware` — Allowlist configurável por ambiente
4. `RateLimitMiddleware` — 120 req/min padrão, 20 req/min login
5. Observability middleware — Registra métricas de request/error

### Routers
- `api/routes.py` — Router principal (~24 endpoints legados + novos)
- `api/projetos_routes.py` — CRUD projetos, disciplinas, equipes
- `api/ged_routes.py` — Upload, indexação, busca semântica, versões
- `api/ncs_routes.py` — NCs: CRUD, ações corretivas, lições aprendidas
- `api/cotacoes_routes.py` — Mapa de cotação, propostas
- `api/obras_routes.py` — Gestão de obras, etapas, QR code
- `api/diario_routes.py` — Diário de Obra, RDO, fotos
- `api/os_routes.py` — Ordens de Serviço, checklists
- `api/medicoes_routes.py` — Medições físico-financeiras
- `api/whatsapp_routes.py` — Webhooks WhatsApp Business (F3)
- `api/marketplace_routes.py` — Prestadores, avaliações, matching (F4)
- `contracts_module_routes.py` — Contratos (herdado)

### Repository Pattern (`backend/app/repositories/`)
Cada repositório suporta transparentemente `DB_DIALECT=oracle` (Oracle 23ai via `oracledb`) ou
`DB_DIALECT=mock` (JSON em `backend/data/`):

```python
def get_data():
    if settings.db_dialect == "oracle":
        return fetch_from_oracle_pool()
    else:
        return load_from_json("backend/data/projetos.json")
```

**Repositories:**
- `projetos_repo.py` — CRUD projetos, etapas, disciplinas
- `ged_repo.py` — Documentos, versões, lista mestra, busca semântica
- `ncs_repo.py` — Não conformidades, ações, lições aprendidas
- `cotacoes_repo.py` — Propostas, comparativo, histórico fornecedores
- `contratos_repo.py` / `contratos_management_repo.py` — Contratos (herdados)
- `obras_repo.py` — Obras, etapas, QR code por pavimento
- `diario_repo.py` — Diário de obra (JSON Duality Views)
- `os_repo.py` — Ordens de serviço, checklists
- `medicoes_repo.py` — Medições físico-financeiras
- `equipe_repo.py` — Efetivo diário, produtividade
- `dashboard_repo.py` — KPIs agregados
- `chat_repo.py` — Chat IA via analysis-agent
- `marketplace_repo.py` — Prestadores, avaliações, cashback (F4)
- `auth_repo.py`, `settings_repo.py`, `comunicados_repo.py`, `reports_repo.py` — Herdados

### Agentes IA (`backend/app/agents/`)
```
backend/app/agents/
├── storage_agent.py      # F1: Azure Blob — organização, nomenclatura, metadados, Cool Tier
├── file_agent.py         # F1: OCR, QR stamp, chunking semântico
├── nlp_agent.py          # F1: embeddings, classificação, pré-preenchimento
├── analysis_agent.py     # F1-3: RAG, conflitos, cross-project analytics
├── data_agent.py         # F1-2: Oracle CRUD, audit trail, cache
├── photo_agent.py        # F2: validação fotos, orientação, tags ML
├── whatsapp_agent.py     # F3: WhatsApp Business API
├── prompts/
│   └── *.py              # System prompts por agente
└── graph_state.py        # Estado compartilhado (Pydantic)
```

> F1–F2: agentes chamados via `FastAPI BackgroundTasks`. F3+: migrar para RabbitMQ se necessário.

### Routers adicionais
- `api/usuarios_routes.py` — CRUD de usuários (admin-only): criar, editar, desativar, redefinir senha

### Security (`backend/app/core/security.py`)
- `AUTH_PROVIDER=local_jwt` — JWT email+senha em todos os ambientes (reutilizar do Projeto Integrado)
- Decoradores: `require_auth()`, `require_roles([...])`, `require_tenant_scope()`
- Oracle Unified Audit: todas as operações sensíveis auditadas com trace_id

### Observability
- Middleware auto-instrumenta todos os endpoints
- `GET /api/observability/metrics` — Métricas estilo Prometheus
- Oracle Unified Audit → `logs/security-audit.log`
- Azure Monitor + Application Insights (produção)

---

## Database (`database/`)

### Flyway Migrations
```
database/flyway/sql/
├── V001–V012  — Schema Projeto Integrado (base, mantidos para compatibilidade)
├── V013       — Tabelas base F1 (projetos, etapas_projeto, equipe, fornecedores)
├── V014       — GED: documentos, revisoes_documento, lista_mestra
├── V015       — NCs: nao_conformidades, acoes_corretivas, licoes_aprendidas
├── V016       — Cotações e contratos de engenharia
├── V017       — Vector Search: embeddings, chunks, índices vetoriais Oracle 23ai
├── V018       — Property Graph: nós/arestas projeto↔doc↔nc (ISO 9001)
├── V019       — F2: obras, etapas_obra, diario_obra, os, medicoes, efetivo
└── V020       — F4: marketplace, prestadores, avaliacoes, cashback
```

### Mock Data (`backend/data/`)
JSON fixtures para desenvolvimento sem Oracle:
- `projetos.json`, `documentos.json`, `ncs.json`, `cotacoes.json`
- `obras.json`, `diario.json`, `medicoes.json`, `equipe.json`
- `knowledge_base/` — Documentos de engenharia civil (normas ABNT, templates RDO, glossário)

---

## Environment Setup

Copiar `.env.example` para `.env.local`. Variáveis principais:

### Frontend (.env.local)
| Variável | Finalidade | Default |
|----------|-----------|---------|
| `VITE_API_BASE_URL` | URL do backend | `http://localhost:4000` |
| `VITE_APP_ENV` | Ambiente (dev/hml/prod) | `dev` |
| `VITE_ENABLE_MOCK_FALLBACK` | Forçar mock fallback | auto: true em dev |

### Backend (.env)
| Variável | Finalidade | Default |
|----------|-----------|---------|
| `APP_ENV` | Ambiente | `dev` |
| `PORT` | Porta do servidor | `4000` |
| `DB_DIALECT` | `oracle` ou `mock` | `mock` |
| `AUTH_PROVIDER` | Sempre `local_jwt` | `local_jwt` |
| `JWT_SECRET` | Segredo JWT — **alterar em produção** | `dev-only-change-me` |
| `JWT_EXPIRES_SECONDS` | TTL do token | `3600` (1h) |
| `ENABLE_DEMO_AUTH` | Credenciais demo (apenas dev) | `false` |
| `CORS_ALLOWED_ORIGINS` | Origins permitidas | `http://localhost:3000` |
| `RATE_LIMIT_MAX` | Req/min por IP | `120` |
| `RATE_LIMIT_LOGIN_MAX` | Tentativas de login/min | `20` |

### Azure (produção / homologação)
| Variável | Finalidade |
|----------|-----------|
| `AZURE_OPENAI_ENDPOINT` | Azure OpenAI endpoint |
| `AZURE_OPENAI_API_KEY` | Azure OpenAI API key |
| `AZURE_OPENAI_DEPLOYMENT` | Nome do deployment (ex: `gpt-4o`) |
| `AZURE_AI_SEARCH_ENDPOINT` | Azure AI Search endpoint |
| `AZURE_AI_SEARCH_KEY` | Azure AI Search API key |
| `AZURE_BLOB_CONNECTION_STRING` | Azure Blob Storage connection string |
| `AZURE_BLOB_CONTAINER_DOCS` | Nome do container de documentos | `documentos` |
| `AZURE_DOC_INTELLIGENCE_ENDPOINT` | Azure AI Document Intelligence endpoint |
| `AZURE_DOC_INTELLIGENCE_KEY` | Azure AI Document Intelligence key |
| `ORACLE_DSN` | Oracle 23ai DSN (ODSA) |
| `ORACLE_USER` | Oracle username |
| `ORACLE_PASSWORD` | Oracle password |

---

## Sprint Plan

### FASE 1 — Gestão de Projetos | 24 semanas | Mai–Out 2026

| Sprint | Semanas | Entregas |
|--------|---------|----------|
| **Sprint 1–2** | Sem 1–4 | Oracle 23ai + ODSA, Azure Container Apps + Static Web Apps + Key Vault + ACR, CI/CD (GitHub Actions → deploy direto), Scaffold FastAPI (agentes via BackgroundTasks), Scaffold React rebranding, DDL V013 (inclui `usuarios`, `usuario_projetos`, `permissoes_customizadas`), Auth JWT email+senha (reutilizar Projeto Integrado), Painel `/admin/usuarios` (CRUD completo de usuários, vínculos de projeto, permissões customizadas), hook `usePermissions()`, componente `<Can>`, sidebar filtrada por role, Ambiente POC/QA com todos os 8 perfis demo |
| **Sprint 3–4** | Sem 5–8 | file-agent (OCR + QR stamp em PDF), storage-agent (Azure Blob: organização + nomenclatura), data-agent (Oracle CRUD), DDL V014, Upload pipeline React→Blob→file-agent, Tela GED |
| **Sprint 5–6** | Sem 9–12 | nlp-agent (embeddings + pré-preenchimento), Modal Confirmação (zero digitação), Oracle 23ai AI Vector Search, Azure AI Search híbrido, Busca semântica GED, Controle de versões R0x |
| **Sprint 7–8** | Sem 13–16 | DDL V015, Módulo NCs (CRUD completo), Fluxo aprovação docs, Acesso por role (Oracle + JWT), Disciplinas customizáveis por projeto (JSON Duality), DDL V016 |
| **Sprint 9–10** | Sem 17–20 | analysis-agent (RAG), DDL V017 Vector Search, DDL V018 Property Graph, Módulo Cotações, Módulo Contratos, storage-agent archival (Cool Tier automático) |
| **Sprint 11–12** | Sem 21–24 | Dashboard KPIs, Calculadoras financeiras, Export Excel flexível, Check-up dashboard, Hardening (LGPD, audit), Testes E2E, **Go-live F1** |

**Marco F1 (Out/2026):** GED + RAG + NCs + Cotações + Contratos — produto vendável.

---

### FASE 2 — Gestão de Obras | 20 semanas | Nov/26–Mar/27

| Sprint | Semanas | Entregas |
|--------|---------|----------|
| **Sprint 13–14** | Sem 25–28 | DDL V019, Módulo Obras, Diário de Obra (JSON Duality), PWA (manifest + service worker + offline sync), Upload diário obrigatório |
| **Sprint 15–16** | Sem 29–32 | Ordens de Serviço + checklists, Módulo Medições, QR Code por pavimento, photo-agent (Azure AI Vision: validação + orientação) |
| **Sprint 17–18** | Sem 33–36 | Módulo Equipe, Financeiro obra (gastos reais vs orçamento), Oracle ML tags fotos, Azure Custom Vision, Trilha visual de fotos por ambiente |
| **Sprint 19–20** | Sem 37–40 | Portal do Cliente, Notificações WhatsApp estratégicas, NCs obra↔projeto (rastreabilidade), Dashboard obra, Compliance diário obrigatório |
| **Sprint 21** | Sem 41–44 | Property Graph rastreabilidade completa, ISO 9001 audit trail, Integração bidirecional projeto↔obra, Testes E2E F1+F2, **Go-live F2** |

**Marco F2 (Mar/2027):** Obra rastreável + portal cliente + photo-agent.

---

### FASE 3 — Inteligência e IA | 16 semanas | Abr–Jul/27

| Sprint | Semanas | Entregas |
|--------|---------|----------|
| **Sprint 22–23** | Sem 45–48 | whatsapp-agent (WhatsApp Business API), Análise automática de propostas, Painel WhatsApp |
| **Sprint 24–25** | Sem 49–52 | Relatórios automáticos por foto, Clima × Cronograma (API meteo), Orçamento SINAPI/CUB, Importação BIM (IFC) |
| **Sprint 26–27** | Sem 53–56 | Check-up inteligente (score + riscos + oportunidades), Recomendações estratégicas, Cross-project analytics, Chatbot multi-projeto |
| **Sprint 28** | Sem 57–60 | Oracle ML in-database, Refinamento de modelos, **Go-live F3** |

**Marco F3 (Jul/2027):** WhatsApp agent + cross-project analytics + check-up inteligente.

---

### FASE 4 — Marketplace | 16 semanas | Ago–Nov/27

| Sprint | Semanas | Entregas |
|--------|---------|----------|
| **Sprint 29–30** | Sem 61–64 | DDL V020, Perfil prestador (portfólio, certificações, localização, disponibilidade), Avaliações com stats reais, Catálogo fornecedores |
| **Sprint 31–32** | Sem 65–68 | Matching inteligente (Oracle ML + Property Graph), Catálogo de serviços |
| **Sprint 33–34** | Sem 69–72 | Cashback + fidelidade, Ranking público + Selo de Qualidade, Gamificação |
| **Sprint 35–36** | Sem 73–76 | Oracle RAC (alta disponibilidade), API pública (OpenAPI) para ERPs, **Go-live F4** |

**Marco F4 (Nov/2027):** Marketplace com avaliações reais + API pública.

---

### Cronograma Consolidado

| Fase | Sprints | Período | Marco |
|------|---------|---------|-------|
| F1 — Gestão de Projetos | 1–12 | Mai–Out 2026 | GED + RAG + NCs + Cotações — **produto vendável** |
| F2 — Gestão de Obras | 13–21 | Nov/26–Mar/27 | Obra rastreável + portal cliente |
| F3 — Inteligência | 22–28 | Abr–Jul 2027 | WhatsApp + cross-project + check-up |
| F4 — Marketplace | 29–36 | Ago–Nov 2027 | Marketplace + API pública |

**Prazo total: 76 semanas (19 meses) — Mai/2026 a Nov/2027**

---

## Mapeamento Projeto Integrado → Plataforma Integrada

| Projeto Integrado (origem) | Plataforma Integrada (destino) | Ação |
|---------------------|-------------------------------|------|
| `src/features/auth/` | `auth/` + painel de usuários | Reutilizar JWT local; adicionar CRUD completo em `/admin/usuarios`, hook `usePermissions()`, componente `<Can>` |
| `src/features/dashboard/` | `dashboard/` com KPIs de obras | Adaptar KPIs |
| `src/features/alerts/` | `ncs/` (Não Conformidades) | Renomear + adaptar domínio |
| `src/features/contracts/` | `contratos/` | Reutilizar (mesma estrutura de 8 sub-rotas) |
| `src/features/invoices/` | `medicoes/` | Adaptar para medições físico-financeiras |
| `src/features/management/` | `obras/` | Adaptar para gestão de obras |
| `src/features/cadastros/` | `cadastros/` | Adaptar entidades (equipes, disciplinas) |
| `src/features/reports/` | `relatorios/` | Adaptar relatórios |
| `src/features/chat/` | Chat IA via analysis-agent | Adaptar agentes (nova knowledge base) |
| `src/features/comunicados/` | `comunicados/` | Reutilizar (avisos para equipes) |
| `src/features/observability/` | `observability/` | Reutilizar (manter para admin) |
| `src/services/http.ts` | Manter idêntico | Nenhuma mudança |
| `src/shared/` | Manter todos os componentes | Apenas rebranding de cores |
| `backend/app/repositories/` | Novos repos por domínio de obra | Reescrever com novas entidades |
| `backend/app/ai/` | `backend/app/agents/` — 7 agentes | Substituir completamente |
| `backend/data/*.json` | Mock data de construção civil | Substituir fixtures |
| `database/flyway/sql/V001–V012` | Manter + adicionar V013–V020 | Adicionar novas migrations |

---

## Key Patterns

### Repository Switching
```bash
DB_DIALECT=mock    # Desenvolvimento local — JSON em backend/data/
DB_DIALECT=oracle  # Produção — Oracle 23ai via ODSA connection pool
```
Nenhuma mudança de código necessária. Cada repositório verifica `DB_DIALECT` na inicialização.

### Fallback Policy (Frontend)
- `dev`: fallback mock automático se API inacessível
- `hml`/`prod`: requer `VITE_ENABLE_MOCK_FALLBACK=true` explícito
- Toast de notificação + `DataSourceBadge` indicam fonte dos dados

### Upload de Documentos
- Nunca enviar arquivo diretamente para Oracle — sempre via Azure Blob (staging, TTL 24h)
- file-agent e nlp-agent executam via `FastAPI BackgroundTasks` (F1–F2)
- Resultado entregue via WebSocket ao frontend

### Agentes IA
- F1–F2: `BackgroundTasks` do FastAPI — sem infra extra, fácil de debugar localmente
- F3+: avaliar migração para RabbitMQ se volume justificar
- Estado compartilhado via `graph_state.py` (Pydantic)
- Fallback: se agente falhar, retornar erro ao frontend com trace_id para reprocessamento manual

### RBAC e Gestão de Acesso
- 8 perfis com 4 dimensões: módulo, CRUD, escopo de dados e nível de documento
- Decoradores backend: `require_roles()`, `require_data_scope()`, `require_doc_level()`, `require_financial_access()`
- Hook frontend: `usePermissions()` + componente `<Can action resource>`
- Sidebar não renderiza (não só oculta) itens sem permissão
- Colunas/campos financeiros renderizados condicionalmente — `---` se sem permissão
- Admin é o único que cria/edita perfis e vínculos de projeto em `/admin/usuarios`
- Permissões customizadas por usuário (override pontual do perfil padrão)
- Roles + project_ids + doc_level no JWT payload — zero queries extras de permissão no request path

### Observability
- Auto-instrumentação via middleware (sem código extra por endpoint)
- Oracle Unified Audit para todas as operações sensíveis
- `GET /api/observability/metrics` — métricas Prometheus-style

### Cobertura de Testes
- Vitest: 75% threshold em caminhos críticos
- `npm run test:coverage` falha se threshold não atingido
- E2E Playwright: fluxos completos por fase (upload GED, NCs, diário de obra)

### ISO 9001 Traceability
- Oracle Property Graph mantém todas as relações projeto↔obra↔doc↔NC
- `GET /api/rastreabilidade/:projeto_id` retorna grafo completo para auditoria
- Habilitado por padrão para todos os projetos (não configurável)

---

## Segurança e Governança

- **LGPD:** Oracle Data Redaction + base legal de execução de contrato
- **Multi-Tenant:** PDB Oracle isolado por construtora + container Azure Blob por tenant
- **Criptografia:** Oracle TDE (repouso) + TLS 1.3 (trânsito) + Azure Key Vault
- **Audit:** Oracle Unified Audit — timestamp + user_id + trace_id + IP
- **Backup:** RMAN incremental diário (30 dias) + archive log; Azure Blob soft-delete 93 dias
- **DevOps:** codificação → testes automatizados → homologação (POC com dados fictícios) → produção

---

## Estimativa de Custos Azure + OCI

| Serviço | F1 (R$/mês) | F2 (R$/mês) | F3 (R$/mês) | F4 (R$/mês) |
|---------|------------|------------|------------|------------|
| Oracle Database 23ai | 1.200–2.400 | 2.400–4.000 | 4.000–6.000 | 6.000–12.000 |
| Azure Container Apps | 150–400 | 400–800 | 800–1.500 | 1.500–3.000 |
| Azure AI (Doc Intel + OpenAI + Vision) | 350–850 | 600–1.400 | 1.500–3.000 | 2.000–4.000 |
| Azure AI Search | 450 | 450–900 | 900–1.500 | 1.500–2.500 |
| Azure Blob + Cool Storage | 25–60 | 100–300 | 300–600 | 600–1.200 |
| WhatsApp Business API | — | — | 200–500 | 500–1.000 |
| OCI Networking (ODSA) | 200–350 | 200–350 | 350–500 | 500–800 |
| Monitor + Key Vault + Misc | 40–95 | 80–150 | 150–250 | 250–400 |
| **TOTAL** | **2.415–4.605** | **4.230–7.900** | **8.200–13.850** | **12.850–24.900** |

---

## Próximos Passos (da ata de 10/04/2026)

| Ação | Responsável | Status |
|------|------------|--------|
| Migrar cards e fases para Planner, iniciar sprints | Renan + Jeferson | Em andamento |
| Compartilhar planilhas de NCs e cronograma para base de dados | Juliana | Pendente |
| Ajustar permissões no Planner para colaboração | Juliana | Pendente |
| Criar ambiente POC com dados fictícios | Renan | Sprint 1 |
| Estudar modelo de sociedade e parceria | Todos | Em discussão |
| Pesquisar Vetor AG e programas de aceleração (Inatel) | Juliana | Pendente |

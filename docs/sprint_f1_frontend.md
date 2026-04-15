# SPRINTS - FASE 1: Frontend
**Periodo:** Mai-Out 2026 | 24 semanas | Sprints 1-12
**Responsavel frontend + UX:** Codex Agent
**Marco:** Produto vendavel - shell operacional + auth + dashboard + projetos + GED + NCs + cotacoes + contratos

> Este arquivo e a base de execucao da Fase 1 do frontend.
> A cada sprint: ler o escopo, implementar, validar localmente e marcar o que foi concluido.
> As proximas fases devem seguir o mesmo formato de documento.
> Sempre validar localmente com `./start-local.sh` ou `npm run dev:local` antes de avancar.

---

## Objetivo da Fase 1

Construir o frontend do novo produto sobre a base atual do repositorio, removendo o acoplamento visual e funcional com o projeto antigo e entregando uma experiencia pronta para operacao em:

- autenticacao e sessao;
- shell principal da plataforma;
- dashboard executivo;
- gestao de usuarios e perfis;
- projetos;
- GED;
- nao conformidades;
- cotacoes;
- contratos;
- observabilidade minima de uso e erro.

---

## Principios de implementacao

1. Rebrand completo.
Trocar naming, identidade visual, textos, navegacao e microcopy do legado para a nova plataforma.

2. Frontend feature-driven.
Novos modulos devem nascer em `src/features/<modulo>` com pagina, componentes, services e tipos proprios.

3. Shell unico e consistente.
Header, sidebar, breadcrumbs, tabs, filtros, estados vazios, loading e erro devem seguir um padrao unico.

4. Mobile-first real.
Tudo que nascer na Fase 1 deve funcionar bem em desktop, tablet e celular.

5. Auth e autorizacao como base.
Nenhum modulo novo deve ignorar role, scope, tenant ou permissoes.

6. UX operacional.
A interface deve priorizar clareza, velocidade de leitura e rastreabilidade de erro.

7. Teste junto com implementacao.
Cada sprint deve fechar com Vitest verde para unit/integration e checklist de validacao visual.

---

## Estrutura alvo do frontend

```text
src/
├── app/
│   ├── AppProviders.tsx
│   └── router/
│       └── AppRouter.tsx
├── shared/
│   ├── branding/
│   │   └── brand.ts
│   └── ui/
│       ├── BrandMark.tsx
│       ├── DataTable.tsx
│       ├── PageHeader.tsx
│       ├── FilterBar.tsx
│       ├── EmptyState.tsx
│       ├── ErrorState.tsx
│       ├── LoadingState.tsx
│       └── ...
├── features/
│   ├── auth/
│   ├── layout/
│   ├── dashboard/
│   ├── admin/
│   ├── projetos/
│   ├── ged/
│   ├── ncs/
│   ├── cotacoes/
│   ├── contratos/
│   ├── settings/
│   └── observability/
└── services/
    ├── http.ts
    ├── authService.ts
    ├── dashboardService.ts
    ├── adminService.ts
    ├── projetosService.ts
    ├── gedService.ts
    ├── ncsService.ts
    ├── cotacoesService.ts
    └── contratosService.ts
```

---

## Rotas alvo da Fase 1

- `/login`
- `/dashboard`
- `/admin/usuarios`
- `/admin/permissoes`
- `/projetos`
- `/projetos/:id`
- `/ged`
- `/ged/:id`
- `/ncs`
- `/ncs/:id`
- `/cotacoes`
- `/cotacoes/:id`
- `/contratos`
- `/contratos/:id`
- `/settings`
- `/observability`

---

## Definition of Done transversal

Uma entrega de frontend so pode ser considerada pronta quando:

- a rota estiver acessivel e integrada ao `AppRouter`;
- a navegacao estiver refletida no shell;
- os estados `loading`, `empty`, `error` e `forbidden` existirem;
- a tela funcionar em mobile e desktop;
- o service do modulo estiver separado;
- o modulo respeitar auth, role e scope;
- houver teste unitario/integration quando a regra justificar;
- `npm run test:frontend` passar;
- `npm run check` passar;
- a microcopy estiver alinhada com a nova marca.

---

## SPRINTS 1-2 - Fundacao, Rebrand e Shell
**Semanas 1-4 | Foco: base visual, estrutural e de sessao**

### Objetivo
Fechar o rebrand, limpar o legado visual e estabelecer o shell oficial da plataforma.

### Entregas principais

- [ ] Consolidar `AtlasGrid` como identidade oficial do frontend.
- [ ] Revisar `src/index.css` com tokens, cores, tipografia e superficies do novo projeto.
- [ ] Evoluir `src/shared/branding/brand.ts` para virar fonte unica de naming e microcopy central.
- [ ] Padronizar `AppLayout` com sidebar, header, breadcrumbs e area de conteudo reutilizavel.
- [ ] Atualizar `Login` para o novo produto e preparar versao definitiva do fluxo de acesso.
- [ ] Remover da navegacao principal os modulos legados que nao pertencem ao novo dominio.
- [ ] Publicar componentes base reutilizaveis:
  - `PageHeader`
  - `PageSection`
  - `StatCard`
  - `FilterBar`
  - `DataTable`
  - `EmptyState`
  - `ErrorState`
  - `LoadingState`

### Arquivos-base a adaptar

- `src/index.css`
- `src/views/Login.tsx`
- `src/features/layout/components/AppLayout.tsx`
- `src/app/router/AppRouter.tsx`
- `src/shared/ui/*`

### Criterios de aceite

- branding antigo nao aparece mais nas telas principais;
- shell novo esta consistente em desktop e mobile;
- login e dashboard usam a nova linguagem visual;
- navegacao principal representa o novo produto, nao o legado;
- a base visual permite escalar os proximos modulos sem retrabalho pesado.

### Validacao

- `npm run test:frontend`
- `npm run check`

---

## SPRINTS 3-4 - Auth, Sessao e Gestao de Usuarios
**Semanas 5-8 | Foco: acesso, perfis e governanca do cliente**

### Objetivo
Conectar o frontend ao novo modelo de perfis e controles de acesso do produto.

### Entregas principais

- [ ] Adaptar `AuthContext`, `ProtectedRoute` e `authService` para o modelo de roles da nova plataforma:
  - `admin`
  - `gestor`
  - `coordenador`
  - `engenheiro`
  - `mestre_obras`
  - `cliente_final`
  - `prestador`
  - `financeiro`
  - `prestador_mkt`
- [ ] Revisar sessao, expiracao e logout previsivel.
- [ ] Criar aviso visual de sessao prestes a expirar.
- [ ] Criar modulo `admin` com:
  - lista de usuarios;
  - criacao/edicao;
  - ativacao/inativacao;
  - associacao de projeto;
  - painel de permissao por recurso.
- [ ] Exibir `traceId` em erros relevantes de forma consistente.
- [ ] Garantir navegacao e UI condicionadas por role.

### Novos caminhos esperados

- `src/features/admin/pages/UsersPage.tsx`
- `src/features/admin/pages/PermissionsPage.tsx`
- `src/features/admin/components/*`
- `src/services/adminService.ts`

### Criterios de aceite

- usuario sem permissao nao acessa tela nem acao protegida;
- sessao nao entra em estado "meio logado";
- erros de `401`, `403` e falha de API exibem UX consistente;
- admin consegue gerenciar usuarios e visualizar escopo de acesso;
- o shell reflete o role autenticado.

### Validacao

- `npm run test:frontend`
- novos testes de auth e role-nav

---

## SPRINTS 5-6 - Dashboard e Projetos
**Semanas 9-12 | Foco: visao executiva e modulo central de projetos**

### Objetivo
Entregar as duas experiencias que sustentam a navegacao diaria do produto: dashboard e projetos.

### Entregas principais

- [ ] Substituir KPIs legados do dashboard por indicadores do novo negocio:
  - projetos ativos
  - documentos pendentes
  - NCs abertas
  - cotacoes em andamento
  - contratos com risco
- [ ] Criar dashboard com cards, blocos de status e lista de prioridades.
- [ ] Criar modulo `projetos` com:
  - lista com filtros;
  - cards e tabela;
  - detalhe do projeto;
  - etapas/fases;
  - membros autorizados;
  - disciplinas e resumo de progresso.
- [ ] Criar componentes compartilhados para `overview`, `timeline` e `status`.

### Novos caminhos esperados

- `src/features/dashboard/*`
- `src/features/projetos/*`
- `src/services/dashboardService.ts`
- `src/services/projetosService.ts`

### Criterios de aceite

- dashboard abre como homepage oficial do produto;
- lista e detalhe de projeto funcionam com fallback visual adequado;
- filtros e busca sao persistentes na navegacao local;
- status do projeto e etapas ficam claros sem depender de leitura tecnica de payload.

### Validacao

- `npm run test:frontend`
- testes integration para dashboard e projetos

---

## SPRINTS 7-8 - GED e Busca Operacional
**Semanas 13-16 | Foco: documentos, metadata e fluxo de consulta**

### Objetivo
Entregar o modulo GED como eixo documental da plataforma.

### Entregas principais

- [ ] Criar modulo `ged` com:
  - lista de documentos;
  - filtros por projeto, disciplina, status e nivel;
  - upload;
  - versoes;
  - metadata;
  - preview e drawer de detalhes;
  - status de processamento.
- [ ] Exibir sinais de OCR, indexacao e readiness de busca.
- [ ] Permitir navegar do projeto para os documentos vinculados.
- [ ] Preparar UI para busca semantica e RAG em fases seguintes.

### Novos caminhos esperados

- `src/features/ged/pages/GedListPage.tsx`
- `src/features/ged/pages/GedDetailPage.tsx`
- `src/features/ged/components/*`
- `src/services/gedService.ts`

### Criterios de aceite

- GED funciona como modulo central do produto;
- upload e metadata possuem UX clara mesmo antes da automacao completa;
- documentos respeitam role e nivel de acesso;
- empty state e erro orientam o usuario sem linguagem tecnica excessiva.

### Validacao

- `npm run test:frontend`
- testes de lista, filtros e detalhe do GED

---

## SPRINTS 9-10 - Nao Conformidades e Cotacoes
**Semanas 17-20 | Foco: fluxos operacionais assistidos**

### Objetivo
Fechar dois modulos de alto valor operacional: NCs e cotacoes.

### Entregas principais

- [ ] Criar modulo `ncs` com:
  - lista;
  - detalhe;
  - criacao;
  - status;
  - responsavel;
  - prazo;
  - anexos;
  - historico.
- [ ] Criar modulo `cotacoes` com:
  - lista;
  - mapa comparativo;
  - cards por fornecedor;
  - aprovacao/reprovacao;
  - status por rodada.
- [ ] Reutilizar tabela, filtro, status badge e timeline do shell.
- [ ] Implementar feedback visual para transicoes de status e acao concluida.

### Novos caminhos esperados

- `src/features/ncs/*`
- `src/features/cotacoes/*`
- `src/services/ncsService.ts`
- `src/services/cotacoesService.ts`

### Criterios de aceite

- usuario consegue acompanhar NC do inicio ao fechamento;
- mapa de cotacao permite comparar fornecedores com leitura rapida;
- historico e status sao legiveis sem abrir cada item;
- acoes sensiveis exibem feedback imediato.

### Validacao

- `npm run test:frontend`
- testes integration para NCs e cotacoes

---

## SPRINTS 11-12 - Contratos, Hardening e Fechamento da Fase
**Semanas 21-24 | Foco: modulo final + qualidade + readiness**

### Objetivo
Fechar o modulo de contratos e consolidar a Fase 1 com qualidade de produto.

### Entregas principais

- [ ] Criar modulo `contratos` com:
  - lista;
  - detalhe;
  - status;
  - vigencia;
  - risco;
  - vinculacao com projeto;
  - documentos relacionados.
- [ ] Ajustar `settings` e `observability` para o novo produto.
- [ ] Revisar responsividade de todas as telas da Fase 1.
- [ ] Padronizar mensagens de erro, skeletons, toasts e estados vazios.
- [ ] Publicar smoke manual de navegacao por modulo.
- [ ] Revisar acessibilidade minima:
  - foco;
  - contraste;
  - labels;
  - navegaçao por teclado;
  - leitura de estados.
- [ ] Fechar backlog residual de branding e naming.

### Novos caminhos esperados

- `src/features/contratos/*`
- `src/services/contratosService.ts`
- ajustes em `settings` e `observability`

### Criterios de aceite

- o frontend da Fase 1 suporta o fluxo principal do produto;
- todos os modulos previstos existem no shell;
- a navegacao por role esta consistente;
- a plataforma esta pronta para entrar em Fase 2 sem retrabalho estrutural;
- build e testes do frontend passam sem regressao.

### Validacao

- `npm run test:frontend`
- `npm run check`
- checklist manual de navegacao completa

---

## Backlog tecnico transversal da Fase 1

- [ ] Criar `PageHeader`, `FilterBar`, `DataTable` e `StatusPill` como primitives oficiais.
- [ ] Revisar `AppRouter` para refletir apenas o novo produto.
- [ ] Substituir services herdados do dominio antigo pelos novos modules/services.
- [ ] Criar padrao unico de `query params` para filtros e ordenacao.
- [ ] Definir estrategia de cache local por modulo.
- [ ] Criar helpers de permissao reutilizaveis no cliente.
- [ ] Padronizar `traceId` e `error code` nas telas.
- [ ] Criar smoke visual por role.
- [ ] Mapear e remover telas legadas nao utilizadas ao final da fase.

---

## Checklist de encerramento da Fase 1

- [ ] Branding consolidado no frontend.
- [ ] Shell principal finalizado.
- [ ] Auth, sessao e roles do novo produto finalizados.
- [ ] Dashboard, projetos, GED, NCs, cotacoes e contratos publicados.
- [ ] Settings e observability adaptados ao novo dominio.
- [ ] `npm run test:frontend` verde.
- [ ] `npm run check` verde.
- [ ] Documentacao da Fase 1 atualizada com desvios e backlog da Fase 2.

---

## Comandos de trabalho

```bash
./start-local.sh
npm run dev
npm run api:dev
npm run test:frontend
npm run check
```

---

## Observacao final

Este documento nao substitui o detalhamento de cada sprint, mas passa a ser a referencia oficial da Fase 1 do frontend.
Os arquivos das proximas fases devem manter:

- mesmo formato;
- mesmo nivel de rastreabilidade;
- backlog transversal;
- checklist de encerramento;
- comandos de validacao.

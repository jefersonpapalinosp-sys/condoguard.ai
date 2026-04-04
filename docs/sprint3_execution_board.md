# Sprint 3 - Board de Execucao (Seguranca, acesso e multi-condominio)

Janela da sprint: 20 de abril a 1 de maio de 2026  
Objetivo: evoluir autenticacao para identidade real, consolidar RBAC no backend e isolar dados por condominio.

## Prioridade da sprint

- P0: `S3-01`, `S3-02`, `S3-03`
- P1: `S3-04`, `S3-05`
- Regra: iniciar P1 apenas com P0 em trilho (sem bloqueio critico).

## Quebra executavel do card S3-01 (P0)

Card principal: `S3-01` Autenticacao e identidade (JWT + provedor corporativo)

### S3-01A - Backend (token e validacao)

Owner sugerido: Backend  
Checklist tecnico:
- Implementar adaptador de identidade (interface `AuthProvider`) desacoplado do provedor.
- Validar assinatura, emissor (`iss`) e audiencia (`aud`) do token do provedor real.
- Mapear claims para usuario interno (`sub`, `email`, `roles`, `condominium_id`).
- Remover dependencia de usuarios demo no fluxo principal.
- Manter modo local apenas para `dev` com flag explicita de ambiente.
DoD:
- Endpoint protegido rejeita token invalido com `401`.
- Endpoint protegido aceita token valido do provedor configurado.

### S3-01B - Frontend (login e sessao)

Owner sugerido: Frontend  
Checklist tecnico:
- Trocar fluxo de login demo por fluxo com provedor corporativo.
- Persistir sessao de forma segura (evitar exposicao desnecessaria de token).
- Manter tratamento de `401` com logout automatico via event bus.
- Ajustar `ProtectedRoute` para depender de sessao validada no backend.
DoD:
- Usuario autenticado acessa rotas permitidas.
- Usuario sem sessao e redirecionado para login sem loop.

### S3-01C - DevOps/Sec (config e segredos)

Owner sugerido: DevOps/Security  
Checklist tecnico:
- Configurar variaveis de identidade por ambiente (`ISSUER`, `AUDIENCE`, `JWKS_URL` ou equivalente).
- Guardar segredos fora do repositorio.
- Configurar rotacao de segredo/chave conforme politica.
DoD:
- Homolog autenticando com provedor real.
- Checklist de segredo e rotacao atualizado.

### S3-01D - QA (teste funcional e negativo)

Owner sugerido: QA  
Checklist tecnico:
- Testar login valido.
- Testar token invalido/expirado.
- Testar usuario sem role necessaria.
- Testar logout forcado por `401`.
DoD:
- Suite automatizada cobrindo cenarios positivos e negativos de autenticacao.

## Criterios de aceite consolidados (S3-01)

- Usuarios demo/JWT local removidos do fluxo principal.
- Login validado via provedor real de identidade em homolog.
- Endpoints protegidos aceitam apenas token valido emitido pelo provedor configurado.

## Quebra executavel do card S3-02 (P0)

Card principal: `S3-02` Autorizacao por perfil (`sindico`, `admin`, `morador`)

### S3-02A - Backend (RBAC central)

Owner sugerido: Backend  
Checklist tecnico:
- Centralizar regras de permissao por endpoint em middleware unico de RBAC.
- Garantir que autorizacao e aplicada no backend (nao apenas no frontend).
- Normalizar retorno de erro `403` para acesso negado por role.
- Cobrir rotas criticas: `/api/invoices`, `/api/management/units`, `/api/alerts`, `/api/chat/*`.
DoD:
- Requisicao sem role permitida retorna `403` padronizado.
- Requisicao com role permitida retorna `2xx`.

### S3-02B - Frontend (guardas e UX de permissao)

Owner sugerido: Frontend  
Checklist tecnico:
- Ajustar `ProtectedRoute` para refletir o mesmo contrato de roles do backend.
- Ocultar/desabilitar acoes nao permitidas por perfil.
- Tratar `403` com mensagem clara sem expor detalhes internos.
DoD:
- Usuario nao visualiza acoes proibidas para sua role.
- Fluxo com role invalida nao quebra navegacao.

### S3-02C - QA/API (matriz de permissao)

Owner sugerido: QA  
Checklist tecnico:
- Criar matriz de cenarios por role x endpoint.
- Automatizar testes API para permitidos e negados.
- Validar regressao com token valido e role incorreta.
DoD:
- Testes cobrindo `admin`, `sindico`, `morador` para rotas principais.
- Evidencia de cenarios negativos anexada.

## Criterios de aceite consolidados (S3-02)

- Testes cobrindo cenarios permitidos e negados por perfil.
- Regras de role aplicadas e verificadas no backend.
- Frontend alinhado com contrato de autorizacao da API.

## Quebra executavel do card S3-03 (P0)

Card principal: `S3-03` Escopo `condominium_id` em queries e rotas

### S3-03A - Backend (isolamento de tenant)

Owner sugerido: Backend  
Checklist tecnico:
- Extrair `condominium_id` do token validado.
- Injetar filtro de `condominium_id` em todas as queries multi-tenant.
- Bloquear acesso quando parametro de rota divergir do escopo do token.
- Padronizar erro `403` para tentativa de acesso cruzado.
DoD:
- Usuario nao acessa dados de outro condominio.
- Endpoints retornam apenas dados do tenant autenticado.

### S3-03B - Dados/Repositorio (queries e indexes)

Owner sugerido: Backend/Dados  
Checklist tecnico:
- Revisar repositorios e queries para garantir filtro por `condominium_id`.
- Validar performance de filtros com indice adequado no Oracle.
- Revisar views/materializacoes para evitar vazamento entre condominios.
DoD:
- Nenhuma query critica sem escopo de condominio.
- Baseline de latencia mantida apos filtro.

### S3-03C - QA/Seguranca (teste de isolamento)

Owner sugerido: QA/Security  
Checklist tecnico:
- Criar teste de tentativa de acesso cruzado (token A consultando dados B).
- Cobrir endpoints de listagem e detalhe.
- Validar que logs de auditoria registram tentativas negadas.
DoD:
- Suite automatizada bloqueia regressao de isolamento.
- Tentativas de cross-tenant retornam `403`.

## Criterios de aceite consolidados (S3-03)

- Usuario nao acessa dados de outro condominio.
- Queries e rotas aplicam escopo `condominium_id` de ponta a ponta.
- Testes negativos de acesso cruzado passando no CI.

## Dependencias

1. Definicao do provedor corporativo (OIDC/OAuth2) e tenant.
2. Claims padrao acordadas (`roles`, `condominium_id`).
3. Chaves e endpoints de homolog liberados para API.
4. Mapeamento de endpoints x roles aprovado por produto/seguranca.
5. Validacao de indice por `condominium_id` no Oracle homolog.

## Riscos e mitigacao

1. Divergencia de claims entre ambientes.  
Mitigacao: contrato de claims versionado e teste de contrato no CI.
2. Quebra de sessao no frontend durante troca de fluxo.  
Mitigacao: feature flag de rollout e smoke E2E de auth antes do merge.
3. Token aceito no frontend mas negado no backend.  
Mitigacao: backend como fonte de verdade e testes de API com token real de homolog.
4. Vazamento entre condominios por query sem filtro.  
Mitigacao: checklist obrigatorio de repositorio + teste automatizado cross-tenant.

## Ordem recomendada

1. `S3-01C` (config de ambiente).
2. `S3-01A` (backend e validacao de token).
3. `S3-01B` (frontend e fluxo de sessao).
4. `S3-01D` (QA e fechamento de criterios).
5. `S3-02A` (RBAC backend central).
6. `S3-02B` (guardas e UX de permissao no frontend).
7. `S3-02C` (matriz de testes por role).
8. `S3-03A` (isolamento por `condominium_id` no backend).
9. `S3-03B` (revisao de queries e performance Oracle).
10. `S3-03C` (teste de acesso cruzado e auditoria).

## Plano diario (10 dias uteis)

1. Dia 1: iniciar `S3-01C` (config do provedor, segredos e conectividade homolog).
2. Dia 2: concluir `S3-01C` e iniciar `S3-01A` (validacao de token no backend).
3. Dia 3: continuar `S3-01A` e cobrir cenarios de token invalido/expirado.
4. Dia 4: concluir `S3-01A` e iniciar `S3-01B` (fluxo frontend com identidade real).
5. Dia 5: concluir `S3-01B` e executar `S3-01D` (QA auth positivo/negativo).
6. Dia 6: iniciar `S3-02A` (RBAC central no backend) + matriz base de permissoes.
7. Dia 7: concluir `S3-02A`, executar `S3-02B` e iniciar `S3-02C`.
8. Dia 8: concluir `S3-02C` e iniciar `S3-03A` (escopo `condominium_id` nas rotas/queries).
9. Dia 9: concluir `S3-03A`, executar `S3-03B` (indices/performance Oracle).
10. Dia 10: concluir `S3-03C`, rodar regressao final da sprint e consolidar evidencias.

## Criterio de encerramento da Sprint 3

- `S3-01`, `S3-02` e `S3-03` em `Done` com evidencia tecnica.
- Fluxo de autenticacao com provedor real validado em homolog.
- RBAC aplicado e testado no backend para perfis `admin`, `sindico` e `morador`.
- Isolamento de dados por `condominium_id` validado com testes de acesso cruzado.

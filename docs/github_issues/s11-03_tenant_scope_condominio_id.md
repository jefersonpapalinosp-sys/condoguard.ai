# S11-03 - Tenant scope end-to-end por `condominio_id`

## Contexto

Objetivo da Sprint 11: reforcar o isolamento multi-condominio como contrato obrigatorio da plataforma.

Card: `S11-03`  
Prioridade: `P0`  
Estimativa: `5 pts`

## Criterio de aceite

- modulos core e integracoes respeitam o `condominiumId` do token;
- acessos cross-tenant sao negados;
- tentativas invalidas geram auditoria;
- nao existe tenant default mascarando comportamento em homolog.

## Escopo tecnico

- revisar `require_tenant_scope` e pontos que dependem dele;
- revisar rotas core, contratos e integracoes ENEL/SABESP;
- revisar repositories e stores que ainda possam assumir tenant implicito;
- revisar contratos internos que trafegam `condominiumId`.

## Arquivos provaveis

- `backend/app/core/security.py`
- `backend/app/api/routes.py`
- `backend/app/api/contracts_module_routes.py`
- `backend/app/api/enel_integration_routes.py`
- `backend/app/api/sabesp_integration_routes.py`
- `backend/app/repositories/`
- `backend/app/integrations/enel/`
- `backend/app/integrations/sabesp/`
- `backend/app/utils/logging.py`

## Checklist de implementacao

- [ ] Mapear endpoints criticos que dependem de tenant.
- [ ] Revisar repositories com fallback ou tenant implicito.
- [ ] Garantir auditoria para escopo invalido.
- [ ] Validar integracoes ENEL/SABESP com tenant real do token.
- [ ] Executar smoke cross-tenant para leitura e mutacao.
- [ ] Publicar resultado consolidado.

## Evidencias obrigatorias

- [ ] matriz de cenarios permitidos e negados;
- [ ] evidencias de leitura negada cross-tenant;
- [ ] evidencias de mutacao negada cross-tenant;
- [ ] log/auditoria de tentativa invalida.

## Dependencias

- `S11-01` validado.
- Ambiente homolog com dados suficientes para simular mais de um tenant.

## Definicao de pronto (DoD do card)

- criterio de aceite atendido;
- pontos de tenant default identificados e tratados;
- risco de vazamento cross-tenant reduzido e documentado;
- evidencias prontas para o smoke final da sprint.

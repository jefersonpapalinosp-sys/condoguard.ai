# Sprint 9 - Analise Tecnica Integracao de Faturas (ENEL)

Data de referencia: 6 de abril de 2026
Escopo: analise tecnica para integrar captura/importacao de faturas de concessionaria ao CondoGuard.

## 1) Contexto

A ideia proposta e automatizar o fluxo de captura de faturas da ENEL (portal web) e integrar os dados no modulo de faturas do CondoGuard.

No estado atual do produto:
- backend de faturas existe e usa Oracle (`/api/invoices`);
- persistencia principal esta em `app.faturas_condominiais`;
- ha suporte de listagem, pagamento e exportacao CSV.

## 2) Diagnostico do script de origem

Resumo do comportamento observado no script enviado:
- abre site da ENEL;
- tenta navegar para ENEL Sao Paulo;
- tenta acessar pagina de login social;
- depende de intervencao humana para CAPTCHA/GOV.BR.

Problemas tecnicos identificados:
- erros de estrutura/indentacao (na forma atual o script nao executa de ponta a ponta);
- `LOGIN` e `SENHA` declarados mas nao utilizados no fluxo;
- funcao `clicar_login_modal` duplicada (sobrescrita);
- fluxo principal nao chama todas as etapas de autenticacao;
- nao existe etapa robusta de "download concluido" e "parse da fatura";
- dependencias em `sleep` fixo e `except` generico reduzem confiabilidade;
- forte acoplamento com seletor de UI do portal (alto risco de quebra).

Conclusao: o script e um bom spike inicial de navegacao, mas nao esta pronto para producao.

## 3) Avaliacao de abordagem para CondoGuard

### Opcao A - Integracao oficial (API/parceria da concessionaria)
- Vantagem: mais estavel, menor risco operacional e juridico.
- Risco: prazo de negociacao e onboarding externo.

### Opcao B - Automacao de portal (Selenium/Playwright)
- Vantagem: entrega mais rapida de um MVP tecnico.
- Risco: CAPTCHA, mudancas de UI, bloqueio anti-bot, termos de uso.

### Opcao C - Importacao assistida (upload/manual + parser)
- Vantagem: menor risco para iniciar operacao e validar valor de negocio.
- Risco: menor automacao inicial.

Recomendacao:
1. iniciar por `Opcao C` (MVP confiavel e auditavel);
2. evoluir para `Opcao B` apenas para assistencia operacional controlada;
3. manter `Opcao A` como objetivo de medio prazo.

## 4) Arquitetura recomendada (MVP recomendado)

### 4.1 Backend (FastAPI)

Criar pacote de integracao:
- `backend/app/integrations/enel/orchestrator.py` (coordena execucao);
- `backend/app/integrations/enel/parser.py` (normaliza dados de fatura);
- `backend/app/integrations/enel/repository.py` (persistencia e dedupe);
- `backend/app/integrations/enel/types.py` (contratos internos).

Criar endpoints administrativos:
- `POST /api/integrations/enel/runs` -> cria execucao;
- `GET /api/integrations/enel/runs` -> historico;
- `POST /api/integrations/enel/runs/{id}/retry` -> reprocessamento.

Observacao:
- execucao inicial deve ser manual/assistida (sem bypass de CAPTCHA).

### 4.2 Persistencia Oracle

Manter `app.faturas_condominiais` como tabela de dominio principal e criar trilha de execucao:
- `app.integracoes_execucoes` (inicio, fim, status, erro, tenant, usuario);
- `app.integracoes_itens` (hash externo, referencia, valor, vencimento, resultado).

Campos recomendados para rastreio em `faturas_condominiais`:
- `origem_dado` ja existente deve incluir origem `integration_enel` (via evolucao de constraint);
- chave de dedupe (`unidade_id + competencia` ja existe e deve ser respeitada);
- metadado opcional de origem externa (ex.: `id_externo`) em tabela auxiliar.

### 4.3 Observabilidade e seguranca

- registrar metricas por run: `total`, `imported`, `skipped`, `failed`, `duration_ms`;
- log estruturado com `tenant_id`, `run_id`, `source=enel`;
- credenciais nunca em codigo; usar variaveis de ambiente e cofre quando disponivel;
- mascarar dados sensiveis em logs.

## 5) Riscos principais e mitigacao

1. Risco juridico/termos de uso do portal.
Mitigacao: validar autorizacao formal antes de automacao total.

2. CAPTCHA/GOV.BR impedir automacao ponta a ponta.
Mitigacao: iniciar com fluxo assistido e checkpoints humanos.

3. Layout do portal mudar e quebrar scraper.
Mitigacao: selectors versionados, testes de smoke de integracao e fallback manual.

4. Duplicidade de faturas importadas.
Mitigacao: dedupe por chave de negocio + hash do documento.

5. Exposicao de credenciais.
Mitigacao: secret management, rotacao e auditoria de acesso.

## 6) Criterio de pronto tecnico para iniciar implementacao

- contrato de payload de importacao definido;
- modelo de dados e regras de dedupe aprovados;
- endpoint de run manual disponivel;
- trilha de auditoria e erro implementada;
- fluxo de rollback operacional documentado.

## 7) Entrega recomendada por fases

Fase 1 (Sprint 9): analise, design, modelo de dados, endpoint manual e importador assistido.
Fase 2 (sprint futura): parser robusto + dashboard operacional da integracao.
Fase 3 (sprint futura): automacao parcial de portal e estrategia de resiliencia.
Fase 4 (futuro): migracao para integracao oficial/parceria quando viavel.

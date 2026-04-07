# Design System: The Architectural Monolith

Referencia de direcao visual consolidada a partir do material base do projeto.

## Conceito

No contexto de gestao inteligente predial, a interface deve transmitir estabilidade, precisao e sofisticacao.  
A ideia central e evitar visual de dashboard generico e trabalhar a UI como extensao digital de arquitetura premium.

## Principios de UI

1. Sem divisorias de 1px  
Separacao de blocos por mudanca tonal de superficie, nao por borda forte.

2. Hierarquia por camadas de superficie  
Priorizar niveis de `surface` e `surface_container` para indicar importancia.

3. Vidro e gradiente  
Elementos de destaque podem usar glassmorphism leve e gradientes sutis em CTAs/KPIs.

4. Assimetria intencional  
Espacamento editorial e composicoes nao totalmente simetricas para reduzir aparencia de template.

## Tipografia

- Headlines/display: `Manrope`
- Corpo e UI operacional: `Inter`

## Elevacao e profundidade

- Priorizar contraste tonal de camada.
- Sombras ambientes leves (blur amplo, baixa opacidade).
- Evitar outline forte; quando necessario, usar contorno suave.

## Do

- Usar margens e respiros amplos.
- Variar altura de cards com intencao visual.
- Manter leitura clara com contraste adequado.

## Dont

- Evitar excesso de linhas separadoras.
- Evitar preto absoluto para texto principal quando existir token de cor adequado.
- Evitar densidade excessiva de informacao sem espacamento.

## Aplicacao recomendada no CondoGuard.AI

- Login e dashboard devem manter linguagem premium e sobria.
- Cards de KPI devem comunicar prioridade por camada tonal.
- Fluxos criticos (alertas, financeiro, gestao) devem priorizar legibilidade e estado visual consistente.

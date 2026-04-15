# Guia de Anomalias de Consumo — Energia e Água

## Fundamentos do Monitoramento

O sistema AtlasGrid monitora consumo por bloco/unidade e compara com a **linha de base histórica** (média dos últimos 6 meses com sazonalidade). Anomalias são identificadas por análise estatística de desvio padrão (sigma).

---

## Níveis de Alerta por Sigma

| Nível | Desvio (σ) | Cor | Ação Necessária |
|---|---|---|---|
| Normal | < 1σ | Verde | Nenhuma |
| Atenção | 1σ a 1,5σ | Amarelo | Monitorar na próxima leitura |
| Anômalo | 1,5σ a 2σ | Laranja | Investigação em 5 dias úteis |
| Crítico | > 2σ | Vermelho | Ação imediata (até 24h) |

---

## Anomalias de Consumo de Energia

### Causas Comuns
1. **Ar-condicionado com manutenção vencida:** Perda de eficiência de até 30%.
2. **Iluminação de áreas comuns defeituosa:** Luminárias ligadas 24h por falha no sensor.
3. **Bomba de recalque em funcionamento contínuo:** Bomba ligada por falha no pressostato ou nível.
4. **Aquecedores de piscina mal calibrados:** Consumo fora do horário contratual.
5. **Equipamentos em stand-by desnecessário:** Portões, cancelas e sistemas de controle de acesso.

### Procedimento de Investigação
1. **Confirmar a leitura:** Verificar se não é erro de leitura do medidor ou do sistema.
2. **Isolar o bloco/circuito:** Identificar o quadro elétrico afetado.
3. **Inspeção visual:** Verificar equipamentos ligados desnecessariamente.
4. **Medição pontual:** Usar medidor clamp-on para identificar o circuito com consumo elevado.
5. **Termografia elétrica:** Para suspeita de falha em equipamento — solicitar laudo técnico.

### Thresholds de Alerta (Energia)
- Variação > 20% sobre a média do mesmo mês no ano anterior: **alerta de atenção**.
- Variação > 40%: **alerta crítico** — verificação obrigatória.
- Consumo noturno (22h–6h) acima de 30% do consumo total: investigar equipamentos ligados fora do horário.

---

## Anomalias de Consumo de Água

### Causas Comuns
1. **Vazamento na rede comum:** Tubulação enterrada ou em parede molhada.
2. **Caixa d'água transbordando:** Float do reservatório superior com defeito.
3. **Válvulas de descarga com defeito:** Gotejamento contínuo em banheiros das áreas comuns.
4. **Irrigação automática mal calibrada:** Sistema ligando fora do horário ou por mais tempo que o necessário.
5. **Medidor com defeito:** Leitura incorreta — verificar com comparativo de conta de distribuição.

### Procedimento de Investigação
1. **Fechar os registros setoriais** e verificar se o hidrômetro parou de girar (identifica vazamento).
2. **Inspeção visual:** Verificar calçadas úmidas, manchas em paredes, barulho de escoamento.
3. **Teste de pressão:** Pressão abaixo de 1 kgf/cm² pode indicar perda na rede.
4. **Câmera de inspeção:** Para tubulações enterradas suspeitas.
5. **Contratação de detector de vazamento eletroacústico:** Para vazamentos ocultos.

### Thresholds de Alerta (Água)
- Variação > 15% sobre a média histórica: **alerta de atenção**.
- Variação > 30%: **alerta crítico** — verificação obrigatória em 24h.
- Consumo fora do horário de irrigação contratado (ex.: madrugada): investigação imediata.

---

## Análise de Eficiência Energética

### Benchmarks do Setor
| Tipo de Condomínio | Consumo Médio por Unidade/mês |
|---|---|
| Residencial sem piscina | 80–120 kWh |
| Residencial com piscina | 150–250 kWh |
| Residencial com academia e salão | 200–350 kWh |

### Oportunidades de Redução
1. **Substituição de lâmpadas:** LED nas áreas comuns reduz até 60% do consumo de iluminação.
2. **Sensor de presença:** Em corredores, escadas e garagens — reduz até 40% do consumo de iluminação.
3. **Compensação de energia reativa:** Banco de capacitores — reduz multas na conta de energia.
4. **Energia solar fotovoltaica:** ROI médio de 4 a 6 anos para condomínios residenciais.
5. **Automação de bombas:** Inversor de frequência reduz consumo em até 50%.

---

## Plano de Ação para Anomalias Críticas

### Energia — Protocolo 24h
1. **H+0:** Registrar alerta no sistema AtlasGrid com descrição e localização.
2. **H+2:** Acionar eletricista de plantão para inspeção visual.
3. **H+6:** Emitir relatório preliminar de causa provável.
4. **H+24:** Solução implementada ou plano de ação aprovado pelo síndico.
5. **H+72:** Confirmação de normalização da telemetria.

### Água — Protocolo 24h
1. **H+0:** Registrar alerta e fechar registros setoriais para isolamento.
2. **H+2:** Acionar encanador de plantão.
3. **H+8:** Identificar e reparar vazamento ou escalonar para empresa especializada.
4. **H+24:** Reabrir registros e confirmar normalização.
5. **H+48:** Monitoramento intensivo para confirmar ausência de reincidência.

---

## Relatórios e Indicadores

- **Consumo por unidade:** relatório mensal enviado automaticamente aos condôminos.
- **Ranking de eficiência:** blocos ordenados por consumo per capita.
- **Histórico de anomalias:** log completo com causa e resolução.
- **Custo por m³ e kWh:** atualizado mensalmente conforme tarifas das distribuidoras.

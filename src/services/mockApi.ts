export type DashboardMetrics = {
  activeAlerts: number;
  monthlySavings: string;
  currentConsumption: string;
  pendingContracts: number;
};

export type DashboardAlert = {
  id: string;
  title: string;
  subtitle: string;
  time: string;
  level: 'critical' | 'warning' | 'info';
};

export type DashboardData = {
  metrics: DashboardMetrics;
  recentAlerts: DashboardAlert[];
};

export type AlertsData = {
  activeCount: number;
  items: Array<{
    id: string;
    severity: 'critical' | 'warning' | 'info';
    title: string;
    description: string;
    time: string;
  }>;
};

export type ConsumptionData = {
  kpis: {
    monitoredUnits: number;
    peakLoad: string;
    projectedCost: string;
  };
  anomalies: Array<{
    id: string;
    title: string;
    sigma: string;
    severity: 'critical' | 'warning' | 'info';
    description: string;
  }>;
};

export type ContractItem = {
  id: string;
  vendor: string;
  monthlyValue: string;
  index: string;
  nextAdjustment: string;
  risk: 'high' | 'medium' | 'low';
  note: string;
};

export type ContractsData = {
  estimatedQuarterImpact: string;
  totalMonthlySpend: string;
  items: ContractItem[];
};

export type ReportItem = {
  id: string;
  title: string;
  subtitle: string;
  generatedAt: string;
};

export type ReportsData = {
  executiveTitle: string;
  executiveSummary: string;
  items: ReportItem[];
};

export type InvoiceStatus = 'pending' | 'paid' | 'overdue';

export type InvoiceItem = {
  id: string;
  unit: string;
  resident: string;
  reference: string;
  dueDate: string;
  amount: number;
  status: InvoiceStatus;
};

export type InvoicesData = {
  items: InvoiceItem[];
};

export type ChatSuggestion = {
  id: string;
  label: string;
  prompt: string;
};

export type ChatMessage = {
  id: string;
  role: 'assistant' | 'user';
  text: string;
  time: string;
};

export type ChatData = {
  welcomeMessage: string;
  suggestions: ChatSuggestion[];
};

export type UnitStatus = 'occupied' | 'vacant' | 'maintenance';

export type ManagementUnit = {
  id: string;
  block: string;
  unit: string;
  resident: string;
  status: UnitStatus;
  lastUpdate: string;
};

export type ManagementData = {
  units: ManagementUnit[];
};

function simulateNetwork<T>(data: T, delayMs = 420): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(data), delayMs);
  });
}

export async function getDashboardData(): Promise<DashboardData> {
  return simulateNetwork({
    metrics: {
      activeAlerts: 2,
      monthlySavings: 'R$ 1.250',
      currentConsumption: '85%',
      pendingContracts: 1,
    },
    recentAlerts: [
      {
        id: '1',
        title: 'Pressao de agua baixa',
        subtitle: 'Sensor PR-04 (Reservatorio inferior)',
        time: '10 min atras',
        level: 'critical',
      },
      {
        id: '2',
        title: 'Manutencao concluida',
        subtitle: 'Elevador social 2 - Bloco A',
        time: '1 h atras',
        level: 'info',
      },
      {
        id: '3',
        title: 'Acesso nao autorizado',
        subtitle: 'Portao garagem G2 (tentativa negada)',
        time: '3 h atras',
        level: 'warning',
      },
    ],
  });
}

export async function getAlertsData(): Promise<AlertsData> {
  return simulateNetwork({
    activeCount: 24,
    items: [
      {
        id: 'a1',
        severity: 'critical',
        title: 'Vazamento de agua (Bloco A, Unidade 302)',
        description: 'Pico de consumo detectado na tubulacao secundaria. Inspecao imediata necessaria.',
        time: '2 min atras',
      },
      {
        id: 'a2',
        severity: 'warning',
        title: 'Oscilacao eletrica (Sala tecnica 02)',
        description: 'Flutuacao de tensao na Fase B. Elevador 3 com lentidao intermitente.',
        time: '15 min atras',
      },
      {
        id: 'a3',
        severity: 'info',
        title: 'Temperatura de lobby normalizada',
        description: 'HVAC ajustado. Ambiente atingiu 24 C conforme programacao.',
        time: '1 h atras',
      },
    ],
  });
}

export async function getConsumptionData(): Promise<ConsumptionData> {
  return simulateNetwork({
    kpis: {
      monitoredUnits: 120,
      peakLoad: '12.4 kWh as 14:45',
      projectedCost: 'R$ 4.820,00',
    },
    anomalies: [
      {
        id: 'c1',
        title: 'Unidade 402B - Vazamento de agua',
        sigma: '3.5 sigma',
        severity: 'critical',
        description: 'Fluxo de 12 L/min por 4 horas. Desvio estatistico indica falha de valvula.',
      },
      {
        id: 'c2',
        title: 'Chiller central - Desequilibrio de fase',
        sigma: '2.1 sigma',
        severity: 'warning',
        description: 'Pico de potencia reativa no compressor 2 com perda de eficiencia.',
      },
      {
        id: 'c3',
        title: 'HVAC do lobby - Ciclagem curta',
        sigma: '1.8 sigma',
        severity: 'info',
        description: 'Frequencia de liga/desliga 40% acima da media sazonal.',
      },
    ],
  });
}

export async function getContractsData(): Promise<ContractsData> {
  return simulateNetwork({
    estimatedQuarterImpact: 'R$ 14.200,00',
    totalMonthlySpend: 'R$ 142.800,00',
    items: [
      {
        id: 'ct1',
        vendor: 'Sentinel Security Ltda',
        monthlyValue: 'R$ 45.200,00',
        index: 'IPCA',
        nextAdjustment: '15 Ago 2026',
        risk: 'high',
        note: 'Reajuste acima do indice contratual detectado.',
      },
      {
        id: 'ct2',
        vendor: 'LimpaPro Servicos',
        monthlyValue: 'R$ 28.500,00',
        index: 'IGP-M',
        nextAdjustment: '02 Out 2026',
        risk: 'medium',
        note: 'Contrato vence em 60 dias sem proposta de renovacao.',
      },
      {
        id: 'ct3',
        vendor: 'TechLift Elevadores',
        monthlyValue: 'R$ 12.800,00',
        index: 'IPCA',
        nextAdjustment: '12 Jan 2027',
        risk: 'low',
        note: 'Contrato com parametros em conformidade.',
      },
    ],
  });
}

export async function getReportsData(): Promise<ReportsData> {
  return simulateNetwork({
    executiveTitle: 'Resumo executivo mensal',
    executiveSummary:
      'Reducao de 4.2% no consumo geral de energia com aumento de 12% no custo de manutencao corretiva de elevadores.',
    items: [
      {
        id: 'r1',
        title: 'Fechamento financeiro',
        subtitle: 'Receitas, despesas e inadimplencia do ultimo mes',
        generatedAt: 'ha 2 dias',
      },
      {
        id: 'r2',
        title: 'Eficiencia energetica',
        subtitle: 'Comparativo de consumo e picos de demanda',
        generatedAt: 'ha 5 dias',
      },
      {
        id: 'r3',
        title: 'Manutencao preventiva',
        subtitle: 'Status dos equipamentos criticos e cronograma',
        generatedAt: 'ha 1 semana',
      },
    ],
  });
}

export async function getInvoicesData(): Promise<InvoicesData> {
  return simulateNetwork({
    items: [
      {
        id: 'inv-1',
        unit: 'A-101',
        resident: 'Mariana Costa',
        reference: 'Abr/2026',
        dueDate: '2026-04-10',
        amount: 945.5,
        status: 'pending',
      },
      {
        id: 'inv-2',
        unit: 'A-304',
        resident: 'Rafael Nunes',
        reference: 'Abr/2026',
        dueDate: '2026-04-05',
        amount: 1022.4,
        status: 'overdue',
      },
      {
        id: 'inv-3',
        unit: 'B-202',
        resident: 'Patricia Mello',
        reference: 'Abr/2026',
        dueDate: '2026-04-08',
        amount: 880,
        status: 'paid',
      },
      {
        id: 'inv-4',
        unit: 'C-110',
        resident: 'Diego Ramos',
        reference: 'Abr/2026',
        dueDate: '2026-04-11',
        amount: 970.75,
        status: 'pending',
      },
    ],
  });
}

export async function getChatData(): Promise<ChatData> {
  return simulateNetwork({
    welcomeMessage: 'Sou o copiloto CondoGuard. Posso ajudar com alertas, consumo e operacao diaria.',
    suggestions: [
      {
        id: 's1',
        label: 'Resumo do dia',
        prompt: 'Gerar um resumo rapido dos eventos operacionais de hoje.',
      },
      {
        id: 's2',
        label: 'Alertas criticos',
        prompt: 'Quais alertas criticos exigem acao imediata?',
      },
      {
        id: 's3',
        label: 'Consumo fora da meta',
        prompt: 'Existe algum bloco com consumo fora da meta nesta semana?',
      },
    ],
  });
}

export async function sendChatMessage(userMessage: string): Promise<ChatMessage> {
  const message = userMessage.toLowerCase();
  let answer = 'Recebido. Posso detalhar esse ponto com base nos modulos de alertas, consumo e contratos.';

  if (message.includes('alerta')) {
    answer = 'Temos 2 alertas com prioridade alta. Recomendo tratar o vazamento do Bloco A e revisar a oscilacao eletrica.';
  }

  if (message.includes('consumo')) {
    answer = 'O consumo atual esta em 85% da meta e o pico registrado foi 12.4 kWh as 14:45.';
  }

  if (message.includes('fatura') || message.includes('inadimpl')) {
    answer = 'Existem 2 faturas pendentes e 1 vencida no ciclo de Abr/2026. Posso listar por unidade.';
  }

  return simulateNetwork(
    {
      id: `bot-${Date.now()}`,
      role: 'assistant',
      text: answer,
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    },
    500,
  );
}

export async function getManagementData(): Promise<ManagementData> {
  return simulateNetwork({
    units: [
      {
        id: 'u1',
        block: 'A',
        unit: '101',
        resident: 'Mariana Costa',
        status: 'occupied',
        lastUpdate: 'Hoje, 09:10',
      },
      {
        id: 'u2',
        block: 'A',
        unit: '304',
        resident: 'Rafael Nunes',
        status: 'maintenance',
        lastUpdate: 'Hoje, 08:40',
      },
      {
        id: 'u3',
        block: 'B',
        unit: '202',
        resident: 'Patricia Mello',
        status: 'occupied',
        lastUpdate: 'Hoje, 09:00',
      },
      {
        id: 'u4',
        block: 'C',
        unit: '110',
        resident: '-',
        status: 'vacant',
        lastUpdate: 'Ontem, 17:20',
      },
    ],
  });
}

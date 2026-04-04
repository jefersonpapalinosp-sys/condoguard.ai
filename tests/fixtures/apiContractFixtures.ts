export const healthResponseFixture = {
  ok: true,
  service: 'condoguard-api',
  dialect: 'mock',
  dbStatus: 'seed',
  timestamp: new Date().toISOString(),
};

export const invoicesResponseFixture = {
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
  ],
  meta: {
    page: 1,
    pageSize: 20,
    total: 1,
    totalPages: 1,
    hasNext: false,
    hasPrevious: false,
  },
  filters: {
    status: null,
    unit: null,
  },
};

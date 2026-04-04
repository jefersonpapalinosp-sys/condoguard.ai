import type { InvoiceItem } from '../../src/services/mockApi';

export function makeInvoice(overrides: Partial<InvoiceItem> = {}): InvoiceItem {
  return {
    id: 'inv-1',
    unit: 'A-101',
    resident: 'Mariana Costa',
    reference: 'Abr/2026',
    dueDate: '2026-04-10',
    amount: 1000,
    status: 'pending',
    ...overrides,
  };
}


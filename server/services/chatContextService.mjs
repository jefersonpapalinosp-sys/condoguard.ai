import { getInvoicesData } from '../repositories/invoicesRepo.mjs';
import { getAlertsData } from '../repositories/alertsRepo.mjs';
import { getManagementUnitsData } from '../repositories/managementRepo.mjs';
import { getServerConfig } from '../config/env.mjs';

function formatSourceList(dbDialect) {
  return dbDialect === 'oracle'
    ? ['mart.vw_financial_invoices', 'mart.vw_alerts_operational', 'mart.vw_management_units']
    : ['seed:invoices.json', 'seed:alerts.json', 'seed:management_units.json'];
}

export async function buildChatContext(condominiumId = 1) {
  const { dbDialect } = getServerConfig();
  const [invoices, alerts, management] = await Promise.all([
    getInvoicesData(condominiumId),
    getAlertsData(condominiumId),
    getManagementUnitsData(condominiumId),
  ]);

  const pendingInvoices = invoices.items.filter((item) => item.status === 'pending').length;
  const overdueInvoices = invoices.items.filter((item) => item.status === 'overdue').length;
  const paidInvoices = invoices.items.filter((item) => item.status === 'paid').length;
  const criticalAlerts = alerts.items.filter((item) => item.severity === 'critical' && item.status !== 'read').length;
  const openAlerts = alerts.items.filter((item) => item.status !== 'read').length;
  const maintenanceUnits = management.units.filter((item) => item.status === 'maintenance').length;
  const occupiedUnits = management.units.filter((item) => item.status === 'occupied').length;

  return {
    condominiumId,
    generatedAt: new Date().toISOString(),
    dataSource: dbDialect,
    metrics: {
      pendingInvoices,
      overdueInvoices,
      paidInvoices,
      criticalAlerts,
      openAlerts,
      maintenanceUnits,
      occupiedUnits,
      totalUnits: management.units.length,
    },
    sources: formatSourceList(dbDialect),
  };
}

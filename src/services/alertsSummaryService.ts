import { requestJson } from './http';

export type AlertSummaryItem = {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  time: string;
  status?: 'active' | 'read';
};

export type AlertsSummary = {
  total: number;
  activeCount: number;
  critical: number;
  warning: number;
  info: number;
  top: AlertSummaryItem[];
};

export async function fetchAlertsSummary(): Promise<AlertsSummary> {
  return requestJson<AlertsSummary>('/api/alerts/summary');
}

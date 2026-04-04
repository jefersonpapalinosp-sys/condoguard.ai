import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '../../features/auth/components/ProtectedRoute';
import LoginPage from '../../features/auth/pages/LoginPage';
import { AppLayout } from '../../features/layout/components/AppLayout';
import DashboardPage from '../../features/dashboard/pages/DashboardPage';
import AlertsPage from '../../features/alerts/pages/AlertsPage';
import ConsumptionPage from '../../features/consumption/pages/ConsumptionPage';
import ContractsPage from '../../features/contracts/pages/ContractsPage';
import InvoicesPage from '../../features/invoices/pages/InvoicesPage';
import ChatPage from '../../features/chat/pages/ChatPage';
import ManagementPage from '../../features/management/pages/ManagementPage';
import ReportsPage from '../../features/reports/pages/ReportsPage';
import SettingsPage from '../../features/settings/pages/SettingsPage';
import CadastrosGeraisPage from '../../features/cadastros/pages/CadastrosGeraisPage';

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="alerts" element={<AlertsPage />} />
        <Route path="consumption" element={<ConsumptionPage />} />
        <Route path="contracts" element={<ContractsPage />} />
        <Route path="invoices" element={<InvoicesPage />} />
        <Route path="chat" element={<ChatPage />} />
        <Route path="management" element={<ManagementPage />} />
        <Route path="cadastros-gerais" element={<CadastrosGeraisPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

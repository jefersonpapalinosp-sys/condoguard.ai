import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '../../features/auth/components/ProtectedRoute';
import LoginPage from '../../features/auth/pages/LoginPage';
import { AppLayout } from '../../features/layout/components/AppLayout';
import DashboardPage from '../../features/dashboard/pages/DashboardPage';
import AlertsPage from '../../features/alerts/pages/AlertsPage';
import ConsumptionPage from '../../features/consumption/pages/ConsumptionPage';
import ContractsPage from '../../features/contracts/pages/ContractsPage';
import ContractsListPage from '../../features/contracts/pages/ContractsListPage';
import ContractCreatePage from '../../features/contracts/pages/ContractCreatePage';
import ContractDetailsPage from '../../features/contracts/pages/ContractDetailsPage';
import ContractEditPage from '../../features/contracts/pages/ContractEditPage';
import ContractsAuditPage from '../../features/contracts/pages/ContractsAuditPage';
import ContractsExpiringPage from '../../features/contracts/pages/ContractsExpiringPage';
import ContractsAdjustmentsPage from '../../features/contracts/pages/ContractsAdjustmentsPage';
import ContractsDocumentsPage from '../../features/contracts/pages/ContractsDocumentsPage';
import InvoicesPage from '../../features/invoices/pages/InvoicesPage';
import ChatPage from '../../features/chat/pages/ChatPage';
import ManagementPage from '../../features/management/pages/ManagementPage';
import ReportsPage from '../../features/reports/pages/ReportsPage';
import SettingsPage from '../../features/settings/pages/SettingsPage';
import CadastrosGeraisPage from '../../features/cadastros/pages/CadastrosGeraisPage';
import ObservabilityPage from '../../features/observability/pages/ObservabilityPage';

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
        <Route path="contracts/lista" element={<ContractsListPage />} />
        <Route path="contracts/novo" element={<ContractCreatePage />} />
        <Route path="contracts/auditoria" element={<ContractsAuditPage />} />
        <Route path="contracts/vencimentos" element={<ContractsExpiringPage />} />
        <Route path="contracts/reajustes" element={<ContractsAdjustmentsPage />} />
        <Route path="contracts/documentos" element={<ContractsDocumentsPage />} />
        <Route path="contracts/:id/editar" element={<ContractEditPage />} />
        <Route path="contracts/:id" element={<ContractDetailsPage />} />
        <Route
          path="invoices"
          element={(
            <ProtectedRoute requiredRoles={['admin', 'sindico']}>
              <InvoicesPage />
            </ProtectedRoute>
          )}
        />
        <Route path="chat" element={<ChatPage />} />
        <Route
          path="management"
          element={(
            <ProtectedRoute requiredRoles={['admin', 'sindico']}>
              <ManagementPage />
            </ProtectedRoute>
          )}
        />
        <Route path="cadastros-gerais" element={<CadastrosGeraisPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route
          path="observability"
          element={(
            <ProtectedRoute requiredRoles={['admin']}>
              <ObservabilityPage />
            </ProtectedRoute>
          )}
        />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

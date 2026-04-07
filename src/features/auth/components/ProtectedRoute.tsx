import { type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { AuthRole } from '../context/AuthContext';

export function ProtectedRoute({
  children,
  requiredRoles,
}: {
  children: ReactNode;
  requiredRoles?: AuthRole[];
}) {
  const { isAuthenticated, role, sessionExpired } = useAuth();
  const location = useLocation();

  if (!isAuthenticated || sessionExpired) {
    return <Navigate to="/login" replace state={{ from: location.pathname, reason: sessionExpired ? 'session_expired' : 'unauthenticated' }} />;
  }

  if (requiredRoles && (!role || !requiredRoles.includes(role))) {
    return <Navigate to="/dashboard" replace state={{ forbidden: true }} />;
  }

  return <>{children}</>;
}

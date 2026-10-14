import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAppSelector } from '../app/hooks';
import { selectCurrentUser } from '../features/auth/authSelectors';
import { hasPermission, type Permission } from '../features/auth/authUtils';

export function AccessDenied() {
  return (
    <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-800">
      <h2 className="font-semibold">Access denied</h2>
      <p className="mt-1 text-sm">Your role does not have permission to view this page.</p>
    </div>
  );
}

export function ProtectedRoute({ permission }: { permission?: Permission }) {
  const user = useAppSelector(selectCurrentUser);
  const location = useLocation();
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (permission && !hasPermission(user.role, permission)) return <AccessDenied />;
  return <Outlet />;
}
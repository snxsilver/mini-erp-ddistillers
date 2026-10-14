import { Navigate, Route, Routes } from 'react-router-dom';
import { useAppSelector } from '../app/hooks';
import { selectCurrentUser } from '../features/auth/authSelectors';
import { AppLayout } from '../components/layout/AppLayout';
import { ProtectedRoute } from './ProtectedRoute';
import LoginPage from '../pages/LoginPage';
import DashboardPage from '../pages/DashboardPage';
import ProductsPage from '../pages/ProductsPage';
import ProductDetailsPage from '../pages/ProductDetailsPage';
import MovementsPage from '../pages/MovementsPage';
import NewMovementPage from '../pages/NewMovementPage';
import UsersPage from '../pages/UsersPage';

function RootRedirect() {
  const user = useAppSelector(selectCurrentUser);
  return <Navigate to={user ? '/dashboard' : '/login'} replace />;
}

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/products/:id" element={<ProductDetailsPage />} />
          <Route path="/movements" element={<MovementsPage />} />
          <Route element={<ProtectedRoute permission="movement:create" />}>
            <Route path="/movements/new" element={<NewMovementPage />} />
          </Route>
          <Route element={<ProtectedRoute permission="users:view" />}>
            <Route path="/users" element={<UsersPage />} />
          </Route>
          <Route path="*" element={<div className="p-6">Page not found.</div>} />
        </Route>
      </Route>
      <Route path="*" element={<RootRedirect />} />
    </Routes>
  );
}
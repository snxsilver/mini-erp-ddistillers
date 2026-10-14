import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeftRight, History, LayoutDashboard, LogOut, Menu, Package, Users, X } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { selectCurrentUser } from '../../features/auth/authSelectors';
import { loggedOut } from '../../features/auth/authSlice';
import { hasPermission, roleLabel, type Permission } from '../../features/auth/authUtils';
import { initializeInventory } from '../../features/inventory/inventorySlice';
import { selectInventoryError, selectInventoryStatus, selectPersistError } from '../../features/inventory/inventorySelectors';
import { Spinner, StateMessage, btnPrimary } from '../ui/common';

const NAV: { to: string; label: string; icon: typeof Package; permission?: Permission }[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/products', label: 'Products', icon: Package },
  { to: '/movements', label: 'Movement History', icon: History },
  { to: '/movements/new', label: 'Record Stock', icon: ArrowLeftRight, permission: 'movement:create' },
  { to: '/users', label: 'User Management', icon: Users, permission: 'users:view' },
];

function titleFor(path: string): string {
  if (path.startsWith('/products/')) return 'Product Details';
  if (path === '/movements/new') return 'Record Stock Movement';
  return NAV.find((n) => n.to === path)?.label ?? 'Mini ERP';
}

export function AppLayout() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const user = useAppSelector(selectCurrentUser);
  const status = useAppSelector(selectInventoryStatus);
  const error = useAppSelector(selectInventoryError);
  const persistError = useAppSelector(selectPersistError);
  const [open, setOpen] = useState(false);

  useEffect(() => { void dispatch(initializeInventory()); }, [dispatch]);
  useEffect(() => setOpen(false), [pathname]);

  if (!user) return null;
  const items = NAV.filter((n) => !n.permission || hasPermission(user.role, n.permission));

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-800">
      <aside className={`fixed inset-y-0 left-0 z-30 w-60 transform border-r border-slate-200 bg-white transition-transform md:static md:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-14 items-center justify-between border-b border-slate-200 px-4 font-semibold text-indigo-700">
          Mini ERP
          <button className="md:hidden" onClick={() => setOpen(false)} aria-label="Close menu"><X className="h-5 w-5" /></button>
        </div>
        <nav aria-label="Main" className="space-y-1 p-3">
          {items.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end
              className={({ isActive }) => `flex items-center gap-2 rounded-md px-3 py-2 text-sm ${isActive ? 'bg-indigo-50 font-medium text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}>
              <Icon className="h-4 w-4" aria-hidden /> {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      {open && <div className="fixed inset-0 z-20 bg-slate-900/30 md:hidden" onClick={() => setOpen(false)} />}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4">
          <div className="flex items-center gap-3">
            <button className="md:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><Menu className="h-5 w-5" /></button>
            <h1 className="text-lg font-semibold">{titleFor(pathname)}</h1>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className="text-right leading-tight">
              <div className="font-medium">{user.name}</div>
              <div className="text-xs text-slate-500">{roleLabel(user.role)}</div>
            </div>
            <button className="rounded-md p-2 text-slate-500 hover:bg-slate-100" aria-label="Log out"
              onClick={() => { dispatch(loggedOut()); navigate('/login'); }}>
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>
        {persistError && (
          <div role="alert" className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
            Browser storage is unavailable or full. Your changes are NOT being saved and will be lost on reload.
          </div>
        )}
        <main className="flex-1 p-4 md:p-6">
          {status === 'error' ? (
            <StateMessage title="Could not load inventory" action={
              <button className={btnPrimary} onClick={() => void dispatch(initializeInventory())}>Retry</button>}>
              {error}
            </StateMessage>
          ) : status !== 'ready' ? (
            <Spinner label="Loading inventory…" />
          ) : (
            <Outlet />
          )}
        </main>
      </div>
    </div>
  );
}
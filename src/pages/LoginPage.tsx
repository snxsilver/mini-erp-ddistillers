import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { selectAuthError, selectCurrentUser } from '../features/auth/authSelectors';
import { login } from '../features/auth/authSlice';
import { btnPrimary, inputCls } from '../components/ui/common';

export default function LoginPage() {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectCurrentUser);
  const error = useAppSelector(selectAuthError);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  if (user) return <Navigate to="/dashboard" replace />;

  const submit = (e: FormEvent) => { e.preventDefault(); dispatch(login(email, password)); };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-lg border border-slate-200 bg-white p-6">
        <h1 className="text-xl font-semibold text-indigo-700">Mini ERP — Sign in</h1>
        {error && <p role="alert" className="rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>}
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium">Email</label>
          <input id="email" type="email" required className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
        </div>
        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium">Password</label>
          <input id="password" type="password" required className={inputCls} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        </div>
        <button type="submit" className={`${btnPrimary} w-full justify-center`}>Sign in</button>
        <div className="rounded bg-slate-50 p-3 text-xs text-slate-600">
          <p className="font-medium">Demo accounts (public, simulated login)</p>
          <p>Manager: manager@demo.local / manager123</p>
          <p>Admin Gudang: admin@demo.local / admin123</p>
          <p>Owner: owner@demo.local / owner123</p>
        </div>
      </form>
    </div>
  );
}
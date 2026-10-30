'use client';
import { useRouter } from 'next/navigation';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { api, User } from './api';

type Ctx = { user: User | null; ready: boolean; login: (token: string, user: User) => void; logout: () => void };
const AuthCtx = createContext<Ctx>({ user: null, ready: false, login: () => {}, logout: () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let token: string | null = null;
    try { token = localStorage.getItem('token'); } catch {}
    if (!token) { setReady(true); return; }
    api<User>('/auth/me')
      .then(setUser)
      .catch(() => { try { localStorage.removeItem('token'); } catch {} })
      .finally(() => setReady(true));
  }, []);

  const login = (token: string, u: User) => {
    try { localStorage.setItem('token', token); } catch {}
    setUser(u);
  };
  const logout = () => {
    try { localStorage.removeItem('token'); } catch {}
    setUser(null);
  };
  return <AuthCtx.Provider value={{ user, ready, login, logout }}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);

/** 로그인이 안 되어 있으면 로그인 화면으로 보낸다 */
export function useRequire() {
  const { user, ready } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (ready && !user) router.replace('/login');
  }, [ready, user, router]);
  return ready && !!user;
}

/** 관리자는 항상 가능, 그 외에는 나열한 역할만 */
export function useCan(...roles: string[]) {
  const { user } = useAuth();
  return !!user && (user.role === 'admin' || roles.includes(user.role));
}

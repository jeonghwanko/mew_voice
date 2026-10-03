import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { sessionStorage } from './storage';

type Session = { mode: 'demo' | 'api'; userId: string; name: string };
type AuthResult = { token: string; user: { id: string; name: string } };
type SessionContextValue = { session: Session | null; ready: boolean; demo: () => Promise<void>; login: (phone: string, password: string) => Promise<void>; guest: (name: string) => Promise<void>; logout: () => Promise<void> };
const Context = createContext<SessionContextValue | null>(null);
export function SessionProvider({ children }: PropsWithChildren) {
  const query = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => { let alive = true; void sessionStorage.get('companion_session_v1').then(raw => { if (!raw) return; const saved = JSON.parse(raw) as Session; if (alive && (saved.mode === 'demo' || saved.mode === 'api') && typeof saved.userId === 'string') setSession(saved); }).catch(() => undefined).finally(() => { if (alive) setReady(true); }); return () => { alive = false; }; }, []);
  const enter = async (next: Session) => { await query.cancelQueries(); query.clear(); await sessionStorage.set('companion_session_v1', JSON.stringify(next)); setSession(next); };
  const accept = async (result: AuthResult) => { await sessionStorage.set('ft_token', result.token); await enter({ mode: 'api', userId: result.user.id, name: result.user.name }); };
  const value: SessionContextValue = {
    session, ready,
    demo: () => enter({ mode: 'demo', userId: 'local-demo', name: '체험 보호자' }),
    login: async (phone, password) => accept(await api.post<AuthResult>('/auth/login', { phone, password })),
    guest: async name => { const { registrationToken } = await api.get<{ registrationToken: string }>('/auth/guest/token'); await accept(await api.post<AuthResult>('/auth/guest', { name, registrationToken })); },
    logout: async () => { await query.cancelQueries(); query.clear(); await sessionStorage.remove('companion_session_v1'); await sessionStorage.remove('ft_token'); setSession(null); },
  };
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useSession() { const value = useContext(Context); if (!value) throw new Error('Missing SessionProvider'); return value; }

import { createContext, useContext, useEffect, useState } from 'react';
import { api } from './api.js';

const Ctx = createContext(null);
export const useSession = () => useContext(Ctx);

export function SessionProvider({ children }) {
  const [session, setSession] = useState(undefined);
  const refresh = () => api('/auth/me').then(setSession).catch(() => setSession(null));
  useEffect(() => { if (window.location.pathname !== '/connexion') refresh(); else setSession(null); }, []);
  return <Ctx.Provider value={{ session, refresh, setSession }}>{children}</Ctx.Provider>;
}

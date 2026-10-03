import { createContext, useCallback, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import { useSession } from './session';
import { sessionStorage } from './storage';

type Selection = { ready: boolean; selectedPetId: string | null; selectPet: (id: string) => Promise<void> };
const Context = createContext<Selection | null>(null);

/** A preference belongs to a session, never to the last account that used this device. */
export function PetSelectionProvider({ children }: PropsWithChildren) {
  const { session } = useSession();
  const scope = session ? `companion_selected_${session.mode}_${session.userId}` : '';
  const [saved, setSaved] = useState({ scope: '', id: null as string | null, ready: false });
  useEffect(() => {
    let alive = true;
    if (!scope) { setSaved({ scope, id: null, ready: true }); return; }
    void sessionStorage.get(scope).then(id => { if (alive) setSaved({ scope, id, ready: true }); })
      .catch(() => { if (alive) setSaved({ scope, id: null, ready: true }); });
    return () => { alive = false; };
  }, [scope]);
  const selectPet = useCallback(async (id: string) => {
    if (!scope) return;
    await sessionStorage.set(scope, id);
    setSaved({ scope, id, ready: true });
  }, [scope]);
  return <Context.Provider value={{ ready: saved.scope === scope && saved.ready, selectedPetId: saved.scope === scope ? saved.id : null, selectPet }}>{children}</Context.Provider>;
}

export function usePetSelection() {
  const value = useContext(Context);
  if (!value) throw new Error('Missing PetSelectionProvider');
  return value;
}

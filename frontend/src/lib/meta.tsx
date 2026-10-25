import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from './api';
import type { Meta } from '../types';

// Plans and option lists come from the backend (/api/meta) so prices live in one place.
const MetaContext = createContext<Meta | null>(null);

export function MetaProvider({ children }: { children: ReactNode }) {
  const [meta, setMeta] = useState<Meta | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = (attempt: number) =>
      api<Meta>('/api/meta')
        .then((m) => !cancelled && setMeta(m))
        .catch(() => !cancelled && attempt < 5 && setTimeout(() => load(attempt + 1), 1500 * (attempt + 1)));
    load(0);
    return () => {
      cancelled = true;
    };
  }, []);

  return <MetaContext.Provider value={meta}>{children}</MetaContext.Provider>;
}

/** Returns null until the plans have loaded. */
export const useMeta = () => useContext(MetaContext);

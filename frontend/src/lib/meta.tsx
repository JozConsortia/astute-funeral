import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from './api';
import type { Meta } from '../types';

// Plans and option lists come from the backend (/api/meta) so prices live in one place.
const MetaContext = createContext<Meta | null>(null);
const MetaFailedContext = createContext(false);

export function MetaProvider({ children }: { children: ReactNode }) {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = (attempt: number) =>
      api<Meta>('/api/meta')
        .then((m) => !cancelled && setMeta(m))
        .catch(() => {
          if (cancelled) return;
          if (attempt < 5) setTimeout(() => load(attempt + 1), 1500 * (attempt + 1));
          else setFailed(true); // about 20 seconds of retries: tell the visitor rather than load for ever
        });
    load(0);
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <MetaContext.Provider value={meta}>
      <MetaFailedContext.Provider value={failed}>{children}</MetaFailedContext.Provider>
    </MetaContext.Provider>
  );
}

/** Returns null until the plans have loaded. */
export const useMeta = () => useContext(MetaContext);

/** True once loading the plans has been retried and given up (server unreachable). */
export const useMetaFailed = () => useContext(MetaFailedContext);

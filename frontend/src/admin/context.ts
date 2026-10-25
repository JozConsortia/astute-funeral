import { useOutletContext } from 'react-router-dom';
import type { Me, Meta } from '../types';

export interface AdminContext {
  me: Me;
  /** Super admins can manage users; everyone else is a regular admin. */
  isSuper: boolean;
  setMe: (me: Me) => void;
  meta: Meta;
  toast: (message: string, type?: 'success' | 'error') => void;
  openApplication: (id: number) => void;
  /** Bumped after an application changes so lists reload. */
  refreshKey: number;
  refresh: () => void;
  setUnread: (count: number) => void;
}

export const useAdmin = () => useOutletContext<AdminContext>();

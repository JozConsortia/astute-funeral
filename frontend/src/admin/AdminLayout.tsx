import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import '../styles/admin.css';
import { Brand } from '../components/Layout';
import { Seo } from '../components/Seo';
import { site } from '../config/site';
import { AUTH_EXPIRED_EVENT, api } from '../lib/api';
import { useMeta } from '../lib/meta';
import { initials, labelOf } from '../lib/format';
import type { Me, Stats } from '../types';
import { ApplicationDetailModal } from './ApplicationDetail';
import { FirstPassword } from './FirstPassword';
import type { AdminContext } from './context';

const NAV = [
  { to: '/admin', label: 'Overview', end: true, icon: <><rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" /></> },
  { to: '/admin/applications', label: 'Applications', icon: <><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z" /><path d="M14 3v6h6M8 13h8M8 17h5" /></> },
  { to: '/admin/capture', label: 'Capture applicant', icon: <><circle cx="10" cy="8" r="4" /><path d="M2 21c.7-4 4-7 8-7 1.4 0 2.7.3 3.8.9M19 14v6M16 17h6" /></> },
  { to: '/admin/messages', label: 'Messages', badge: true, icon: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></> },
  { to: '/admin/users', label: 'Users', superOnly: true, icon: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.6-3.6 3.3-6 6.5-6s5.9 2.4 6.5 6" /><circle cx="17.5" cy="7.5" r="2.5" /><path d="M16 13.2c3-.3 5.3 1.7 5.8 4.8" /></> },
  { to: '/admin/settings', label: 'My account', icon: <><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" /></> },
];

const TITLES: Record<string, string> = {
  '/admin': 'Overview',
  '/admin/applications': 'Applications',
  '/admin/capture': 'Capture applicant',
  '/admin/messages': 'Messages',
  '/admin/users': 'Users',
  '/admin/settings': 'My account',
};

export function AdminLayout() {
  const meta = useMeta();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [me, setMe] = useState<Me | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [openId, setOpenId] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [toastState, setToastState] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const toastTimer = useRef<number>(undefined);

  useEffect(() => {
    document.body.classList.add('admin');
    return () => document.body.classList.remove('admin');
  }, []);

  // Confirm the session, and send the user to the login page whenever it expires.
  useEffect(() => {
    const toLogin = () => navigate('/admin/login', { replace: true });
    window.addEventListener(AUTH_EXPIRED_EVENT, toLogin);
    api<Me>('/api/admin/me')
      .then(setMe)
      .catch(toLogin);
    api<Stats>('/api/admin/stats')
      .then((s) => setUnread(s.awaitingReply))
      .catch(() => {});
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, toLogin);
  }, [navigate]);

  useEffect(() => setSidebarOpen(false), [pathname]);

  const toast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToastState({ message, type });
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastState(null), 3200);
  }, []);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  async function logout() {
    await api('/api/admin/logout', 'POST').catch(() => {});
    navigate('/admin/login', { replace: true });
  }

  if (!me || !meta) {
    return <div className="admin-loading">Loading…</div>;
  }

  if (me.mustChangePassword) {
    const done = () => {
      setMe({ ...me, mustChangePassword: false });
      // The unread count was refused while the temporary password was in use.
      api<Stats>('/api/admin/stats').then((s) => setUnread(s.awaitingReply)).catch(() => {});
    };
    return <FirstPassword name={me.fullName} onDone={done} onLogout={logout} />;
  }

  const isSuper = me.role === 'SUPER_ADMIN';
  const context: AdminContext = { me, isSuper, setMe, meta, toast, openApplication: setOpenId, refreshKey, refresh, setUnread };

  return (
    <div className="admin-shell">
      <Seo title={`${TITLES[pathname] ?? 'Admin'} | ${site.name} Admin`} description="Administrator area" path={pathname} noindex />

      <aside className={`admin-sidebar${sidebarOpen ? ' is-open' : ''}`}>
        <Link className="brand" to="/admin">
          <Brand tagline="Admin portal" />
        </Link>
        <nav className="admin-nav" aria-label="Admin">
          {NAV.filter((item) => !item.superOnly || isSuper).map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `admin-nav__link${isActive ? ' is-active' : ''}`}>
              <svg viewBox="0 0 24 24" aria-hidden="true">{item.icon}</svg>
              {item.label}
              {item.badge && unread > 0 && <span className="pill pill--gold">{unread}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="admin-sidebar__foot">
          <div className="admin-user">
            <span className="admin-user__avatar" aria-hidden="true">{initials(me.fullName)}</span>
            <span className="admin-user__text">
              <strong>{me.fullName}</strong>
              <span className={`role-pill role-pill--${me.role.toLowerCase()}`}>{labelOf(meta.adminRoles, me.role)}</span>
            </span>
          </div>
          <a className="admin-nav__link" href="/" target="_blank" rel="noopener">View website ↗</a>
          <button className="btn btn--outline btn--sm btn--block" type="button" onClick={logout}>Sign out</button>
        </div>
      </aside>
      {sidebarOpen && <div className="admin-backdrop" onClick={() => setSidebarOpen(false)} />}

      <div className="admin-main">
        <header className="admin-topbar">
          <button className="nav-toggle admin-topbar__toggle" type="button" aria-label="Open menu" onClick={() => setSidebarOpen(true)}>
            <span className="nav-toggle__bar" />
          </button>
          <h1 className="admin-topbar__title">{TITLES[pathname] ?? 'Admin'}</h1>
          <Link className="btn btn--gold btn--sm" to="/admin/capture">+ New applicant</Link>
        </header>
        <div className="admin-content">
          <Outlet context={context} />
        </div>
      </div>

      {openId !== null && (
        <ApplicationDetailModal
          id={openId}
          meta={meta}
          onClose={() => setOpenId(null)}
          onChanged={(message) => {
            toast(message);
            refresh();
          }}
          onError={(message) => toast(message, 'error')}
        />
      )}

      {toastState && (
        <div className={`toast toast--${toastState.type}`} role="status" aria-live="polite">
          {toastState.message}
        </div>
      )}
    </div>
  );
}


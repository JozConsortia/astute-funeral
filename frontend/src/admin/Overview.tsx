import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { formatDate, money } from '../lib/format';
import { Icon, type IconName } from '../components/Icon';
import type { Stats } from '../types';
import { useAdmin } from './context';
import { StatusPill } from './StatusPill';

const LIST = '/admin/applications';

interface Tile {
  label: string;
  value: string | number;
  icon: IconName;
  note: string;
  tone?: 'new' | 'review' | 'approved' | 'declined' | 'gold' | 'alert';
  /** Every tile opens the list it counts. */
  to: string;
}

export function Overview() {
  const { meta, openApplication, refreshKey, setUnread, toast } = useAdmin();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    api<Stats>('/api/admin/stats')
      .then((s) => {
        setStats(s);
        setUnread(s.awaitingReply);
      })
      .catch((err: Error) => toast(err.message, 'error'));
  }, [refreshKey, setUnread, toast]);

  const month = new Date().toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' });
  const tiles: Tile[] = stats
    ? [
        { label: 'Total applications', value: stats.total, icon: 'file', note: 'All time', to: LIST },
        { label: 'New', value: stats.byStatus.NEW, icon: 'sparkle', note: 'Waiting to be reviewed', tone: 'new', to: `${LIST}?status=NEW` },
        { label: 'In review', value: stats.byStatus.IN_REVIEW, icon: 'clock', note: 'Being checked', tone: 'review', to: `${LIST}?status=IN_REVIEW` },
        { label: 'Approved', value: stats.byStatus.APPROVED, icon: 'check', note: 'Policies approved', tone: 'approved', to: `${LIST}?status=APPROVED` },
        { label: 'Declined', value: stats.byStatus.DECLINED, icon: 'close', note: 'Not approved', tone: 'declined', to: `${LIST}?status=DECLINED` },
        { label: 'This month', value: stats.thisMonth, icon: 'calendar', note: `Applications in ${month}`, to: `${LIST}?period=month` },
        {
          label: 'Monthly premiums',
          value: money(stats.approvedPremium),
          icon: 'wallet',
          note: 'From approved policies',
          tone: 'gold',
          to: `${LIST}?status=APPROVED`,
        },
        {
          label: 'Messages awaiting reply',
          value: stats.awaitingReply,
          icon: 'mail',
          note: stats.awaitingReply > 0 ? 'Reply now' : 'All caught up',
          tone: stats.awaitingReply > 0 ? 'alert' : undefined,
          to: '/admin/messages',
        },
      ]
    : [];
  const maxPlan = Math.max(1, ...(stats?.byPlan.map((p) => p.count) ?? []));

  return (
    <section>
      <div className="stats">
        {stats
          ? tiles.map((t) => {
              const className = `stat stat--link${t.tone ? ` stat--${t.tone}` : ''}`;
              const body = (
                <>
                  <span className="stat__icon"><Icon name={t.icon} /></span>
                  <span className="stat__label">{t.label}</span>
                  <span className="stat__value">{t.value}</span>
                  <span className="stat__note">{t.note}</span>
                </>
              );
              return (
                <Link className={className} key={t.label} to={t.to} aria-label={`${t.label}: ${t.value}. ${t.note}`}>
                  {body}
                </Link>
              );
            })
          : <p className="muted">Loading…</p>}
      </div>

      <div className="panel-grid">
        <div className="panel">
          <div className="panel__head">
            <h2 className="panel__title">Recent applications</h2>
            <Link className="link-btn" to="/admin/applications">View all</Link>
          </div>
          <div className="table-wrap">
            <table className="table table--responsive">
              <thead>
                <tr><th>Reference</th><th>Applicant</th><th>Plan</th><th>Date</th><th>Status</th></tr>
              </thead>
              <tbody>
                {stats?.recent.length ? (
                  stats.recent.map((r) => (
                    <tr key={r.id} className="is-clickable" onClick={() => openApplication(r.id)}>
                      <td data-label="Reference"><span className="ref">{r.reference}</span></td>
                      <td data-label="Applicant">{r.firstName} {r.lastName}</td>
                      <td data-label="Plan">{r.planName}</td>
                      <td data-label="Date">{formatDate(r.createdAt)}</td>
                      <td data-label="Status"><StatusPill status={r.status} statuses={meta.statuses} /></td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="empty">
                      {stats ? 'No applications yet. They will appear here as soon as someone applies.' : 'Loading…'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel">
          <div className="panel__head"><h2 className="panel__title">Applications by plan</h2></div>
          <ul className="plan-breakdown">
            {stats?.byPlan.length ? (
              stats.byPlan.map((p) => (
                <li className="plan-breakdown__item" key={p.planName}>
                  <span className="plan-breakdown__label"><span>{p.planName}</span><strong>{p.count}</strong></span>
                  <span className="plan-breakdown__track">
                    <span className="plan-breakdown__bar" style={{ width: `${(p.count / maxPlan) * 100}%` }} />
                  </span>
                </li>
              ))
            ) : (
              <li className="empty">No data yet.</li>
            )}
          </ul>
        </div>
      </div>
    </section>
  );
}

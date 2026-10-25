import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { formatDate, money } from '../lib/format';
import type { Stats } from '../types';
import { useAdmin } from './context';
import { StatusPill } from './StatusPill';

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

  const tiles: [string, string | number, boolean?, string?][] = stats
    ? [
        ['Total applications', stats.total],
        ['New', stats.byStatus.NEW],
        ['In review', stats.byStatus.IN_REVIEW],
        ['Approved', stats.byStatus.APPROVED],
        ['This month', stats.thisMonth],
        ['Approved monthly premiums', money(stats.approvedPremium), true],
        ['Messages awaiting reply', stats.awaitingReply, false, '/admin/messages'],
      ]
    : [];
  const maxPlan = Math.max(1, ...(stats?.byPlan.map((p) => p.count) ?? []));

  return (
    <section>
      <div className="stats">
        {stats
          ? tiles.map(([label, value, gold, to]) =>
              to ? (
                <Link className={`stat stat--link${Number(value) > 0 ? ' stat--alert' : ''}`} key={label} to={to}>
                  <span className="stat__label">{label}</span>
                  <span className="stat__value">{value}</span>
                  <span className="stat__more">{Number(value) > 0 ? 'Reply now →' : 'All caught up'}</span>
                </Link>
              ) : (
                <div className={`stat${gold ? ' stat--gold' : ''}`} key={label}>
                  <span className="stat__label">{label}</span>
                  <span className="stat__value">{value}</span>
                </div>
              ),
            )
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

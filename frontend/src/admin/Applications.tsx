import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { formatDate, money, telLink } from '../lib/format';
import type { ApplicationSummary, PageResult } from '../types';
import { useAdmin } from './context';
import { StatusPill } from './StatusPill';

export function Applications() {
  const { meta, openApplication, refreshKey, toast } = useAdmin();
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [plan, setPlan] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<PageResult<ApplicationSummary> | null>(null);

  // Debounce typing in the search box.
  useEffect(() => {
    const t = window.setTimeout(() => {
      setQ(search.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(t);
  }, [search]);

  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (status) params.set('status', status);
  if (plan) params.set('plan', plan);
  const filterQuery = params.toString();

  useEffect(() => {
    const p = new URLSearchParams(filterQuery);
    p.set('page', String(page));
    api<PageResult<ApplicationSummary>>(`/api/admin/applications?${p}`)
      .then(setData)
      .catch((err: Error) => toast(err.message, 'error'));
  }, [filterQuery, page, refreshKey, toast]);

  const filtered = Boolean(q || status || plan);

  return (
    <section>
      <div className="toolbar">
        <input
          className="toolbar__search"
          type="search"
          placeholder="Search name, ID, reference, phone…"
          aria-label="Search applications"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select aria-label="Filter by status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          {meta.statuses.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select aria-label="Filter by plan" value={plan} onChange={(e) => { setPlan(e.target.value); setPage(1); }}>
          <option value="">All plans</option>
          {meta.plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <a className="btn btn--outline btn--sm" href={`/api/admin/applications.csv?${filterQuery}`}>Export CSV</a>
      </div>

      <div className="panel">
        <div className="table-wrap">
          <table className="table table--responsive">
            <thead>
              <tr>
                <th>Reference</th><th>Applicant</th><th>ID / Passport</th><th>Phone</th><th>Plan</th><th>Submitted</th><th>Status</th>
                <th><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {data?.rows.length ? (
                data.rows.map((r) => (
                  <tr key={r.id}>
                    <td data-label="Reference">
                      <span>
                        <span className="ref">{r.reference}</span>
                        {r.source === 'ADMIN' && <span className="source">captured</span>}
                      </span>
                    </td>
                    <td data-label="Applicant"><strong>{r.firstName} {r.lastName}</strong></td>
                    <td data-label="ID / Passport">{r.idNumber}</td>
                    <td data-label="Phone"><a href={telLink(r.phone)}>{r.phone}</a></td>
                    <td data-label="Plan">
                      <span>{r.planName}<span className="muted"> · {money(r.monthlyPremium)}/m</span></span>
                    </td>
                    <td data-label="Submitted">{formatDate(r.createdAt)}</td>
                    <td data-label="Status"><StatusPill status={r.status} statuses={meta.statuses} /></td>
                    <td className="table__actions">
                      <button className="btn btn--outline btn--sm" type="button" onClick={() => openApplication(r.id)}>View</button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="empty">
                    {!data ? 'Loading…' : filtered ? 'No applications match your filters.' : 'No applications yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {data && (
          <div className="pager">
            <span className="muted">{data.total} application{data.total === 1 ? '' : 's'}</span>
            <div className="pager__buttons">
              <button className="btn btn--ghost btn--sm" type="button" disabled={data.page <= 1} onClick={() => setPage(data.page - 1)}>‹ Prev</button>
              <span>Page {data.page} of {data.pages}</span>
              <button className="btn btn--ghost btn--sm" type="button" disabled={data.page >= data.pages} onClick={() => setPage(data.page + 1)}>Next ›</button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

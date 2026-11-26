import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { fullAddress, site } from '../config/site';
import { api } from '../lib/api';
import { capitalise, formatDateTime, labelOf, money, telLink } from '../lib/format';
import type { ApplicationDetail, Meta, Status } from '../types';
import { StatusPill } from './StatusPill';

interface Props {
  id: number;
  meta: Meta;
  onClose: () => void;
  onChanged: (message: string) => void;
  onError: (message: string) => void;
}

function Details({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="details">
      {rows
        .filter(([, value]) => value)
        .map(([label, value]) => (
          <div key={label} className="details__row">
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
    </dl>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="detail-section">
      <h3 className="detail-section__title">{title}</h3>
      {children}
    </section>
  );
}

export function ApplicationDetailModal({ id, meta, onClose, onChanged, onError }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [app, setApp] = useState<ApplicationDetail | null>(null);
  const [status, setStatus] = useState<Status>('NEW');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Keep the latest callbacks without re-running the load effect when the parent re-renders.
  const callbacks = useRef({ onClose, onError });
  callbacks.current = { onClose, onError };

  useEffect(() => {
    if (dialog.current && !dialog.current.open) dialog.current.showModal();
    let cancelled = false;
    api<ApplicationDetail>(`/api/admin/applications/${id}`)
      .then((a) => {
        if (cancelled) return;
        setApp(a);
        setStatus(a.status);
        setNotes(a.notes);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        callbacks.current.onError(err.message);
        callbacks.current.onClose();
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api(`/api/admin/applications/${id}`, 'PATCH', { status, notes });
      onChanged('Application updated.');
      onClose();
    } catch (err) {
      onError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!window.confirm('Delete this application permanently? This cannot be undone.')) return;
    try {
      await api(`/api/admin/applications/${id}`, 'DELETE');
      onChanged('Application deleted.');
      onClose();
    } catch (err) {
      onError((err as Error).message);
    }
  }

  return (
    <dialog
      ref={dialog}
      className="modal"
      aria-labelledby="detail-title"
      onClose={onClose}
      onClick={(e) => e.target === dialog.current && dialog.current?.close()}
    >
      {/* Letterhead: hidden on screen, printed at the top of the application. */}
      <div className="print-letterhead" aria-hidden="true">
        <img src="/img/logo-deep.png" alt="" width={480} height={414} />
        <div className="print-letterhead__text">
          <strong>{site.name}</strong>
          <span>{fullAddress}</span>
          <span>Office {site.office} · 24/7 emergency {site.emergency}</span>
          <span>{site.email}</span>
          <span>{site.fsp}</span>
        </div>
      </div>
      <div className="modal__head">
        <div>
          <p className="modal__ref">{app?.reference ?? ' '}</p>
          <h2 className="modal__title" id="detail-title">
            {app ? `${app.title ? `${app.title} ` : ''}${app.firstName} ${app.lastName}` : 'Loading…'}
          </h2>
        </div>
        <button className="modal__close" type="button" aria-label="Close" onClick={() => dialog.current?.close()}>
          &times;
        </button>
      </div>

      <div className="modal__body">
        {app && (
          <>
            <div className="detail-banner">
              <StatusPill status={app.status} statuses={meta.statuses} />
              <span>Submitted {formatDateTime(app.createdAt)}</span>
              <span>{app.source === 'ADMIN' ? `Captured by ${app.capturedBy ?? 'admin'}` : 'Online application'}</span>
              {app.lastUpdatedBy && <span>Last updated by {app.lastUpdatedBy} · {formatDateTime(app.updatedAt)}</span>}
            </div>
            <Section title="Policy">
              <Details
                rows={[
                  ['Plan', app.planName],
                  ['Cover amount', money(app.coverAmount)],
                  ['Monthly premium', money(app.monthlyPremium)],
                  ['Payment method', labelOf(meta.paymentMethods, app.paymentMethod)],
                  ['Deduction date', app.debitDay && labelOf(meta.debitDays, app.debitDay)],
                ]}
              />
            </Section>
            <Section title="Main member">
              <Details
                rows={[
                  ['ID / Passport', app.idNumber],
                  ['Date of birth', app.dateOfBirth],
                  ['Gender', capitalise(app.gender)],
                  ['Marital status', labelOf(meta.maritalStatuses, app.maritalStatus)],
                  ['Cellphone', <a href={telLink(app.phone)}>{app.phone}</a>],
                  ['Alternative', app.altPhone],
                  ['Email', app.email && <a href={`mailto:${app.email}`}>{app.email}</a>],
                  ['Address', [app.address, app.city, app.province, app.postalCode].filter(Boolean).join(', ')],
                ]}
              />
            </Section>
            <Section title={`Family members (${app.dependants.length})`}>
              {app.dependants.length ? (
                <div className="table-wrap">
                  <table className="table table--compact">
                    <thead>
                      <tr><th>Name</th><th>Relationship</th><th>ID / Passport</th><th>Date of birth</th></tr>
                    </thead>
                    <tbody>
                      {app.dependants.map((d, i) => (
                        <tr key={i}>
                          <td>{d.firstName} {d.lastName}</td>
                          <td>{labelOf(meta.relationships, d.relationship)}</td>
                          <td>{d.idNumber || '–'}</td>
                          <td>{d.dateOfBirth}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="muted">Main member only.</p>
              )}
            </Section>
            <Section title="Beneficiary">
              <Details
                rows={[
                  ['Name', `${app.beneficiary.firstName} ${app.beneficiary.lastName}`],
                  ['Relationship', app.beneficiary.relationship],
                  ['ID / Passport', app.beneficiary.idNumber],
                  ['Phone', <a href={telLink(app.beneficiary.phone)}>{app.beneficiary.phone}</a>],
                ]}
              />
            </Section>
          </>
        )}
      </div>

      <form className="modal__foot" onSubmit={save}>
        <div className="field">
          <label htmlFor="d-status">Status</label>
          <select id="d-status" value={status} onChange={(e) => setStatus(e.target.value as Status)} disabled={!app}>
            {meta.statuses.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <div className="field modal__notes">
          <label htmlFor="d-notes">Internal notes</label>
          <textarea
            id="d-notes"
            rows={3}
            maxLength={5000}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Called client, debit order set up for the 25th"
            disabled={!app}
          />
        </div>
        <div className="modal__actions">
          <button className="btn btn--danger btn--sm" type="button" onClick={remove} disabled={!app}>Delete</button>
          <button className="btn btn--ghost btn--sm" type="button" onClick={() => window.print()} disabled={!app}>Print</button>
          <button className="btn btn--gold btn--sm" type="submit" disabled={!app || saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </dialog>
  );
}

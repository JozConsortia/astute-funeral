import { useState, type FormEvent } from 'react';
import { Field, FormAlert } from '../components/Field';
import { PasswordInput } from '../components/PasswordInput';
import { ApiError, api } from '../lib/api';
import { labelOf } from '../lib/format';
import type { FieldErrors, Me } from '../types';
import { useAdmin } from './context';

type Alert = { message: string; type: 'error' | 'success' } | null;

export function Settings() {
  return (
    <section className="settings">
      <Profile />
      <ChangePassword />
    </section>
  );
}

function Profile() {
  const { me, setMe, meta } = useAdmin();
  const [form, setForm] = useState({ fullName: me.fullName, email: me.email ?? '' });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [alert, setAlert] = useState<Alert>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setAlert(null);
    try {
      const updated = await api<Me>('/api/admin/me', 'PATCH', form);
      setMe(updated);
      setErrors({});
      setAlert({ message: 'Your details have been saved.', type: 'success' });
    } catch (err) {
      if (err instanceof ApiError) setErrors(err.errors);
      setAlert({ message: (err as Error).message, type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="panel panel--narrow">
      <h2 className="panel__title">My details</h2>
      <p className="muted settings__meta">
        Signed in as <strong>@{me.username}</strong> &middot;{' '}
        <span className={`role-pill role-pill--${me.role.toLowerCase()}`}>{labelOf(meta.adminRoles, me.role)}</span>
      </p>
      <form onSubmit={submit} noValidate>
        {alert && <FormAlert message={alert.message} type={alert.type} />}
        <Field label="Full name" htmlFor="m-name" error={errors.fullName} help="Shown next to the replies and changes you make.">
          <input id="m-name" value={form.fullName} maxLength={80} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} />
        </Field>
        <Field label="Email (optional)" htmlFor="m-email" error={errors.email}>
          <input id="m-email" type="email" value={form.email} maxLength={120} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
        </Field>
        <button className="btn btn--gold" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save details'}</button>
      </form>
    </div>
  );
}

function ChangePassword() {
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [alert, setAlert] = useState<Alert>(null);

  const set = (key: keyof typeof form, value: string) => setForm((f) => ({ ...f, [key]: value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setAlert(null);
    if (form.next.length < 10) return setErrors({ next: 'Use at least 10 characters.' });
    if (form.next !== form.confirm) return setErrors({ confirm: 'Passwords do not match.' });
    setErrors({});
    try {
      await api('/api/admin/password', 'POST', { current: form.current, next: form.next });
      setForm({ current: '', next: '', confirm: '' });
      setAlert({ message: 'Password updated.', type: 'success' });
    } catch (err) {
      if (err instanceof ApiError) setErrors(err.errors);
      setAlert({ message: (err as Error).message, type: 'error' });
    }
  }

  return (
    <div className="panel panel--narrow">
      <h2 className="panel__title">Change password</h2>
      <form onSubmit={submit} noValidate>
        {alert && <FormAlert message={alert.message} type={alert.type} />}
        <Field label="Current password" htmlFor="p-current" error={errors.current}>
          <PasswordInput id="p-current" autoComplete="current-password" value={form.current} onChange={(e) => set('current', e.target.value)} />
        </Field>
        <Field label="New password (min. 10 characters)" htmlFor="p-next" error={errors.next}>
          <PasswordInput id="p-next" autoComplete="new-password" value={form.next} onChange={(e) => set('next', e.target.value)} />
        </Field>
        <Field label="Confirm new password" htmlFor="p-confirm" error={errors.confirm}>
          <PasswordInput id="p-confirm" autoComplete="new-password" value={form.confirm} onChange={(e) => set('confirm', e.target.value)} />
        </Field>
        <button className="btn btn--gold" type="submit">Update password</button>
      </form>
    </div>
  );
}

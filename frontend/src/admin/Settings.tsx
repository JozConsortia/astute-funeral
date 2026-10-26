import { useState, type FormEvent, type ReactNode } from 'react';
import { Field, FormAlert } from '../components/Field';
import { Icon, IconInput, type IconName } from '../components/Icon';
import { PasswordInput } from '../components/PasswordInput';
import { ApiError, api } from '../lib/api';
import { initials, labelOf } from '../lib/format';
import { PASSWORD_RULES, isStrongPassword } from '../lib/passwordRules';
import type { FieldErrors, Me } from '../types';
import { useAdmin } from './context';

type Alert = { message: string; type: 'error' | 'success' } | null;

export function Settings() {
  const { me, meta } = useAdmin();
  return (
    <div className="account">
      <section className="account-banner" aria-label="Your account">
        <span className="account-banner__avatar" aria-hidden="true">{initials(me.fullName)}</span>
        <div className="account-banner__text">
          <h2 className="account-banner__name">{me.fullName}</h2>
          <p className="account-banner__meta">
            <span>@{me.username}</span>
            <span className={`role-pill role-pill--${me.role.toLowerCase()}`}>{labelOf(meta.adminRoles, me.role)}</span>
          </p>
          <p className="account-banner__email">
            <Icon name="mail" /> {me.email || 'No email address added yet'}
          </p>
        </div>
      </section>

      <div className="account__grid">
        <Profile />
        <ChangePassword />
      </div>
    </div>
  );
}

function AccountPanel({ icon, title, hint, children }: { icon: IconName; title: string; hint: string; children: ReactNode }) {
  return (
    <section className="panel account-panel">
      <header className="account-panel__head">
        <span className="account-panel__icon"><Icon name={icon} /></span>
        <div>
          <h2 className="panel__title">{title}</h2>
          <p className="account-panel__hint">{hint}</p>
        </div>
      </header>
      {children}
    </section>
  );
}

function Profile() {
  const { me, setMe } = useAdmin();
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
    <AccountPanel icon="user" title="My details" hint="Your name is shown next to the replies and changes you make.">
      <form className="account-form" onSubmit={submit} noValidate>
        {alert && <FormAlert message={alert.message} type={alert.type} />}
        <Field label="Full name" htmlFor="m-name" error={errors.fullName}>
          <IconInput icon="user">
            <input id="m-name" value={form.fullName} maxLength={80} placeholder="Your name and surname" onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} />
          </IconInput>
        </Field>
        <Field label="Email (optional)" htmlFor="m-email" error={errors.email}>
          <IconInput icon="mail">
            <input id="m-email" type="email" value={form.email} maxLength={120} placeholder="you@example.com" onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          </IconInput>
        </Field>
        <div className="account-form__actions">
          <button className="btn btn--gold" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save details'}</button>
        </div>
      </form>
    </AccountPanel>
  );
}

function ChangePassword() {
  return (
    <AccountPanel icon="lock" title="Change password" hint="Choose a password you do not use anywhere else.">
      <ChangePasswordForm />
    </AccountPanel>
  );
}

/** Current + new password with a live checklist of the password rules. Also used on the first-sign-in screen. */
export function ChangePasswordForm({ onChanged, submitLabel = 'Update password' }: { onChanged?: () => void; submitLabel?: string }) {
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [alert, setAlert] = useState<Alert>(null);
  const [saving, setSaving] = useState(false);

  const set = (key: keyof typeof form, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: '' }));
  };
  const matches = form.next.length > 0 && form.next === form.confirm;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setAlert(null);
    if (!form.current) return setErrors({ current: 'Enter your current password.' });
    if (!isStrongPassword(form.next)) return setErrors({ next: 'Your new password does not meet all the rules below yet.' });
    if (!matches) return setErrors({ confirm: 'Passwords do not match.' });
    setErrors({});
    setSaving(true);
    try {
      await api('/api/admin/password', 'POST', { current: form.current, next: form.next });
      setForm({ current: '', next: '', confirm: '' });
      setAlert({ message: 'Password updated.', type: 'success' });
      onChanged?.();
    } catch (err) {
      if (err instanceof ApiError) setErrors(err.errors);
      setAlert({ message: (err as Error).message, type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="account-form" onSubmit={submit} noValidate>
      {alert && <FormAlert message={alert.message} type={alert.type} />}
      <Field label="Current password" htmlFor="p-current" error={errors.current}>
        <IconInput icon="lock">
          <PasswordInput id="p-current" autoComplete="current-password" value={form.current} onChange={(e) => set('current', e.target.value)} />
        </IconInput>
      </Field>
      <Field label="New password" htmlFor="p-next" error={errors.next}>
        <IconInput icon="lock">
          <PasswordInput id="p-next" autoComplete="new-password" value={form.next} onChange={(e) => set('next', e.target.value)} />
        </IconInput>
      </Field>
      <Field label="Confirm new password" htmlFor="p-confirm" error={errors.confirm}>
        <IconInput icon="lock">
          <PasswordInput id="p-confirm" autoComplete="new-password" value={form.confirm} onChange={(e) => set('confirm', e.target.value)} />
        </IconInput>
      </Field>
      <ul className="password-checks" aria-label="Password rules">
        {PASSWORD_RULES.map((r) => (
          <li key={r.label} className={r.test(form.next) ? 'is-met' : ''}>{r.label}</li>
        ))}
        <li className={matches ? 'is-met' : ''}>Both new passwords match</li>
      </ul>
      <div className="account-form__actions">
        <button className="btn btn--gold" type="submit" disabled={saving}>{saving ? 'Saving…' : submitLabel}</button>
      </div>
    </form>
  );
}

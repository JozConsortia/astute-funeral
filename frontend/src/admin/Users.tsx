import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { Field, FormAlert } from '../components/Field';
import { PasswordInput } from '../components/PasswordInput';
import { ApiError, api } from '../lib/api';
import { formatDateTime, labelOf } from '../lib/format';
import type { AdminRole, AdminUser, FieldErrors } from '../types';
import { useAdmin } from './context';
import { Modal } from './Modal';

const ROLE_INFO: Record<AdminRole, string> = {
  ADMIN: 'Reviews and approves applications, captures applicants and replies to messages.',
  SUPER_ADMIN: 'Everything an admin can do, plus adding, editing and removing users.',
};

/** 12 characters without look-alikes (0/O, 1/l/I) so it is easy to read out over the phone. */
function generatePassword() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}

const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('');

type Dialog = { kind: 'create' } | { kind: 'edit'; user: AdminUser } | { kind: 'password'; user: AdminUser } | null;

export function Users() {
  const { me, isSuper, meta, toast } = useAdmin();
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);

  const load = useCallback(
    () => api<AdminUser[]>('/api/admin/users').then(setUsers).catch((err: Error) => toast(err.message, 'error')),
    [toast],
  );

  useEffect(() => {
    if (isSuper) load();
  }, [isSuper, load]);

  if (!isSuper) return <Navigate to="/admin" replace />;

  async function remove(user: AdminUser) {
    if (!window.confirm(`Remove ${user.fullName}'s access permanently? This cannot be undone.`)) return;
    try {
      await api(`/api/admin/users/${user.id}`, 'DELETE');
      toast(`${user.fullName} has been removed.`);
      load();
    } catch (err) {
      toast((err as Error).message, 'error');
    }
  }

  const activeCount = users?.filter((u) => u.active).length ?? 0;

  return (
    <section className="users">
      <div className="users__head">
        <div>
          <h2 className="panel__title">Team members</h2>
          <p className="muted">
            Add the people who will manage applications and reply to messages.
            {users && ` ${activeCount} active user${activeCount === 1 ? '' : 's'}.`}
          </p>
        </div>
        <button className="btn btn--gold" type="button" onClick={() => setDialog({ kind: 'create' })}>
          + Add user
        </button>
      </div>

      <div className="role-cards">
        {(['ADMIN', 'SUPER_ADMIN'] as AdminRole[]).map((role) => (
          <div className="role-card" key={role}>
            <span className={`role-pill role-pill--${role.toLowerCase()}`}>{labelOf(meta.adminRoles, role)}</span>
            <p>{ROLE_INFO[role]}</p>
          </div>
        ))}
      </div>

      <div className="panel">
        <div className="table-wrap">
          <table className="table table--responsive">
            <thead>
              <tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Last sign-in</th><th><span className="sr-only">Actions</span></th></tr>
            </thead>
            <tbody>
              {!users ? (
                <tr><td colSpan={6} className="empty">Loading…</td></tr>
              ) : (
                users.map((u) => {
                  const isMe = u.username === me.username;
                  return (
                    <tr key={u.id} className={u.active ? '' : 'is-inactive'}>
                      <td data-label="Name">
                        <span className="user-cell">
                          <span className="admin-user__avatar" aria-hidden="true">{initials(u.fullName)}</span>
                          <span>
                            <strong>{u.fullName}</strong>
                            {isMe && <span className="you-tag">You</span>}
                            <span className="user-cell__username">@{u.username}</span>
                          </span>
                        </span>
                      </td>
                      <td data-label="Email">{u.email ? <a href={`mailto:${u.email}`}>{u.email}</a> : <span className="muted">–</span>}</td>
                      <td data-label="Role"><span className={`role-pill role-pill--${u.role.toLowerCase()}`}>{labelOf(meta.adminRoles, u.role)}</span></td>
                      <td data-label="Status">
                        <span className={`status ${u.active ? 'status--approved' : 'status--declined'}`}>{u.active ? 'Active' : 'Deactivated'}</span>
                      </td>
                      <td data-label="Last sign-in">{u.lastLoginAt ? formatDateTime(u.lastLoginAt) : <span className="muted">Never</span>}</td>
                      <td className="table__actions">
                        <span className="row-actions">
                          <button className="btn btn--outline btn--sm" type="button" onClick={() => setDialog({ kind: 'edit', user: u })}>Edit</button>
                          <button className="btn btn--ghost btn--sm" type="button" onClick={() => setDialog({ kind: 'password', user: u })}>Reset password</button>
                          {!isMe && (
                            <button className="btn btn--danger btn--sm" type="button" onClick={() => remove(u)}>Remove</button>
                          )}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {(dialog?.kind === 'create' || dialog?.kind === 'edit') && (
        <UserDialog
          user={dialog.kind === 'edit' ? dialog.user : undefined}
          isMe={dialog.kind === 'edit' && dialog.user.username === me.username}
          onClose={() => setDialog(null)}
          onSaved={(message) => {
            toast(message);
            setDialog(null);
            load();
          }}
        />
      )}
      {dialog?.kind === 'password' && (
        <PasswordDialog
          user={dialog.user}
          onClose={() => setDialog(null)}
          onSaved={(message) => {
            toast(message);
            setDialog(null);
          }}
        />
      )}
    </section>
  );
}

// ---------------------------------------------------------------- add / edit

interface UserDialogProps {
  user?: AdminUser;
  isMe: boolean;
  onClose: () => void;
  onSaved: (message: string) => void;
}

function UserDialog({ user, isMe, onClose, onSaved }: UserDialogProps) {
  const { meta } = useAdmin();
  const editing = Boolean(user);
  const [form, setForm] = useState({
    fullName: user?.fullName ?? '',
    username: user?.username ?? '',
    email: user?.email ?? '',
    role: (user?.role ?? 'ADMIN') as AdminRole,
    active: user?.active ?? true,
    password: '',
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [alert, setAlert] = useState('');
  const [saving, setSaving] = useState(false);
  const [generated, setGenerated] = useState(0);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: '' }));
  };

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setAlert('');
    try {
      if (user) {
        await api(`/api/admin/users/${user.id}`, 'PATCH', {
          fullName: form.fullName,
          email: form.email,
          role: form.role,
          active: form.active,
        });
        onSaved(`${form.fullName}'s details have been updated.`);
      } else {
        await api('/api/admin/users', 'POST', {
          fullName: form.fullName,
          username: form.username,
          email: form.email,
          role: form.role,
          password: form.password,
        });
        onSaved(`${form.fullName} can now sign in as "${form.username.toLowerCase()}".`);
      }
    } catch (err) {
      if (err instanceof ApiError) setErrors(err.errors);
      setAlert((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={editing ? `Edit ${user!.fullName}` : 'Add a user'}
      subtitle={editing ? `@${user!.username}` : 'New team member'}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn--ghost btn--sm" type="button" onClick={onClose}>Cancel</button>
          <button className="btn btn--gold btn--sm" type="submit" form="user-form" disabled={saving}>
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Add user'}
          </button>
        </>
      }
    >
      <form id="user-form" className="stack" onSubmit={save} noValidate>
        <FormAlert message={alert} />
        <Field label="Full name" htmlFor="u-name" required error={errors.fullName}>
          <input id="u-name" value={form.fullName} maxLength={80} autoFocus onChange={(e) => set('fullName', e.target.value)} />
        </Field>
        <div className="grid grid--2">
          <Field label="Username" htmlFor="u-username" required={!editing} error={errors.username}
            help={editing ? 'Usernames cannot be changed.' : 'Used to sign in, e.g. thandi.nkosi'}>
            <input id="u-username" value={form.username} maxLength={40} disabled={editing} autoCapitalize="off" spellCheck={false}
              onChange={(e) => set('username', e.target.value)} />
          </Field>
          <Field label="Email (optional)" htmlFor="u-email" error={errors.email}>
            <input id="u-email" type="email" value={form.email} maxLength={120} onChange={(e) => set('email', e.target.value)} />
          </Field>
        </div>

        <Field label="Role" required error={errors.role}>
          <div className="role-options">
            {(['ADMIN', 'SUPER_ADMIN'] as AdminRole[]).map((role) => (
              <label key={role} className={`role-option${form.role === role ? ' is-selected' : ''}${isMe && role === 'ADMIN' ? ' is-disabled' : ''}`}>
                <input type="radio" name="role" value={role} checked={form.role === role} disabled={isMe && role === 'ADMIN'}
                  onChange={() => set('role', role)} />
                <span>
                  <strong>{labelOf(meta.adminRoles, role)}</strong>
                  <span>{ROLE_INFO[role]}</span>
                </span>
              </label>
            ))}
          </div>
        </Field>

        {editing && (
          <label className={`switch${isMe ? ' is-disabled' : ''}`}>
            <input type="checkbox" checked={form.active} disabled={isMe} onChange={(e) => set('active', e.target.checked)} />
            <span className="switch__track" aria-hidden="true" />
            <span>
              <strong>{form.active ? 'Account active' : 'Account deactivated'}</strong>
              <span className="muted">
                {isMe ? "You can't deactivate your own account." : 'Deactivated users are signed out and cannot sign in.'}
              </span>
            </span>
          </label>
        )}

        {!editing && (
          <Field label="Temporary password" htmlFor="u-password" required error={errors.password}
            help="Share it with the person securely. They can change it under My account after signing in.">
            <div className="password-row">
              <PasswordInput id="u-password" value={form.password} autoComplete="new-password" revealKey={generated}
                onChange={(e) => set('password', e.target.value)} />
              <button className="btn btn--outline btn--sm" type="button"
                onClick={() => { set('password', generatePassword()); setGenerated((n) => n + 1); }}>Generate</button>
            </div>
          </Field>
        )}
      </form>
    </Modal>
  );
}

// ---------------------------------------------------------------- reset password

function PasswordDialog({ user, onClose, onSaved }: { user: AdminUser; onClose: () => void; onSaved: (message: string) => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [generated, setGenerated] = useState(0);

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api(`/api/admin/users/${user.id}/password`, 'POST', { password });
      onSaved(`Password reset for ${user.fullName}.`);
    } catch (err) {
      setError(err instanceof ApiError ? err.errors.password ?? err.message : (err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title="Reset password"
      subtitle={user.fullName}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn--ghost btn--sm" type="button" onClick={onClose}>Cancel</button>
          <button className="btn btn--gold btn--sm" type="submit" form="password-form" disabled={saving}>
            {saving ? 'Saving…' : 'Set new password'}
          </button>
        </>
      }
    >
      <form id="password-form" className="stack" onSubmit={save} noValidate>
        <p className="muted">Choose a new temporary password for {user.fullName} and share it with them securely.</p>
        <Field label="New password (min. 10 characters)" htmlFor="r-password" error={error}>
          <div className="password-row">
            <PasswordInput id="r-password" value={password} autoComplete="new-password" autoFocus revealKey={generated}
              onChange={(e) => { setPassword(e.target.value); setError(''); }} />
            <button className="btn btn--outline btn--sm" type="button"
              onClick={() => { setPassword(generatePassword()); setError(''); setGenerated((n) => n + 1); }}>Generate</button>
          </div>
        </Field>
      </form>
    </Modal>
  );
}

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { Field, FormAlert } from '../components/Field';
import { ApiError, api } from '../lib/api';
import { formatDateTime, initials, labelOf } from '../lib/format';
import type { AdminRole, AdminUser, FieldErrors, TemporaryPassword } from '../types';
import { useAdmin } from './context';
import { Modal } from './Modal';

const ROLE_INFO: Record<AdminRole, string> = {
  ADMIN: 'Reviews and approves applications, captures applicants and replies to messages.',
  SUPER_ADMIN: 'Everything an admin can do, plus adding, editing and removing users.',
};

type Dialog =
  | { kind: 'create' }
  | { kind: 'edit'; user: AdminUser }
  | { kind: 'password'; user: AdminUser }
  | { kind: 'temporary'; result: TemporaryPassword; isNew: boolean }
  | null;

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
    if (!window.confirm(`Delete ${user.fullName}'s account permanently? This cannot be undone.`)) return;
    try {
      await api(`/api/admin/users/${user.id}`, 'DELETE');
      toast(`${user.fullName}'s account has been deleted.`);
      load();
    } catch (err) {
      toast((err as Error).message, 'error');
    }
  }

  async function setActive(user: AdminUser, active: boolean) {
    if (!active && !window.confirm(`Deactivate ${user.fullName}? They will be signed out and cannot sign in until you activate them again.`)) return;
    try {
      await api(`/api/admin/users/${user.id}`, 'PATCH', { fullName: user.fullName, email: user.email ?? '', role: user.role, active });
      toast(active ? `${user.fullName} can sign in again.` : `${user.fullName} has been deactivated.`);
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
                        <span className="status-stack">
                          <span className={`status ${u.active ? 'status--approved' : 'status--declined'}`}>{u.active ? 'Active' : 'Deactivated'}</span>
                          {u.mustChangePassword && <span className="temp-tag" title="Has not chosen their own password yet">Temporary password</span>}
                        </span>
                      </td>
                      <td data-label="Last sign-in">{u.lastLoginAt ? formatDateTime(u.lastLoginAt) : <span className="muted">Never</span>}</td>
                      <td className="table__actions">
                        <span className="row-actions">
                          <button className="btn btn--outline btn--sm" type="button" onClick={() => setDialog({ kind: 'edit', user: u })}>Edit</button>
                          <button className="btn btn--ghost btn--sm" type="button" onClick={() => setDialog({ kind: 'password', user: u })}>Reset password</button>
                          {!isMe && (
                            u.active ? (
                              <button className="btn btn--ghost btn--sm" type="button" onClick={() => setActive(u, false)}>Deactivate</button>
                            ) : (
                              <button className="btn btn--outline btn--sm" type="button" onClick={() => setActive(u, true)}>Activate</button>
                            )
                          )}
                          {!isMe && (
                            <button className="btn btn--danger btn--sm" type="button" onClick={() => remove(u)}>Delete</button>
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
          onCreated={(result) => {
            setDialog({ kind: 'temporary', result, isNew: true });
            load();
          }}
        />
      )}
      {dialog?.kind === 'password' && (
        <PasswordDialog
          user={dialog.user}
          onClose={() => setDialog(null)}
          onReset={(result) => {
            setDialog({ kind: 'temporary', result, isNew: false });
            load();
          }}
        />
      )}
      {dialog?.kind === 'temporary' && (
        <TemporaryPasswordDialog result={dialog.result} isNew={dialog.isNew} onClose={() => setDialog(null)} />
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
  onCreated: (result: TemporaryPassword) => void;
}

function UserDialog({ user, isMe, onClose, onSaved, onCreated }: UserDialogProps) {
  const { meta } = useAdmin();
  const editing = Boolean(user);
  const [form, setForm] = useState({
    fullName: user?.fullName ?? '',
    username: user?.username ?? '',
    email: user?.email ?? '',
    role: (user?.role ?? 'ADMIN') as AdminRole,
    active: user?.active ?? true,
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [alert, setAlert] = useState('');
  const [saving, setSaving] = useState(false);

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
        const result = await api<TemporaryPassword>('/api/admin/users', 'POST', {
          fullName: form.fullName,
          username: form.username,
          email: form.email,
          role: form.role,
        });
        onCreated(result);
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
          <p className="notice">
            A temporary password is created automatically when you add the user. They must choose their own strong
            password the first time they sign in.
          </p>
        )}
      </form>
    </Modal>
  );
}

// ---------------------------------------------------------------- reset password

function PasswordDialog({ user, onClose, onReset }: { user: AdminUser; onClose: () => void; onReset: (result: TemporaryPassword) => void }) {
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function reset(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      onReset(await api<TemporaryPassword>(`/api/admin/users/${user.id}/password`, 'POST'));
    } catch (err) {
      setError((err as Error).message);
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
            {saving ? 'Resetting…' : 'Reset password'}
          </button>
        </>
      }
    >
      <form id="password-form" className="stack" onSubmit={reset} noValidate>
        <FormAlert message={error} />
        <p>
          {user.fullName} will get a new temporary password. Their current password stops working straight away, and
          they must choose their own password when they next sign in.
        </p>
      </form>
    </Modal>
  );
}

// ---------------------------------------------------------------- temporary password (shown once)

function TemporaryPasswordDialog({ result, isNew, onClose }: { result: TemporaryPassword; isNew: boolean; onClose: () => void }) {
  const { user, temporaryPassword } = result;
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(`Username: ${user.username}\nTemporary password: ${temporaryPassword}`);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Modal
      title={isNew ? `${user.fullName} has been added` : 'New temporary password'}
      subtitle={isNew ? 'Sign-in details' : user.fullName}
      onClose={onClose}
      footer={<button className="btn btn--gold btn--sm" type="button" onClick={onClose}>Done</button>}
    >
      <div className="stack">
        <p>
          Give these details to {user.fullName.split(' ')[0]} in person or by phone. They will be asked to choose their own
          password when they sign in.
        </p>
        <dl className="credentials">
          <div><dt>Username</dt><dd>{user.username}</dd></div>
          <div><dt>Temporary password</dt><dd className="credentials__password">{temporaryPassword}</dd></div>
        </dl>
        <button className="btn btn--outline btn--sm credentials__copy" type="button" onClick={copy}>
          {copied ? 'Copied ✓' : 'Copy sign-in details'}
        </button>
        <p className="notice notice--warning">This password is shown only once. You will not be able to see it again.</p>
      </div>
    </Modal>
  );
}

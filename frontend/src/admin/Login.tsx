import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../styles/admin.css';
import { Field, FormAlert } from '../components/Field';
import { PasswordInput } from '../components/PasswordInput';
import { Seo } from '../components/Seo';
import { site } from '../config/site';
import { api } from '../lib/api';

export function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [alert, setAlert] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    document.body.classList.add('login-page');
    // Already signed in? Go straight to the dashboard.
    api('/api/admin/me')
      .then(() => navigate('/admin', { replace: true }))
      .catch(() => {});
    return () => document.body.classList.remove('login-page');
  }, [navigate]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!username || !password) {
      setAlert('Enter your username and password.');
      return;
    }
    setBusy(true);
    try {
      await api('/api/admin/login', 'POST', { username, password });
      navigate('/admin', { replace: true });
    } catch (err) {
      setAlert((err as Error).message);
      setPassword('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login">
      <Seo title={`Admin sign in | ${site.name}`} description="Administrator area" path="/admin/login" noindex />
      <div className="login__card">
        <Link className="login__logo" to="/" aria-label={`${site.name} website`}>
          <img src="/img/logo.png" alt={`${site.name} - ${site.tagline}`} width={749} height={646} />
        </Link>
        <h1 className="login__title">Admin sign in</h1>
        <form onSubmit={submit} noValidate>
          <FormAlert message={alert} />
          <Field label="Username" htmlFor="l-user">
            <input id="l-user" autoComplete="username" autoFocus value={username} onChange={(e) => setUsername(e.target.value)} />
          </Field>
          <Field label="Password" htmlFor="l-pass">
            <PasswordInput id="l-pass" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <button className="btn btn--gold btn--block" type="submit" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="login__back">
          <Link to="/">&larr; Back to website</Link>
        </p>
      </div>
    </main>
  );
}

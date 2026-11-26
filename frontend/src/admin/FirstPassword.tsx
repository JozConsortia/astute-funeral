import { site } from '../config/site';
import { ChangePasswordForm } from './Settings';

/** Shown instead of the dashboard while the user still has the temporary password a super admin gave them. */
export function FirstPassword({ name, onDone, onLogout }: { name: string; onDone: () => void; onLogout: () => void }) {
  return (
    <div className="login-page">
      <main className="login login--wide">
        <div className="login__card">
          <div className="login__logo">
            <img src="/img/logo.png" alt={`${site.name} - ${site.tagline}`} width={749} height={646} />
          </div>
          <h1 className="login__title">Choose your own password</h1>
          <p className="login__intro">
            Welcome, {name.split(' ')[0]}. You signed in with a temporary password. Please replace it with a strong
            password that only you know before you continue.
          </p>
          <ChangePasswordForm onChanged={onDone} submitLabel="Save and continue" />
          <p className="login__back">
            <button className="link-btn" type="button" onClick={onLogout}>Sign out</button>
          </p>
        </div>
      </main>
    </div>
  );
}

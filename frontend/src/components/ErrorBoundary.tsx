import { Component, type ErrorInfo, type ReactNode } from 'react';
import { site } from '../config/site';

/**
 * If a page crashes (or a part of the site fails to download after an update), show the phone numbers
 * and a reload button instead of a blank white screen. Kept free of the router so it works even if that fails.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Page crashed:', error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="crash">
        <img className="crash__logo" src="/img/logo.png" alt={`${site.name} - ${site.tagline}`} width={749} height={646} />
        <h1 className="crash__title">Sorry, something went wrong</h1>
        <p className="crash__text">
          Please reload the page. If someone has passed away, call us at any time. We are here 24 hours a day.
        </p>
        <div className="crash__actions">
          <a className="btn btn--gold btn--lg" href={site.emergencyLink}>24/7 emergency: {site.emergency}</a>
          <a className="btn btn--outline" href={site.officeLink}>Office: {site.office}</a>
          <button className="btn btn--ghost" type="button" onClick={() => window.location.reload()}>Reload page</button>
        </div>
      </main>
    );
  }
}

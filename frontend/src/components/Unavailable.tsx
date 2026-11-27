import { site } from '../config/site';
import { Icon } from './Icon';

/** Shown when plans can't be loaded from the server, so nobody is left looking at "Loading…" for ever. */
export function Unavailable({ what }: { what: string }) {
  return (
    <div className="unavailable" role="alert">
      <p>
        <strong>Sorry, we couldn&rsquo;t load {what} just now.</strong> Please check your internet connection and try
        again, or call us and we&rsquo;ll help you over the phone.
      </p>
      <div className="unavailable__actions">
        <button className="btn btn--gold btn--sm" type="button" onClick={() => window.location.reload()}>Try again</button>
        <a className="btn btn--outline btn--sm" href={site.officeLink}><Icon name="phone" /> {site.office}</a>
      </div>
    </div>
  );
}

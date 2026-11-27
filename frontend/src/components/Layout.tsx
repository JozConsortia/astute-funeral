import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { mapLink, site } from '../config/site';
import { Icon, type IconName } from './Icon';

export function Layout() {
  const { pathname, hash } = useLocation();

  // Scroll to the top (or to #anchor) on navigation.
  useEffect(() => {
    if (hash) {
      document.getElementById(hash.slice(1))?.scrollIntoView();
    } else {
      window.scrollTo(0, 0);
    }
  }, [pathname, hash]);

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Header />
      <main id="main">
        <Outlet />
      </main>
      <Footer />
      <EmergencyButton />
    </>
  );
}


/** Floating call button for the 24/7 emergency & pick-ups line, on every public page. */
function EmergencyButton() {
  return (
    <a className="emergency-fab" href={site.emergencyLink} aria-label={`24/7 emergency and pick-ups: call ${site.emergency}`}>
      <span className="emergency-fab__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2Z" />
        </svg>
      </span>
      <span className="emergency-fab__text">
        <span className="emergency-fab__label">24/7 Emergency &amp; Pick-ups</span>
        <span className="emergency-fab__number">{site.emergency}</span>
      </span>
    </a>
  );
}

export function Brand({ tagline = site.tagline }: { tagline?: string }) {
  return (
    <>
      <img className="brand__mark" src="/img/emblem.png" alt="" width={400} height={190} />
      <span className="brand__text">
        <span className="brand__name">Astute Funerals</span>
        <span className="brand__tagline">{tagline}</span>
      </span>
    </>
  );
}

function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.classList.toggle('nav-open', open);
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    const wide = matchMedia('(min-width: 900px)');
    const onWide = () => setOpen(false);
    document.addEventListener('keydown', onKey);
    wide.addEventListener('change', onWide);
    return () => {
      document.removeEventListener('keydown', onKey);
      wide.removeEventListener('change', onWide);
    };
  }, [open]);

  const link = ({ isActive }: { isActive: boolean }) => `site-nav__link${isActive ? ' is-active' : ''}`;

  return (
    <header className={`site-header${scrolled ? ' is-scrolled' : ''}`}>
      <div className="container site-header__inner">
        <Link className="brand" to="/" aria-label={`${site.name} home`}>
          <Brand />
        </Link>
        <button
          className="nav-toggle"
          type="button"
          aria-expanded={open}
          aria-controls="site-nav"
          onClick={() => setOpen((o) => !o)}
        >
          <span className="nav-toggle__bar" />
          <span className="sr-only">Menu</span>
        </button>
        <nav className={`site-nav${open ? ' is-open' : ''}`} id="site-nav" aria-label="Main">
          <NavLink className={link} to="/" end>
            Home
          </NavLink>
          <NavLink className={link} to="/about">
            About
          </NavLink>
          <NavLink className={link} to="/apply">
            Apply
          </NavLink>
          <NavLink className={link} to="/contact">
            Contact
          </NavLink>
          <NavLink className={({ isActive }) => `btn btn--gold btn--sm site-nav__cta${isActive ? ' is-active' : ''}`} to="/get-covered">
            Get covered
          </NavLink>
          <div className="site-nav__contact">
            <a href={site.officeLink}><Icon name="phone" /> Office: {site.office}</a>
            <a href={site.emergencyLink}><Icon name="phone" /> 24/7 Emergency: {site.emergency}</a>
            <span>{site.hours}</span>
          </div>
        </nav>
      </div>
    </header>
  );
}

const FOOTER_ACTIONS: { label: string; href: string; icon: IconName; urgent?: boolean; external?: boolean }[] = [
  { label: '24/7 emergency & pick-ups', href: site.emergencyLink, icon: 'phone', urgent: true },
  { label: 'Call the office', href: site.officeLink, icon: 'phone' },
  { label: 'WhatsApp us', href: site.whatsappLink, icon: 'whatsapp', external: true },
  { label: 'Email us', href: `mailto:${site.email}`, icon: 'mail' },
  { label: 'Get directions', href: mapLink, icon: 'pin', external: true },
];

function Footer() {
  return (
    <footer className="site-footer">
      <div className="container site-footer__grid">
        <div className="site-footer__brand">
          <Link to="/" aria-label={`${site.name} home`}>
            <img
              className="site-footer__logo"
              src="/img/logo.png"
              alt={`${site.name} - ${site.tagline}`}
              width={749}
              height={646}
              loading="lazy"
            />
          </Link>
          <p>Affordable funeral cover and caring funeral services that honour your loved ones and protect your family.</p>
        </div>
        <div>
          <h2 className="site-footer__heading">Explore</h2>
          <ul className="site-footer__links">
            <li><Link to="/">Home</Link></li>
            <li><Link to="/about">About us</Link></li>
            <li><Link to="/get-covered">Get covered</Link></li>
            <li><Link to="/apply">Apply online</Link></li>
            <li><Link to="/contact">Contact</Link></li>
            <li><Link to="/privacy">Privacy notice</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="site-footer__heading">Get in touch</h2>
          {/* Icons only; the name of each action is in its label and tooltip. */}
          <ul className="footer-icons">
            {FOOTER_ACTIONS.map((a) => (
              <li key={a.label}>
                <a
                  className={`footer-icon${a.urgent ? ' footer-icon--urgent' : ''}`}
                  href={a.href}
                  aria-label={a.label}
                  title={a.label}
                  {...(a.external ? { target: '_blank', rel: 'noopener' } : {})}
                >
                  <Icon name={a.icon} />
                </a>
              </li>
            ))}
          </ul>
          <p className="site-footer__hours">
            <Icon name="clock" /> {site.hours}
          </p>
        </div>
      </div>
      <div className="container site-footer__bottom">
        <p>
          &copy; {new Date().getFullYear()} {site.name} &middot; <span className="script">{site.tagline}</span>
        </p>
        <p>{site.fsp}</p>
      </div>
    </footer>
  );
}

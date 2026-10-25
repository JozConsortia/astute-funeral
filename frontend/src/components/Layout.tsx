import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { mapLink, site } from '../config/site';
import { useTextSize, type TextSize } from '../lib/textSize';

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

const TEXT_SIZES: { value: TextSize; label: string; name: string }[] = [
  { value: 'normal', label: 'A', name: 'Normal text' },
  { value: 'large', label: 'A+', name: 'Large text' },
  { value: 'larger', label: 'A++', name: 'Extra large text' },
];

/** Lets visitors enlarge all text on the site - remembered for their next visit. */
function TextSizeControl() {
  const [size, setSize] = useTextSize();
  return (
    <div className="text-size" role="group" aria-label="Text size">
      <span className="text-size__label">Text size</span>
      {TEXT_SIZES.map((t) => (
        <button
          key={t.value}
          type="button"
          className={`text-size__btn text-size__btn--${t.value}`}
          aria-pressed={size === t.value}
          aria-label={t.name}
          title={t.name}
          onClick={() => setSize(t.value)}
        >
          {t.label}
        </button>
      ))}
    </div>
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
      <img className="brand__mark" src="/img/emblem.png" alt="" width={611} height={283} />
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
          <TextSizeControl />
          <div className="site-nav__contact">
            <a href={site.officeLink}>Office: {site.office}</a>
            <a href={site.emergencyLink}>24/7 Emergency: {site.emergency}</a>
            <span>{site.hours}</span>
          </div>
        </nav>
      </div>
    </header>
  );
}

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
              height={653}
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
          </ul>
        </div>
        <div>
          <h2 className="site-footer__heading">Contact</h2>
          <ul className="site-footer__links site-footer__contact">
            <li><span>Office</span><a href={site.officeLink}>{site.office}</a></li>
            <li><span>Mobile</span><a href={site.mobileLink}>{site.mobile}</a></li>
            <li>
              <span>Emergency / Pick-ups (24/7)</span>
              <a className="site-footer__emergency" href={site.emergencyLink}>{site.emergency}</a>
            </li>
            <li><span>Email</span><a href={`mailto:${site.email}`}>{site.email}</a></li>
          </ul>
        </div>
        <div>
          <h2 className="site-footer__heading">Visit us</h2>
          <address className="site-footer__address">
            {site.street}<br />{site.suburb}<br />{site.city}, {site.postalCode}
          </address>
          <p><a href={mapLink} target="_blank" rel="noopener">Get directions &rarr;</a></p>
          <p className="site-footer__note">
            {site.hoursLines[0]}
            <br />
            {site.hoursLines[1]}
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

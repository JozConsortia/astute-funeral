import { Link } from 'react-router-dom';
import { CtaBand } from '../components/CtaBand';
import { Icon, type IconName } from '../components/Icon';
import { Reveal } from '../components/Reveal';
import { Seo } from '../components/Seo';
import { site } from '../config/site';

const VALUES = [
  ['Dignity', 'We treat every family and every life with the utmost respect.'],
  ['Integrity', 'Clear terms, honest advice and no hidden surprises.'],
  ['Compassion', 'We listen, we support and we walk the journey with you.'],
  ['Reliability', 'Fast claims and a team you can reach day or night.'],
];

const BENEFITS: { label: string; icon: IconName }[] = [
  { label: 'Funeral arrangements & coffin', icon: 'heart' },
  { label: 'Transport of the deceased', icon: 'car' },
  { label: 'Repatriation within South Africa', icon: 'pin' },
  { label: 'Tent, chairs & catering', icon: 'tent' },
  { label: 'Grocery benefit', icon: 'cart' },
  { label: 'Tombstone benefit', icon: 'tombstone' },
  { label: 'Memorial programmes', icon: 'book' },
  { label: 'Cash payout to your beneficiary', icon: 'wallet' },
];

export function About() {
  return (
    <>
      <Seo
        title={`About Us | ${site.name}, Danville Pretoria`}
        description={`Learn about ${site.name} in Danville, Pretoria - a caring funeral home helping families lay loved ones to rest with class and dignity.`}
        path="/about"
      />

      <section className="page-hero">
        <div className="container">
          <p className="eyebrow">About us</p>
          <h1 className="page-hero__title">Caring for families, honouring lives</h1>
          <p className="script page-hero__script">{site.tagline}</p>
          <p className="page-hero__lead">
            We believe every person deserves a dignified farewell, and every family deserves support without financial stress.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container split">
          <Reveal className="split__text">
            <p className="eyebrow">Our story</p>
            <h2 className="section__title">Rooted in Danville, serving Pretoria</h2>
            <p>
              {site.name} was founded to give South African families affordable, dependable funeral cover backed by people
              who genuinely care. We know that losing a loved one is one of life's hardest moments, and that the cost of a
              funeral should never add to that burden.
            </p>
            <p>
              From our home at {site.street} in Danville, we serve families across Pretoria and beyond with simple plans,
              honest advice and fast claim payouts &mdash; so that you can focus on celebrating the life of the person you
              have lost.
            </p>
            <Link className="btn btn--gold" to="/apply">Apply for cover</Link>
          </Reveal>
          <Reveal className="split__aside">
            <div className="stat-panel">
              <div className="stat-panel__item"><span className="stat-panel__num">48h</span><span>Claims payout</span></div>
              <div className="stat-panel__item"><span className="stat-panel__num">24/7</span><span>Emergency pick-ups</span></div>
              <div className="stat-panel__item"><span className="stat-panel__num">3</span><span>Plans to choose from</span></div>
              <div className="stat-panel__item"><span className="stat-panel__num">0</span><span>Medical exams</span></div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="section section--light">
        <div className="container">
          <Reveal className="mission">
            <article className="mission__card">
              <h2 className="mission__title">Our mission</h2>
              <p>To provide affordable, transparent funeral cover and compassionate service that allow every family to lay their loved ones to rest with dignity.</p>
            </article>
            <article className="mission__card">
              <h2 className="mission__title">Our vision</h2>
              <p>To be the most trusted funeral cover provider in the communities we serve &mdash; known for keeping our promises when families need us most.</p>
            </article>
          </Reveal>

          <Reveal as="header" className="section__head">
            <p className="eyebrow">Our values</p>
            <h2 className="section__title">What we stand for</h2>
          </Reveal>
          <Reveal className="values">
            {VALUES.map(([title, text]) => (
              <div className="value" key={title}>
                <h3 className="value__title">{title}</h3>
                <p>{text}</p>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <Reveal as="header" className="section__head">
            <p className="eyebrow">Benefits</p>
            <h2 className="section__title">What your policy can help with</h2>
            <p className="section__lead">Depending on your plan, your cover can be used for the services your family needs.</p>
          </Reveal>
          <Reveal as="ul" className="benefits">
            {BENEFITS.map((b) => (
              <li key={b.label}>
                <Link className="benefits__link" to="/get-covered">
                  <span className="benefits__icon"><Icon name={b.icon} /></span>
                  {b.label}
                  <span className="benefits__more">See plans &rarr;</span>
                </Link>
              </li>
            ))}
          </Reveal>
        </div>
      </section>

      <CtaBand title="Ready to protect your family?" text="Speak to a consultant or apply online in minutes.">
        <Link className="btn btn--dark btn--lg" to="/apply">Apply now</Link>
        <Link className="btn btn--dark-outline btn--lg" to="/contact">Contact us</Link>
      </CtaBand>
    </>
  );
}

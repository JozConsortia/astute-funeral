import { Link } from 'react-router-dom';
import { CtaBand } from '../components/CtaBand';
import { Reveal } from '../components/Reveal';
import { Seo } from '../components/Seo';
import { site } from '../config/site';
import { useMeta } from '../lib/meta';

const FEATURES = [
  {
    title: 'Fast, reliable claims',
    text: 'Valid claims are paid out within 48 hours so your family can focus on saying goodbye.',
    icon: <><path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5l-8-3Z" /><path d="m9 12 2 2 4-4" /></>,
  },
  {
    title: 'Whole-family cover',
    text: 'Protect your spouse, children, parents and extended family on one simple monthly premium.',
    icon: <><circle cx="9" cy="8" r="3.5" /><circle cx="17" cy="9" r="2.5" /><path d="M2.5 20c.6-3.6 3.3-6 6.5-6s5.9 2.4 6.5 6" /><path d="M15.5 14.2c2.8-.4 5.3 1.6 6 4.8" /></>,
  },
  {
    title: 'Compassionate service',
    text: 'Our caring team guides you through every step, from 24/7 pick-ups to the final farewell.',
    icon: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21.2l8.8-8.8a5.5 5.5 0 0 0 0-7.8Z" />,
  },
  {
    title: 'Affordable premiums',
    text: 'Flexible payment by debit order, stop order or EFT, with no medical examinations required.',
    icon: <><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18" /><path d="M7 15h3" /></>,
  },
];

export function Home() {
  const meta = useMeta();
  const minPremium = meta ? Math.min(...meta.plans.map((p) => p.premium)) : 95;

  return (
    <>
      <Seo
        title={`${site.name} | Funeral Services & Funeral Cover in Danville, Pretoria`}
        description={`${site.name} - ${site.tagline}. Affordable funeral policies from R${minPremium} per month for you and your family, with 24/7 emergency pick-ups in Pretoria.`}
        path="/"
      />

      <section className="hero">
        <div className="container hero__inner">
          <Reveal className="hero__content">
            <p className="eyebrow">Funeral cover from R{minPremium} per month</p>
            <h1 className="hero__title">
              Honour every life with <em>Class in Dignity</em>
            </h1>
            <p className="hero__lead">
              Affordable funeral policies for you, your spouse, your children and your extended family &mdash; and a caring
              team ready to help, day or night, when your family needs us most.
            </p>
            <div className="hero__actions">
              <Link className="btn btn--gold btn--lg" to="/get-covered">View our plans</Link>
              <Link className="btn btn--outline btn--lg" to="/apply">Apply online</Link>
            </div>
            <ul className="hero__trust">
              <li><strong>48h</strong> claims payout</li>
              <li><strong>No</strong> medical exams</li>
              <li><strong>24/7</strong> emergency pick-ups</li>
            </ul>
          </Reveal>
          <Reveal className="hero__visual">
            <img className="hero__logo" src="/img/logo.png" alt="" width={749} height={653} fetchPriority="high" />
          </Reveal>
        </div>
      </section>

      <section className="section section--light" aria-labelledby="help-title">
        <div className="container">
          <Reveal as="header" className="section__head">
            <p className="eyebrow">How can we help?</p>
            <h2 className="section__title" id="help-title">Everything you need, in one place</h2>
          </Reveal>
          <Reveal className="steps">
            <Link className="step step--link" to="/get-covered">
              <span className="step__num">01</span>
              <h3 className="step__title">Get covered</h3>
              <p>Compare our single, family and extended family plans, from R{minPremium} per month.</p>
              <span className="step__more">View plans &rarr;</span>
            </Link>
            <Link className="step step--link" to="/apply">
              <span className="step__num">02</span>
              <h3 className="step__title">Apply online</h3>
              <p>Complete our secure application in about 10 minutes &mdash; no paperwork, no medical exams.</p>
              <span className="step__more">Start application &rarr;</span>
            </Link>
            <Link className="step step--link" to="/contact">
              <span className="step__num">03</span>
              <h3 className="step__title">Talk to us</h3>
              <p>Questions, claims or emergency pick-ups &mdash; our team is here for you 24 hours a day.</p>
              <span className="step__more">Contact us &rarr;</span>
            </Link>
          </Reveal>
        </div>
      </section>

      <section className="section" aria-labelledby="why-title">
        <div className="container">
          <Reveal as="header" className="section__head">
            <p className="eyebrow">Why families choose us</p>
            <h2 className="section__title" id="why-title">Here for you when it matters most</h2>
          </Reveal>
          <Reveal className="features">
            {FEATURES.map((f) => (
              <article className="feature" key={f.title}>
                <span className="feature__icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24">{f.icon}</svg>
                </span>
                <h3 className="feature__title">{f.title}</h3>
                <p>{f.text}</p>
              </article>
            ))}
          </Reveal>
        </div>
      </section>

      <CtaBand title="Give your family peace of mind today" text="Compare our plans or speak to a consultant.">
        <Link className="btn btn--dark btn--lg" to="/get-covered">Get covered</Link>
        <a className="btn btn--dark-outline btn--lg" href={site.officeLink}>Call {site.office}</a>
      </CtaBand>
    </>
  );
}

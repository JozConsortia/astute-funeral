import { Link } from 'react-router-dom';
import { CallBack } from '../components/CallBack';
import { Icon } from '../components/Icon';
import { Reveal } from '../components/Reveal';
import { Seo } from '../components/Seo';
import { site } from '../config/site';
import { thousands } from '../lib/format';
import { useMeta, useMetaFailed } from '../lib/meta';
import { Unavailable } from '../components/Unavailable';

const NEXT_STEPS = [
  {
    title: 'Call us, day or night',
    text: `Phone ${site.emergency}. We come to you and take care of your loved one with dignity.`,
  },
  {
    title: 'Have the death confirmed',
    text: 'A doctor confirms the death at home or in hospital. After an accident, the police are called (10111).',
  },
  {
    title: 'We help with the paperwork',
    text: 'We help you register the death at Home Affairs and get the death certificate.',
  },
  {
    title: 'Claim your cover',
    text: 'Bring the ID documents, the death certificate and the policy number. Valid claims are paid within 48 hours.',
  },
];

export function Home() {
  const meta = useMeta();
  const metaFailed = useMetaFailed();
  const minPremium = meta ? Math.min(...meta.plans.map((p) => p.premium)) : 95;

  return (
    <>
      <Seo
        title={`${site.name} | Funeral Services & Funeral Cover in Danville, Pretoria`}
        description={`${site.name} - ${site.tagline}. Affordable funeral policies from R${minPremium} per month for you and your family, with 24/7 emergency pick-ups in Pretoria.`}
        path="/"
      />

      <section className="hero hero--simple">
        <div className="container">
          <Reveal className="hero__intro">
            <h1 className="hero__title">
              Honour every life with <em>Class in Dignity</em>
            </h1>
            <p className="hero__lead">How can we help you today?</p>
          </Reveal>

          <Reveal className="doors">
            <article className="door door--urgent">
              <h2 className="door__title">Someone has passed away</h2>
              <p>We are here 24 hours a day. Call us now and we will guide you through every step.</p>
              <a className="btn btn--gold btn--lg btn--block" href={site.emergencyLink}><Icon name="phone" /> Call {site.emergency}</a>
              <a className="door__link" href="#next-steps">What to do next &darr;</a>
            </article>
            <article className="door">
              <h2 className="door__title">Plan ahead for my family</h2>
              <p>Funeral cover from R{minPremium} a month for you and your loved ones. No medical exams.</p>
              <Link className="btn btn--gold btn--lg btn--block" to="/get-covered">See our plans</Link>
              <Link className="door__link" to="/apply">Or apply online now &rarr;</Link>
            </article>
          </Reveal>

          <ul className="hero__trust">
            <li>Claims paid within 48 hours</li>
            <li>No medical exams</li>
            <li>24/7 pick-ups</li>
          </ul>
        </div>
      </section>

      <section className="section section--light" id="next-steps" aria-labelledby="next-title">
        <div className="container">
          <Reveal as="header" className="section__head">
            <p className="eyebrow">When someone passes away</p>
            <h2 className="section__title" id="next-title">What to do next</h2>
            <p className="section__lead">Take it one step at a time. We are with you for all of it.</p>
          </Reveal>
          <Reveal as="ol" className="steps steps--four">
            {NEXT_STEPS.map((s, i) => (
              <li className="step" key={s.title}>
                <span className="step__num">{i + 1}</span>
                <h3 className="step__title">{s.title}</h3>
                <p>{s.text}</p>
              </li>
            ))}
          </Reveal>
        </div>
      </section>

      <section className="section" aria-labelledby="plans-title">
        <div className="container">
          <Reveal as="header" className="section__head">
            <p className="eyebrow">Our funeral plans</p>
            <h2 className="section__title" id="plans-title">Simple cover, one monthly price</h2>
          </Reveal>
          {metaFailed && !meta && <Unavailable what="our plans" />}
          <Reveal className="plan-strip">
            {(meta?.plans ?? []).map((p) => (
              <Link className={`plan-mini${p.featured ? ' plan-mini--featured' : ''}`} to={`/apply?plan=${p.id}`} key={p.id}>
                <span className="plan-mini__name">{p.name}</span>
                <span className="plan-mini__price">R{p.premium}<small>/month</small></span>
                <span className="plan-mini__cover">R{thousands(p.cover)} cover &middot; {p.summary}</span>
                <span className="plan-mini__go">Apply &rarr;</span>
              </Link>
            ))}
          </Reveal>
          <p className="plan-strip__more"><Link to="/get-covered">Compare the plans in full &rarr;</Link></p>
        </div>
      </section>

      <CallBack />
    </>
  );
}

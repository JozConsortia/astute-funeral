import { Link } from 'react-router-dom';
import { CtaBand } from '../components/CtaBand';
import { Reveal } from '../components/Reveal';
import { Seo } from '../components/Seo';
import { site } from '../config/site';
import { thousands } from '../lib/format';
import { useMeta, useMetaFailed } from '../lib/meta';
import { Unavailable } from '../components/Unavailable';

const FAQS = [
  ['Who can apply for a funeral policy?', 'Any South African resident between 18 and 65 years old with a valid SA ID or passport can apply as the main member.'],
  ['Is there a waiting period?', 'Yes. There is a 6-month waiting period for death from natural causes. Accidental death is covered from the day your first premium is received.'],
  ['How quickly are claims paid?', 'Once we receive all the required documents, valid claims are paid within 48 hours.'],
  ['What documents do I need to apply?', "Only your ID number, the ID numbers or dates of birth of your family members, and your beneficiary's details. A consultant will help you set up your payment."],
  ['Can I add family members later?', 'Yes. Contact us at any time to add or remove dependants or to upgrade your plan.'],
];

export function GetCovered() {
  const meta = useMeta();
  const metaFailed = useMetaFailed();
  const minPremium = meta ? Math.min(...meta.plans.map((p) => p.premium)) : 95;

  return (
    <>
      <Seo
        title={`Funeral Plans & Prices | Get Covered | ${site.name}`}
        description={`Compare ${site.name} funeral plans: single, family and extended family cover from R${minPremium} per month. No medical exams, claims paid within 48 hours.`}
        path="/get-covered"
      />

      <section className="page-hero">
        <div className="container">
          <p className="eyebrow">Get covered</p>
          <h1 className="page-hero__title">Funeral plans for every family</h1>
          <p className="page-hero__lead">
            Simple, transparent cover from R{minPremium} per month. Compare our plans below, then apply online in minutes.
          </p>
        </div>
      </section>

      <section className="section" id="plans" aria-labelledby="plans-title">
        <div className="container">
          <Reveal as="header" className="section__head">
            <p className="eyebrow">Our funeral plans</p>
            <h2 className="section__title" id="plans-title">Cover that fits your family</h2>
            <p className="section__lead">No hidden fees and no medical examinations. Choose the cover that suits you.</p>
          </Reveal>
          {metaFailed && !meta && <Unavailable what="our plans" />}
          <Reveal className="plans">
            {meta?.plans.map((p) => (
              <article key={p.id} className={`plan-card${p.featured ? ' plan-card--featured' : ''}`}>
                {p.featured && <span className="plan-card__badge">Most popular</span>}
                <h3 className="plan-card__name">{p.name}</h3>
                <p className="plan-card__summary">{p.summary}</p>
                <p className="plan-card__price">
                  <span className="plan-card__from">from</span> R{thousands(p.premium)}
                  <span className="plan-card__per">/month</span>
                </p>
                <p className="plan-card__cover">R{thousands(p.cover)} cover</p>
                <ul className="plan-card__features">
                  {p.features.map((f) => <li key={f}>{f}</li>)}
                </ul>
                <Link className={`btn ${p.featured ? 'btn--gold' : 'btn--outline'} btn--block`} to={`/apply?plan=${p.id}`}>
                  Apply for this plan
                </Link>
              </article>
            ))}
          </Reveal>
          <p className="fineprint">Premiums shown are starting prices and may vary by age and cover amount. Terms and conditions apply.</p>
        </div>
      </section>

      <section className="section section--light" aria-labelledby="how-title">
        <div className="container">
          <Reveal as="header" className="section__head">
            <p className="eyebrow">How it works</p>
            <h2 className="section__title" id="how-title">Covered in three simple steps</h2>
          </Reveal>
          <Reveal as="ol" className="steps">
            <li className="step">
              <span className="step__num">01</span>
              <h3 className="step__title">Choose a plan</h3>
              <p>Compare our single, family and extended family plans and pick the cover that is right for you.</p>
            </li>
            <li className="step">
              <span className="step__num">02</span>
              <h3 className="step__title">Apply online</h3>
              <p>Fill in our secure application form with your details, your family members and your beneficiary.</p>
            </li>
            <li className="step">
              <span className="step__num">03</span>
              <h3 className="step__title">We confirm your cover</h3>
              <p>A consultant calls you to confirm your details and set up your payment. Your cover starts from your first premium.</p>
            </li>
          </Reveal>
        </div>
      </section>

      <section className="section section--dark-alt" aria-labelledby="faq-title">
        <div className="container container--narrow">
          <Reveal as="header" className="section__head">
            <p className="eyebrow">Questions</p>
            <h2 className="section__title" id="faq-title">Frequently asked questions</h2>
          </Reveal>
          <Reveal className="faq">
            {FAQS.map(([q, a]) => (
              <details className="faq__item" key={q}>
                <summary>{q}</summary>
                <p>{a}</p>
              </details>
            ))}
          </Reveal>
        </div>
      </section>

      <CtaBand title="Ready to apply?" text="It takes less than 10 minutes. No medical exams, no paperwork.">
        <Link className="btn btn--dark btn--lg" to="/apply">Apply now</Link>
        <Link className="btn btn--dark-outline btn--lg" to="/contact">Ask us a question</Link>
      </CtaBand>
    </>
  );
}

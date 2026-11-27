import { useSearchParams } from 'react-router-dom';
import { ApplicationForm } from '../components/ApplicationForm';
import { Icon } from '../components/Icon';
import { Seo } from '../components/Seo';
import { site } from '../config/site';

export function Apply() {
  const [params] = useSearchParams();

  return (
    <>
      <Seo
        title={`Apply for Funeral Cover Online | ${site.name}`}
        description="Apply for a funeral policy online in minutes. Choose a single, family or extended family plan and add your dependants and beneficiary."
        path="/apply"
      />

      <section className="page-hero page-hero--compact">
        <div className="container">
          <p className="eyebrow">Apply online</p>
          <h1 className="page-hero__title">Funeral policy application</h1>
          <p className="page-hero__lead">
            Complete the form below. It takes about 10 minutes and a consultant will contact you to confirm your cover.
          </p>
        </div>
      </section>

      <section className="section section--tight">
        <div className="container apply-layout">
          <div className="card card--form">
            <ApplicationForm endpoint="/api/applications" mode="public" initialPlan={params.get('plan') ?? ''} />
          </div>

          <aside className="apply-aside">
            <div className="card card--light">
              <h2 className="card__title">Before you start</h2>
              <p>Please have the following ready:</p>
              <ul className="checklist">
                <li>Your SA ID or passport number</li>
                <li>ID numbers or dates of birth of family members</li>
                <li>Your beneficiary's details and phone number</li>
              </ul>
            </div>
            <div className="card">
              <h2 className="card__title">Need help?</h2>
              <p>Our consultants can complete the application with you over the phone.</p>
              <p><a className="btn btn--outline btn--block" href={site.officeLink}><Icon name="phone" /> Office: {site.office}</a></p>
              <p><a className="btn btn--outline btn--block" href={site.mobileLink}><Icon name="phone" /> Mobile: {site.mobile}</a></p>
              <p><a className="btn btn--whatsapp btn--block" href={site.whatsappLink} target="_blank" rel="noopener"><Icon name="whatsapp" /> WhatsApp us</a></p>
            </div>
            <p className="fineprint">
              Your information is encrypted in transit and is only used to process your application, in line with POPIA.{' '}
              <a href="/privacy" target="_blank" rel="noopener">Privacy notice</a>
            </p>
          </aside>
        </div>
      </section>
    </>
  );
}

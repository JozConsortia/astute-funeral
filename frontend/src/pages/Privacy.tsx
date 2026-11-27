import { Seo } from '../components/Seo';
import { fullAddress, site } from '../config/site';
import { useMeta } from '../lib/meta';

// Plain-language POPIA notice. Keep it in step with what the forms actually collect
// (components/ApplicationForm.tsx, pages/Contact.tsx, components/CallBack.tsx).
const UPDATED = '26 November 2026';

export function Privacy() {
  const meta = useMeta();
  return (
    <>
      <Seo
        title={`Privacy Notice | ${site.name}`}
        description={`How ${site.name} collects, uses and protects your personal information, in line with POPIA.`}
        path="/privacy"
      />

      <section className="page-hero page-hero--compact">
        <div className="container">
          <p className="eyebrow">Your information</p>
          <h1 className="page-hero__title">Privacy notice</h1>
          <p className="page-hero__lead">
            How {site.name} collects, uses and protects your personal information, in line with the Protection of
            Personal Information Act (POPIA).
          </p>
        </div>
      </section>

      <section className="section section--tight">
        <div className="container legal">
          <p className="legal__updated">Last updated {UPDATED}</p>

          <h2>Who we are</h2>
          <p>
            {site.name} is responsible for the personal information you give us on this website, by phone or at our
            office. You can reach us at {fullAddress}, on <a href={site.officeLink}>{site.office}</a> or
            at <a href={`mailto:${site.email}`}>{site.email}</a>.
          </p>

          <h2>What we collect</h2>
          <ul>
            <li>
              <strong>When you apply for cover:</strong> your name, ID or passport number, date of birth, gender,
              marital status, phone numbers, email address and home address. For each family member you add, their
              name, relationship to you, ID number and date of birth. For your beneficiary, their name, ID number,
              relationship to you and phone number.
            </li>
            <li>
              <strong>When you send a message or ask us to call you back:</strong> your name, phone number, email
              address and what you wrote.
            </li>
          </ul>
          <p>
            We do not ask for banking details on this website. A consultant completes the debit order or stop order
            with you by phone.
          </p>

          <h2>Why we use it</h2>
          <ul>
            <li>To assess your application and set up your cover.</li>
            <li>To contact you about your application, your policy or your message.</li>
            <li>To administer your policy and pay claims to your beneficiary.</li>
            <li>To meet our legal and regulatory duties as a financial services provider.</li>
          </ul>
          <p>We do not use your information for advertising, and we do not sell it.</p>

          <h2>Family members and beneficiaries</h2>
          <p>
            When you give us someone else&rsquo;s details, you confirm that they know about it and have agreed to be
            included, as the application form asks you to declare.
          </p>

          <h2>Who can see it</h2>
          <p>
            Only {site.name} staff who need your information to handle your application, policy, message or claim can
            see it. Each staff member signs in with their own account and a strong password. We share your
            information outside {site.name} only when it is needed to provide your cover or pay a claim, or when the
            law requires us to.
          </p>

          {meta?.addressSearch && (
            <>
              <h2>Address suggestions</h2>
              <p>
                When you type your home address on the application form, what you type is sent to{' '}
                {meta.addressSearch === 'google'
                  ? 'Google (Google Maps)'
                  : 'Photon, a free address-search service run by komoot in Germany using OpenStreetMap maps,'}{' '}
                so it can suggest matching addresses. It does not receive your name, ID number or any other details
                from the form.
              </p>
            </>
          )}

          <h2>How we protect it</h2>
          <p>
            Information you send through this website is encrypted on its way to us. It is kept on secured systems,
            and access is limited to authorised staff.
          </p>

          <h2>How long we keep it</h2>
          <p>
            We keep your information for as long as we need it for your policy and any claims, and for as long as the
            law requires us to keep records. After that, it is deleted.
          </p>

          <h2>Cookies and your browser</h2>
          <p>
            This website does not use advertising or tracking cookies. It only uses a small security cookie that
            protects our forms, and sign-in cookies for our staff. Our fonts are loaded from Google Fonts, so your
            browser connects to Google to download them.
          </p>
          <p>
            While you fill in the application form, your answers are kept in your browser so that refreshing the page
            does not lose them. They are removed when you submit the form or close the browser tab.
          </p>

          <h2>Your rights</h2>
          <ul>
            <li>Ask to see the personal information we hold about you.</li>
            <li>Ask us to correct it, or to delete it where the law does not require us to keep it.</li>
            <li>Object to how we use it.</li>
            <li>
              Lodge a complaint with the Information Regulator
              (<a href="https://inforegulator.org.za" target="_blank" rel="noopener">inforegulator.org.za</a>).
            </li>
          </ul>

          <h2>Contact us about your information</h2>
          <p>
            To make a request or ask a question, email <a href={`mailto:${site.email}`}>{site.email}</a> or call
            us on <a href={site.officeLink}>{site.office}</a>.
          </p>
        </div>
      </section>
    </>
  );
}

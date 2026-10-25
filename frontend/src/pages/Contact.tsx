import { useState, type FormEvent } from 'react';
import { Field, FormAlert, Honeypot } from '../components/Field';
import { Seo } from '../components/Seo';
import { mapLink, site } from '../config/site';
import { ApiError, api } from '../lib/api';
import type { FieldErrors } from '../types';

const SUBJECTS = ['General enquiry', 'New policy', 'Existing policy', 'Claims', 'Payments', 'Funeral arrangements'];

const empty = { name: '', email: '', phone: '', subject: SUBJECTS[0], message: '', website: '' };

export function Contact() {
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [alert, setAlert] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const set = (key: keyof typeof empty, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: '' }));
  };

  async function submit(e: FormEvent) {
    e.preventDefault();
    const found: FieldErrors = {};
    if (form.name.trim().length < 2) found.name = 'Please enter your name.';
    if (!form.email.trim() && !form.phone.trim()) found.email = 'Give us an email address or phone number.';
    if (form.message.trim().length < 10) found.message = 'Please write a short message (10+ characters).';
    setErrors(found);
    if (Object.keys(found).length) return;

    setSending(true);
    setAlert('');
    try {
      await api('/api/contact', 'POST', form);
      setSent(true);
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.errors);
        setAlert(err.message);
      } else {
        setAlert('Could not reach the server. Please try again or call us.');
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <Seo
        title={`Contact Us | ${site.name}, Danville Pretoria`}
        description={`Contact ${site.name}: office ${site.office}, mobile ${site.mobile}, 24/7 emergency & pick-ups ${site.emergency}. Visit us at ${site.street}, Danville, Pretoria.`}
        path="/contact"
      />

      <section className="page-hero page-hero--compact">
        <div className="container">
          <p className="eyebrow">Contact us</p>
          <h1 className="page-hero__title">We are here to help</h1>
          <p className="page-hero__lead">
            Questions about a policy, a claim or a payment? Reach out and our team will respond promptly.
          </p>
        </div>
      </section>

      <section className="section section--tight">
        <div className="container contact-layout">
          <div className="contact-cards">
            <a className="contact-card contact-card--emergency" href={site.emergencyLink}>
              <span className="contact-card__label">Emergency / Pick-ups</span>
              <span className="contact-card__value">{site.emergency}</span>
              <span className="contact-card__note">Available 24 hours a day, 7 days a week</span>
            </a>
            <div className="contact-cards__pair">
              <a className="contact-card" href={site.officeLink}>
                <span className="contact-card__label">Office</span>
                <span className="contact-card__value">{site.office}</span>
                <span className="contact-card__note">During office hours</span>
              </a>
              <a className="contact-card" href={site.mobileLink}>
                <span className="contact-card__label">Mobile</span>
                <span className="contact-card__value">{site.mobile}</span>
                <span className="contact-card__note">Calls &amp; WhatsApp</span>
              </a>
            </div>
            <a className="contact-card" href={`mailto:${site.email}`}>
              <span className="contact-card__label">Email</span>
              <span className="contact-card__value contact-card__value--plain">{site.email}</span>
              <span className="contact-card__note">We reply within one working day</span>
            </a>
            <a className="contact-card" href={mapLink} target="_blank" rel="noopener">
              <span className="contact-card__label">Visit us</span>
              <span className="contact-card__value">{site.street}</span>
              <span className="contact-card__note">
                {site.suburb}, {site.city}, {site.postalCode}
                <br />
                {site.hours}
              </span>
            </a>
          </div>

          <div className="card card--form">
            {sent ? (
              <div className="form-success">
                <div className="form-success__icon" aria-hidden="true">&#10003;</div>
                <h2 className="form-success__title">Message sent</h2>
                <p>Thank you for reaching out. We will be in touch shortly.</p>
              </div>
            ) : (
              <>
                <h2 className="card__title">Send us a message</h2>
                <form onSubmit={submit} noValidate>
                  <FormAlert message={alert} />
                  <Honeypot value={form.website} onChange={(v) => set('website', v)} />
                  <div className="grid grid--2">
                    <Field label="Full name" htmlFor="c-name" required error={errors.name} className="grid__span-2">
                      <input id="c-name" autoComplete="name" maxLength={80} value={form.name} onChange={(e) => set('name', e.target.value)} />
                    </Field>
                    <Field label="Email" htmlFor="c-email" error={errors.email}>
                      <input id="c-email" type="email" autoComplete="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
                    </Field>
                    <Field label="Phone" htmlFor="c-phone" error={errors.phone}>
                      <input id="c-phone" type="tel" autoComplete="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
                    </Field>
                    <Field label="Subject" htmlFor="c-subject" className="grid__span-2">
                      <select id="c-subject" value={form.subject} onChange={(e) => set('subject', e.target.value)}>
                        {SUBJECTS.map((s) => <option key={s}>{s}</option>)}
                      </select>
                    </Field>
                    <Field label="Message" htmlFor="c-message" required error={errors.message} className="grid__span-2">
                      <textarea id="c-message" rows={5} maxLength={3000} value={form.message} onChange={(e) => set('message', e.target.value)} />
                    </Field>
                  </div>
                  <div className="form-actions">
                    <button className="btn btn--gold" type="submit" disabled={sending}>
                      {sending ? 'Sending…' : 'Send message'}
                    </button>
                    <p className="form-actions__note">We usually reply within one working day.</p>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

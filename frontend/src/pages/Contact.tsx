import { useRef, useState, type FormEvent } from 'react';
import { Field, FormAlert, Honeypot } from '../components/Field';
import { Icon, type IconName } from '../components/Icon';
import { Seo } from '../components/Seo';
import { mapLink, site } from '../config/site';
import { ApiError, api } from '../lib/api';
import type { FieldErrors } from '../types';

const SUBJECTS = ['General enquiry', 'New policy', 'Existing policy', 'Claims', 'Payments', 'Funeral arrangements'];

const empty = { name: '', email: '', phone: '', subject: SUBJECTS[0], message: '', website: '' };

// Numbers and the address are not shown on the page; each tile names the action and links to it.
const TILES: { label: string; title: string; href: string; icon: IconName; urgent?: boolean; whatsapp?: boolean; external?: boolean }[] = [
  { label: 'Emergency 24/7', title: 'Call our 24/7 emergency & pick-up line', href: site.emergencyLink, icon: 'phone', urgent: true },
  { label: 'Call office', title: 'Call the office', href: site.officeLink, icon: 'phone' },
  { label: 'Call mobile', title: 'Call our mobile number', href: site.mobileLink, icon: 'phone' },
  { label: 'WhatsApp', title: 'Chat to us on WhatsApp', href: site.whatsappLink, icon: 'whatsapp', whatsapp: true, external: true },
  { label: 'Email', title: 'Send us an email', href: `mailto:${site.email}`, icon: 'mail' },
  { label: 'Directions', title: 'Get directions to our office', href: mapLink, icon: 'pin', external: true },
];

export function Contact() {
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [alert, setAlert] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);

  // A sent message is cleared the next time the form is opened.
  function openForm() {
    if (sent) {
      setForm(empty);
      setSent(false);
    }
    dialog.current?.showModal();
  }

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
          <div className="contact-panel">
            <h2 className="card__title">Reach us in one tap</h2>
            <p className="muted">Choose how you would like to get hold of us.</p>
            <ul className="contact-tiles">
              {TILES.map((t) => (
                <li key={t.label}>
                  <a
                    className={`contact-tile${t.urgent ? ' contact-tile--urgent' : ''}${t.whatsapp ? ' contact-tile--whatsapp' : ''}`}
                    href={t.href}
                    title={t.title}
                    {...(t.external ? { target: '_blank', rel: 'noopener' } : {})}
                  >
                    <span className="contact-tile__icon"><Icon name={t.icon} /></span>
                    <span className="contact-tile__label">{t.label}</span>
                  </a>
                </li>
              ))}
            </ul>
            <p className="contact-panel__hours">
              <Icon name="clock" /> Office hours: {site.hours}
            </p>
            <div className="contact-panel__message">
              <p>Prefer to write to us? We usually reply within one working day.</p>
              <button className="btn btn--gold btn--lg" type="button" onClick={openForm}>
                <Icon name="mail" /> Send us a message
              </button>
            </div>
          </div>

          <dialog
            ref={dialog}
            className="popup"
            aria-labelledby="message-title"
            onClick={(e) => e.target === dialog.current && dialog.current?.close()}
          >
            <header className="popup__head">
              <span className="popup__badge"><Icon name="mail" /></span>
              <div>
                <h2 className="popup__title" id="message-title">{sent ? 'Message sent' : 'Send us a message'}</h2>
                <p className="popup__subtitle">We usually reply within one working day.</p>
              </div>
              <button className="popup__close" type="button" aria-label="Close" onClick={() => dialog.current?.close()}>
                &times;
              </button>
            </header>

            {sent ? (
              <div className="popup__body form-success">
                <div className="form-success__icon" aria-hidden="true">&#10003;</div>
                <p>Thank you for reaching out, {form.name.trim().split(' ')[0]}. We will be in touch shortly.</p>
                <button className="btn btn--gold" type="button" onClick={() => dialog.current?.close()}>Done</button>
              </div>
            ) : (
              <form className="popup__form" onSubmit={submit} noValidate>
                <div className="popup__body">
                  <FormAlert message={alert} />
                  <Honeypot value={form.website} onChange={(v) => set('website', v)} />
                  <div className="grid grid--2">
                    <Field label="Full name" htmlFor="c-name" required error={errors.name} className="grid__span-2">
                      <span className="input-icon">
                        <Icon name="user" />
                        <input id="c-name" autoComplete="name" maxLength={80} placeholder="Your name and surname" value={form.name} onChange={(e) => set('name', e.target.value)} />
                      </span>
                    </Field>
                    <Field label="Email" htmlFor="c-email" error={errors.email}>
                      <span className="input-icon">
                        <Icon name="mail" />
                        <input id="c-email" type="email" autoComplete="email" placeholder="you@example.com" value={form.email} onChange={(e) => set('email', e.target.value)} />
                      </span>
                    </Field>
                    <Field label="Phone" htmlFor="c-phone" error={errors.phone}>
                      <span className="input-icon">
                        <Icon name="phone" />
                        <input id="c-phone" type="tel" autoComplete="tel" placeholder="082 123 4567" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
                      </span>
                    </Field>
                    {!errors.email && <p className="popup__hint grid__span-2">Give us an email address or a phone number so we can reply.</p>}
                    <Field label="What is it about?" htmlFor="c-subject" className="grid__span-2">
                      <select id="c-subject" value={form.subject} onChange={(e) => set('subject', e.target.value)}>
                        {SUBJECTS.map((s) => <option key={s}>{s}</option>)}
                      </select>
                    </Field>
                    <Field label="Message" htmlFor="c-message" required error={errors.message} className="grid__span-2">
                      <textarea id="c-message" rows={4} maxLength={3000} placeholder="How can we help?" value={form.message} onChange={(e) => set('message', e.target.value)} />
                    </Field>
                    <p className="popup__hint grid__span-2">
                      We only use your details to reply to you. <a href="/privacy" target="_blank" rel="noopener">Privacy notice</a>
                    </p>
                  </div>
                </div>
                <footer className="popup__foot">
                  <button className="btn btn--ghost" type="button" onClick={() => dialog.current?.close()}>Cancel</button>
                  <button className="btn btn--gold" type="submit" disabled={sending}>
                    <Icon name="send" /> {sending ? 'Sending…' : 'Send message'}
                  </button>
                </footer>
              </form>
            )}
          </dialog>
        </div>
      </section>
    </>
  );
}

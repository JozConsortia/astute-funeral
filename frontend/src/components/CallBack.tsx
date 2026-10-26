import { useState, type FormEvent } from 'react';
import { site } from '../config/site';
import { ApiError, api } from '../lib/api';
import { Field, FormAlert, Honeypot } from './Field';
import { Reveal } from './Reveal';

/** Name + number only: lands in the admin inbox as a "Call-back request" message. */
export function CallBack() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});
  const [alert, setAlert] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const found: typeof errors = {};
    if (name.trim().length < 2) found.name = 'Please enter your name.';
    if (phone.replace(/\D/g, '').length < 9) found.phone = 'Please enter your phone number.';
    setErrors(found);
    if (Object.keys(found).length) return;

    setSending(true);
    setAlert('');
    try {
      await api('/api/contact', 'POST', {
        name, phone, email: '', subject: 'Call-back request', message: 'Please call me back.', website,
      });
      setSent(true);
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors({ name: err.errors.name, phone: err.errors.phone });
        setAlert(err.message);
      } else {
        setAlert(`Could not reach the server. Please call us on ${site.office}.`);
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="cta-band" aria-labelledby="callback-title">
      <Reveal className="container callback">
        <div>
          <h2 className="cta-band__title" id="callback-title">Rather we call you?</h2>
          <p>Leave your name and number and a consultant will phone you back.</p>
        </div>
        {sent ? (
          <p className="callback__done" role="status">Thank you, {name.trim().split(' ')[0]}. We&rsquo;ll call you soon.</p>
        ) : (
          <form className="callback__form" onSubmit={submit} noValidate>
            <FormAlert message={alert} />
            <Honeypot value={website} onChange={setWebsite} />
            <Field label="Your name" htmlFor="cb-name" error={errors.name}>
              <input id="cb-name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="Phone number" htmlFor="cb-phone" error={errors.phone}>
              <input id="cb-phone" type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </Field>
            <button className="btn btn--dark btn--lg" type="submit" disabled={sending}>
              {sending ? 'Sending…' : 'Call me back'}
            </button>
          </form>
        )}
      </Reveal>
    </section>
  );
}

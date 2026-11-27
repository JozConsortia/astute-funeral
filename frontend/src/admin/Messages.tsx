import { useCallback, useEffect, useMemo, useState } from 'react';
import { site } from '../config/site';
import { ApiError, api } from '../lib/api';
import { formatDateTime, labelOf, telLink, whatsappNumber } from '../lib/format';
import type { ContactMessage, Me, ReplyChannel } from '../types';
import { useAdmin } from './context';

type Filter = 'all' | 'awaiting' | 'replied' | 'unread';

const FILTERS: { value: Filter; label: string; match: (m: ContactMessage) => boolean }[] = [
  { value: 'awaiting', label: 'Awaiting reply', match: (m) => m.replies.length === 0 },
  { value: 'unread', label: 'Unread', match: (m) => !m.read },
  { value: 'replied', label: 'Replied', match: (m) => m.replies.length > 0 },
  { value: 'all', label: 'All', match: () => true },
];

const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name;

/** Ready-made replies. {first} and the sign-off are filled in automatically. */
const TEMPLATES: { label: string; text: string }[] = [
  {
    label: "We'll call you",
    text: 'Thank you for contacting Astute Funerals. One of our consultants will call you within one working day.',
  },
  {
    label: 'Plans & applying',
    text: `Thank you for your interest in our funeral plans. You can compare our plans at ${site.url}/get-covered and apply online at ${site.url}/apply in about 10 minutes. If you prefer, reply with a good time and we will call you to complete it together.`,
  },
  {
    label: 'Claim documents',
    text: `We are sorry for your loss. To process the claim, please send us a certified copy of the death certificate, the deceased's ID, your ID and proof of your banking details. For pick-ups and urgent help, our 24/7 line is ${site.emergency}.`,
  },
  {
    label: 'Payment query',
    text: 'We have received your payment query and are checking your account. We will get back to you within one working day.',
  },
];

const compose = (m: ContactMessage, me: Me, text = '') =>
  `Hi ${firstName(m.name)},\n\n${text}\n\nKind regards,\n${me.fullName}\n${site.name} · ${site.office}`;

export function Messages() {
  const { setUnread, toast } = useAdmin();
  const [messages, setMessages] = useState<ContactMessage[] | null>(null);
  const [filter, setFilter] = useState<Filter>('awaiting');
  const [search, setSearch] = useState('');
  const [replyingTo, setReplyingTo] = useState<number | null>(null);

  const load = useCallback(
    () =>
      api<ContactMessage[]>('/api/admin/messages')
        .then((list) => {
          setMessages(list);
          setUnread(list.filter((m) => m.replies.length === 0).length);
        })
        .catch((err: Error) => toast(err.message, 'error')),
    [setUnread, toast],
  );

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(() => {
    if (!messages) return [];
    const q = search.trim().toLowerCase();
    const match = FILTERS.find((f) => f.value === filter)!.match;
    return messages.filter(
      (m) => match(m) && (!q || [m.name, m.email, m.phone, m.subject, m.message].some((v) => v?.toLowerCase().includes(q))),
    );
  }, [messages, filter, search]);

  async function toggleRead(m: ContactMessage) {
    await api(`/api/admin/messages/${m.id}`, 'PATCH', { read: !m.read }).catch((err: Error) => toast(err.message, 'error'));
    load();
  }

  async function remove(m: ContactMessage) {
    if (!window.confirm(`Delete the message from ${m.name}? This cannot be undone.`)) return;
    await api(`/api/admin/messages/${m.id}`, 'DELETE').catch((err: Error) => toast(err.message, 'error'));
    toast('Message deleted.');
    load();
  }

  if (!messages) return <p className="muted">Loading…</p>;

  return (
    <section className="inbox">
      <div className="inbox__bar">
        <div className="tabs" role="tablist" aria-label="Filter messages">
          {FILTERS.map((f) => (
            <button key={f.value} type="button" role="tab" aria-selected={filter === f.value}
              className={`tabs__tab${filter === f.value ? ' is-active' : ''}`} onClick={() => setFilter(f.value)}>
              {f.label} <span className="tabs__count">{messages.filter(f.match).length}</span>
            </button>
          ))}
        </div>
        <input className="inbox__search" type="search" placeholder="Search messages…" aria-label="Search messages"
          value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {visible.length === 0 ? (
        <div className="panel empty">
          {messages.length === 0
            ? 'No messages yet. Messages sent from the Contact page appear here.'
            : filter === 'awaiting' && !search
              ? 'All caught up — every message has been replied to.'
              : 'No messages match.'}
        </div>
      ) : (
        <div className="messages">
          {visible.map((m) => (
            <MessageCard
              key={m.id}
              message={m}
              replying={replyingTo === m.id}
              onReply={() => {
                setReplyingTo(replyingTo === m.id ? null : m.id);
                if (!m.read) api(`/api/admin/messages/${m.id}`, 'PATCH', { read: true }).then(load).catch(() => {});
              }}
              onSent={() => {
                setReplyingTo(null);
                load();
              }}
              onToggleRead={() => toggleRead(m)}
              onDelete={() => remove(m)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------- one message

interface MessageCardProps {
  message: ContactMessage;
  replying: boolean;
  onReply: () => void;
  onSent: () => void;
  onToggleRead: () => void;
  onDelete: () => void;
}

function MessageCard({ message: m, replying, onReply, onSent, onToggleRead, onDelete }: MessageCardProps) {
  const { meta } = useAdmin();
  const last = m.replies[m.replies.length - 1];

  return (
    <article className={`message${m.read ? '' : ' message--unread'}${m.replies.length ? '' : ' message--awaiting'}`}>
      <header className="message__head">
        <div>
          <h3 className="message__name">{m.name}</h3>
          <p className="message__meta">
            {m.email && <a href={`mailto:${m.email}`}>{m.email}</a>}
            {m.email && m.phone && ' · '}
            {m.phone && <a href={telLink(m.phone)}>{m.phone}</a>}
          </p>
        </div>
        <div className="message__side">
          {m.subject && <span className="pill">{m.subject}</span>}
          <time dateTime={m.createdAt}>{formatDateTime(m.createdAt)}</time>
        </div>
      </header>

      <p className="message__body">{m.message}</p>

      {m.replies.length > 0 && (
        <ol className="thread" aria-label="Replies">
          {m.replies.map((r) => (
            <li key={r.id} className="thread__item">
              <p className="thread__meta">
                <strong>{r.sentBy}</strong> replied by {labelOf(meta.replyChannels, r.channel)} · {formatDateTime(r.sentAt)}
              </p>
              <p className="thread__body">{r.body}</p>
            </li>
          ))}
        </ol>
      )}

      <footer className="message__actions">
        <span className={`reply-state${last ? ' reply-state--done' : ''}`}>
          {last ? `✓ Replied by ${last.sentBy}` : '● Awaiting reply'}
        </span>
        <span className="message__buttons">
          <button className="btn btn--ghost btn--sm" type="button" onClick={onToggleRead}>
            {m.read ? 'Mark unread' : 'Mark read'}
          </button>
          <button className="btn btn--danger btn--sm" type="button" onClick={onDelete}>Delete</button>
          <button className="btn btn--gold btn--sm" type="button" onClick={onReply} aria-expanded={replying}>
            {replying ? 'Close' : m.replies.length ? 'Reply again' : 'Reply'}
          </button>
        </span>
      </footer>

      {replying && <ReplyComposer message={m} onSent={onSent} />}
    </article>
  );
}

// ---------------------------------------------------------------- reply composer

function ReplyComposer({ message: m, onSent }: { message: ContactMessage; onSent: () => void }) {
  const { me, toast } = useAdmin();
  const [body, setBody] = useState(() => compose(m, me));
  const [error, setError] = useState('');
  const [sending, setSending] = useState<ReplyChannel | null>(null);

  const subject = `Re: ${m.subject || 'Your message to Astute Funerals'}`;

  async function record(channel: ReplyChannel, successMessage: string) {
    setSending(channel);
    setError('');
    try {
      await api(`/api/admin/messages/${m.id}/replies`, 'POST', { body, channel });
      toast(successMessage);
      onSent();
    } catch (err) {
      setError(err instanceof ApiError ? Object.values(err.errors)[0] ?? err.message : (err as Error).message);
    } finally {
      setSending(null);
    }
  }

  function check() {
    if (body.trim().length < 2) {
      setError('Write a reply first.');
      return false;
    }
    return true;
  }

  // Open WhatsApp / the email app straight from the click (so pop-up blockers allow it), then log the reply.
  function viaWhatsApp() {
    if (!check()) return;
    window.open(`https://wa.me/${whatsappNumber(m.phone)}?text=${encodeURIComponent(body)}`, '_blank', 'noopener');
    record('WHATSAPP', `WhatsApp opened for ${m.name} — reply logged.`);
  }

  function viaEmailApp() {
    if (!check()) return;
    window.location.href = `mailto:${m.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    record('EMAIL_APP', `Email opened for ${m.name} — reply logged.`);
  }

  function viaServerEmail() {
    if (check()) record('EMAIL', `Email sent to ${m.email}.`);
  }

  function logCall() {
    if (check()) record('PHONE', `Call with ${m.name} logged.`);
  }

  return (
    <div className="composer">
      <div className="composer__templates">
        <span className="composer__label">Quick replies:</span>
        {TEMPLATES.map((t) => (
          <button key={t.label} type="button" className="chip" onClick={() => { setBody(compose(m, me, t.text)); setError(''); }}>
            {t.label}
          </button>
        ))}
      </div>

      <label className="sr-only" htmlFor={`reply-${m.id}`}>Your reply to {m.name}</label>
      <textarea
        id={`reply-${m.id}`}
        className="composer__text"
        rows={8}
        maxLength={3000}
        value={body}
        onChange={(e) => { setBody(e.target.value); setError(''); }}
      />
      {error && <p className="field__error">{error}</p>}

      <div className="composer__send">
        {m.phone && (
          <button className="btn btn--whatsapp btn--sm" type="button" onClick={viaWhatsApp} disabled={!!sending}>
            WhatsApp {m.phone}
          </button>
        )}
        {m.email && me.emailEnabled && (
          <button className="btn btn--gold btn--sm" type="button" onClick={viaServerEmail} disabled={!!sending}>
            {sending === 'EMAIL' ? 'Sending…' : `Send email to ${m.email}`}
          </button>
        )}
        {m.email && (
          <button className={`btn ${me.emailEnabled ? 'btn--ghost' : 'btn--gold'} btn--sm`} type="button" onClick={viaEmailApp} disabled={!!sending}>
            {me.emailEnabled ? 'Open in my email app' : `Email ${m.email}`}
          </button>
        )}
        {m.phone && (
          <a className="btn btn--outline btn--sm" href={telLink(m.phone)}>Call {m.phone}</a>
        )}
        <button className="btn btn--ghost btn--sm" type="button" onClick={logCall} disabled={!!sending}>
          Log a phone call
        </button>
      </div>
      <p className="composer__hint">
        {me.emailEnabled
          ? 'Send email delivers your reply straight to their inbox from the business address. WhatsApp opens with your reply already typed — press send there.'
          : 'WhatsApp and email open with your reply already typed — just press send.'}{' '}
        Every reply is saved here so the team can see who answered.
      </p>
    </div>
  );
}

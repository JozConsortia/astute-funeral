import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { api } from '../lib/api';
import { Icon, IconInput } from './Icon';

export interface PickedAddress {
  street: string;
  city: string;
  province: string;
  postalCode: string;
}

interface Suggestion {
  id: string;
  main: string;
  secondary: string;
  /** Sent straight away by OpenStreetMap; Google sends it on a second call once one is picked. */
  address: PickedAddress | null;
}

export type AddressSource = '' | 'google' | 'openstreetmap';

/** Google groups all the lookups for one address (one "session") into a single charge. */
function newSessionToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(16)); // works on http too, unlike crypto.randomUUID
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

interface Props {
  id: string;
  value: string;
  invalid: boolean;
  /** Where suggestions come from; '' makes this a plain text box. */
  source: AddressSource;
  onChange: (value: string) => void;
  onPick: (address: PickedAddress) => void;
}

/**
 * Street address box that suggests real addresses as people type (via our server, which asks Google or the free
 * OpenStreetMap service) and fills in the town, province and postal code when one is picked. Typing it in full
 * always works too.
 */
export function AddressSearch({ id, value, invalid, source, onChange, onPick }: Props) {
  const enabled = source !== '';
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const session = useRef(newSessionToken());
  const typed = useRef(false); // only look up what the person types (not a restored or picked address)
  const panel = useRef<HTMLDivElement>(null);
  const listId = `${id}-suggestions`;

  // On a phone the list can open below the fold: bring it into view.
  useEffect(() => {
    if (open) panel.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [open]);

  useEffect(() => {
    if (!enabled || !typed.current) return;
    const input = value.trim();
    if (input.length < 3) {
      setItems([]);
      setOpen(false);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      api<Suggestion[]>('/api/address/suggest', 'POST', { input, session: session.current })
        .then((found) => {
          if (cancelled) return;
          setItems(found);
          setOpen(found.length > 0);
          setActive(-1);
        })
        .catch(() => !cancelled && setOpen(false)); // no suggestions is fine: they can type it in
    }, 350);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [value, enabled]);

  async function pick(s: Suggestion) {
    typed.current = false;
    setOpen(false);
    setItems([]);
    onChange(s.main);
    if (s.address) {
      onPick(s.address);
      return;
    }
    try {
      onPick(await api<PickedAddress>('/api/address/details', 'POST', { id: s.id, session: session.current }));
    } catch {
      // Keep the picked street; the person fills in the rest.
    }
    session.current = newSessionToken(); // a pick ends Google's billing session
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, items.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter' && active >= 0) {
      e.preventDefault();
      void pick(items[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div className="address-search">
      <IconInput icon="pin">
        <input
          id={id}
          value={value}
          maxLength={200}
          placeholder={enabled ? 'Start typing your street address' : 'House number and street name'}
          autoComplete={enabled ? 'off' : 'street-address'}
          spellCheck={false}
          aria-invalid={invalid}
          {...(enabled && {
            role: 'combobox',
            'aria-autocomplete': 'list' as const,
            'aria-expanded': open,
            'aria-controls': listId,
            'aria-activedescendant': open && active >= 0 ? `${listId}-${active}` : undefined,
          })}
          onChange={(e) => {
            typed.current = true;
            onChange(e.target.value);
          }}
          onKeyDown={onKeyDown}
          onBlur={() => setOpen(false)}
        />
      </IconInput>
      {open && (
        <div className="address-search__panel" ref={panel}>
          <ul className="address-search__list" id={listId} role="listbox" aria-label="Matching addresses">
            {items.map((s, i) => (
              <li
                key={s.id}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                className={`address-search__item${i === active ? ' is-active' : ''}`}
                // mousedown (not click) so the pick happens before the box loses focus and closes the list
                onMouseDown={(e) => {
                  e.preventDefault();
                  void pick(s);
                }}
              >
                <Icon name="pin" />
                <span>
                  <strong>{s.main}</strong>
                  {s.secondary && <span className="address-search__secondary">{s.secondary}</span>}
                </span>
              </li>
            ))}
          </ul>
          <p className="address-search__foot">
            <span>Not in the list? Just keep typing.</span>
            {source === 'google' ? (
              // Attribution Google requires when its suggestions are shown without a map.
              <span className="address-search__attribution" translate="no">Google Maps</span>
            ) : (
              // Credit the OpenStreetMap licence asks for.
              <a
                className="address-search__attribution"
                href="https://www.openstreetmap.org/copyright"
                target="_blank"
                rel="noopener"
                translate="no"
                tabIndex={-1}
                onMouseDown={(e) => e.preventDefault()}
              >
                &copy; OpenStreetMap contributors
              </a>
            )}
          </p>
        </div>
      )}
    </div>
  );
}

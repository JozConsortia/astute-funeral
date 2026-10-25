import { useEffect, useState, type InputHTMLAttributes } from 'react';

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  /** Change this number to reveal the password, e.g. after generating one. */
  revealKey?: number;
};

/** Password field with a button to show or hide what has been typed. */
export function PasswordInput({ revealKey, ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (revealKey) setVisible(true);
  }, [revealKey]);

  return (
    <div className="password-input">
      <input {...props} type={visible ? 'text' : 'password'} autoCapitalize="off" spellCheck={false} />
      <button
        type="button"
        className="password-input__toggle"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        aria-controls={props.id}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          {visible ? (
            <>
              <path d="M3 3l18 18" />
              <path d="M10.6 5.1A9.8 9.8 0 0 1 12 5c5.5 0 9 5.5 9.6 7-.3.8-1.3 2.5-2.9 4M6.5 6.6C4.3 8 2.9 10.1 2.4 12c.6 1.5 4.1 7 9.6 7 1.8 0 3.4-.6 4.8-1.4" />
              <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
            </>
          ) : (
            <>
              <path d="M2.4 12C3 10.5 6.5 5 12 5s9 5.5 9.6 7c-.6 1.5-4.1 7-9.6 7s-9-5.5-9.6-7Z" />
              <circle cx="12" cy="12" r="3" />
            </>
          )}
        </svg>
        <span className="password-input__text">{visible ? 'Hide' : 'Show'}</span>
      </button>
    </div>
  );
}

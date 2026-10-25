import type { ReactNode } from 'react';

interface FieldProps {
  label?: ReactNode;
  htmlFor?: string;
  error?: string;
  required?: boolean;
  className?: string;
  help?: ReactNode;
  children: ReactNode;
}

/** Label + control + error message, styled by .field in styles.css. */
export function Field({ label, htmlFor, error, required, className = '', help, children }: FieldProps) {
  return (
    <div className={`field ${className} ${error ? 'has-error' : ''}`.trim()}>
      {label &&
        (htmlFor ? (
          <label htmlFor={htmlFor}>
            {label} {required && <span className="req">*</span>}
          </label>
        ) : (
          <span className="label">
            {label} {required && <span className="req">*</span>}
          </span>
        ))}
      {children}
      {help && <p className="field__help">{help}</p>}
      {error && <p className="field__error">{error}</p>}
    </div>
  );
}

export function FormAlert({ message, type = 'error' }: { message: string; type?: 'error' | 'success' }) {
  if (!message) return null;
  return (
    <div className={`form-alert form-alert--${type}`} role="alert">
      {message}
    </div>
  );
}

/** Hidden field that only bots fill in. */
export function Honeypot({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="hp" aria-hidden="true">
      <label>
        Website <input type="text" tabIndex={-1} autoComplete="off" value={value} onChange={(e) => onChange(e.target.value)} />
      </label>
    </div>
  );
}

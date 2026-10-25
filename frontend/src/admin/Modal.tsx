import { useEffect, useRef, type ReactNode } from 'react';

interface ModalProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'md' | 'lg';
}

/** Small dialog used by the Users page; styled by .modal in admin.css. */
export function Modal({ title, subtitle, onClose, children, footer, size = 'md' }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      className={`modal modal--${size}`}
      aria-labelledby="modal-title"
      onClose={() => close.current()}
      onClick={(e) => e.target === ref.current && ref.current?.close()}
    >
      <div className="modal__head">
        <div>
          {subtitle && <p className="modal__ref">{subtitle}</p>}
          <h2 className="modal__title" id="modal-title">{title}</h2>
        </div>
        <button className="modal__close" type="button" aria-label="Close" onClick={() => ref.current?.close()}>
          &times;
        </button>
      </div>
      <div className="modal__body">{children}</div>
      {footer && <div className="modal__foot modal__foot--actions">{footer}</div>}
    </dialog>
  );
}

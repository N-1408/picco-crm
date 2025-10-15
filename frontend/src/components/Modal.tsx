import { useEffect, type ReactNode } from 'react';
import clsx from 'clsx';

export type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
};

export default function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  actions
}: ModalProps) {
  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-panel">
        {(title || actions || description) && (
          <header className="modal-header">
            {title ? <h2>{title}</h2> : null}
            <button
              type="button"
              className="modal-close"
              onClick={onClose}
              aria-label="Yopish"
            >
              <span className="material-symbols-rounded">close</span>
            </button>
          </header>
        )}
        {description ? <p className="modal-description">{description}</p> : null}
        <div className={clsx('modal-body', description && 'with-description')}>{children}</div>
        {actions ? <div className="modal-actions">{actions}</div> : null}
      </div>
    </div>
  );
}

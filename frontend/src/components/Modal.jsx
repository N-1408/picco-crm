import React, { useEffect } from 'react';
import clsx from 'clsx';

export default function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  actions
}) {
  useEffect(() => {
    if (!isOpen) return undefined;
    const handler = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-panel">
        <div className="modal-header">
          <h2>{title}</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Yopish">
            <span className="material-symbols-rounded">close</span>
          </button>
        </div>
        {description ? <p className="modal-description">{description}</p> : null}
        <div className={clsx('modal-body', description && 'with-description')}>{children}</div>
        {actions ? <div className="modal-actions">{actions}</div> : null}
      </div>
    </div>
  );
}

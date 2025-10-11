import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';

export type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  showClose?: boolean;
  fullScreen?: boolean;
};

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  showClose = true,
  fullScreen = false
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      ref={overlayRef}
      className={clsx(
        'fixed inset-0 z-50',
        'bg-black/25 backdrop-blur-sm',
        'flex items-center justify-center',
        'animate-fade-in'
      )}
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div
        ref={contentRef}
        className={clsx(
          'bg-white rounded-2xl',
          'shadow-xl border border-white/20',
          'animate-slide-up',
          fullScreen
            ? 'fixed inset-4 overflow-auto'
            : 'w-full max-w-md mx-4 max-h-[90vh] overflow-hidden'
        )}
      >
        {/* Header */}
        {(title || showClose) && (
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            {title && (
              <h2 className="text-lg font-medium text-gray-900">{title}</h2>
            )}
            {showClose && (
              <button
                onClick={onClose}
                className={clsx(
                  'w-8 h-8 flex items-center justify-center',
                  'rounded-full hover:bg-gray-100',
                  'transition-colors duration-200'
                )}
              >
                <span className="material-symbols-rounded text-gray-500">
                  close
                </span>
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className={clsx(
          'overflow-auto',
          fullScreen ? 'p-4' : 'p-6'
        )}>
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
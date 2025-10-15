import { type ReactNode } from 'react';
import clsx from 'clsx';

interface FloatingActionButtonProps {
  icon?: string;
  label?: string;
  onClick: () => void;
  className?: string;
  children?: ReactNode;
}

export default function FloatingActionButton({
  icon = 'add',
  label,
  onClick,
  className,
  children
}: FloatingActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx('fab-button', className)}
      aria-label={label ?? 'Yangi qo‘shish'}
    >
      <span className="fab-icon material-symbols-rounded">{icon}</span>
      {label ? <span className="fab-label">{label}</span> : null}
      {children}
    </button>
  );
}

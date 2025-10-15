import { type ReactNode } from 'react';
import clsx from 'clsx';

interface FilterToolbarProps {
  children: ReactNode;
  className?: string;
  sticky?: boolean;
}

export default function FilterToolbar({ children, className, sticky = false }: FilterToolbarProps) {
  return (
    <div className={clsx('filter-toolbar', sticky && 'filter-toolbar--sticky', className)}>
      {children}
    </div>
  );
}

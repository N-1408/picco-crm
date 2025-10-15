import { type ReactNode } from 'react';
import clsx from 'clsx';

interface PageContainerProps {
  children: ReactNode;
  variant?: 'default' | 'gradient' | 'split';
  className?: string;
}

export default function PageContainer({
  children,
  variant = 'default',
  className
}: PageContainerProps) {
  return (
    <main className={clsx('page-container', `page-container--${variant}`, className)}>
      {children}
    </main>
  );
}

import { type ReactNode } from 'react';
import clsx from 'clsx';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
}

export default function SectionHeader({
  title,
  subtitle,
  action,
  className
}: SectionHeaderProps) {
  return (
    <div className={clsx('section-header', className)}>
      <div>
        <h2>{title}</h2>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {action ? <div className="section-header__action">{action}</div> : null}
    </div>
  );
}

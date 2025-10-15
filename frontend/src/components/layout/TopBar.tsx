import { type ReactNode } from 'react';

interface TopBarProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  actions?: ReactNode;
}

export default function TopBar({
  title,
  subtitle,
  showBack = false,
  onBack,
  actions
}: TopBarProps) {
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      window.history.back();
    }
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred?.('light');
  };

  return (
    <header className="top-bar glass-surface">
      <div className="top-bar__left">
        {showBack ? (
          <button type="button" className="top-bar__back" onClick={handleBack} aria-label="Ortga">
            <span className="material-symbols-rounded">chevron_left</span>
          </button>
        ) : null}
        <div className="top-bar__titles">
          {title ? <h1>{title}</h1> : null}
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
      </div>
      {actions ? <div className="top-bar__right">{actions}</div> : null}
    </header>
  );
}

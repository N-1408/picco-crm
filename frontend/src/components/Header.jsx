import React from 'react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';

export default function Header({
  title,
  subtitle,
  showBack = false,
  onBack,
  rightSlot
}) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }

    if (window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
    }
  };

  return (
    <header className="app-header glass-panel">
      <div className="header-left">
        {showBack && (
          <button
            type="button"
            className="back-btn"
            onClick={handleBack}
            aria-label="Ortga"
          >
            <span className="material-symbols-rounded">chevron_left</span>
          </button>
        )}
        <div className={clsx('header-text', !subtitle && 'single-line')}>
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </div>
      {rightSlot ? <div className="header-right">{rightSlot}</div> : null}
    </header>
  );
}

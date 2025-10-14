import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext.tsx';

export default function LandingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading, authError } = useApp();
  const isRegistered = Boolean(user);

  useEffect(() => {
    if (!window.Telegram?.WebApp) return;
    const tg = window.Telegram.WebApp;
    tg.ready();
    tg.expand();
    tg.enableClosingConfirmation();
  }, []);

  const vibrate = () => {
    const feedback = window.Telegram?.WebApp?.HapticFeedback;
    if (feedback?.impactOccurred) {
      feedback.impactOccurred('light');
    } else if (feedback?.selectionChanged) {
      feedback.selectionChanged();
    }
  };

  const handleOpenBot = () => {
    vibrate();
    const url = 'https://t.me/picco_agent_bot';
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.openTelegramLink(url);
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleOpenAgent = () => {
    vibrate();
    navigate('/agent', { replace: false });
  };

  const handleOpenAdmin = () => {
    vibrate();
    navigate('/admin', { replace: false });
  };

  const showRegisterNotice = !loading && !isRegistered;
  const cameFromRestricted = location.search.includes('needsRegistration');

  return (
    <main className="landing-page landing-clean">
      <section className="landing-hero">
        <div className="hero-glow" aria-hidden="true" />
        <div className="hero-card hero-card--clean">
          <span className="hero-tag">Agent tizimi</span>
          <h1 className="hero-logo">PICCO</h1>
          <p className="hero-sub">Panelni tanlang va ishni boshlang.</p>
          <div className="hero-illustration hero-illustration--pulse" aria-hidden="true">
            <div className="pulse-ring pulse-ring--outer" />
            <div className="pulse-ring pulse-ring--inner" />
            <span className="material-symbols-rounded">hub</span>
          </div>
          {loading ? (
            <div className="hero-loader">
              <div className="loader-dot" aria-hidden="true" />
              <span>Ma&apos;lumotlar yuklanmoqda...</span>
            </div>
          ) : isRegistered ? (
            <div className="hero-actions hero-actions--stacked">
              <button type="button" className="btn-primary btn-large" onClick={handleOpenAgent}>
                🧑‍💼 Agent paneli
              </button>
              <button type="button" className="btn-secondary btn-large" onClick={handleOpenAdmin}>
                👑 Admin paneli
              </button>
              <button type="button" className="btn-link" onClick={handleOpenBot}>
                Telegram orqali ro&apos;yxatdan o&apos;tish
                <span className="material-symbols-rounded">arrow_outward</span>
              </button>
            </div>
          ) : (
            <div className="hero-message">
              <p>
                {cameFromRestricted
                  ? 'Avval ro\'yxatdan o\'tishingiz kerak. PICCO agent paneli faqat tasdiqlangan foydalanuvchilar uchun.'
                  : 'Iltimos, avval PICCO bot orqali ro\'yxatdan o\'ting. Tasdiqlangandan so\'ng panel avtomatik ochiladi.'}
              </p>
              {authError ? <span className="hero-error">{authError}</span> : null}
              <button type="button" className="btn-primary btn-large" onClick={handleOpenBot}>
                @picco_agent_bot bilan ro&apos;yxatdan o&apos;tish
              </button>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

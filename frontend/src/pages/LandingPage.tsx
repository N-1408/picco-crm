import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext.tsx';

interface LandingPageProps {
  onLoginRequest: (role?: 'agent' | 'admin') => void;
}

export default function LandingPage({ onLoginRequest }: LandingPageProps) {
  const navigate = useNavigate();
  const { user } = useApp();

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

  const handleOpenPanel = (role: 'agent' | 'admin') => {
    if (user) {
      navigate(role === 'admin' ? '/admin' : '/agent', { replace: false });
    } else {
      onLoginRequest(role);
    }
    vibrate();
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
          <div className="hero-actions hero-actions--stacked">
            <button
              type="button"
              className="btn-primary btn-large"
              onClick={() => handleOpenPanel('agent')}
            >
              Agent paneli
            </button>
            <button
              type="button"
              className="btn-secondary btn-large"
              onClick={() => handleOpenPanel('admin')}
            >
              Admin paneli
            </button>
            <button type="button" className="btn-link" onClick={handleOpenBot}>
              Telegram orqali ro'yxatdan o'tish
              <span className="material-symbols-rounded">arrow_outward</span>
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

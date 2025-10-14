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
    window.Telegram.WebApp.ready();
    window.Telegram.WebApp.expand();
    window.Telegram.WebApp.enableClosingConfirmation();
  }, []);

  const handleOpenPanel = (role: 'agent' | 'admin') => {
    if (user) {
      navigate(role === 'admin' ? '/admin' : '/agent', { replace: false });
    } else {
      onLoginRequest(role);
    }
    if (window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.selectionChanged();
    }
  };

  const handleOpenBot = () => {
    const url = 'https://t.me/picco_agent_bot';
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.openTelegramLink(url);
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <main className="landing-page">
      <section className="landing-hero">
        <div className="hero-card">
          <div className="logo-circle">
            <span className="material-symbols-rounded">sparkles</span>
          </div>
          <h1>Soft power for smart sales.</h1>
          <p>
            PICCO agentlari va administratorlari uchun yaratilgan sokin boshqaruv maydoni —
            buyurtmalar, mijozlar va xaritalar bir joyda, Apple uslubidagi uyg'unlikda.
          </p>
          <div className="hero-illustration" aria-hidden="true">
            <div className="orbit">
              <span className="material-symbols-rounded">sell</span>
              <span className="material-symbols-rounded">route</span>
              <span className="material-symbols-rounded">insights</span>
            </div>
            <div className="glow" />
          </div>
          <div className="hero-actions">
            <button type="button" className="btn-primary" onClick={() => handleOpenPanel('agent')}>
              Agent paneli
            </button>
            <button type="button" className="btn-secondary" onClick={() => handleOpenPanel('admin')}>
              Admin paneli
            </button>
            <button type="button" className="btn-link" onClick={handleOpenBot}>
              Telegram orqali ro'yxatdan o'tish
              <span className="material-symbols-rounded">north_east</span>
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

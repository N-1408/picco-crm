import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import PageContainer from '../components/layout/PageContainer';
import { useApp } from '../context/AppContext';

export default function LandingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading, authError } = useApp();
  const isRegistered = Boolean(user);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg) return;
    tg.ready();
    tg.expand();
    tg.enableClosingConfirmation();
  }, []);

  const vibrate = () => {
    const feedback = window.Telegram?.WebApp?.HapticFeedback as
      | {
          impactOccurred?: (_style: 'light' | 'medium' | 'heavy') => void;
          selectionChanged?: () => void;
        }
      | undefined;
    if (feedback?.impactOccurred) {
      feedback.impactOccurred('light');
    } else if (feedback?.selectionChanged) {
      feedback.selectionChanged();
    }
  };

  const openBot = () => {
    vibrate();
    const url = 'https://t.me/picco_agent_bot';
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.openTelegramLink(url);
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const goAgent = () => {
    vibrate();
    navigate('/agent');
  };

  const goAdmin = () => {
    vibrate();
    navigate('/admin');
  };

  const cameFromRestricted = location.search.includes('needsRegistration');

  return (
    <PageContainer variant="gradient" className="landing-page landing-clean">
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
              <button type="button" className="btn-primary btn-large" onClick={goAgent}>
                Agent paneli
              </button>
              <button type="button" className="btn-secondary btn-large" onClick={goAdmin}>
                Admin paneli
              </button>
              <button type="button" className="btn-link" onClick={openBot}>
                Telegram orqali ro&apos;yxatdan o&apos;tish
                <span className="material-symbols-rounded">arrow_outward</span>
              </button>
            </div>
          ) : (
            <div className="hero-message">
              <p>
                {cameFromRestricted
                  ? "Avval ro'yxatdan o'tishingiz kerak. PICCO agent paneli faqat tasdiqlangan foydalanuvchilar uchun."
                  : "Iltimos, avval PICCO bot orqali ro'yxatdan o'ting. Tasdiqlangandan so'ng panel avtomatik ochiladi."}
              </p>
              {authError ? <span className="hero-error">{authError}</span> : null}
              <button type="button" className="btn-primary btn-large" onClick={openBot}>
                @picco_agent_bot bilan ro&apos;yxatdan o&apos;tish
              </button>
            </div>
          )}
        </div>
      </section>
    </PageContainer>
  );
}

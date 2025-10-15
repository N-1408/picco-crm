import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext.tsx';

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
          impactOccurred?: (style: 'light' | 'medium' | 'heavy') => void;
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
    navigate('/agent', { replace: false });
  };

  const goAdmin = () => {
    vibrate();
    navigate('/admin', { replace: false });
  };

  const cameFromRestricted = location.search.includes('needsRegistration');

  return (
    <main className="landing-page landing-clean">
      <section className="landing-hero">
        <div className="hero-glow" aria-hidden="true" />
        <div className="hero-card hero-card--clean">
          <div className="hero-header">
            <span className="hero-tag">PICCO CRM · Mini App</span>
            <h1 className="hero-logo">Sotuvlar uchun premium boshqaruv</h1>
            <p className="hero-sub">
              Agentlar va administratorlar uchun Apple uslubidagi hushyor boshqaruv paneli.
              Buyurtmalar, xaritalar va statistikani bir joyda kuzating.
            </p>
          </div>
          <div className="hero-illustration hero-illustration--pulse" aria-hidden="true">
            <div className="pulse-ring pulse-ring--outer" />
            <div className="pulse-ring pulse-ring--inner" />
            <span className="material-symbols-rounded">hub</span>
          </div>

          <div className="hero-metrics">
            <div>
              <span>Buyurtmalar</span>
              <strong>+1240</strong>
            </div>
            <div>
              <span>Do&apos;konlar</span>
              <strong>312</strong>
            </div>
            <div>
              <span>Agentlar</span>
              <strong>480</strong>
            </div>
          </div>

          {loading ? (
            <div className="hero-loader">
              <div className="loader-dot" aria-hidden="true" />
              <span>Ma&apos;lumotlar yuklanmoqda...</span>
            </div>
          ) : isRegistered ? (
            <div className="hero-actions hero-actions--stacked">
              <button type="button" className="btn-primary btn-large" onClick={goAgent}>
                🧑‍💼 Agent paneli
              </button>
              <button type="button" className="btn-secondary btn-large" onClick={goAdmin}>
                👑 Admin paneli
              </button>
              <button type="button" className="btn-link" onClick={openBot}>
                Telegram orqali ro&apos;yxatdan o&apos;tish
                <span className="material-symbols-rounded">arrow_outward</span>
              </button>
            </div>
          ) : (
            <div className="hero-message glass-panel">
              <div className="hero-message__content">
                <h2>Ro&apos;yxatdan o&apos;tish talab qilinadi</h2>
                <p>
                  {cameFromRestricted
                    ? "Avval ro'yxatdan o'tishingiz kerak. PICCO agent paneli faqat tasdiqlangan foydalanuvchilar uchun ochiladi."
                    : "Iltimos, PICCO bot orqali ro'yxatdan o'ting. Tasdiqlanganingizdan so'ng, agent paneli avtomatik ochiladi."}
                </p>
                {authError ? <span className="hero-error">{authError}</span> : null}
              </div>
              <div className="hero-message__actions">
                <button type="button" className="btn-primary btn-large" onClick={openBot}>
                  @picco_agent_bot orqali ro&apos;yxatdan o&apos;tish
                </button>
                <span className="hero-note">
                  PICCO rasmiy botida ma&apos;lumotlaringizni yuboring va tezkor tasdiqdan so&apos;ng
                  WebApp orqali ishni boshlang.
                </span>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

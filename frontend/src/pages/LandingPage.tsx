import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

interface LandingPageProps {
  onLoginRequest: (role?: 'agent' | 'admin') => void;
}

export default function LandingPage({ onLoginRequest }: LandingPageProps) {
  const navigate = useNavigate();
  const { user } = useAppContext();

  React.useEffect(() => {
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand();
      window.Telegram.WebApp.enableClosingConfirmation();
    }
  }, []);

  const handleAgentClick = () => {
    navigate('/agent');
    if (window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
    }
  };

  const handleAdminClick = () => {
    navigate('/admin');
    if (window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
    }
  };

  const handleStartWithTelegram = () => {
    const botUsername = 'picco_agent_bot';
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.openTelegramLink(`https://t.me/${botUsername}`);
    } else {
      window.open(`https://t.me/${botUsername}`, '_blank');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-white to-gray-50 px-4 py-8">
      <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh]">
        <img src="/logo.svg" alt="PICCO" className="w-24 h-24 mb-8 animate-float" />
        {user ? (
          <div className="w-full max-w-md space-y-4">
            <button
              onClick={handleAdminClick}
              className="w-full h-12 rounded-xl font-medium bg-[#007AFF] text-white shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-transform"
            >
              Admin Panelga kirish
            </button>
            <button
              onClick={handleAgentClick}
              className="w-full h-12 rounded-xl font-medium bg-gray-100 text-gray-900 hover:bg-gray-200 active:bg-gray-300 transition-colors"
            >
              Agent Panelga kirish
            </button>
          </div>
        ) : (
          <div className="w-full max-w-md text-center">
            <h1 className="text-2xl font-semibold mb-3">
              PICCO Agent Paneliga xush kelibsiz!
            </h1>
            <p className="text-gray-600 mb-8 leading-relaxed">
              Agent sifatida buyurtmalarni, do'konlarni va natijalarni boshqarish uchun tizimga kiring.
            </p>
            <button
              onClick={handleStartWithTelegram}
              className="w-full h-12 rounded-xl font-medium bg-[#007AFF] text-white shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
            >
              <span className="material-symbols-rounded">telegram</span>
              Start with Telegram
            </button>
          </div>
        )}
      </div>
      <div className="mt-auto text-center animate-pulse-slow">
        <p className="text-gray-600 italic px-6">
          🚀 PICCO bilan natija — bu tasodif emas. Har bir sotuv, har bir qadam — mukammallikka yo'l.
        </p>
      </div>
    </div>
  );
}
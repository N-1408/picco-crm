import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import clsx from 'clsx';

const PICCO_BOT_URL = 'https://t.me/picco_agent_bot';

export default function LandingPage() {
  const navigate = useNavigate();
  const { user, loading } = useApp();

  useEffect(() => {
    // Initialize Telegram WebApp
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand();
      window.Telegram.WebApp.enableClosingConfirmation();
    }
  }, []);

  const handleAdminPanelClick = () => {
    navigate('/admin/dashboard');
    
    if (window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
    }
  };

  const handleAgentPanelClick = () => {
    navigate('/agent/dashboard');
    
    if (window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
    }
  };

  const handleStartWithTelegram = () => {
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.openTelegramLink(PICCO_BOT_URL);
    } else {
      window.open(PICCO_BOT_URL, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-gray-50">
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-white to-gray-50 px-4 py-8">
      {/* Logo */}
      <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh]">
        <img 
          src="/logo.svg" 
          alt="PICCO" 
          className="w-24 h-24 mb-8 animate-float"
        />

        {user ? (
          // Registered user view
          <div className="w-full max-w-md space-y-4">
            <button
              onClick={handleAdminPanelClick}
              className={clsx(
                'w-full h-12 rounded-xl font-medium',
                'bg-[#007AFF] text-white',
                'shadow-lg shadow-blue-500/20',
                'active:scale-[0.98] transition-transform'
              )}
            >
              Admin Panelga kirish
            </button>

            <button
              onClick={handleAgentPanelClick}
              className={clsx(
                'w-full h-12 rounded-xl font-medium',
                'bg-gray-100 text-gray-900',
                'hover:bg-gray-200 active:bg-gray-300',
                'transition-colors'
              )}
            >
              Agent Panelga kirish
            </button>
          </div>
        ) : (
          // New user view
          <div className="w-full max-w-md text-center">
            <h1 className="text-2xl font-semibold mb-3">
              PICCO CRM tizimiga xush kelibsiz!
            </h1>
            
            <p className="text-gray-600 mb-8 leading-relaxed">
              Bizning xizmatlarimiz orqali biznesingizni 
              yangi bosqichga olib chiqing.
            </p>

            <button
              onClick={handleStartWithTelegram}
              className={clsx(
                'w-full h-12 rounded-xl font-medium',
                'bg-[#007AFF] text-white',
                'shadow-lg shadow-blue-500/20',
                'flex items-center justify-center gap-2',
                'active:scale-[0.98] transition-transform'
              )}
            >
              <span className="material-symbols-rounded">telegram</span>
              Start with Telegram
            </button>
          </div>
        )}
      </div>

      {/* Motivational Quote */}
      <div className="mt-auto text-center animate-pulse-slow">
        <p className="text-gray-600 italic px-6">
          🚀 PICCO bilan natija — bu tasodif emas. 
          Har bir sotuv, har bir qadam — mukammallikka yo'l.
        </p>
      </div>
    </div>
  );
          </div>
        </div>
      </section>
    </main>
  );
}

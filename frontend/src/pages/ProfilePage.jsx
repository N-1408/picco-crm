import React from 'react';
import PageContainer from '../components/layout/PageContainer';
import SectionHeader from '../components/layout/SectionHeader';
import { useAppContext } from '../context/AppContext';

export default function ProfilePage() {
  const {
    state: { user, preferences },
    updatePreferences,
    logout,
    addToast
  } = useAppContext();

  if (!user) return null;

  const handleLogout = () => {
    logout();
    addToast({
      variant: 'info',
      title: 'Sessiya yakunlandi',
      description: "Kirish ma'lumotlaringiz xavfsiz tarzda o'chirildi."
    });
  };

  const openSupport = () => {
    const url = 'https://t.me/picco_agent_bot';
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.openTelegramLink(url);
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <PageContainer className="profile-page">
      <section className="profile-header frosted-card">
        <div className="profile-avatar">
          <img src={user.avatar} alt={user.name} />
          <span className="status-dot success" />
        </div>
        <div className="profile-meta">
          <h2>{user.name}</h2>
          <span className="role-chip">{user.role === 'admin' ? 'Admin' : 'Agent'}</span>
          <p>{user.phone}</p>
        </div>
        <button type="button" className="btn-glass" onClick={openSupport}>
          <span className="material-symbols-rounded">support</span>
          Qo&apos;llab-quvvatlash
        </button>
      </section>

      <section className="surface-card preferences-card">
        <SectionHeader title="Ilova sozlamalari" subtitle="Shaxsiy tajribangizni boshqaring" />

        <div className="preference-row">
          <div>
            <strong>Haptik bildirishnomalar</strong>
            <p>Harakatlar uchun engil titrash orqali fikr bildirish.</p>
          </div>
          <label className="switch">
            <input
              type="checkbox"
              checked={preferences.haptics}
              aria-label="Haptik bildirishnomalar"
              onChange={(event) => updatePreferences({ haptics: event.target.checked })}
            />
            <span />
          </label>
        </div>

        <div className="preference-row">
          <div>
            <strong>Til</strong>
            <p>Interfeys tilini tanlang.</p>
          </div>
          <select
            value={preferences.language}
            onChange={(event) => updatePreferences({ language: event.target.value })}
          >
            <option value="uz">O&apos;zbekcha</option>
            <option value="ru">Русский</option>
            <option value="en">English</option>
          </select>
        </div>

        <button type="button" className="btn-danger" onClick={handleLogout}>
          <span className="material-symbols-rounded">logout</span>
          Chiqish
        </button>
      </section>
    </PageContainer>
  );
}

import { useEffect } from 'react';

export default function useTelegram() {
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg) return;

    try {
      tg.expand();
      tg.requestFullscreen();
      tg.enableClosingConfirmation();
      tg.setHeaderColor('#FFFFFF');
      tg.setBackgroundColor('#F9FAFB');
    } catch (error) {
      console.warn('Telegram WebApp API is not fully available', error);
    }
  }, []);
}

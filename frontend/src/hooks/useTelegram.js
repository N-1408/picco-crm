import { useEffect } from 'react';

export default function useTelegram() {
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg) return;

    const unsafeTg = tg;

    try {
      unsafeTg.expand?.();
      unsafeTg.requestFullscreen?.();
      unsafeTg.enableClosingConfirmation?.();
      unsafeTg.setHeaderColor?.('#FFFFFF');
      unsafeTg.setBackgroundColor?.('#F9FAFB');
    } catch (error) {
      console.warn('Telegram WebApp API is not fully available', error);
    }
  }, []);
}

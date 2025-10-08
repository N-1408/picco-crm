export function getTelegramWebApp() {
  return window.Telegram?.WebApp;
}

export function initTelegram() {
  const tg = getTelegramWebApp();
  if (tg) {
    tg.ready();
    tg.expand();
  }
  return tg;
}

export function getTelegramUser() {
  const tg = getTelegramWebApp();
  return tg?.initDataUnsafe?.user;
}

export function getTelegramTheme() {
  const tg = getTelegramWebApp();
  return tg?.colorScheme ?? 'light';
}

export function closeTelegram() {
  const tg = getTelegramWebApp();
  tg?.close();
}

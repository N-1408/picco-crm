interface TelegramWebApp {
  ready: () => void;
  expand: () => void;
  enableClosingConfirmation: () => void;
  close: () => void;
  MainButton: {
    text: string;
    show: () => void;
    hide: () => void;
    onClick: (callback: () => void) => void;
  };
  BackButton: {
    show: () => void;
    hide: () => void;
    onClick: (callback: () => void) => void;
  };
  HapticFeedback: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
    notificationOccurred: (type: 'error' | 'warning' | 'success') => void;
    selectionChanged: () => void;
  };
  openTelegramLink: (url: string) => void;
  initDataUnsafe?: {
    user?: {
      id?: number | string;
      first_name?: string;
      last_name?: string;
      username?: string;
      language_code?: string;
    };
    [key: string]: unknown;
  };
}

interface Window {
  Telegram?: {
    WebApp: TelegramWebApp;
  };
}

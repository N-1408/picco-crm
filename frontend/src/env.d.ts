/// <reference types="vite/client" />

interface Window {
  Telegram?: {
    WebApp?: {
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
        notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
        selectionChanged: () => void;
      };
      openTelegramLink: (url: string) => void;
    };
  };
}

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
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
        impactOccurred?: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
        notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
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

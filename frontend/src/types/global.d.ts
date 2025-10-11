/// <reference types="react" />
/// <reference types="vite/client" />

declare module '*.svg' {
  const content: React.FunctionComponent<React.SVGAttributes<SVGElement>>;
  export default content;
}

declare module '*.png' {
  const content: string;
  export default content;
}

declare module '*.jpg' {
  const content: string;
  export default content;
}

declare module '*.jpeg' {
  const content: string;
  export default content;
}

declare module '*.gif' {
  const content: string;
  export default content;
}

declare module '*.webp' {
  const content: string;
  export default content;
}

declare module '*.ico' {
  const content: string;
  export default content;
}

declare module '*.bmp' {
  const content: string;
  export default content;
}

interface Window {
  Telegram?: {
    WebApp?: {
      ready: () => void;
      expand: () => void;
      enableClosingConfirmation: () => void;
      requestFullscreen: () => void;
      MainButton: {
        text: string;
        color: string;
        textColor: string;
        isVisible: boolean;
        isActive: boolean;
        show: () => void;
        hide: () => void;
        enable: () => void;
        disable: () => void;
        showProgress: (leaveActive: boolean) => void;
        hideProgress: () => void;
        onClick: (callback: () => void) => void;
        offClick: (callback: () => void) => void;
      };
      BackButton: {
        isVisible: boolean;
        show: () => void;
        hide: () => void;
        onClick: (callback: () => void) => void;
        offClick: (callback: () => void) => void;
      };
      HapticFeedback: {
        impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
        notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
        selectionChanged: () => void;
      };
      isExpanded: boolean;
      viewportHeight: number;
      viewportStableHeight: number;
      colorScheme: 'light' | 'dark';
      headerColor: string;
      backgroundColor: string;
      isClosingConfirmationEnabled: boolean;
      platform: string;
      version: string;
      initData: string;
      initDataUnsafe: {
        query_id: string;
        user: {
          id: number;
          first_name: string;
          last_name?: string;
          username?: string;
          language_code: string;
        };
        auth_date: string;
        hash: string;
      };
      openLink: (url: string) => void;
      openTelegramLink: (url: string) => void;
      close: () => void;
    };
  };
}
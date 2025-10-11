import { useEffect } from 'react';
import clsx from 'clsx';
import { useApp, type Toast, type AlertVariant } from '../context/AppContext';

const icons: Record<AlertVariant, string> = {
  success: 'task_alt',
  error: 'error',
  warning: 'warning',
  info: 'info'
};

const colors: Record<AlertVariant, string> = {
  success: 'bg-[#34C759]/10 text-[#248A3D] border-[#34C759]/20',
  error: 'bg-[#FF3B30]/10 text-[#D70015] border-[#FF3B30]/20',
  warning: 'bg-[#FF9500]/10 text-[#C93400] border-[#FF9500]/20',
  info: 'bg-[#007AFF]/10 text-[#0040DD] border-[#007AFF]/20'
};

export default function ToastContainer() {
  const { toasts, dismissToast } = useApp();

  useEffect(() => {
    if (!toasts.length) return undefined;
    const timers = toasts.map((toast: Toast) =>
      setTimeout(() => dismissToast(toast.id), toast.duration ?? 3000)
    );
    return () => timers.forEach(clearTimeout);
  }, [toasts, dismissToast]);

  return (
    <div className="fixed top-safe inset-x-0 z-50 pointer-events-none p-4 flex flex-col items-center gap-2">
      {toasts?.map((toast: Toast) => {
        const variant = (toast as any).variant ?? 'info';
        return (
        <div
          key={toast.id}
          className={clsx(
            'w-full max-w-md pointer-events-auto',
            'flex items-start gap-3 p-4 rounded-xl border animate-slide-in',
            'backdrop-blur-xl bg-white/80',
            colors[variant as AlertVariant]
          )}
        >
          <span className="material-symbols-rounded shrink-0 mt-0.5">
            {icons[variant as AlertVariant] ?? icons.info}
          </span>
          
          <div className="flex-1 min-w-0">
            {toast.title && (
              <p className="font-medium leading-5 mb-1">{toast.title}</p>
            )}
            {toast.description && (
              <p className="text-sm opacity-80 line-clamp-2">{toast.description}</p>
            )}
          </div>

          <button
            type="button"
            className={clsx(
              'shrink-0 -mt-1 -mr-1 p-1.5 rounded-lg',
              'hover:bg-black/5 active:bg-black/10 transition-colors'
            )}
            onClick={() => dismissToast(toast.id)}
          >
            <span className="material-symbols-rounded text-xl">close</span>
          </button>
        </div>
        );
      })}
    </div>
  );
}

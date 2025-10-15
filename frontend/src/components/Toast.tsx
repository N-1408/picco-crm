import { useEffect } from 'react';
import { useApp, type AlertVariant } from '../context/AppContext';

const icons: Record<AlertVariant, string> = {
  success: 'task_alt',
  error: 'error',
  warning: 'warning',
  info: 'info'
};

const variantClass: Record<AlertVariant, string> = {
  success: 'toast-success',
  error: 'toast-error',
  warning: 'toast-warning',
  info: ''
};

export default function ToastContainer() {
  const { toasts, dismissToast } = useApp();

  useEffect(() => {
    if (!toasts.length) return undefined;
    const timers = toasts.map((toast) =>
      window.setTimeout(() => dismissToast(toast.id), toast.duration ?? 3000)
    );
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [toasts, dismissToast]);

  if (!toasts.length) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => {
        const variant = toast.variant ?? 'info';
        return (
          <div key={toast.id} className={`toast ${variantClass[variant as AlertVariant]}`}>
            <span className="toast-icon material-symbols-rounded">
              {icons[variant as AlertVariant] ?? icons.info}
            </span>
            <div className="toast-content">
              {toast.title ? <strong>{toast.title}</strong> : null}
              {toast.description ? <p>{toast.description}</p> : null}
            </div>
            <button type="button" className="toast-dismiss" onClick={() => dismissToast(toast.id)}>
              <span className="material-symbols-rounded">close</span>
            </button>
          </div>
        );
      })}
    </div>
  );
}

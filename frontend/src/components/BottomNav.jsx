import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import clsx from 'clsx';

/**
 * @typedef {Object} NavItem
 * @property {string} id
 * @property {string} icon
 * @property {string} label
 * @property {string} path
 */

/**
 * @param {{ items?: NavItem[] }} props
 */
export default function BottomNav({ items = [] }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [labelKey, setLabelKey] = useState(/** @type {string|null} */ (null));
  /** @type {React.MutableRefObject<number|undefined>} */
  const timerRef = useRef();

  useEffect(() => {
    return () => clearTimeout(timerRef.current);
  }, []);

  useEffect(() => {
    // Expand Telegram WebApp on mount
    if (window.Telegram?.WebApp?.expand) {
      window.Telegram.WebApp.expand();
    }
  }, []);

  if (!items.length) return null;

  /** @type {(item: NavItem) => void} */
  const handleClick = (item) => {
    if (item.path === location.pathname) {
      setLabelKey(item.id);
    } else {
      navigate(item.path);
      setLabelKey(item.id);
    }

    if (window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.selectionChanged();
    }

    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setLabelKey(null), 1500);
  };

  return (
    <nav className="bottom-nav">
      {items.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => handleClick(item)}
            className={clsx('nav-btn', isActive && 'active')}
            aria-label={item.label}
          >
            <span
              className={clsx(
                'material-symbols-rounded',
                'nav-icon',
                isActive ? 'active-icon' : 'inactive-icon'
              )}
            >
              {item.icon}
            </span>
            {labelKey === item.id && (
              <span className="absolute -top-8 left-1/2 -translate-x-1/2 text-sm font-medium bg-black/75 text-white px-2 py-1 rounded-md whitespace-nowrap animate-fade-in">
                {item.label}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}

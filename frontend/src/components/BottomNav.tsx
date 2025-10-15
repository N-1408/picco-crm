import { useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import clsx from 'clsx';

export type NavItem = {
  id: string;
  icon: string;
  label: string;
  path: string;
};

interface BottomNavProps {
  items?: NavItem[];
}

export default function BottomNav({ items = [] }: BottomNavProps) {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (window.Telegram?.WebApp?.expand) {
      window.Telegram.WebApp.expand();
    }
  }, []);

  const currentPath = location.pathname;

  const navItems = useMemo(() => items, [items]);

  if (!navItems.length) return null;

  return (
    <nav className="bottom-nav">
      {navItems.map((item) => {
        const isActive = currentPath === item.path;
        return (
          <button
            key={item.id}
            type="button"
            className={clsx('nav-btn', isActive && 'active')}
            onClick={() => {
              if (item.path !== currentPath) {
                navigate(item.path);
              }
              window.Telegram?.WebApp?.HapticFeedback?.selectionChanged?.();
            }}
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
            <span className="nav-label">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

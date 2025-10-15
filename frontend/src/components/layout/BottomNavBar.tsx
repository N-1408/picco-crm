import { useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import clsx from 'clsx';

export interface BottomNavItem {
  id: string;
  icon: string;
  label: string;
  path: string;
}

interface BottomNavBarProps {
  items: BottomNavItem[];
}

export default function BottomNavBar({ items }: BottomNavBarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;

  useEffect(() => {
    window.Telegram?.WebApp?.expand?.();
  }, []);

  const navItems = useMemo(() => items, [items]);

  if (!navItems.length) {
    return null;
  }

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
                window.Telegram?.WebApp?.HapticFeedback?.selectionChanged?.();
              }
            }}
            aria-label={item.label}
          >
            <span
              className={clsx(
                'material-symbols-rounded nav-icon',
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

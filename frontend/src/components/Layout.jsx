import React from 'react';
import { useLocation } from 'react-router-dom';
import BottomNav from './BottomNav';
import Header from './Header';

const defaultNavItems = [
  {
    id: 'home',
    icon: 'home',
    label: 'Asosiy',
    path: '/dashboard'
  },
  {
    id: 'orders',
    icon: 'shopping_cart',
    label: 'Buyurtmalar',
    path: '/orders'
  },
  {
    id: 'stats',
    icon: 'monitoring',
    label: 'Statistika',
    path: '/stats'
  },
  {
    id: 'profile',
    icon: 'person',
    label: 'Profil',
    path: '/profile'
  }
];

export default function Layout({ 
  children, 
  showHeader = true,
  showNav = true,
  headerTitle,
  headerAction,
  navItems = defaultNavItems,
  transparent = false
}) {
  const location = useLocation();

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-white to-gray-50">
      {showHeader && (
        <Header
          title={headerTitle}
          action={headerAction}
          transparent={transparent}
          showBack={location.pathname !== '/dashboard'}
        />
      )}

      <main className="flex-1 flex flex-col">
        {children}
      </main>

      {showNav && <BottomNav items={navItems} />}
    </div>
  );
}
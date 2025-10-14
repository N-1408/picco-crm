import React from 'react';
import { type ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { AppProvider, useAppContext } from './context/AppContext.tsx';
import useTelegram from './hooks/useTelegram.js';
import LandingPage from './pages/LandingPage';
import AgentDashboard from './pages/AgentDashboard.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import MapPage from './pages/MapPage.jsx';
import StatsPage from './pages/StatsPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import BottomNav from './components/BottomNav.jsx';
import Header from './components/Header.jsx';
import ToastContainer from './components/Toast.jsx';
import LoginModal from './components/LoginModal.jsx';

interface ProtectedRouteProps {
  children: ReactNode;
  roles?: ('agent' | 'admin')[];
}

function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { user } = useAppContext();

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/agent'} replace />;
  }

  return children;
}

function MainApp() {
  useTelegram();
  const { user } = useAppContext();
  const location = useLocation();
  const navigate = useNavigate();
  const [loginModalOpen, setLoginModalOpen] = React.useState(false);
  const [requestedRole, setRequestedRole] = React.useState<'agent' | 'admin'>('agent');

  const showBack = React.useMemo(() => {
    if (location.pathname === '/' || location.pathname === `/${user?.role ?? ''}`) {
      return false;
    }
    if (!user) return false;
    return location.pathname !== (user.role === 'admin' ? '/admin' : '/agent');
  }, [location.pathname, user]);

  const title = React.useMemo(() => {
    if (!user) return 'PICCO CRM';
    if (location.pathname.startsWith('/agent')) {
      if (location.pathname.includes('orders')) return 'Buyurtmalar';
      if (location.pathname.includes('stores')) return 'Do\'konlar';
      return 'Agent Paneli';
    }
    if (location.pathname.startsWith('/admin')) {
      if (location.pathname.includes('products')) return 'Mahsulotlar';
      if (location.pathname.includes('agents')) return 'Agentlar';
      if (location.pathname.includes('stores')) return 'Do\'konlar';
      return 'Admin Paneli';
    }
    if (location.pathname.startsWith('/map')) return 'Xarita';
    if (location.pathname.startsWith('/stats')) return 'Statistika';
    if (location.pathname.startsWith('/profile')) return 'Profil';
    return 'PICCO CRM';
  }, [location.pathname, user]);

  const navItems = React.useMemo(() => {
    if (!user) return [];
    if (user.role === 'admin') {
      return [
        { id: 'admin-home', label: 'Asosiy', icon: 'dashboard', path: '/admin' },
        { id: 'admin-products', label: 'Mahsulotlar', icon: 'inventory_2', path: '/admin/products' },
        { id: 'admin-map', label: 'Xarita', icon: 'map', path: '/map' },
        { id: 'admin-agents', label: 'Agentlar', icon: 'group', path: '/admin/agents' }
      ];
    }
    return [
      { id: 'agent-home', label: 'Bosh sahifa', icon: 'home', path: '/agent' },
      { id: 'agent-orders', label: 'Buyurtmalar', icon: 'assignment', path: '/agent/orders' },
      { id: 'agent-stats', label: 'Statistika', icon: 'insights', path: '/stats' },
      { id: 'agent-profile', label: 'Profil', icon: 'person', path: '/profile' }
    ];
  }, [user]);

  const handleLoginRequest = (role: 'agent' | 'admin' = 'agent') => {
    setRequestedRole(role);
    setLoginModalOpen(true);
  };

  const handleLoggedIn = (profile: { role: 'agent' | 'admin' }) => {
    if (profile.role === 'admin') {
      navigate('/admin', { replace: true });
      return;
    }
    navigate('/agent', { replace: true });
  };

  const hideHeader = !user && location.pathname === '/';

  return (
    <div className="app-root">
      {!hideHeader && <Header title={title} subtitle="" showBack={showBack} onBack={() => navigate(-1)} rightSlot={null} />}
      <div className="app-content">
        <Routes>
          <Route
            path="/"
            element={
              <LandingPage onLoginRequest={handleLoginRequest} />
            }
          />
          <Route
            path="/agent"
            element={
              <ProtectedRoute roles={['agent', 'admin']}>
                <AgentDashboard activeTab="overview" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/agent/orders"
            element={
              <ProtectedRoute roles={['agent', 'admin']}>
                <AgentDashboard activeTab="orders" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/agent/stores"
            element={
              <ProtectedRoute roles={['agent', 'admin']}>
                <AgentDashboard activeTab="stores" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={['admin']}>
                <AdminDashboard activeTab="overview" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/products"
            element={
              <ProtectedRoute roles={['admin']}>
                <AdminDashboard activeTab="products" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/stores"
            element={
              <ProtectedRoute roles={['admin']}>
                <AdminDashboard activeTab="stores" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/agents"
            element={
              <ProtectedRoute roles={['admin']}>
                <AdminDashboard activeTab="agents" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/map"
            element={
              <ProtectedRoute roles={['agent', 'admin']}>
                <MapPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/stats"
            element={
              <ProtectedRoute roles={['agent', 'admin']}>
                <StatsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute roles={['agent', 'admin']}>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      {user ? <BottomNav items={navItems} /> : null}
      <ToastContainer />
      <LoginModal
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        initialRole={requestedRole}
        onLoggedIn={handleLoggedIn}
      />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <MainApp />
      </BrowserRouter>
    </AppProvider>
  );
}

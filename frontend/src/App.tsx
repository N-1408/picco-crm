import React, { type ReactNode } from 'react';
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate
} from 'react-router-dom';
import { AppProvider, useAppContext } from './context/AppContext';
import useTelegram from './hooks/useTelegram.js';
import LandingPage from './pages/LandingPage';
import AgentDashboard from './pages/AgentDashboard.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import MapPage from './pages/MapPage.jsx';
import StatsPage from './pages/StatsPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import AdminLoginPage from './pages/AdminLogin';
import AppShell from './components/layout/AppShell';
import FloatingActionButton from './components/layout/FloatingActionButton';
import ToastContainer from './components/Toast.jsx';

interface RouteGuardProps {
  children: ReactNode;
}

function AgentGuard({ children }: RouteGuardProps) {
  const { user, loading } = useAppContext();

  if (loading) {
    return (
      <main className="page">
        <div className="hero-loader">
          <div className="loader-dot" aria-hidden="true" />
          <span>Ma&apos;lumotlar yuklanmoqda...</span>
        </div>
      </main>
    );
  }

  if (!user) {
    return <Navigate to="/?needsRegistration=1" replace />;
  }

  return <>{children}</>;
}

function AdminGuard({ children }: RouteGuardProps) {
  const { adminToken, adminLoading } = useAppContext();
  const location = useLocation();

  if (adminLoading) {
    return (
      <main className="page">
        <div className="hero-loader">
          <div className="loader-dot" aria-hidden="true" />
          <span>Admin paneliga kirish tekshirilmoqda...</span>
        </div>
      </main>
    );
  }

  if (!adminToken) {
    return <AdminLoginPage redirectTo={location.pathname} />;
  }

  return <>{children}</>;
}

function MainApp() {
  useTelegram();
  const { user } = useAppContext();
  const location = useLocation();
  const navigate = useNavigate();

  const showBack = location.pathname !== '/';

  const title = React.useMemo(() => {
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
  }, [location.pathname]);

  const navItems = React.useMemo(() => {
    if (!user) return [];
    return [
      { id: 'agent-home', label: 'Bosh sahifa', icon: 'home', path: '/agent' },
      { id: 'agent-orders', label: 'Buyurtmalar', icon: 'assignment', path: '/agent/orders' },
      { id: 'agent-stats', label: 'Statistika', icon: 'insights', path: '/stats' },
      { id: 'agent-profile', label: 'Profil', icon: 'person', path: '/profile' }
    ];
  }, [user]);

  const hideTopBar = location.pathname === '/';

  const floatingAction =
    user && location.pathname.startsWith('/agent')
      ? (
          <FloatingActionButton
            icon={location.pathname.includes('stores') ? 'store' : 'add'}
            label={location.pathname.includes('stores') ? 'Do‘kon qo‘shish' : 'Buyurtma qo‘shish'}
            onClick={() => {
              const eventName = location.pathname.includes('stores')
                ? 'picco:add-store'
                : 'picco:add-order';
              window.dispatchEvent(new CustomEvent(eventName));
              window.Telegram?.WebApp?.HapticFeedback?.impactOccurred?.('medium');
            }}
          />
        )
      : null;

  return (
    <AppShell
      title={title}
      subtitle=""
      showTopBar={!hideTopBar}
      showBack={showBack}
      onBack={() => navigate(-1)}
      navigation={user ? navItems : undefined}
      floatingAction={floatingAction}
    >
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route
          path="/agent"
          element={
            <AgentGuard>
              <AgentDashboard activeTab="overview" />
            </AgentGuard>
          }
        />
        <Route
          path="/agent/orders"
          element={
            <AgentGuard>
              <AgentDashboard activeTab="orders" />
            </AgentGuard>
          }
        />
        <Route
          path="/agent/stores"
          element={
            <AgentGuard>
              <AgentDashboard activeTab="stores" />
            </AgentGuard>
          }
        />
        <Route path="/admin/login" element={<AdminLoginPage redirectTo="/admin" />} />
        <Route
          path="/admin"
          element={
            <AdminGuard>
              <AdminDashboard activeTab="overview" />
            </AdminGuard>
          }
        />
        <Route
          path="/admin/products"
          element={
            <AdminGuard>
              <AdminDashboard activeTab="products" />
            </AdminGuard>
          }
        />
        <Route
          path="/admin/stores"
          element={
            <AdminGuard>
              <AdminDashboard activeTab="stores" />
            </AdminGuard>
          }
        />
        <Route
          path="/admin/agents"
          element={
            <AdminGuard>
              <AdminDashboard activeTab="agents" />
            </AdminGuard>
          }
        />
        <Route
          path="/map"
          element={
            <AgentGuard>
              <MapPage />
            </AgentGuard>
          }
        />
        <Route
          path="/stats"
          element={
            <AgentGuard>
              <StatsPage />
            </AgentGuard>
          }
        />
        <Route
          path="/profile"
          element={
            <AgentGuard>
              <ProfilePage />
            </AgentGuard>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ToastContainer />
    </AppShell>
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

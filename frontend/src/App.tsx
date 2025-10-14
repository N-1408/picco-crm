import React, { type ReactNode } from 'react';
import {
  HashRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate
} from 'react-router-dom';
import { AppProvider, useAppContext } from './context/AppContext.tsx';
import useTelegram from './hooks/useTelegram.js';
import LandingPage from './pages/LandingPage';
import AgentDashboard from './pages/AgentDashboard.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import MapPage from './pages/MapPage.jsx';
import StatsPage from './pages/StatsPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import AdminLoginPage from './pages/AdminLogin';
import BottomNav from './components/BottomNav.jsx';
import Header from './components/Header.jsx';
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

  const hideHeader = location.pathname === '/';

  return (
    <div className="app-root">
      {!hideHeader && (
        <Header
          title={title}
          subtitle=""
          showBack={showBack}
          onBack={() => navigate(-1)}
          rightSlot={null}
        />
      )}
      <div className="app-content">
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
      </div>
      {user ? <BottomNav items={navItems} /> : null}
      <ToastContainer />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <HashRouter>
        <MainApp />
      </HashRouter>
    </AppProvider>
  );
}

import { BrowserRouter as Router, Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Command,
  Sparkles,
  BookOpen,
  Clock,
  Settings,
  BrainCircuit,
  Link2,
  LogOut,
} from 'lucide-react';
import Dashboard from './components/Dashboard';
import CommandBar from './components/CommandBar';
import PRDGenerator from './components/PRDGenerator';
import DecisionMemory from './components/DecisionMemory';
import DailyDigest from './components/DailyDigest';
import EvidenceOpportunities from './components/EvidenceOpportunities';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import SettingsPage from './pages/SettingsPage';
import AuthCallbackPage from './pages/AuthCallbackPage';
import WelcomeSetupPage from './pages/WelcomeSetupPage';
import { FeedbackWidget } from './components/FeedbackWidget';
import { AppProvider, useApp } from './context/AppContext';
import './index.css';
import './App.css';

const Sidebar = () => {
  const location = useLocation();
  const { session } = useApp();

  const navItems = [
    { path: '/workspace', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/workspace/command', icon: Command, label: 'Jarvis Command Bar' },
    { path: '/workspace/prds', icon: BookOpen, label: 'PRD Documents' },
    { path: '/workspace/decisions', icon: BrainCircuit, label: 'Decision Memory' },
    { path: '/workspace/digest', icon: Clock, label: 'Daily Digest' },
    { path: '/workspace/opportunities', icon: BrainCircuit, label: 'Opportunities' },
  ];

  const user = session?.user;

  return (
    <aside className="sidebar glass-panel">
      <div className="sidebar-header">
        <Sparkles className="logo-icon" size={24} />
        <h2>ProductJarvis</h2>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <NavLink key={item.path} to={item.path} className={`nav-item ${isActive ? 'active' : ''}`}>
              <item.icon size={20} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <NavLink to="/workspace/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Settings size={20} />
          <span>Settings</span>
        </NavLink>
        <div className="user-profile">
          <div className="avatar">{user?.name?.slice(0, 2).toUpperCase() || 'PM'}</div>
          <div className="user-info">
            <span className="user-name">{user?.name || 'User'}</span>
            <span className="user-role">{user?.role || 'Product Manager'}</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

const IntegrationPills = () => {
  const { session, api, refreshSession } = useApp();
  const integrations = session?.integrations || {};

  const handleConnect = async (provider) => {
    await api.connectIntegration(provider, session?.workspace?.id || 'ws_1');
    await refreshSession();
  };

  return (
    <div className="integration-pills">
      {Object.entries(integrations).map(([provider, cfg]) => (
        <button
          key={provider}
          className={`integration-pill ${cfg.connected ? 'connected' : 'disconnected'}`}
          onClick={() => {
            if (!cfg.connected) {
              handleConnect(provider);
            }
          }}
          title={cfg.connected ? `${provider} connected` : `Connect ${provider}`}
        >
          <Link2 size={12} /> {provider.toUpperCase()} {cfg.connected ? 'Connected' : 'Connect'}
        </button>
      ))}
    </div>
  );
};

const WorkspaceShell = () => {
  const { session, logout } = useApp();
  const usage = session?.usage;
  const usageLabel = `${usage?.prd_generated_this_month || 0}/${usage?.prd_limit_monthly || 3} PRDs this month`;
  const connectedIntegrations = Object.values(session?.integrations || {}).filter((entry) => entry.connected).length;

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <header className="topbar glass-panel">
          <div className="breadcrumb">
            Space / <strong>{session?.workspace?.name || 'Workspace'}</strong>
          </div>
          <div className="topbar-actions">
            <IntegrationPills />
            <span className="usage-badge">{usageLabel}</span>
            <button className="integration-pill disconnected" onClick={logout} title="Log out">
              <LogOut size={12} /> Logout
            </button>
          </div>
        </header>
        {connectedIntegrations === 0 ? (
          <div className="data-warning glass-panel">
            Data confidence is reduced because no integrations are connected yet. Connect Jira, Linear, or Notion for stronger outputs.
          </div>
        ) : null}
        <div className="route-wrapper">
          <Routes>
            <Route index element={<Dashboard />} />
            <Route path="command" element={<CommandBar />} />
            <Route path="prds" element={<PRDGenerator />} />
            <Route path="decisions" element={<DecisionMemory />} />
            <Route path="digest" element={<DailyDigest />} />
            <Route path="opportunities" element={<EvidenceOpportunities />} />
            <Route path="settings" element={<SettingsPage />} />
          </Routes>
        </div>
      </main>
      <FeedbackWidget />
    </div>
  );
};

const AppRoutes = () => {
  const { session, loading, error } = useApp();

  if (loading && !session) {
    return <div className="loading-screen">Loading ProductJarvis...</div>;
  }

  if (error && !session) {
    return <div className="loading-screen">{error}</div>;
  }

  const authenticated = Boolean(session?.auth?.authenticated);
  const onboardingComplete = Boolean(session?.workspace?.onboarding_complete);

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route
        path="/auth"
        element={authenticated ? <Navigate to={onboardingComplete ? '/workspace' : '/welcome'} replace /> : <AuthPage />}
      />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route
        path="/welcome"
        element={
          !authenticated ? (
            <Navigate to="/auth" replace />
          ) : onboardingComplete ? (
            <Navigate to="/workspace" replace />
          ) : (
            <WelcomeSetupPage />
          )
        }
      />
      <Route
        path="/workspace/*"
        element={
          !authenticated ? (
            <Navigate to="/auth" replace />
          ) : !onboardingComplete ? (
            <Navigate to="/welcome" replace />
          ) : (
            <WorkspaceShell />
          )
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <AppProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AppProvider>
  );
}

export default App;

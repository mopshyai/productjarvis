import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
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
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import AuthCallbackPage from './pages/AuthCallbackPage';
import { AppProvider, useApp } from './context/AppContext';
import {
  getCurrentSurface,
  getDomainHref,
  getSurfacePath,
  isLocalHost,
  isSameSurfaceNavigation,
  navigateToSurface,
  SURFACES,
} from './lib/domainRoutes';
import './index.css';
import './App.css';

// Lazy-loaded — only fetched after authentication
const Dashboard = lazy(() => import('./components/Dashboard'));
const CommandBar = lazy(() => import('./components/CommandBar'));
const PRDGenerator = lazy(() => import('./components/PRDGenerator'));
const DecisionMemory = lazy(() => import('./components/DecisionMemory'));
const DailyDigest = lazy(() => import('./components/DailyDigest'));
const EvidenceOpportunities = lazy(() => import('./components/EvidenceOpportunities'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const WelcomeSetupPage = lazy(() => import('./pages/WelcomeSetupPage'));
const FeedbackWidget = lazy(() => import('./components/FeedbackWidget').then((m) => ({ default: m.FeedbackWidget })));
const IntegrationsCallbackPage = lazy(() => import('./pages/IntegrationsCallbackPage'));

// Lazy-loaded content pages
const DocsPage = lazy(() => import('./pages/DocsPage'));
const APIDocsPage = lazy(() => import('./pages/APIDocsPage'));
const BlogPage = lazy(() => import('./pages/BlogPage'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));
const TermsPage = lazy(() => import('./pages/TermsPage'));
const SecurityPage = lazy(() => import('./pages/SecurityPage'));
const ChangelogPage = lazy(() => import('./pages/ChangelogPage'));
const PricingPage = lazy(() => import('./pages/PricingPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const StatusPage = lazy(() => import('./pages/StatusPage'));
const ApiStatusPage = lazy(() => import('./pages/ApiStatusPage'));

function PageLoader() {
  return <div className="loading-screen">Loading...</div>;
}

const SurfaceRedirect = ({ surface, path = '/', replace = true }) => {
  const navigate = useNavigate();

  useEffect(() => {
    navigateToSurface(navigate, surface, path, { replace });
  }, [navigate, path, replace, surface]);

  return <PageLoader />;
};

const CanonicalSurfaceRedirect = ({ surface }) => {
  const location = useLocation();

  return <SurfaceRedirect surface={surface} path={`${location.pathname}${location.search}${location.hash}`} replace />;
};

const Sidebar = () => {
  const location = useLocation();
  const { session } = useApp();

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/command', icon: Command, label: 'Jarvis Command Bar' },
    { path: '/prds', icon: BookOpen, label: 'PRD Documents' },
    { path: '/decisions', icon: BrainCircuit, label: 'Decision Memory' },
    { path: '/digest', icon: Clock, label: 'Daily Digest' },
    { path: '/opportunities', icon: BrainCircuit, label: 'Opportunities' },
  ];

  const user = session?.user;
  const renderNavItem = ({ path, icon: Icon, label, surface = SURFACES.APP }) => {
    const IconComponent = Icon;
    const href = getDomainHref(surface, path);
    const isActive = isSameSurfaceNavigation(surface) && location.pathname === getSurfacePath(surface, path);
    const className = `sidebar-nav-item ${isActive ? 'active' : ''}`;

    if (isSameSurfaceNavigation(surface)) {
      return (
        <Link key={`${surface}:${path}`} to={href} className={className}>
          <IconComponent size={20} />
          <span>{label}</span>
        </Link>
      );
    }

    return (
      <a key={`${surface}:${path}`} href={href} className={className}>
        <IconComponent size={20} />
        <span>{label}</span>
      </a>
    );
  };

  const settingsHref = getDomainHref(SURFACES.ADMIN, '/');
  const settingsActive = isSameSurfaceNavigation(SURFACES.ADMIN) && location.pathname === getSurfacePath(SURFACES.ADMIN, '/');

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <Sparkles size={20} />
        </div>
        <span className="sidebar-logo-text">ProductJarvis</span>
      </div>

      <nav className="sidebar-nav">
        {navItems.map(renderNavItem)}
      </nav>

      <div className="sidebar-footer">
        {isSameSurfaceNavigation(SURFACES.ADMIN) ? (
          <Link to={settingsHref} className={`sidebar-nav-item ${settingsActive ? 'active' : ''}`}>
            <Settings size={20} />
            <span>Settings</span>
          </Link>
        ) : (
          <a href={settingsHref} className="sidebar-nav-item">
            <Settings size={20} />
            <span>Settings</span>
          </a>
        )}
        <div className="sidebar-user">
          <div className="sidebar-avatar">{user?.name?.slice(0, 2).toUpperCase() || 'PM'}</div>
          <div className="sidebar-user-info">
            <span className="sidebar-user-name">{user?.name || 'User'}</span>
            <span className="sidebar-user-plan">{user?.role || 'Product Manager'}</span>
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

const WorkspaceShell = ({ settingsOnly = false }) => {
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
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {settingsOnly ? (
                <>
                  <Route index element={<SettingsPage />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </>
              ) : (
                <>
                  <Route index element={<Dashboard />} />
                  <Route path="command" element={<CommandBar />} />
                  <Route path="prds" element={<PRDGenerator />} />
                  <Route path="decisions" element={<DecisionMemory />} />
                  <Route path="digest" element={<DailyDigest />} />
                  <Route path="opportunities" element={<EvidenceOpportunities />} />
                  <Route path="settings" element={<SettingsPage />} />
                </>
              )}
            </Routes>
          </Suspense>
        </div>
      </main>
      <Suspense fallback={null}>
        <FeedbackWidget />
      </Suspense>
    </div>
  );
};

const AppRoutes = () => {
  const { loading, error, isAuthenticated, workspaceAccess, workspaceAccessLoading } = useApp();

  if (loading) {
    return <div className="loading-screen">Loading ProductJarvis...</div>;
  }

  if (error) {
    return <div className="loading-screen">{error}</div>;
  }

  const authenticated = isAuthenticated;
  const hasWorkspace = workspaceAccess.hasWorkspace;
  const onboardingComplete = workspaceAccess.onboardingComplete;
  const currentSurface = getCurrentSurface();
  const localDev = isLocalHost();

  if (authenticated && workspaceAccessLoading && !workspaceAccess.checked) {
    return <div className="loading-screen">Checking workspace access...</div>;
  }

  const marketingRoutes = (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/pricing" element={<Suspense fallback={<PageLoader />}><PricingPage /></Suspense>} />
      <Route path="/about" element={<Suspense fallback={<PageLoader />}><AboutPage /></Suspense>} />
      <Route path="/contact" element={<Suspense fallback={<PageLoader />}><ContactPage /></Suspense>} />
      <Route path="/status" element={<Suspense fallback={<PageLoader />}><StatusPage /></Suspense>} />
      <Route path="/privacy" element={<Suspense fallback={<PageLoader />}><PrivacyPage /></Suspense>} />
      <Route path="/terms" element={<Suspense fallback={<PageLoader />}><TermsPage /></Suspense>} />
      <Route path="/security" element={<Suspense fallback={<PageLoader />}><SecurityPage /></Suspense>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );

  if (localDev) {
    return (
      <Routes>
        {/* Public pages */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/pricing" element={<Suspense fallback={<PageLoader />}><PricingPage /></Suspense>} />
        <Route path="/about" element={<Suspense fallback={<PageLoader />}><AboutPage /></Suspense>} />
        <Route path="/contact" element={<Suspense fallback={<PageLoader />}><ContactPage /></Suspense>} />
        <Route path="/status" element={<Suspense fallback={<PageLoader />}><StatusPage /></Suspense>} />

        {/* Legal pages */}
        <Route path="/privacy" element={<Suspense fallback={<PageLoader />}><PrivacyPage /></Suspense>} />
        <Route path="/terms" element={<Suspense fallback={<PageLoader />}><TermsPage /></Suspense>} />
        <Route path="/security" element={<Suspense fallback={<PageLoader />}><SecurityPage /></Suspense>} />

        {/* Documentation */}
        <Route path="/docs" element={<Suspense fallback={<PageLoader />}><DocsPage /></Suspense>} />
        <Route path="/docs/:section" element={<Suspense fallback={<PageLoader />}><DocsPage /></Suspense>} />
        <Route path="/docs/:section/:page" element={<Suspense fallback={<PageLoader />}><DocsPage /></Suspense>} />
        <Route path="/api-docs" element={<Suspense fallback={<PageLoader />}><APIDocsPage /></Suspense>} />
        <Route path="/api-docs/:section" element={<Suspense fallback={<PageLoader />}><APIDocsPage /></Suspense>} />
        <Route path="/changelog" element={<Suspense fallback={<PageLoader />}><ChangelogPage /></Suspense>} />

        {/* Blog */}
        <Route path="/blog" element={<Suspense fallback={<PageLoader />}><BlogPage /></Suspense>} />
        <Route path="/blog/:slug" element={<Suspense fallback={<PageLoader />}><BlogPage /></Suspense>} />

        {/* Auth */}
        <Route
          path="/auth"
          element={authenticated && hasWorkspace ? <Navigate to={onboardingComplete ? '/workspace' : '/welcome'} replace /> : <AuthPage />}
        />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/integrations/callback" element={<Suspense fallback={<PageLoader />}><IntegrationsCallbackPage /></Suspense>} />

        {/* Onboarding */}
        <Route
          path="/welcome"
          element={
            !authenticated ? (
              <Navigate to="/auth" replace />
            ) : !hasWorkspace ? (
              <Navigate to="/auth" replace />
            ) : onboardingComplete ? (
              <Navigate to="/workspace" replace />
            ) : (
              <Suspense fallback={<PageLoader />}>
                <WelcomeSetupPage />
              </Suspense>
            )
          }
        />

        {/* Workspace */}
        <Route
          path="/workspace/*"
          element={
            !authenticated ? (
              <Navigate to="/auth" replace />
            ) : !hasWorkspace ? (
              <Navigate to="/auth" replace />
            ) : !onboardingComplete ? (
              <Navigate to="/welcome" replace />
            ) : (
              <WorkspaceShell />
            )
          }
        />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  if (currentSurface === SURFACES.APP) {
    return (
      <Routes>
        <Route
          path="/welcome"
          element={
            !authenticated ? (
              <SurfaceRedirect surface={SURFACES.AUTH} path="/" replace />
            ) : !hasWorkspace ? (
              <SurfaceRedirect surface={SURFACES.AUTH} path="/" replace />
            ) : onboardingComplete ? (
              <SurfaceRedirect surface={SURFACES.APP} path="/" replace />
            ) : (
              <Suspense fallback={<PageLoader />}>
                <WelcomeSetupPage />
              </Suspense>
            )
          }
        />
        <Route path="/workspace/*" element={<CanonicalSurfaceRedirect surface={SURFACES.APP} />} />
        <Route path="/settings" element={<SurfaceRedirect surface={SURFACES.ADMIN} path="/" replace />} />
        <Route
          path="/*"
          element={
            !authenticated ? (
              <SurfaceRedirect surface={SURFACES.AUTH} path="/" replace />
            ) : !hasWorkspace ? (
              <SurfaceRedirect surface={SURFACES.AUTH} path="/" replace />
            ) : !onboardingComplete ? (
              <SurfaceRedirect surface={SURFACES.APP} path="/welcome" replace />
            ) : (
              <WorkspaceShell />
            )
          }
        />
      </Routes>
    );
  }

  if (currentSurface === SURFACES.AUTH) {
    return (
      <Routes>
        <Route
          path="/"
          element={
            authenticated && hasWorkspace ? (
              <SurfaceRedirect surface={SURFACES.APP} path={onboardingComplete ? '/' : '/welcome'} replace />
            ) : (
              <AuthPage />
            )
          }
        />
        <Route path="/callback" element={<AuthCallbackPage />} />
        <Route path="/integrations/callback" element={<Suspense fallback={<PageLoader />}><IntegrationsCallbackPage /></Suspense>} />
        <Route path="/auth/*" element={<CanonicalSurfaceRedirect surface={SURFACES.AUTH} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  if (currentSurface === SURFACES.ADMIN) {
    return (
      <Routes>
        <Route path="/workspace/settings" element={<CanonicalSurfaceRedirect surface={SURFACES.ADMIN} />} />
        <Route
          path="/*"
          element={
            !authenticated ? (
              <SurfaceRedirect surface={SURFACES.AUTH} path="/" replace />
            ) : !hasWorkspace ? (
              <SurfaceRedirect surface={SURFACES.AUTH} path="/" replace />
            ) : !onboardingComplete ? (
              <SurfaceRedirect surface={SURFACES.APP} path="/welcome" replace />
            ) : (
              <WorkspaceShell settingsOnly />
            )
          }
        />
      </Routes>
    );
  }

  if (currentSurface === SURFACES.DOCS) {
    return (
      <Routes>
        <Route path="/" element={<Suspense fallback={<PageLoader />}><DocsPage /></Suspense>} />
        <Route path="/api-docs" element={<Suspense fallback={<PageLoader />}><APIDocsPage /></Suspense>} />
        <Route path="/api-docs/:section" element={<Suspense fallback={<PageLoader />}><APIDocsPage /></Suspense>} />
        <Route path="/changelog" element={<Suspense fallback={<PageLoader />}><ChangelogPage /></Suspense>} />
        <Route path="/docs/*" element={<CanonicalSurfaceRedirect surface={SURFACES.DOCS} />} />
        <Route path="/:section" element={<Suspense fallback={<PageLoader />}><DocsPage /></Suspense>} />
        <Route path="/:section/:page" element={<Suspense fallback={<PageLoader />}><DocsPage /></Suspense>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  if (currentSurface === SURFACES.BLOG) {
    return (
      <Routes>
        <Route path="/" element={<Suspense fallback={<PageLoader />}><BlogPage /></Suspense>} />
        <Route path="/blog/*" element={<CanonicalSurfaceRedirect surface={SURFACES.BLOG} />} />
        <Route path="/:slug" element={<Suspense fallback={<PageLoader />}><BlogPage /></Suspense>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  if (currentSurface === SURFACES.API) {
    return (
      <Routes>
        <Route
          path="*"
          element={
            <Suspense fallback={<PageLoader />}>
              <ApiStatusPage />
            </Suspense>
          }
        />
      </Routes>
    );
  }

  return marketingRoutes;
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

import React, { createContext, useContext, useEffect, useState } from 'react';
import api from '../lib/apiClient';
import { getApiBaseUrl, getDomainHref, SURFACES } from '../lib/domainRoutes';
import { supabase } from '../lib/supabaseClient';
import { setSentryUser, setSentryWorkspace } from '../lib/sentry';
import { identifyUser, setWorkspace, resetUser } from '../lib/posthog';

const AppContext = createContext(null);

function getWorkspaceAccessFromSession(session) {
  return {
    hasWorkspace: Boolean(session?.workspace),
    onboardingComplete: Boolean(session?.workspace?.onboarding_complete),
  };
}

export const AppProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  // Real Supabase auth state (separate from mock session)
  const [supaSession, setSupaSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [workspaceAccess, setWorkspaceAccess] = useState({
    checked: false,
    ...getWorkspaceAccessFromSession(null),
  });
  const [workspaceAccessLoading, setWorkspaceAccessLoading] = useState(false);

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('🔍 AppContext Debug:', {
        supabaseConfigured: !!supabase,
        supabaseUrl: import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_PRODUCTJARVIS_SUPABASE_URL || 'NOT SET',
        apiBaseUrl: getApiBaseUrl() || getDomainHref(SURFACES.API, '/'),
      });
      if (!supabase) {
        console.warn('Supabase not configured');
      }
    }
  }, []);

  // ── Session data (workspace, integrations) ──────────────────────────────────
  const refreshSession = async () => {
    if (!supaSession?.user?.id) {
      setSession(null);
      setLoading(false);
      return;
    }

    try {
      setError('');
      const data = await api.getSession();
      setSession(data);
    } catch (err) {
      console.warn('Session fetch failed (non-fatal):', err.message);
      setSession(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    // Session is fetched when supaSession changes (see below)
  }, []);

  // ── Supabase real auth ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSupaSession(s);
      if (!s) {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSupaSession(s);
    });

    return () => subscription.unsubscribe();
  }, []);

  // ── Refresh product session when Supabase auth changes ───────────────────────
  useEffect(() => {
    refreshSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supaSession?.user?.id]);

  // ── Analytics sync ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (session?.user) {
      setSentryUser(session.user);
      setSentryWorkspace(session.workspace);
      identifyUser(session.user);
      setWorkspace(session.workspace);
    }
  }, [session]);

  // ── Auth methods ──────────────────────────────────────────────────────────────
  const signInWithGoogle = async () => {
    if (!supabase) throw new Error('Supabase is not configured');

    const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: getDomainHref(SURFACES.AUTH, '/callback'),
        queryParams: {
          access_type: 'offline',
          prompt: 'select_account',
        },
      },
    });

    if (oauthError) throw oauthError;
    return data;
  };

  const sendMagicLink = async (payload) => {
    return api.sendMagicLink(payload);
  };

  const authCallback = async (payload) => {
    setLoading(true);
    try {
      const updated = await api.authCallback(payload);
      setSession(updated);
      return updated;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setSentryUser(null);
    resetUser();
    setLoading(true);
    try {
      if (supabase) await supabase.auth.signOut();
      const updated = await api.logout();
      setSession(updated);
      setSupaSession(null);
      setWorkspaceAccess({
        checked: true,
        ...getWorkspaceAccessFromSession(updated),
      });
    } finally {
      setLoading(false);
    }
  };

  const checkOnboardingStatus = async (userId) => {
    if (!supabase) return { hasWorkspace: false, onboardingComplete: false };

    const { data, error: dbError } = await supabase
      .from('workspace_members')
      .select('workspace_id, workspaces(onboarding_complete)')
      .eq('user_id', userId)
      .maybeSingle();

    if (dbError || !data) {
      return { hasWorkspace: false, onboardingComplete: false };
    }

    return {
      hasWorkspace: true,
      onboardingComplete: data.workspaces?.onboarding_complete ?? false,
    };
  };

  const refreshWorkspaceAccess = async (userId = supaSession?.user?.id) => {
    if (!supabase || !userId) {
      const status = getWorkspaceAccessFromSession(session);
      setWorkspaceAccess({ checked: true, ...status });
      return status;
    }

    setWorkspaceAccessLoading(true);
    try {
      const status = await checkOnboardingStatus(userId);
      setWorkspaceAccess({ checked: true, ...status });
      return status;
    } finally {
      setWorkspaceAccessLoading(false);
    }
  };

  useEffect(() => {
    if (!supaSession?.user?.id) {
      setWorkspaceAccess({
        checked: true,
        ...getWorkspaceAccessFromSession(session),
      });
      return;
    }

    refreshWorkspaceAccess(supaSession.user.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    session?.workspace?.id,
    session?.workspace?.onboarding_complete,
    supaSession?.user?.id,
  ]);

  // ── Onboarding ────────────────────────────────────────────────────────────────
  const completeOnboarding = async (payload) => {
    setLoading(true);
    try {
      const updated = await api.completeOnboarding(payload);
      setSession(updated);
      setWorkspaceAccess({
        checked: true,
        ...getWorkspaceAccessFromSession(updated),
      });
    } finally {
      setLoading(false);
    }
  };

  const getOnboardingSchema = async () => api.getOnboardingSchema();
  const saveOnboardingAnswer = async (payload) => api.saveOnboardingAnswer(payload);

  const completeAdaptiveOnboarding = async (payload) => {
    setLoading(true);
    try {
      const updated = await api.completeAdaptiveOnboarding(payload);
      setSession(updated);
      setWorkspaceAccess({
        checked: true,
        ...getWorkspaceAccessFromSession(updated),
      });
      return updated;
    } finally {
      setLoading(false);
    }
  };

  const recommendMethodologies = async (payload) => api.recommendMethodologies(payload);

  // ── Context value ─────────────────────────────────────────────────────────────
  const value = {
    session,
    supaSession,
    loading,
    error,
    isAuthenticated: Boolean(supaSession) || Boolean(session?.auth?.authenticated),
    workspaceAccess,
    workspaceAccessLoading,
    refreshSession,
    refreshWorkspaceAccess,
    completeOnboarding,
    signInWithGoogle,
    sendMagicLink,
    authCallback,
    logout,
    checkOnboardingStatus,
    getOnboardingSchema,
    saveOnboardingAnswer,
    completeAdaptiveOnboarding,
    recommendMethodologies,
    api,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp must be used within AppProvider');
  }
  return ctx;
};

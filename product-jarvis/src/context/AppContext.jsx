import React, { createContext, useContext, useEffect, useState } from 'react';
import api from '../lib/apiClient';
import { supabase } from '../lib/supabaseClient';
import { setSentryUser, setSentryWorkspace } from '../lib/sentry';
import { identifyUser, setWorkspace, resetUser } from '../lib/posthog';

const AppContext = createContext(null);

export const AppProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  // Real Supabase auth state (separate from mock session)
  const [supaSession, setSupaSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ── Mock API session (product data) ──────────────────────────────────────────
  const refreshSession = async () => {
    try {
      setError('');
      const data = await api.getSession();
      setSession(data);
    } catch (err) {
      // /api/session may not exist yet (404) or network may be unavailable.
      // Treat this as "no session" rather than a fatal error — Supabase auth
      // is the source of truth for authentication.
      console.warn('Session fetch failed (non-fatal):', err.message);
      setSession(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshSession();
  }, []);

  // ── Supabase real auth ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!supabase) return;

    // Get initial Supabase session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSupaSession(s);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSupaSession(s);
    });

    return () => subscription.unsubscribe();
  }, []);

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
    if (!supabase) {
      // Mock fallback
      setLoading(true);
      try {
        const updated = await api.signInWithGoogle();
        setSession(updated);
        return updated;
      } finally {
        setLoading(false);
      }
    }

    const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
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
    } finally {
      setLoading(false);
    }
  };

  const checkOnboardingStatus = async (userId) => {
    if (!supabase) {
      return {
        hasWorkspace: Boolean(session?.workspace),
        onboardingComplete: Boolean(session?.workspace?.onboarding_complete),
      };
    }

    const { data, error: dbError } = await supabase
      .from('workspace_members')
      .select('workspace_id, workspaces(onboarding_complete)')
      .eq('user_id', userId)
      .single();

    if (dbError || !data) {
      return { hasWorkspace: false, onboardingComplete: false };
    }

    return {
      hasWorkspace: true,
      onboardingComplete: data.workspaces?.onboarding_complete ?? false,
    };
  };

  // ── Onboarding ────────────────────────────────────────────────────────────────
  const completeOnboarding = async (payload) => {
    setLoading(true);
    try {
      const updated = await api.completeOnboarding(payload);
      setSession(updated);
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
    refreshSession,
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

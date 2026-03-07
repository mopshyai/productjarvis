import React, { createContext, useContext, useEffect, useState } from 'react';
import api from '../lib/apiClient';

const AppContext = createContext(null);

export const AppProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refreshSession = async () => {
    try {
      setError('');
      const data = await api.getSession();
      setSession(data);
    } catch (err) {
      setError(err.message || 'Failed to load session');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshSession();
  }, []);

  const completeOnboarding = async (payload) => {
    setLoading(true);
    try {
      const updated = await api.completeOnboarding(payload);
      setSession(updated);
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      const updated = await api.signInWithGoogle();
      setSession(updated);
      return updated;
    } finally {
      setLoading(false);
    }
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
    setLoading(true);
    try {
      const updated = await api.logout();
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

  const value = {
    session,
    loading,
    error,
    refreshSession,
    completeOnboarding,
    signInWithGoogle,
    sendMagicLink,
    authCallback,
    logout,
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

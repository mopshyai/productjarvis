import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useApp } from '../context/AppContext';
import { navigateToSurface, SURFACES } from '../lib/domainRoutes';
import './AuthCallbackPage.css';

const AuthCallbackPage = () => {
  const navigate = useNavigate();
  const { authCallback, refreshWorkspaceAccess } = useApp();
  const [callbackError, setCallbackError] = useState(null);

  useEffect(() => {
    const handle = async () => {
      try {
        if (supabase) {
          // Real Supabase OAuth callback
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();

          if (sessionError) throw sessionError;

          if (!session) {
            navigateToSurface(navigate, SURFACES.AUTH, '/', { replace: true });
            return;
          }

          const userId = session.user.id;

          // Create user record if new (ignore duplicate errors)
          const { error: upsertError } = await supabase
            .from('users')
            .upsert({
              id: userId,
              email: session.user.email,
              full_name:
                session.user.user_metadata?.full_name ||
                session.user.user_metadata?.name ||
                null,
              avatar_url: session.user.user_metadata?.avatar_url || null,
            }, { onConflict: 'id', ignoreDuplicates: false });

          if (upsertError) console.warn('[AuthCallback] upsert user:', upsertError.message);

          // Route based on onboarding status
          const status = await refreshWorkspaceAccess(userId);
          if (status.hasWorkspace) {
            navigateToSurface(navigate, SURFACES.APP, status.onboardingComplete ? '/' : '/welcome', { replace: true });
            return;
          }

          navigateToSurface(navigate, SURFACES.AUTH, '/', { replace: true });
        } else {
          // Mock fallback — read provider/token from URL params
          const params = new URLSearchParams(window.location.search);
          const provider = params.get('provider') || 'magic_link';
          const token = params.get('token') || '';
          const session = await authCallback({ provider, token });
          if (session?.workspace) {
            navigateToSurface(
              navigate,
              SURFACES.APP,
              session.workspace.onboarding_complete ? '/' : '/welcome',
              { replace: true }
            );
            return;
          }

          navigateToSurface(navigate, SURFACES.AUTH, '/', { replace: true });
        }
      } catch (err) {
        console.error('[AuthCallback] error:', err);
        setCallbackError(err.message || 'Authentication failed');
      }
    };

    handle();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (callbackError) {
    return (
      <div className="auth-callback auth-callback--error">
        <div className="auth-callback__content">
          <div className="auth-callback__icon">⚠️</div>
          <h2>Authentication Failed</h2>
          <p>{callbackError}</p>
          <button onClick={() => navigateToSurface(navigate, SURFACES.AUTH, '/')} className="auth-callback__button">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-callback">
      <div className="auth-callback__content">
        <div className="auth-callback__spinner" />
        <p>Signing you in...</p>
      </div>
    </div>
  );
};

export default AuthCallbackPage;

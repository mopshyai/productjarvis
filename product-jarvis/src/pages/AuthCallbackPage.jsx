import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useApp } from '../context/AppContext';
import './AuthCallbackPage.css';

const AuthCallbackPage = () => {
  const navigate = useNavigate();
  const { checkOnboardingStatus, authCallback } = useApp();
  const [callbackError, setCallbackError] = useState(null);

  useEffect(() => {
    const handle = async () => {
      try {
        if (supabase) {
          // Real Supabase OAuth callback
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();

          if (sessionError) throw sessionError;

          if (!session) {
            navigate('/auth', { replace: true });
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

          // Redeem invite code if stored
          const inviteCode = sessionStorage.getItem('invite_code');
          if (inviteCode) {
            const { error: redeemError } = await supabase.rpc('redeem_invite_code', {
              code: inviteCode,
              user_id: userId,
            });
            if (redeemError) console.warn('[AuthCallback] redeem invite:', redeemError.message);
            sessionStorage.removeItem('invite_code');
          }

          // Route based on onboarding status
          const status = await checkOnboardingStatus(userId);
          navigate(status.onboardingComplete ? '/workspace' : '/welcome', { replace: true });
        } else {
          // Mock fallback — read provider/token from URL params
          const params = new URLSearchParams(window.location.search);
          const provider = params.get('provider') || 'magic_link';
          const token = params.get('token') || '';
          const session = await authCallback({ provider, token });
          navigate(session?.workspace?.onboarding_complete ? '/workspace' : '/welcome', { replace: true });
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
          <button onClick={() => navigate('/auth')} className="auth-callback__button">
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

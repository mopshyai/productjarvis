import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabaseClient';
import './AuthPage.css';

const AuthPage = () => {
  try {
    // eslint-disable-next-line react/jsx-no-useless-fragment
    return AuthPageInner();
  } catch (error) {
    console.error('AuthPage crash:', error);
    return (
      <div style={{ padding: '2rem', color: 'white', background: '#1a1a2e', minHeight: '100vh' }}>
        <h1>Auth Error</h1>
        <p>{error.message}</p>
        <pre style={{ fontSize: '0.75rem', marginTop: '1rem', opacity: 0.7 }}>{error.stack}</pre>
      </div>
    );
  }
};

const AuthPageInner = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signInWithGoogle, isAuthenticated, checkOnboardingStatus, supaSession, loading } = useApp();

  // 'waitlist' | 'invite' | 'login'
  const [mode, setMode] = useState('waitlist');
  const [inviteCode, setInviteCode] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [waitlistEmail, setWaitlistEmail] = useState('');
  const [waitlistSubmitted, setWaitlistSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [authError, setAuthError] = useState('');

  // If already authenticated, redirect
  useEffect(() => {
    if (!isAuthenticated) return;
    const uid = supaSession?.user?.id;
    if (uid) {
      checkOnboardingStatus(uid).then((status) => {
        navigate(status.onboardingComplete ? '/workspace' : '/welcome', { replace: true });
      });
    } else {
      // Mock auth session
      navigate('/workspace', { replace: true });
    }
  }, [isAuthenticated, supaSession, checkOnboardingStatus, navigate]);

  // Check for invite code in URL
  useEffect(() => {
    const codeFromUrl = searchParams.get('code');
    if (codeFromUrl) {
      setInviteCode(codeFromUrl.toUpperCase());
      setMode('invite');
    }
  }, [searchParams]);

  const validateInviteCode = async () => {
    const code = inviteCode.trim().toUpperCase();
    if (!code) {
      setInviteError('Please enter an invite code');
      return;
    }

    setBusy(true);
    setInviteError('');

    try {
      if (supabase) {
        const { data, error: dbError } = await supabase
          .from('invite_codes')
          .select('*')
          .eq('code', code)
          .eq('is_active', true)
          .single();

        console.log('🔍 Invite validation:', { data, dbError, code });

        if (dbError) {
          // Table doesn't exist yet — allow through in dev only
          if (dbError.code === '42P01' || dbError.message?.includes('relation') || dbError.message?.includes('does not exist')) {
            if (import.meta.env.DEV) {
              console.warn('⚠️ DEV MODE: invite_codes table not found, bypassing for testing');
              sessionStorage.setItem('invite_code', code);
              setMode('login');
              return;
            } else {
              // In production, show error - don't bypass
              setInviteError('System temporarily unavailable. Please try again later.');
              return;
            }
          }
          setInviteError('Invalid or expired invite code');
          return;
        }
        if (!data) {
          setInviteError('Invalid or expired invite code');
          return;
        }
        if (data.expires_at && new Date(data.expires_at) < new Date()) {
          setInviteError('This invite code has expired');
          return;
        }
        if (data.max_uses && data.uses >= data.max_uses) {
          setInviteError('This invite code has been fully redeemed');
          return;
        }
      } else {
        // Mock validation
        const MOCK_CODES = ['JARVIS-ALPHA', 'JARVIS-LAUNCH', 'JARVIS-PM2026'];
        if (!MOCK_CODES.includes(code)) {
          setInviteError('Invalid or expired invite code');
          return;
        }
      }

      sessionStorage.setItem('invite_code', code);
      setMode('login');
    } catch (err) {
      console.error('Invite validation error:', err);
      setInviteError('Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setBusy(true);
    setAuthError('');
    try {
      await signInWithGoogle();
      // OAuth redirect handles the rest
    } catch (err) {
      setAuthError('Failed to sign in with Google. Please try again.');
      setBusy(false);
    }
  };

  const submitWaitlist = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (supabase) {
        const { error: dbError } = await supabase
          .from('waitlist')
          .insert({ email: waitlistEmail.toLowerCase(), source: 'auth_page' });

        if (dbError) {
          // Ignore duplicate email (23505) and missing table (42P01 in dev only)
          if (dbError.code === '23505') {
            // already on waitlist — treat as success
          } else if (dbError.code === '42P01' || dbError.message?.includes('relation') || dbError.message?.includes('does not exist')) {
            if (import.meta.env.DEV) {
              console.warn('⚠️ DEV MODE: waitlist table not found, logging locally');
              console.info('[Waitlist]', waitlistEmail);
            } else {
              // In production, fail silently but log error
              console.error('Waitlist table error:', dbError);
              throw new Error('Unable to join waitlist. Please try again later.');
            }
          } else {
            throw dbError;
          }
        }
      } else {
        console.info('[Waitlist]', waitlistEmail);
      }
      setWaitlistSubmitted(true);
    } catch (err) {
      console.error('Waitlist error:', err);
    } finally {
      setBusy(false);
    }
  };

  if (loading && !isAuthenticated) {
    return <div className="loading-screen">Loading...</div>;
  }

  return (
    <div className="auth-page">
      <div className="auth-page__container">
        {/* Logo */}
        <div className="auth-page__logo">
          <div className="auth-page__logo-icon">J</div>
          <span className="auth-page__logo-text">ProductJarvis</span>
        </div>

        {/* Waitlist Mode */}
        {mode === 'waitlist' && !waitlistSubmitted && (
          <div className="auth-page__content">
            <h1>ProductJarvis is in Private Alpha</h1>
            <p className="auth-page__subtitle">Join the waitlist to get early access</p>

            <form onSubmit={submitWaitlist} className="auth-page__form">
              <input
                type="email"
                placeholder="Enter your work email"
                value={waitlistEmail}
                onChange={(e) => setWaitlistEmail(e.target.value)}
                required
                className="auth-page__input"
              />
              <button
                type="submit"
                disabled={busy || !waitlistEmail.trim()}
                className="auth-page__button auth-page__button--primary"
              >
                {busy ? 'Joining...' : 'Join Waitlist'}
              </button>
            </form>

            <div className="auth-page__divider">
              <span>Have an invite code?</span>
            </div>

            <button
              onClick={() => setMode('invite')}
              className="auth-page__button auth-page__button--secondary"
            >
              Enter Invite Code
            </button>
          </div>
        )}

        {/* Waitlist Success */}
        {waitlistSubmitted && (
          <div className="auth-page__content auth-page__content--success">
            <div className="auth-page__success-icon">🎉</div>
            <h2>You're on the list!</h2>
            <p className="auth-page__subtitle">We'll send you an invite code as soon as a spot opens up.</p>
          </div>
        )}

        {/* Invite Code Mode */}
        {mode === 'invite' && (
          <div className="auth-page__content">
            <h1>Enter Invite Code</h1>
            <p className="auth-page__subtitle">Enter your invite code to continue</p>

            <div className="auth-page__form">
              <input
                type="text"
                placeholder="e.g. JARVIS-ALPHA"
                value={inviteCode}
                onChange={(e) => {
                  setInviteCode(e.target.value.toUpperCase());
                  setInviteError('');
                }}
                className={`auth-page__input${inviteError ? ' auth-page__input--error' : ''}`}
                onKeyDown={(e) => e.key === 'Enter' && validateInviteCode()}
              />
              {inviteError && <p className="auth-page__error">{inviteError}</p>}
              <button
                onClick={validateInviteCode}
                disabled={busy || !inviteCode.trim()}
                className="auth-page__button auth-page__button--primary"
              >
                {busy ? 'Verifying...' : 'Verify Code'}
              </button>
            </div>

            <button onClick={() => setMode('waitlist')} className="auth-page__link">
              ← Back to waitlist
            </button>
          </div>
        )}

        {/* Login Mode */}
        {mode === 'login' && (
          <div className="auth-page__content">
            <div className="auth-page__invite-badge">✓ Invite code accepted</div>

            <h1>Welcome to ProductJarvis</h1>
            <p className="auth-page__subtitle">Sign in with Google to get started</p>

            {authError && <div className="auth-page__error-banner">{authError}</div>}

            <button
              onClick={handleGoogleSignIn}
              disabled={busy}
              className="auth-page__button auth-page__button--google"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {busy ? 'Signing in...' : 'Continue with Google'}
            </button>

            <p className="auth-page__trust">🔒 No credit card required</p>
          </div>
        )}

        <div className="auth-page__footer">
          <a href="/privacy">Privacy</a>
          <span>·</span>
          <a href="/terms">Terms</a>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;

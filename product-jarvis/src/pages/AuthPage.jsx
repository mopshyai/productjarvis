import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import DomainLink from '../components/DomainLink';
import { useApp } from '../context/AppContext';
import { navigateToSurface, SURFACES } from '../lib/domainRoutes';
import { supabase } from '../lib/supabaseClient';
import './AuthPage.css';

const MOCK_CODES = ['JARVIS-ALPHA', 'JARVIS-LAUNCH', 'JARVIS-PM2026'];

const AuthPageInner = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    signInWithGoogle,
    isAuthenticated,
    checkOnboardingStatus,
    refreshWorkspaceAccess,
    workspaceAccess,
    supaSession,
    loading,
  } = useApp();

  const [inviteCode, setInviteCode] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [waitlistEmail, setWaitlistEmail] = useState('');
  const [waitlistSubmitted, setWaitlistSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [authError, setAuthError] = useState('');

  const signedInEmail = supaSession?.user?.email || '';
  const needsAccessGate = isAuthenticated && !workspaceAccess.hasWorkspace;

  useEffect(() => {
    if (!isAuthenticated || !workspaceAccess.hasWorkspace) {
      return;
    }

    const userId = supaSession?.user?.id;
    if (userId) {
      checkOnboardingStatus(userId).then((status) => {
        navigateToSurface(navigate, SURFACES.APP, status.onboardingComplete ? '/' : '/welcome', { replace: true });
      });
      return;
    }

    navigateToSurface(
      navigate,
      SURFACES.APP,
      workspaceAccess.onboardingComplete ? '/' : '/welcome',
      { replace: true }
    );
  }, [
    checkOnboardingStatus,
    isAuthenticated,
    navigate,
    supaSession?.user?.id,
    workspaceAccess.hasWorkspace,
    workspaceAccess.onboardingComplete,
  ]);

  useEffect(() => {
    const codeFromUrl = searchParams.get('code');
    if (codeFromUrl) {
      setInviteCode(codeFromUrl.toUpperCase());
    }
  }, [searchParams]);

  useEffect(() => {
    if (signedInEmail) {
      setWaitlistEmail((current) => current || signedInEmail);
    }
  }, [signedInEmail]);

  const handleGoogleSignIn = async () => {
    setBusy(true);
    setAuthError('');
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error('Google sign-in failed:', err);
      setAuthError('Failed to sign in with Google. Please try again.');
      setBusy(false);
    }
  };

  const redeemInviteCode = async () => {
    if (!needsAccessGate) {
      setAuthError('Sign in with Google first to redeem an invite code.');
      return;
    }

    const code = inviteCode.trim().toUpperCase();
    if (!code) {
      setInviteError('Please enter an invite code.');
      return;
    }

    setBusy(true);
    setInviteError('');
    setAuthError('');

    try {
      if (supabase && supaSession?.user?.id) {
        const { data, error: lookupError } = await supabase
          .from('invite_codes')
          .select('*')
          .eq('code', code)
          .eq('is_active', true)
          .maybeSingle();

        if (lookupError) {
          if (
            import.meta.env.DEV &&
            (lookupError.code === '42P01' || lookupError.message?.includes('relation') || lookupError.message?.includes('does not exist'))
          ) {
            console.warn('invite_codes table not found in dev; allowing mock invite flow');
          } else {
            setInviteError('Invalid or expired invite code.');
            return;
          }
        }

        if (data) {
          if (data.expires_at && new Date(data.expires_at) < new Date()) {
            setInviteError('This invite code has expired.');
            return;
          }

          if (data.max_uses && data.uses >= data.max_uses) {
            setInviteError('This invite code has been fully redeemed.');
            return;
          }
        } else if (!import.meta.env.DEV) {
          setInviteError('Invalid or expired invite code.');
          return;
        }

        const { error: redeemError } = await supabase.rpc('redeem_invite_code', {
          code,
          user_id: supaSession.user.id,
        });

        if (redeemError) {
          console.warn('[AuthPage] redeem invite:', redeemError.message);
          setInviteError('We could not activate this invite code yet. Contact support if it should already be valid.');
          return;
        }

        const status = await refreshWorkspaceAccess(supaSession.user.id);
        if (status.hasWorkspace) {
          navigateToSurface(navigate, SURFACES.APP, status.onboardingComplete ? '/' : '/welcome', { replace: true });
          return;
        }

        setInviteError('Invite validated, but workspace access is not provisioned yet. Contact support.');
        return;
      }

      if (!MOCK_CODES.includes(code)) {
        setInviteError('Invalid or expired invite code.');
        return;
      }

      navigateToSurface(navigate, SURFACES.APP, '/welcome', { replace: true });
    } catch (err) {
      console.error('Invite redemption error:', err);
      setInviteError('Something went wrong while redeeming that invite code.');
    } finally {
      setBusy(false);
    }
  };

  const submitWaitlist = async (event) => {
    event.preventDefault();

    const email = waitlistEmail.trim().toLowerCase();
    if (!email) {
      setAuthError('Enter your email address to join the waitlist.');
      return;
    }

    setBusy(true);
    setAuthError('');

    try {
      if (supabase) {
        const { error: dbError } = await supabase
          .from('waitlist')
          .insert({ email, source: needsAccessGate ? 'post_auth_gate' : 'auth_page' });

        if (dbError) {
          if (dbError.code === '23505') {
            // Already on the waitlist. Treat as success.
          } else if (
            import.meta.env.DEV &&
            (dbError.code === '42P01' || dbError.message?.includes('relation') || dbError.message?.includes('does not exist'))
          ) {
            console.warn('waitlist table not found in dev; logging locally');
            console.info('[Waitlist]', email);
          } else {
            throw dbError;
          }
        }
      } else {
        console.info('[Waitlist]', email);
      }

      setWaitlistSubmitted(true);
    } catch (err) {
      console.error('Waitlist error:', err);
      setAuthError('Unable to join the waitlist right now. Please try again later.');
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
        <div className="auth-page__logo">
          <div className="auth-page__logo-icon">J</div>
          <span className="auth-page__logo-text">ProductJarvis</span>
        </div>

        {!needsAccessGate ? (
          <div className="auth-page__content">
            <h1>Sign in to ProductJarvis</h1>
            <p className="auth-page__subtitle">
              Continue with Google first. If your workspace is not enabled yet, we&apos;ll ask for an
              invite code or let you join the waitlist after sign-in.
            </p>

            {authError && <div className="auth-page__error-banner">{authError}</div>}

            <button
              onClick={handleGoogleSignIn}
              disabled={busy}
              className="auth-page__button auth-page__button--google"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              {busy ? 'Signing in...' : 'Continue with Google'}
            </button>

            <div className="auth-page__divider">
              <span>What happens next</span>
            </div>

            <ul className="auth-page__list">
              <li>Sign in with your Google account on the auth host.</li>
              <li>If your email already has access, you go straight into the app.</li>
              <li>If not, you can redeem an invite code or join the waitlist after sign-in.</li>
            </ul>

            <p className="auth-page__trust">
              Already invited? Use the same Google account from your ProductJarvis invitation.
            </p>
          </div>
        ) : (
          <div className="auth-page__content">
            <div className="auth-page__invite-badge">Signed in as {signedInEmail || 'your Google account'}</div>

            <h1>Unlock workspace access</h1>
            <p className="auth-page__subtitle">
              Your Google account is connected. Enter an invite code to activate ProductJarvis for
              this email, or join the waitlist and we&apos;ll follow up.
            </p>

            {authError && <div className="auth-page__error-banner">{authError}</div>}

            <div className="auth-page__form">
              <input
                type="text"
                placeholder="e.g. JARVIS-ALPHA"
                value={inviteCode}
                onChange={(event) => {
                  setInviteCode(event.target.value.toUpperCase());
                  setInviteError('');
                }}
                className={`auth-page__input${inviteError ? ' auth-page__input--error' : ''}`}
                onKeyDown={(event) => event.key === 'Enter' && redeemInviteCode()}
              />
              {inviteError && <p className="auth-page__error">{inviteError}</p>}
              <button
                onClick={redeemInviteCode}
                disabled={busy || !inviteCode.trim()}
                className="auth-page__button auth-page__button--primary"
              >
                {busy ? 'Checking...' : 'Redeem invite code'}
              </button>
            </div>

            <div className="auth-page__divider">
              <span>or</span>
            </div>

            {waitlistSubmitted ? (
              <div className="auth-page__success-panel">
                <h2>You&apos;re on the list</h2>
                <p className="auth-page__subtitle auth-page__subtitle--compact">
                  We&apos;ll follow up at {waitlistEmail} when access is available for this workspace.
                </p>
              </div>
            ) : (
              <form onSubmit={submitWaitlist} className="auth-page__form">
                <input
                  type="email"
                  placeholder="Enter your work email"
                  value={waitlistEmail}
                  onChange={(event) => setWaitlistEmail(event.target.value)}
                  required
                  className="auth-page__input"
                />
                <button
                  type="submit"
                  disabled={busy || !waitlistEmail.trim()}
                  className="auth-page__button auth-page__button--secondary"
                >
                  {busy ? 'Submitting...' : 'Join waitlist'}
                </button>
              </form>
            )}

            <p className="auth-page__trust">
              Need help? Email <a href="mailto:support@productjarvis.com">support@productjarvis.com</a>.
            </p>
          </div>
        )}

        <div className="auth-page__footer">
          <DomainLink surface={SURFACES.WWW} path="/privacy">Privacy</DomainLink>
          <span>·</span>
          <DomainLink surface={SURFACES.WWW} path="/terms">Terms</DomainLink>
        </div>
      </div>
    </div>
  );
};

const AuthPage = () => <AuthPageInner />;

export default AuthPage;
